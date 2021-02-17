//import { commands, CompleteResult, ExtensionContext, listManager, sources, workspace } from 'coc.nvim';
import {commands, ExtensionContext, listManager, sources, CompletionContext, workspace, languages} from 'coc.nvim';
import {TextDocument, Position, CancellationToken, CompletionList, CompletionItem, Range} from 'vscode-languageserver-protocol';
import SchemaList from './lists';
import {RimeContext, RimeCandidate, RimeSchema, RimeCLI} from './rime';
import {Config} from './config';

export async function activate(context: ExtensionContext): Promise<void> {
  const userConfig = new Config();

  const rimeCLI: RimeCLI = new RimeCLI(userConfig.binaryPath);
  await rimeCLI.installRimeCLI(context.storagePath + '/').catch((e) => {
    workspace.showMessage(`Failed to install/find rime-cli: ${e}`, 'error');
  });
  rimeCLI.setCompletionStatus(userConfig.enabled);
  rimeCLI.setSchema(userConfig.schemaId);

  context.subscriptions.push(
    // Commands
    commands.registerCommand('rime.enable', async () => {
      rimeCLI.setCompletionStatus(true);
    }),

    commands.registerCommand('rime.disable', async () => {
      rimeCLI.setCompletionStatus(false);
    }),

    commands.registerCommand('rime.toggle', async () => {
      rimeCLI.toggleCompletionStatus();
    }),

    // Completion Source
    languages.registerCompletionItemProvider('rime', 'IM', null, {
      async provideCompletionItems(document: TextDocument, position: Position, _token: CancellationToken, context: CompletionContext): Promise<CompletionList | undefined | null> {
        return new Promise<CompletionList>((resolve, reject) => {
          const alphaCharset = 'acdghijklmnpqstuvwxyz';
          const punctuationCharset = '\'\"()<>[],.?;:';

          let preEdit = '';
          for (const singleChar of context.option.input) {
            if (!alphaCharset.includes(singleChar)) {
              preEdit += singleChar;
            } else {
              break;
            }
          }

          let inputString = '';
          let offset = document.offsetAt(position);
          let inputRange: Range = { start: document.positionAt(offset), end: document.positionAt(offset), };
          if (offset != 0) {
            let singleChar = document.getText({
              start: document.positionAt(offset - 1),
              end: document.positionAt(offset),
            });
            while ((alphaCharset.includes(singleChar) || punctuationCharset.includes(singleChar)) && offset != 0) {
              inputString = singleChar + inputString;
              offset -= 1;
              singleChar = document.getText({
                start: document.positionAt(offset - 1),
                end: document.positionAt(offset),
              });
            }
            inputRange.start = document.positionAt(offset);
          }

          rimeCLI.getContext(inputString)
          .then((res) => {
            // const sampleItem: CompletionItem = {
            //   label: 'newText',
            //   sortText: context.option.input,
            //   filterText: context.option.input,
            //   textEdit: {
            //     range: inputRange,
            //     newText: 'newText',
            //   }
            // };
            // let { range } = sampleItem.textEdit;
            // let newText: string = sampleItem.textEdit.newText;
            // if (range && range.start.line == range.end.line) {
            //   let { line, col, colnr } = context.option;
            //   let character = col;
            //   if (range.start.character > character) {
            //     let before = line.slice(character - range.start.character)
            //     newText = before + newText
            //   } else {
            //     let start = line.slice(range.start.character, character)
            //     if (start.length && newText.startsWith(start)) {
            //       newText = newText.slice(start.length)
            //     }
            //   }
            //   character = colnr - 1;
            //   if (range.end.character > character) {
            //     let end = line.slice(character, range.end.character)
            //     if (newText.endsWith(end)) {
            //       newText = newText.slice(0, - end.length)
            //     }
            //   }
            //   workspace.showMessage('newText: ' + newText + ', start: ' + inputRange.start.character + ', end: ' + inputRange.end.character);
            // }
            // resolve({
            //   items: [sampleItem],
            //   isIncomplete: false,
            // });

            rimeCLI.getCompletionStatus()
            .then((isEnabled) => {
              if (isEnabled && res != null && 'menu' in res && res.menu != null && 'candidates' in res.menu && res.menu.candidates != null) {
                let completionItems: CompletionList = {
                  items: res.menu.candidates.map(candidate => {
                    return {
                      label: preEdit + candidate.text,
                      sortText: context.option.input + candidate.label.toString().padStart(8, '0'),
                      filterText: context.option.input,
                      textEdit: {
                        range: inputRange,
                        newText: candidate.text,
                      }
                    }
                  }),
                  isIncomplete: false,
                  // isIncomplete: context.option.input.length <= 3,
                };
                resolve(completionItems);
              } else {
                resolve({
                  items: [],
                  isIncomplete: false,
                  // isIncomplete: context.option.input.length <= 3,
                });
              }
            })
            .catch((e) => {
              console.log(`Error getting the status of the completion source: ${e}`);
              reject(e);
            });
          })
          .catch((e) => {
            console.log(`Error getting Context: ${e}`);
            reject(e);
          });
        });
      }
    }, [], userConfig.priority, [])
  );

  // Schema List
  listManager.registerList(new SchemaList(workspace.nvim, rimeCLI));
}
