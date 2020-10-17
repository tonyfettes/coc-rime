//import { commands, CompleteResult, ExtensionContext, listManager, sources, workspace } from 'coc.nvim';
import {commands, ExtensionContext, listManager, sources, CompletionContext, workspace, languages} from 'coc.nvim';
import {TextDocument, Position, CancellationToken, CompletionList, CompletionItem, Range} from 'vscode-languageserver-protocol';
import SchemaList from './lists';
import {RimeContext, RimeCandidate, RimeSchema, RimeCLI} from './rime';
import {Config} from './config';

export async function activate(context: ExtensionContext): Promise<void> {
  const userConfig = new Config();
  if (userConfig.enabled == false) {
    return;
  }

  const rimeCLI: RimeCLI = new RimeCLI(userConfig.binaryPath);
  await rimeCLI.installRimeCLI(context.storagePath + '/').catch((e) => {
    workspace.showMessage(`Failed to install/find rime-cli: ${e}`, 'error');
  });
  rimeCLI.setSchema(userConfig.schemaId);

  // Completion Source
  context.subscriptions.push(languages.registerCompletionItemProvider('rime', 'IM', null, {
    async provideCompletionItems(_document: TextDocument, _position: Position, _token: CancellationToken, context: CompletionContext): Promise<CompletionList | undefined | null> {
      return new Promise<CompletionList>((resolve, reject) => {
        const acceptCharset = 'abcdefghijklmnopqrstuvwxyz';
        let preEdit = '';
        for (const singleChar of context.option.input) {
          if (!acceptCharset.includes(singleChar)) {
            preEdit += singleChar;
          } else {
            break;
          }
        }
        rimeCLI.getContext(context.option.input)
        .then((res) => {
          if (res != null && 'menu' in res && res.menu != null && 'candidates' in res.menu && res.menu.candidates != null) {
            let completionItems: CompletionList = {
              items: res.menu.candidates.map(candidate => {
                return {
                  label: preEdit + candidate.text,
                  sortText: context.option.input + candidate.label.toString().padStart(8, '0'),
                  filterText: context.option.input,
                  insertText: preEdit + candidate.text,
                }
              }),
              isIncomplete: context.option.input.length <= 3,
            };
              resolve(completionItems);
          } else {
            resolve({
              items: [],
              isIncomplete: context.option.input.length <= 3,
            });
          }
        })
        .catch((e) => {
          console.log(`Error getting Context: ${e}`);
          reject(e);
        });
      })
    }
  }, [], userConfig.priority, []));

  // Schema List
  listManager.registerList(new SchemaList(workspace.nvim, rimeCLI));
}
