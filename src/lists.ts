import {BasicList, ListAction, ListContext, ListItem, Neovim, window} from 'coc.nvim'
import {RimeSchema, RimeCLI} from './rime'

export default class SchemaList extends BasicList {
  public readonly name = 'rime_schema';
  public readonly description = 'Schema list of Rime';
  public readonly defaultAction = 'open';
  public schemaList: RimeSchema[] = [];
  public actions: ListAction[] = [];

  private rimeCLI: RimeCLI;

  constructor(nvim: Neovim, rimeCLI: RimeCLI) {
    super(nvim);
    this.rimeCLI = rimeCLI;
    this.addAction('open', (item: ListItem) => {
      if (this.rimeCLI.getCompletionStatus()) {
        this.rimeCLI.setSchema(item.data.schemaId)
        .then((_) => {})
        .catch((e) => {
          console.log(`Error setting the schema: ${e}`);
          window.showMessage(`Set schema ${item.data.label} failed.`);
        });
        this.rimeCLI.getSchema()
        .then((schemaId) => {
          window.showMessage(`Changed to schema ${schemaId}.`);
        })
        .catch((e) => {
          console.log(`Error get current schema: ${e}`);
          window.showMessage(`Get current schema failed.`);
        });
      } else {
        console.log(`rime-cli disabled`);
        window.showMessage(`rime-cli disabled`);
      }
    })
  }

  public async loadItems(_context: ListContext): Promise<ListItem[] | null> {
    return new Promise<ListItem[] | null>((resolve, _) => {
      if (this.rimeCLI.getCompletionStatus()) {
        this.rimeCLI.getSchemaList()
        .then((res) => {
          let listItems: ListItem[] = res.map(schema => {
            return {
              label: schema.name + ': ' + schema.schemaId,
              filterText: schema.name + schema.schemaId,
              data: schema,
            }
          });
          resolve(listItems)
        });
      } else {
        resolve(null);
      }
    });
  }
}
