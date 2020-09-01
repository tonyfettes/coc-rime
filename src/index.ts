//import { commands, CompleteResult, ExtensionContext, listManager, sources, workspace } from 'coc.nvim';
import { commands, ExtensionContext, listManager, sources, CompletionContext, workspace, languages } from 'coc.nvim';
import { TextDocument, Position, CancellationToken, CompletionList, CompletionItem, Range } from 'vscode-languageserver-protocol'
import { ChildProcess, spawn } from 'child_process'
import { ReadLine, createInterface } from 'readline'
import { Mutex } from 'await-semaphore'
import DemoList from './lists';
import {stdin} from 'process';

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
          let candidateItems = []
          if (any_response === null || any_response === undefined) reject(null)
          if ("menu" in any_response && "candidates" in any_response.menu) {
            for (let item of any_response.menu.candidates) {
              candidateItems.push(item.text)
            }
            resolve(candidateItems)
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

const CHAR_LIMIT = 100000

//export async function activate(context: ExtensionContext): Promise<void> {
export function activate(context: ExtensionContext): void {
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
        /*
        const curln = document.getText(Range.create({
          line: position.line,
          character: 0,
        }, {
          line: position.line,
          character: CHAR_LIMIT,
        }))
        let prefix = position.character - 1
        let acceptCharset = "'abcdefghijklmnopqrstuvwxyz"
        while (prefix > 0 && acceptCharset.includes(curln.charAt(prefix))) {
          prefix--
        }
        let suffix = position.character - 1
        while (suffix < curln.length && acceptCharset.includes(curln.charAt(suffix))) {
          suffix++
        }
        */
        workspace.showMessage(context.option.input)
        //prefix = Math.max(0, prefix)
        //workspace.showMessage('charAt(' + prefix.toString() + '): ' + curln.charAt(prefix) + ', charAt(' + suffix.toString() + '):' + curln.charAt(suffix))
        //workspace.showMessage(prefix.toString() + ' ' + suffix.toString())
        //workspace.showMessage(curln.slice(prefix, suffix - 1))
        let req = undefined
        for (const singleChar of context.option.input) {
          req = rimeCLI.request({
            keysym: singleChar.charCodeAt(0),
            modifiers: 0
          })
        }
        const res: string[] = await req
        //workspace.showMessage(items)
        /*
        return res.map(candidate => {
          //return makeCompletionItem(curln.slice(prefix, suffix - 1), candidate)
          return {
            label: candidate,
            sortText: curln.slice(prefix, suffix - 1),
            filterText: curln.slice(prefix, suffix - 1),
            insertText: candidate,
          }
        })
        */
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

  /*
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
      firstMatch: false,
      doComplete: async function (opt) {
        if (!opt.input) {
          return null
        }
        const tItems = await getCompletionItems(opt.input);
        workspace.showMessage(tItems);
        return {
          items: tItems.map(singleItem => {
            return {
              //word: opt.input + singleItem,
              word: opt.input,
              //word: singleItem,
              //word: '',
              abbr: singleItem,
              menu: singleItem,
              dup: 1,
              empty: 1,
              equal: 1,
            }
          }),
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
  */
}

/*
async function getRimeResponse(document: TextDocument, position: Position): Promise<any> {
  const rimeCLI = new RimeCLI("/usr/bin/rime-cli")
  const curln = document.getText(Range.create({
    line: position.line,
    character: 0,
  }, {
    line: position.line,
    character: CHAR_LIMIT,
  }))
  let prefix = position.character
  let acceptCharset = "'abcdefghijklmnopqrstuvwxyz"
  while (prefix >= 0 && acceptCharset.includes(curln.charAt(prefix))) {
    prefix--
  }
  let suffix = position.character + 1
  while (suffix < curln.length && acceptCharset.includes(curln.charAt(suffix))) {
    suffix++
  }
  let res = undefined
  for (let singleChar of curln.slice(prefix + 1, suffix - 1)) {
    res = rimeCLI.request({
      keysym: singleChar.charCodeAt(0),
      modifiers: 0
    })
  }
  return res
}
*/

//async function getCompletionItems(input:string): Promise<any> {
//  const rimeCLI = new RimeCLI("/usr/bin/rime-cli")
//  let res = undefined
//  for (let singleChar of input) {
//    res = rimeCLI.request({
//      keysym: singleChar.charCodeAt(0),
//      modifiers: 0
//    })
//  }
//  return res
//}
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
