import { BasicList, ListAction, ListContext, ListItem, Neovim, window, StatusBarItem } from 'coc.nvim';
import { RimeSchema, Rime } from './rime';

export default class SchemaList extends BasicList {
  public readonly name = 'rime_schema';
  public readonly description = 'Schema list of Rime';
  public readonly defaultAction = 'open';
  public schemaList: RimeSchema[] = [];
  public actions: ListAction[] = [];

  private rime: Rime;

  constructor(nvim: Neovim, rime: Rime, statusBarItem: StatusBarItem, shortcut: string) {
    super(nvim);
    this.rime = rime;
    this.addAction('open', (item: ListItem) => {
      let schemaId: string;
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
          schemaId = schema_id;
          window.showMessage(`Changed to schema ${schema_id}.`);
        })
        .catch((e) => {
          console.log(`Error get current schema: ${e}`);
          window.showMessage(`Get current schema failed.`);
        });
      this.rime.get_schema_list().then((schema_list) => {
        if (schemaId !== undefined) {
          statusBarItem.text =
            shortcut +
            ' ' +
            schema_list.filter((schema) => {
              return schema.schema_id === schemaId;
            })[0].name;
        }
      });
    });
  }

  public async loadItems(_context: ListContext): Promise<ListItem[] | null> {
    return new Promise<ListItem[] | null>((resolve, _) => {
      this.rime.get_schema_list().then((res) => {
        const listItems: ListItem[] = res.map((schema) => {
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
