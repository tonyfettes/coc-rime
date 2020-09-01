//import { commands, CompleteResult, ExtensionContext, listManager, sources, workspace } from 'coc.nvim';
import { commands, ExtensionContext, listManager, sources, CompletionContext, workspace, languages } from 'coc.nvim';
import { TextDocument, Position, CancellationToken, CompletionList, CompletionItem, Range } from 'vscode-languageserver-protocol'
import { ChildProcess, spawn } from 'child_process'
import { ReadLine, createInterface } from 'readline'
import { Mutex } from 'await-semaphore'
//import DemoList from './lists';

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

  public async request(any_request: any): Promise<string[]> {
    const release = await this.mutex.acquire()
    try {
      return await this.requestUnlocked(any_request)
    } finally {
      release()
    }
  }

  private requestUnlocked(any_request: any): Promise<string[]> {
    const request = JSON.stringify(any_request) + '\n'
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
          let candidateItems = []
          if (any_response === null || any_response === undefined) reject(null)
          if ("menu" in any_response && "candidates" in any_response.menu) {
            for (let item of any_response.menu.candidates) {
              candidateItems.push(item.text)
            }
            resolve(candidateItems)
          }
        })
        this.proc.stdin.write(request, "utf8")
      } catch(e) {
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

export async function activate(context: ExtensionContext): Promise<void> {
  workspace.showMessage(`coc-rime works!`);

  function makeCompletionItem(preedit: string, candidate: string): CompletionItem {
    let item: CompletionItem = {
      label: candidate,
      sortText: preedit,
      filterText: preedit,
      insertText: candidate,
    }
    return item
  }

  context.subscriptions.push(languages.registerCompletionItemProvider('rime', 'IM', null, {
    async provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext): Promise<CompletionList | undefined | null> {
      try {
        const rimeCLI = new RimeCLI("/usr/bin/rime-cli")
        let req = undefined
        for (const singleChar of context.option.input) {
          req = rimeCLI.request({
            keysym: singleChar.charCodeAt(0),
            modifiers: 0
          })
        }
        const res: string[] = await req
        let completionItems: CompletionList = {
          items: res.map(candidate => {
            return {
              label: candidate,
              sortText: context.option.input,
              filterText: context.option.input,
              insertText: candidate
            }
          }),
          isIncomplete: context.option.input.length <= 3
        }
        return completionItems
      } catch(e) {
        console.log(`Error setting up request: ${e}`)
      }
    }
  }, [], 99))
}
