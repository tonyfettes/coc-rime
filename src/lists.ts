import { BasicList, ListAction, ListContext, ListItem, Neovim, window } from 'coc.nvim';
import { RimeSchema, Rime } from './rime';

export default class SchemaList extends BasicList {
  public readonly name = 'rime_schema';
  public readonly description = 'Schema list of Rime';
  public readonly defaultAction = 'open';
  public schemaList: RimeSchema[] = [];
  public actions: ListAction[] = [];

  private rime: Rime;

  constructor(nvim: Neovim, rime: Rime) {
    super(nvim);
    this.rime = rime;
    this.addAction('open', (item: ListItem) => {
      this.rime
        .setSchema(item.data.schema_id)
        .then((_) => {})
        .catch((e) => {
          console.log(`Error setting the schema: ${e}`);
          window.showMessage(`Set schema ${item.data.label} failed.`);
        });
      this.rime
        .getSchema()
        .then((schema_id) => {
          window.showMessage(`Changed to schema ${schema_id}.`);
        })
        .catch((e) => {
          console.log(`Error get current schema: ${e}`);
          window.showMessage(`Get current schema failed.`);
        });
    });
  }

  public async loadItems(_context: ListContext): Promise<ListItem[] | null> {
    return new Promise<ListItem[] | null>((resolve, _) => {
      this.rime.getSchemaList().then((res) => {
        let listItems: ListItem[] = res.map((schema) => {
          return {
            label: schema.name + ': ' + schema.schema_id,
            filterText: schema.name + schema.schema_id,
            data: schema,
          };
        });
        resolve(listItems);
      });
    });
  }
}
