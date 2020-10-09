import { BasicList, ListAction, ListContext, ListItem, Neovim, workspace } from 'coc.nvim'
import {RimeSchema} from './rime'

export default class SchemaList extends BasicList {
  public readonly name = 'rime_schema';
  public readonly description = 'Schema list of Rime';
  public readonly defaultAction = 'open';
  public schemaList: RimeSchema[] = [];
  public actions: ListAction[] = [];

  constructor(nvim: Neovim, schemaList: RimeSchema[]) {
    super(nvim);
    this.addAction('open', (item: ListItem) => {
      workspace.showMessage(`${item.label}, ${item.data.name}`);
    });
  }

  public async loadItems(context: ListContext): Promise<ListItem[]> {
    return [
      {
        label: 'coc-rime list item 1',
        data: {name: 'list item 1'},
      },
      {
        label: 'coc-rime list item 2',
        data: {name: 'list item 2'},
      },
    ];
  }
}
