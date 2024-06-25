import { commands, ExtensionContext, listManager, CompletionContext, window, workspace, languages } from 'coc.nvim';
import { Position, CancellationToken, CompletionList, Range } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import SchemaList from './lists';
import { Rime } from './rime';
import { Config } from './config';

let rime: Rime;

export async function activate(context: ExtensionContext): Promise<void> {
  const userConfig = new Config(context);

  rime = new Rime(await userConfig.traits, userConfig.ui, userConfig.keymaps);
  rime.setCompletionStatus(userConfig.enabled);
  const statusBarItem = window.createStatusBarItem(0, { progress: false });
  rime.getSchema().then((schemaId) => {
    if (schemaId !== userConfig.schemaId && userConfig.schemaId !== '') {
      rime.setSchema(userConfig.schemaId);
      schemaId = userConfig.schemaId;
    }
    rime.getSchemaList().then((schemaList) => {
      statusBarItem.text =
        userConfig.shortcut +
        ' ' +
        schemaList.filter((schema) => {
          return schema.schema_id === schemaId;
        })[0].name;
    });
  });
  if (userConfig.enabled) {
    statusBarItem.show();
  }
  for (const keymap of userConfig.keymaps) {
    rime.registerKeymap(keymap.key, keymap.modifiers, keymap.lhs);
  }

  context.subscriptions.push(
    // Commands
    commands.registerCommand('rime.source.enable', async () => {
      rime.setCompletionStatus(true);
      statusBarItem.show();
    }),

    commands.registerCommand('rime.source.disable', async () => {
      rime.setCompletionStatus(false);
      statusBarItem.hide();
    }),

    commands.registerCommand('rime.source.toggle', async () => {
      rime.toggleCompletionStatus();
      if (rime.getCompletionStatus()) {
        statusBarItem.show();
      } else {
        statusBarItem.hide();
      }
    }),

    commands.registerCommand('rime.enable', async () => {
      rime.register();
    }),

    commands.registerCommand('rime.disable', async () => {
      rime.unregister();
    }),

    commands.registerCommand('rime.toggle', async () => {
      rime.toggleRegister();
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
                  .getContextWithAllCandidates(inputString)
                  .then((res) => {
                    if (
                      res !== null &&
                      'composition' in res &&
                      res.composition !== null &&
                      'preedit' in res.composition &&
                      res.composition.preedit !== null
                    ) {
                      window.showInformationMessage(res.composition.preedit);
                    }
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
                            documentation: candidate?.comment ?? '',
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
  listManager.registerList(new SchemaList(workspace.nvim, rime, statusBarItem, userConfig.shortcut));
}

export async function deactivate(): Promise<void> {
  rime.destroy();
}
