import {BasicList, ListAction, ListContext, ListItem, Neovim, workspace} from 'coc.nvim'
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
      workspace.showMessage(`${item.label}, ${item.data.name}`);
    })
  }

  public async loadItems(_context: ListContext): Promise<ListItem[]> {
    return new Promise<ListItem[]>((resolve, _) => {
      this.rimeCLI.requestSchemaList().then((res) => {
        let listItems: ListItem[] = res.map(schema => {
          return {
            label: schema.name,
            filterText: schema.name + schema.schemaId,
          }
        });
        resolve(listItems)
      })
    });
  }
}
