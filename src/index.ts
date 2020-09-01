//import { commands, CompleteResult, ExtensionContext, listManager, sources, workspace } from 'coc.nvim';
import { commands, ExtensionContext, listManager, sources, workspace } from 'coc.nvim';
import { ChildProcess, spawn } from 'child_process'
import { ReadLine, createInterface } from 'readline'
import { Mutex } from 'await-semaphore'
import DemoList from './lists';

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

  public async request(any_request: any): Promise<any> {
    const release = await this.mutex.acquire()
    try {
      return await this.requestUnlocked(any_request)
    } finally {
      release()
    }
  }

  private requestUnlocked(any_request: any): Promise<any> {
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
          let completionItems = []
          for (let item of any_response.menu.candidates) {
            completionItems.push(item.text)
          }
          resolve(completionItems)
          /*
          resolve({
            items: completionItems.map(singleItem => {
              return {
                word: "a" + singleItem
              }
            })
          })
          */
          /*
          resolve(any_response)
          */
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

  context.subscriptions.push(
    commands.registerCommand('coc-rime.Command', async () => {
      workspace.showMessage(`coc-rime Commands works!`);
    }),

    listManager.registerList(new DemoList(workspace.nvim)),

    sources.createSource({
      name: 'rime', // unique id
      shortcut: '[IM]', // [CS] is custom source
      priority: 99,
      triggerPatterns: [], // RegExp pattern
      doComplete: async function (opt) {
        if (!opt.input) {
          return null
        }
        const tItems = await getCompletionItems(opt.input);
        console.log(tItems)
        return {
          items: tItems.map(singleItem => {
            return {
              //word: opt.input + singleItem,
              word: opt.input + singleItem,
              abbr: opt.input + singleItem,
              dup: 1,
              empty: 1,
            }
          })
        }
      },
    }),

    workspace.registerKeymap(
      ['n'],
      'coc-rime-keymap',
      async () => {
        workspace.showMessage(`registerKeymap`);
      },
      { sync: false }
    ),

    workspace.registerAutocmd({
      event: 'InsertLeave',
      request: true,
      callback: () => {
        workspace.showMessage(`registerAutocmd on InsertLeave`);
      },
    })
  );
}

async function getCompletionItems(input:string): Promise<any> {
  const rimeCLI = new RimeCLI("/usr/bin/rime-cli")
  let res = undefined
  for (let singleChar of input) {
    res = rimeCLI.request({
      keysym: singleChar.charCodeAt(0),
      modifiers: 0
    })
  }
  return res
}
//async function getCompletionItems(): Promise<CompleteResult> {
//  return {
//    items: [
//      {
//        //word: 'TestCompletionItem 1',
//        word: 'a啊',
//      },
//      {
//        word: 'a嗄',
//      },
//    ],
//  };
//}
