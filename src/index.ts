//import { commands, CompleteResult, ExtensionContext, listManager, sources, workspace } from 'coc.nvim';
import {commands, ExtensionContext, listManager, sources, CompletionContext, workspace, languages} from 'coc.nvim';
import {TextDocument, Position, CancellationToken, CompletionList, CompletionItem, Range} from 'vscode-languageserver-protocol'
import {ChildProcess, spawn} from 'child_process'
import {ReadLine, createInterface} from 'readline'
import {Mutex} from 'await-semaphore'
//import DemoList from './lists';

interface RimeRequest {
  keysym: number[],
  modifiers: number
}

class RimeCLI {
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

  public async request(request_string: string): Promise<string[]> {
    const release = await this.mutex.acquire()
    try {
      // Group the input string into one request pack.
      let grouped_request: RimeRequest = {
        keysym: [],
        modifiers: 0,
      }
      for (const singleChar of request_string) {
        grouped_request.keysym.push(singleChar.charCodeAt(0));
      }
      // Send the request asynchronously.
      return await this.requestUnlocked(grouped_request)
    } finally {
      release()
    }
  }

  private requestUnlocked(grouped_request: RimeRequest): Promise<string[]> {
    return new Promise<any>((resolve, reject) => {
      try {
        if (!this.isChildAlive()) {
          this.restartChild()
        }
        if (!this.isChildAlive()) {
          reject(new Error("rime-cli process is dead."))
        }
        this.rl.once('line', response => {
          let any_response: any = JSON.parse(response.toString())
          let candidateItems: string[] = []
          if (any_response === null || any_response === undefined) {
            resolve([])
          } else if ("menu" in any_response && any_response.menu !== null && "candidates" in any_response.menu) {
            for (let item of any_response.menu.candidates) {
              candidateItems.push(item.text)
            }
            resolve(candidateItems)
          } else {
            resolve(candidateItems)
          }
        })
        this.proc.stdin.write(JSON.stringify(grouped_request) + '\n', "utf8")
      } catch (e) {
        console.log(`Error interacting with rime-cli: ${e}`)
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
    const binaryPath = this.binaryPath || "/usr/bin/rime-cli"

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
    this.proc.unref() // AIUI, this lets Node exit without waiting for the child
    this.rl = createInterface({
      input: this.proc.stdout,
      output: this.proc.stdin
    })
  }
}

const rimeCLI = new RimeCLI("/usr/bin/rime-cli")

//export async function activate(context: ExtensionContext): Promise<void> {
export function activate(context: ExtensionContext): void {
  //workspace.showMessage(`coc-rime works!`);

  context.subscriptions.push(languages.registerCompletionItemProvider('rime', 'IM', null, {
    async provideCompletionItems(_document: TextDocument, _position: Position, _token: CancellationToken, context: CompletionContext): Promise<CompletionList | undefined | null> {
      const SPACE_KEYSYM = 32
      try {
        const req = rimeCLI.request("  " + context.option.input)
        const acceptCharset = "'=-abcdefghijklmnopqrstuvwxyz"
        let preEdit: string = ''
        for (const singleChar of context.option.input) {
          if (!acceptCharset.includes(singleChar)) {
            preEdit += singleChar
          }
        }
        const res: string[] = await req
        let completionItems: CompletionList = {
          items: res.map(candidate => {
            return {
              label: preEdit + candidate,
              sortText: context.option.input,
              filterText: context.option.input,
              insertText: preEdit + candidate
            }
          }),
          isIncomplete: context.option.input.length <= 3,
        }
        return completionItems
      } catch (e) {
        console.log(`Error setting up request: ${e}`)
      }
    }
  }, [], 1))
}
