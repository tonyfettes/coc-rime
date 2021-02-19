import {commands, ExtensionContext, listManager, CompletionContext, window, workspace, languages} from 'coc.nvim';
import {Position, CancellationToken, CompletionList, Range, CompletionItem} from 'vscode-languageserver-protocol';
import {TextDocument} from 'vscode-languageserver-textdocument';
import SchemaList from './lists';
import {RimeCLI} from './rime';
import {Config} from './config';

export async function activate(context: ExtensionContext): Promise<void> {
  const userConfig = new Config();

  const start = new Date().getTime();
  const rimeCLI: RimeCLI = new RimeCLI(userConfig.binaryPath);
  await rimeCLI.installRimeCLI(context.storagePath + '/').catch((e) => {
    window.showMessage(`Failed to install/find rime-cli: ${e}`, 'error');
  });
  rimeCLI.setCompletionStatus(userConfig.enabled);
  rimeCLI.setSchema(userConfig.schemaId);
  const statusBarItem = window.createStatusBarItem(99, { progress: false });
  statusBarItem.text = 'ㄓ';
  if (userConfig.enabled === true) {
    statusBarItem.show();
  }
  const end = new Date().getTime();
  // window.showMessage('time to init: ' + (end - start).toString());
  
  let semaphore = 0;

  context.subscriptions.push(
    // Commands
    commands.registerCommand('rime.enable', async () => {
      rimeCLI.setCompletionStatus(true);
      statusBarItem.show();
    }),

    commands.registerCommand('rime.disable', async () => {
      rimeCLI.setCompletionStatus(false);
      statusBarItem.hide();
    }),

    commands.registerCommand('rime.toggle', async () => {
      rimeCLI.toggleCompletionStatus();
      rimeCLI.getCompletionStatus()
      .then((completionStatus) => {
        if (completionStatus) {
          statusBarItem.show();
        } else {
          statusBarItem.hide();
        }
      })
      .catch((e) => {
        console.log(`Error getting Context: ${e}`);
      });
    }),

    // Completion Source
    languages.registerCompletionItemProvider('rime', 'IM', null, {
      async provideCompletionItems(document: TextDocument, position: Position, _token: CancellationToken, _context: CompletionContext): Promise<CompletionList> {
        return new Promise<CompletionList>((resolve, reject) => {
          const alphaCharset = 'abcdefghijklmnopqrstuvwxyz';
          let inputString = '';
          let contextString = '';
          let offset = document.offsetAt(position);
          let inputRange: Range = { start: document.positionAt(offset), end: document.positionAt(offset), };
          if (offset != 0) {
            let singleChar = document.getText({
              start: document.positionAt(offset - 1),
              end: document.positionAt(offset),
            });
            while (alphaCharset.includes(singleChar) && offset != 0) {
              inputString = singleChar + inputString;
              offset -= 1;
              singleChar = document.getText({
                start: document.positionAt(offset - 1),
                end: document.positionAt(offset),
              });
            }
            inputRange.start = document.positionAt(offset);
            while (singleChar != ' ' && singleChar != '\n' && singleChar != '\r' && singleChar != '\t') {
              contextString = singleChar + contextString;
              offset -= 1;
              singleChar = document.getText({
                start: document.positionAt(offset - 1),
                end: document.positionAt(offset),
              });
            }
          } else {
            resolve({
              items: [],
              isIncomplete: false,
            });
          }
          rimeCLI.getCompletionStatus()
          .then((isEnabled) => {
            let completionList: CompletionList = {
              items: [],
              isIncomplete: false,
            };
            rimeCLI.getContext(inputString)
            .then((res) => {
              if (isEnabled && res != null && 'menu' in res && res.menu != null && 'candidates' in res.menu && res.menu.candidates != null) {
                completionList.items = res.menu.candidates.map(candidate => {
                  return {
                    label: contextString + candidate.text,
                    sortText: contextString + inputString + candidate.label.toString().padStart(8, '0'),
                    filterText: contextString + inputString,
                    textEdit: {
                      range: inputRange,
                      newText: candidate.text,
                    }
                  };
                });
                completionList.isIncomplete = false;
              }
              resolve(completionList);
            })
            .catch((e) => {
              console.log(`Error getting Context: ${e}`);
              resolve({
                items: [],
                isIncomplete: false,
              });
            });
          })
          .catch((e) => {
            console.log(`Error getting the status of the completion source: ${e}`);
            resolve({
              items: [],
              isIncomplete: false,
            });
          });
        });
      }
    }, [], userConfig.priority, [])
  );

  // Schema List
  listManager.registerList(new SchemaList(workspace.nvim, rimeCLI));
}
