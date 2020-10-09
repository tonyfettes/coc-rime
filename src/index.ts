//import { commands, CompleteResult, ExtensionContext, listManager, sources, workspace } from 'coc.nvim';
import {commands, ExtensionContext, listManager, sources, CompletionContext, workspace, languages} from 'coc.nvim';
import {TextDocument, Position, CancellationToken, CompletionList, CompletionItem, Range} from 'vscode-languageserver-protocol'
import SchemaList from './lists';
import {RimeContext, RimeCandidate, RimeSchema, RimeCLI} from './rime';

const rimeCLI = new RimeCLI("/usr/bin/rime-cli");

export async function activate(context: ExtensionContext): Promise<void> {

  // Completion Source
  context.subscriptions.push(languages.registerCompletionItemProvider('rime', 'IM', null, {
    async provideCompletionItems(_document: TextDocument, _position: Position, _token: CancellationToken, context: CompletionContext): Promise<CompletionList | undefined | null> {
      return new Promise<CompletionList>((resolve, reject) => {
        try {
          const acceptCharset = "'=-abcdefghijklmnopqrstuvwxyz";
          let preEdit: string = '';
          for (const singleChar of context.option.input) {
            if (!acceptCharset.includes(singleChar)) {
              preEdit += singleChar;
            }
          }
          rimeCLI.requestContext(context.option.input).then((res) => {
            if (res !== null && "menu" in res && res.menu != null && "candidates" in res.menu && res.menu.candidates != null) {
              let completionItems: CompletionList = {
                items: res.menu.candidates.map(candidate => {
                  return {
                    label: preEdit + candidate.text,
                    sortText: context.option.input + candidate.label.toString().padStart(8, "0"),
                    filterText: context.option.input,
                    insertText: preEdit + candidate.text,
                  }
                }),
                isIncomplete: context.option.input.length <= 3,
              };
              resolve(completionItems)
            } else {
              resolve({
                items: [],
                isIncomplete: context.option.input.length <= 3,
              })
            }
          })
        } catch (e) {
          console.log(`Error setting up request: ${e}`)
          reject(e)
        }
      })
    }
  }, [], 1));

  // Schema List
  listManager.registerList(new SchemaList(workspace.nvim, await rimeCLI.requestSchemaList()));
}
