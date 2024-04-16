import { commands, ExtensionContext, listManager, CompletionContext, window, workspace, languages } from 'coc.nvim';
import { Position, CancellationToken, CompletionList, Range } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import SchemaList from './lists';
import { RimeCLI } from './rime';
import { Config } from './config';

export async function activate(context: ExtensionContext): Promise<void> {
  const userConfig = new Config(context);
  let binaryPath = await userConfig.binaryPath;
  let traits = await userConfig.traits;
  if (binaryPath === '') {
    window.showInformationMessage(`'rime.binaryPath' cannot be found. Read README.md to know how to build it.`);
    return;
  }

  const rimeCLI: RimeCLI = new RimeCLI(binaryPath, [traits.shared_data_dir, traits.user_data_dir, traits.log_dir]);
  rimeCLI.setCompletionStatus(userConfig.enabled);
  rimeCLI.getSchema().then((schemaId) => {
    if (schemaId !== userConfig.schemaId && userConfig.schemaId !== '') rimeCLI.setSchema(userConfig.schemaId);
  });
  const statusBarItem = window.createStatusBarItem(0, { progress: false });
  statusBarItem.text = userConfig.shortcut;
  if (userConfig.enabled) {
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
      if (rimeCLI.getCompletionStatus()) {
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
          _context: CompletionContext
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
            if (offset != 0 && rimeCLI.getCompletionStatus()) {
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
                while (/[!-@\[-~]/.test(singleChar) && offset != 0) {
                  inputString = singleChar + inputString;
                  offset -= 1;
                  singleChar = getPrevSingleChar(offset);
                }
                // Special treat for camelCase naming
                if (/[A-Z]/.test(singleChar)) {
                  inputString = '';
                }
                inputRange.start = document.positionAt(offset);
                rimeCLI
                  .getContext(inputString)
                  .then((res) => {
                    if (
                      res != null &&
                      'menu' in res &&
                      res.menu != null &&
                      'candidates' in res.menu &&
                      res.menu.candidates != null
                    ) {
                      resolve({
                        items: res.menu.candidates.map((candidate) => {
                          return {
                            label: candidate.text,
                            sortText: String.fromCharCode(candidate.label),
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
      []
    )
  );

  // Schema List
  listManager.registerList(new SchemaList(workspace.nvim, rimeCLI));
}
