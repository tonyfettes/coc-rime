import { commands, ExtensionContext, listManager, CompletionContext, window, workspace, languages } from 'coc.nvim';
import { Position, CancellationToken, CompletionList, Range } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import SchemaList from './lists';
import { Rime } from './rime';
import { Config } from './config';

export async function activate(context: ExtensionContext): Promise<void> {
  const userConfig = new Config(context);

  const rime: Rime = new Rime(await userConfig.traits);
  rime.setCompletionStatus(userConfig.enabled);
  rime.getSchema().then((schemaId) => {
    if (schemaId !== userConfig.schemaId && userConfig.schemaId !== '') rime.setSchema(userConfig.schemaId);
  });
  const statusBarItem = window.createStatusBarItem(0, { progress: false });
  statusBarItem.text = userConfig.shortcut;
  if (userConfig.enabled) {
    statusBarItem.show();
  }

  context.subscriptions.push(
    // Commands
    commands.registerCommand('rime.enable', async () => {
      rime.setCompletionStatus(true);
      statusBarItem.show();
    }),

    commands.registerCommand('rime.disable', async () => {
      rime.setCompletionStatus(false);
      statusBarItem.hide();
    }),

    commands.registerCommand('rime.toggle', async () => {
      rime.toggleCompletionStatus();
      if (rime.getCompletionStatus()) {
        statusBarItem.show();
      } else {
        statusBarItem.hide();
      }
    }),

    // Completion Source
    languages.registerCompletionItemProvider(
      'rime',
      userConfig.shortcut,
      null,
      {
        async provideCompletionItems(
          document: TextDocument,
          position: Position,
          _token: CancellationToken,
          _context: CompletionContext,
        ): Promise<CompletionList> {
          return new Promise<CompletionList>((resolve, reject) => {
            const emptyResponse: CompletionList = {
              items: [],
              isIncomplete: false,
            };
            const punctMap: Map<string, string[]> = new Map([
              [',', ['，']],
              ['.', ['。']],
              ['?', ['？']],
              ['!', ['！']],
              [':', ['：']],
              [';', ['；']],
              ['\\', ['、']],
              ['"', ['“', '”']],
              ["'", ['‘', '’']],
              ['<', ['《', '〈', '«', '‹', '˂']],
              ['>', ['》', '〉', '»', '›', '˃']],
              ['(', ['（']],
              [')', ['）']],
              ['[', ['「', '【', '〔', '［', '〚']],
              [']', ['」', '】', '〕', '］', '〛']],
              ['{', ['｛']],
              ['}', ['｝']],
              ['$', ['￥']],
              ['|', ['｜']],
              ['^', ['……']],
              ['~', ['～']],
              ['-', ['——']],
            ]);
            let offset = document.offsetAt(position);
            if (offset !== 0 && rime.getCompletionStatus()) {
              let inputString = '';
              let inputRange: Range = { start: position, end: position };
              const getPrevSingleChar = (offset: number): string => {
                return document.getText({
                  start: document.positionAt(offset - 1),
                  end: document.positionAt(offset),
                });
              };
              let singleChar = getPrevSingleChar(offset);
              if (punctMap.has(singleChar)) {
                let punctResponse = emptyResponse;
                for (const fullWidthPunct of punctMap.get(singleChar)) {
                  punctResponse.items.push({
                    label: fullWidthPunct,
                    sortText: singleChar,
                    filterText: singleChar,
                    textEdit: {
                      range: { start: document.positionAt(offset - 1), end: position },
                      newText: fullWidthPunct,
                    },
                  });
                }
                resolve(punctResponse);
              } else {
                while (/[!-@\[-~]/.test(singleChar) && offset !== 0) {
                  inputString = singleChar + inputString;
                  offset -= 1;
                  singleChar = getPrevSingleChar(offset);
                }
                // Special treat for camelCase naming
                if (/[A-Z]/.test(singleChar)) {
                  inputString = '';
                }
                inputRange.start = document.positionAt(offset);
                rime
                  .getContext(inputString)
                  .then((res) => {
                    if (
                      res !== null &&
                      'menu' in res &&
                      res.menu !== null &&
                      'candidates' in res.menu &&
                      res.menu.candidates !== null
                    ) {
                      resolve({
                        items: res.menu.candidates.map((candidate, order) => {
                          return {
                            label: candidate.text,
                            sortText: String.fromCharCode(order),
                            filterText: inputString,
                            textEdit: { range: inputRange, newText: candidate.text },
                          };
                        }),
                        isIncomplete: true,
                      });
                    } else {
                      resolve(emptyResponse);
                    }
                  })
                  .catch((e) => {
                    console.log(`Error getting Rime Context: ${e}`);
                    reject(e);
                  });
              }
            } else {
              // offset === 0
              resolve(emptyResponse);
            }
          });
        },
      },
      [],
      userConfig.priority,
      [],
    ),
  );

  // Schema List
  listManager.registerList(new SchemaList(workspace.nvim, rime));
}
