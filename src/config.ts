import { workspace, WorkspaceConfiguration } from 'coc.nvim';

export class Config {
  private cfg: WorkspaceConfiguration;

  constructor () {
    this.cfg = workspace.getConfiguration('rime');
  }
  get enabled() {
    return this.cfg.get<boolean>('enabled', true);
  }
  get priority() {
    return this.cfg.get<number>('priority', 0);
  }
  get schemaId() {
    return this.cfg.get<string>('schemaId', 'luna_pinyin');
  }
  get binaryPath() {
    return this.cfg.get<string>('binaryPath', '/usr/bin/rime-cli');
  }
}
