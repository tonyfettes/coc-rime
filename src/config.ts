import * as process from 'process';
import { realpath, mkdir, access, constants } from 'fs/promises';
import { resolve } from 'path';
import { workspace, WorkspaceConfiguration, ExtensionContext } from 'coc.nvim';
import untildify from 'untildify';
import { exec } from 'child_process';
import { promisify } from 'util';

let execAsync = promisify(exec);

async function get_dir(...dirs: string[]): Promise<string> {
  for (const dir of dirs) {
    try {
      return await realpath(untildify(dir));
    } catch (e) {}
  }
  return '';
}

export class Config {
  private cfg: WorkspaceConfiguration;
  private context: ExtensionContext;

  constructor(context: ExtensionContext) {
    this.cfg = workspace.getConfiguration('rime');
    this.context = context;
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
  get shortcut() {
    return this.cfg.get<string>('shortcut');
  }
  get binaryPath() {
    return new Promise<string>(async (res, reject) => {
      let binaryPath = this.cfg.get<string>('binaryPath');
      if (binaryPath === '') {
        binaryPath = await get_dir(resolve(this.context.extensionPath, 'build', 'Release', 'rime_cli'));
      }
      if (binaryPath === '') {
        await execAsync(`npm rebuild`, { cwd: this.context.extensionPath });
        binaryPath = await get_dir(resolve(this.context.extensionPath, 'build', 'Release', 'rime_cli'));
      }
      try {
        res(binaryPath);
      } catch (e) {
        reject(e);
      }
    });
  }
  get args() {
    return new Promise<string[]>(async (res, reject) => {
      let shared_data_dir = this.cfg.get<string>('sharedDataDir');
      let user_data_dir = this.cfg.get<string>('userDataDir');
      let log_dir = this.cfg.get<string>('logDir');
      if (log_dir === '') log_dir = this.context.storagePath;
      if (shared_data_dir === '')
        shared_data_dir = await get_dir(
          (process.env.PREFIX ?? '/usr') + '/share/rime-data',
          '/run/current-system/sw/share/rime-data',
          '/sdcard/rime-data'
        );

      if (user_data_dir === '')
        user_data_dir = await get_dir(
          '~/.config/ibus/rime',
          '~/.local/share/fcitx5/rime',
          '~/.config/fcitx/rime',
          '/sdcard/rime'
        );
      // if logDir doesn't exist:
      // In GNU/Linux, log will be disabled
      // In Android, an ::__fs::filesystem::filesystem_error will be threw
      try {
        await mkdir(log_dir);
      } catch (e) {}
      try {
        res([shared_data_dir, user_data_dir, log_dir]);
      } catch (e) {
        reject(e);
      }
    });
  }
}
