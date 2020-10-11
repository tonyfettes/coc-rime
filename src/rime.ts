import {commands, ExtensionContext, listManager, sources, CompletionContext, workspace, languages} from 'coc.nvim';
import {ChildProcess, spawn} from 'child_process'
import {ReadLine, createInterface} from 'readline'
import {Mutex} from 'await-semaphore'

export enum RimeRequestType {IOError, Invalid, Schema, Context};

export interface RimeRequest {
  type: RimeRequestType,
  content: RimeContextRequest | RimeSchemaRequest,
}

export interface RimeComposition {
  length: number,
  cursorPos: number,
  selStart: number,
  selEnd: number,
  preEdit: string,
}

export interface RimeCandidate {
  text: string,
  comment: string,
  label: number,
}

export interface RimeMenu {
  pageSize: number,
  pageNo: number,
  isLastPage: boolean,
  highlightedCandidateIndex: number,
  numCandidates: number,
  candidates: RimeCandidate[],
  selectKeys: string,
}

export interface RimeCommit {
  text: string,
}

export interface RimeContext {
  composition: RimeComposition,
  menu: RimeMenu,
  commitTextPreview: string,
  selectLabels: string[],
}

export interface RimeContextRequest {
  keyCode: number[],
  modifiers: number,
}

export enum RimeSchemaRequestAction {Nop, GetCurrent, GetList, Select};

export interface RimeSchemaRequest {
  action: RimeSchemaRequestAction,
  schemaId: string,
}

export interface RimeSchema {
  schemaId: string,
  name: string,
}

export class RimeCLI {
  private childDead: boolean
  private binaryPath?: string
  private mutex: Mutex = new Mutex()
  private numRestarts = 0
  private proc: ChildProcess
  private rl: ReadLine

  constructor(binaryPath?: string) {
    this.binaryPath = binaryPath
    this.childDead = false
  }

  public async getContext(input: string): Promise<RimeContext> {
    // Group the input string into one request pack.
    return new Promise<RimeContext>((resolve, reject) => {
      try {
        let grouped_request: RimeContextRequest = {
          keyCode: [],
          modifiers: 0,
        }
        const KEYCODE_ESCAPE = 0xff1b;
        grouped_request.keyCode.push(KEYCODE_ESCAPE);
        for (const singleChar of input) {
          grouped_request.keyCode.push(singleChar.charCodeAt(0));
        }
        this.request({
          type: RimeRequestType.Context,
          content: grouped_request,
        }).then((res) => {
          resolve(res)
        }).catch((e) => {
          reject(e)
        })
      } catch(e) {
        reject(e)
      }
    });
  }

  public async getSchemaList(): Promise<RimeSchema[]> {
    return new Promise<RimeSchema[]>((resolve, reject) => {
      try {
        this.request({
          type: RimeRequestType.Schema,
          content: <RimeSchemaRequest>{
            action: RimeSchemaRequestAction.GetList,
            schemaId: '',
          },
        })
        .then((res) => {
          if ('schemaList' in res && res.schemaList !== null) {
            resolve(res.schemaList);
          } else {
            resolve([]);
          }
        })
        .catch((e) => {
          reject(e);
        });
      } catch(e) {
        console.log(`Error parse the response: ${e}`);
        resolve(null);
      }
    })
  }

  public async getSchema(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.request(<RimeRequest>{
        type: RimeRequestType.Schema,
        content: <RimeSchemaRequest>{
          action: RimeSchemaRequestAction.GetCurrent,
          schemaId: '',
        }
      })
      .then((res) => {
        if ('schemaId' in res && res.schemaId != null) {
          resolve(res.schemaId);
        } else {
          reject('Invalid response');
        }
      })
      .catch((e) => {
        reject(e);
      });
    });
  }

  public async setSchema(schemaId: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.request(<RimeRequest>{
        type: RimeRequestType.Schema,
        content: <RimeSchemaRequest>{
          action: RimeSchemaRequestAction.Select,
          schemaId: schemaId,
        }
      })
      .then((res) => {
        if ('success' in res && res.success == true) {
          resolve();
        } else {
          reject('rime-cli reports error');
        }
      })
      .catch((e) => {
        reject(e);
      });
    });
  }

  private async request(rimeRequest: RimeRequest): Promise<any> {
    const release = await this.mutex.acquire()
    try {
      // Send the request asynchronously.
      return await this.requestUnlocked(rimeRequest)
    } finally {
      release()
    }
  }

  private async requestUnlocked(rimeRequest: RimeRequest): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      try {
        if (!this.isChildAlive()) {
          this.restartChild()
        }
        if (!this.isChildAlive()) {
          reject(new Error('rime-cli process is dead.'))
        }
        this.rl.once('line', response => {
          let any_response: any = JSON.parse(response.toString())
          //let candidateItems: string[] = []
          if (any_response === null || any_response === undefined) {
            resolve(null)
          } else {
            resolve(any_response);
          }
          /*
          } else if ('menu' in any_response && any_response.menu !== null && 'candidates' in any_response.menu) {
            for (let item of any_response.menu.candidates) {
              candidateItems.push(item)
            }
            resolve(candidateItems)
          } else {
            resolve(candidateItems)
          }
          */
        })
        this.proc.stdin.write(JSON.stringify(rimeRequest) + '\n', 'utf8')
      } catch (e) {
        console.log(`Error interacting with rime-cli: ${e}.`)
        reject(e)
      }
    })
  }

  private isChildAlive(): boolean {
    return this.proc && !this.childDead
  }

  private restartChild(): void {
    if (this.numRestarts >= 10) {
      return
    }
    this.numRestarts += 1
    if (this.proc) {
      this.proc.kill()
    }

    const args = []
    const binaryPath = this.binaryPath || '/usr/bin/rime-cli'

    this.proc = spawn(binaryPath, args)
    this.childDead = false
    this.proc.on('exit', () => {
      this.childDead = true
    })
    this.proc.stdin.on('error', error => {
      console.log(`stdin error: ${error}`)
      this.childDead = true
    })
    this.proc.stdout.on('error', error => {
      // tslint:disable-next-line: no-console
      console.log(`stdout error: ${error}`)
      this.childDead = true
    })
    this.proc.unref() // As I understand it, this lets Node exit without waiting for the child
    this.rl = createInterface({
      input: this.proc.stdout,
      output: this.proc.stdin
    })
  }
}
