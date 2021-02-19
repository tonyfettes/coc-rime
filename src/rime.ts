import {ChildProcess, spawn} from 'child_process';
import {ReadLine, createInterface} from 'readline';
import {Mutex} from 'async-mutex';
import download from './download';
import fs from 'fs';
import mkdirp from 'mkdirp';
import {window} from 'coc.nvim';

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
  private isEnabled: boolean
  private childDead: boolean
  private binaryPath?: string
  private mutex: Mutex = new Mutex()
  private numRestarts = 0
  private proc: ChildProcess
  private rl: ReadLine
  private schemaList: RimeSchema[]

  constructor(binaryPath?: string) {
    this.binaryPath = binaryPath || '/usr/bin/rime-cli';
    this.childDead = false;
  }

  public async installRimeCLI(root: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        if (process.arch != "x64" || process.platform != "linux") {
          reject(`Sorry, the platform ${process.platform}-${process.arch} is not supported by rime-cli.`);
        }
        if (fs.existsSync(this.binaryPath)) {
          resolve();
          return;
        }
        if (!fs.existsSync(root)) {
          mkdirp.sync(root);
        }
        const binaryName = 'rime-cli';
        const dest = root + binaryName;
        if (!fs.existsSync(dest)) {
          const binaryUrl = `https://github.com/tonyfettes/rime-cli/releases/download/v0.0.1-alpha/rime-cli-x86_64-linux`;
          const item = window.createStatusBarItem(0, { progress: true });
          item.text = `Downloading ${binaryName}`;
          item.show();
          download(binaryUrl, dest, (percent) => {
            item.text = `Downloading ${binaryName} ${(percent * 100).toFixed(0)}%`;
          })
          .then(() => {
            try {
              fs.chmodSync(dest, 0o755);
              this.binaryPath = dest;
            } catch (e) {
              window.showMessage(`Error setting the permission: ${e}`, `error`);
              reject(e);
            } finally {
              item.dispose();
            }
          })
          .catch((e) => {
            window.showMessage(`Error downloading ${binaryName}: ${e}`);
            reject(e);
          });
        } else {
          this.binaryPath = dest;
          resolve();
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  public async setCompletionStatus(status: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      try {
        this.isEnabled = status;
        resolve(this.isEnabled);
      } catch(e) {
        reject(e);
      }
    });
  }

  public async toggleCompletionStatus(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      try {
        this.isEnabled = !this.isEnabled;
        resolve(this.isEnabled);
      } catch(e) {
        reject(e);
      }
    });
  }

  public async getCompletionStatus(): Promise<boolean> {
    return this.isEnabled;
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
            this.schemaList = res.schemaList;
          } else {
            this.schemaList = [];
          }
          resolve(this.schemaList);
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
          reject(`rime-cli reports error.`);
        }
      })
      .catch((e) => {
        reject(e);
      });
    });
  }

  private async request(rimeRequest: RimeRequest): Promise<any> {
    const release = await this.mutex.acquire();
    try {
      // Send the request asynchronously.
      return await this.requestUnlocked(rimeRequest);
    } finally {
      release();
    }
  }

  private async requestUnlocked(rimeRequest: RimeRequest): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      try {
        if (!this.isChildAlive()) {
          this.restartChild();
        }
        if (!this.isChildAlive()) {
          reject(new Error('rime-cli process is dead.'));
        }
        this.rl.once('line', response => {
          let any_response: any = JSON.parse(response.toString());
          //let candidateItems: string[] = []
          if (any_response === null || any_response === undefined) {
            resolve(null);
          } else {
            resolve(any_response);
          }
        })
        this.proc.stdin.write(JSON.stringify(rimeRequest) + '\n', 'utf8');
      } catch (e) {
        console.log(`Error interacting with rime-cli: ${e}`);
        reject(e);
      }
    })
  }

  private isChildAlive(): boolean {
    return this.proc && !this.childDead
  }

  private restartChild(): void {
    if (this.numRestarts >= 10 || !fs.existsSync(this.binaryPath)) {
      return;
    }
    this.numRestarts += 1;
    if (this.proc) {
      this.proc.kill();
    }

    const args = [];
    const binaryPath = this.binaryPath;

    this.proc = spawn(binaryPath, args);
    this.childDead = false;
    this.proc.on('exit', () => {
      this.childDead = true;
    });
    this.proc.stdin.on('error', error => {
      console.log(`stdin error: ${error}`)
      this.childDead = true;
    });
    this.proc.stdout.on('error', error => {
      // tslint:disable-next-line: no-console
      console.log(`stdout error: ${error}`);
      this.childDead = true;
    });
    this.proc.unref(); // As I understand it, this lets Node exit without waiting for the child
    this.rl = createInterface({
      input: this.proc.stdout,
      output: this.proc.stdin
    });
  }
}
