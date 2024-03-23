import * as fs from 'fs';
import { workspace, WorkspaceConfiguration } from 'coc.nvim';
import untildify from 'untildify';

function get_data_dir(...dirs: string[]): string {
  for (const dir of dirs) {
    let data_dir = untildify(dir);
    if (fs.existsSync(data_dir)) return data_dir;
  }
}

export class Config {
  private cfg: WorkspaceConfiguration;

  constructor() {
    this.cfg = workspace.getConfiguration('rime');
  }
  get enabled() {
    return this.cfg.get<boolean>('enabled');
  }
  get priority() {
    return this.cfg.get<number>('priority');
  }
  get schemaId() {
    return this.cfg.get<string>('schemaId');
  }
  get binaryPath() {
    return this.cfg.get<string>('binaryPath');
  }
  get args() {
    let shared_data_dir = this.cfg.get<string>('sharedDataDir');
    if (shared_data_dir === '')
      shared_data_dir = get_data_dir(
        '/sdcard/rime-data',
        '/run/current-system/sw/share/rime-data',
        (process.env.PREFIX ?? '/usr') + '/share/rime-data'
      );

    let user_data_dir = this.cfg.get<string>('userDataDir');
    if (user_data_dir === '')
      user_data_dir = get_data_dir(
        '~/.config/ibus/rime',
        '~/.local/share/fcitx5/rime',
        '~/.config/fcitx/rime',
        '/sdcard/rime'
      );
    let log_dir = this.cfg.get<string>('logDir');
    return [shared_data_dir, user_data_dir, log_dir];
  }
}
