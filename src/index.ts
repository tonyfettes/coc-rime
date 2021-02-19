import {commands, ExtensionContext, listManager, CompletionContext, window, workspace, languages} from 'coc.nvim';
import {Position, CancellationToken, CompletionList, Range, CompletionItem} from 'vscode-languageserver-protocol';
import {TextDocument} from 'vscode-languageserver-textdocument';
import SchemaList from './lists';
import {RimeCLI} from './rime';
import {Config} from './config';

export async function activate(context: ExtensionContext): Promise<void> {
  const userConfig = new Config();

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
      async provideCompletionItems(document: TextDocument, position: Position, _token: CancellationToken, _context: CompletionContext): Promise<CompletionList | undefined | null> {
        return new Promise<CompletionList>((resolve, reject) => {
          const alphaCharset = 'abcdefghijklmnopqrstuvwxyz';
          const punctuationCharset = '\'\"()<>[],.?;:';
          const punctMap: Map<string, string[]> = new Map();
          punctMap.set(',', ['，']);
          punctMap.set('.', ['。']);
          punctMap.set('?', ['？']);
          punctMap.set('!', ['！']);
          punctMap.set(':', ['：']);
          punctMap.set(';', ['；']);
          punctMap.set('\\', ['、']);
          punctMap.set('\"', ['“', '”']);
          punctMap.set('\'', ['‘', '’']);
          punctMap.set('<', ['《', '〈', '«', '‹', '˂']);
          punctMap.set('>', ['》', '〉', '»', '›', '˃']);
          punctMap.set('(', ['（']);
          punctMap.set(')', ['）']);
          punctMap.set('[', ['「', '【', '〔', '［', '〚']);
          punctMap.set(']', ['」', '】', '〕', '］', '〛']);
          punctMap.set('{', ['｛']);
          punctMap.set('}', ['｝']);
          punctMap.set('$', ['￥']);
          punctMap.set('|', ['｜']);
          punctMap.set('^', ['……']);
          punctMap.set('~', ['～']);

          let inputString = '';
          let contextString = '';
          let offset = document.offsetAt(position);
          window.showMessage('offset: ' + offset);
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
          }
          window.showMessage('context: ' + contextString + ', input: ' + inputString);

          rimeCLI.getCompletionStatus()
          .then((isEnabled) => {
            let completionList: CompletionList = {
              items: [],
              isIncomplete: true,
            };
            for (const [halfWidthPunct, fullWithPunctList] of punctMap) {
              for (const fullWithPunct of fullWithPunctList) {
                completionList.items.push({
                  label: fullWithPunct,
                  sortText: halfWidthPunct,
                  filterText: halfWidthPunct + 'pct',
                  insertText: fullWithPunct,
                } as CompletionItem);
              }
            }
            rimeCLI.getContext(inputString)
            .then((res) => {
              if (isEnabled && res != null && 'menu' in res && res.menu != null && 'candidates' in res.menu && res.menu.candidates != null) {
                completionList.items = completionList.items.concat(res.menu.candidates.map(candidate => {
                  return {
                    label: contextString + candidate.text,
                    sortText: contextString + inputString + candidate.label.toString().padStart(8, '0'),
                    filterText: contextString + inputString,
                    textEdit: {
                      range: inputRange,
                      newText: candidate.text,
                    }
                  };
                }));
                completionList.isIncomplete = false;
              }
              resolve(completionList);
            })
            .catch((e) => {
              console.log(`Error getting Context: ${e}`);
              reject(e);
            });
          })
          .catch((e) => {
            console.log(`Error getting the status of the completion source: ${e}`);
            reject(e);
          });
        });
      }
    }, [], userConfig.priority, [])
  );

  // Schema List
  listManager.registerList(new SchemaList(workspace.nvim, rimeCLI));
}
