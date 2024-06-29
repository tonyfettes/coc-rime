import { workspace, NvimFloatOptions, Window, window } from 'coc.nvim';
import { UI, Keymap } from './config';
import { Traits } from './binding';
import { default as binding, Context, Schema, Commit } from './binding';
import { default as modifiers } from './modifiers.json';
import { default as keys } from './keys.json';

export class Rime {
  private isEnabled: boolean = true;
  private isRegisterd: boolean = false;
  private readonly ui: UI;
  private readonly keymaps: Keymap[];
  private sessionId: BigInt;
  private schemaList: Schema[];
  private schemaId: string;
  private win: Window | null = null;

  constructor(traits: Traits, ui: UI, keymaps: Keymap[]) {
    this.ui = ui;
    this.keymaps = keymaps;
    binding.init(traits);
    this.sessionId = binding.createSession();
  }

  destroy() {
    binding.destroySession(this.sessionId);
  }

  async setCompletionStatus(status: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      try {
        this.isEnabled = status;
        resolve(this.isEnabled);
      } catch (e) {
        reject(e);
      }
    });
  }

  async toggleCompletionStatus(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      try {
        this.isEnabled = !this.isEnabled;
        resolve(this.isEnabled);
      } catch (e) {
        reject(e);
      }
    });
  }

  getCompletionStatus(): boolean {
    return this.isEnabled;
  }

  async processKey(key: string, modifiers_: string[], lhs: string): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      try {
        let sum = 0;
        for (const modifier of modifiers_) {
          let mask = modifiers.indexOf(modifier);
          if (mask !== -1) {
            sum += 2 ** mask;
          } else {
            window.showErrorMessage(`${modifier} is not a legal modifier!`);
          }
        }
        let keycode = key.charCodeAt(0);
        if (key in keys) {
          keycode = keys[key];
        }
        try {
          binding.processKey(this.sessionId, keycode, sum);
        } catch (error) {
          // https://github.com/neoclide/coc.nvim/discussions/5069
          if (lhs === '<BS>') {
            lhs = '<C-H>';
          }
          let code: string = await workspace.nvim.request('nvim_replace_termcodes', [lhs, true, false, true]);
          await workspace.nvim.request('nvim_feedkeys', [code, 'n', false]);
        }
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  async getContext(): Promise<Context> {
    return new Promise<Context>((resolve, reject) => {
      try {
        resolve(binding.getContext(this.sessionId));
      } catch (e) {
        reject(e);
      }
    });
  }

  async getCommit(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      try {
        let text = '';
        if (binding.commitComposition(this.sessionId)) {
          let commit: Commit = binding.getCommit(this.sessionId);
          text = commit.text;
        }
        resolve(text);
      } catch (e) {
        reject(e);
      }
    });
  }

  async clearComposition(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        binding.clearComposition(this.sessionId);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  registerKeymap(key: string, modifiers: string[], lhs: string) {
    // https://github.com/rime/librime/blob/master/src/rime/key_table.cc
    if (key in keys) {
      workspace.registerKeymap(['i'], ['rime', ...modifiers, key].join('-'), async () => {
        this.drawUI(key, modifiers, lhs);
      });
      return;
    }
    window.showErrorMessage(`${key} is not a legal key!`);
  }

  async drawUI(key: string, modifiers_: string[], lhs: string): Promise<void> {
    await this.processKey(key, modifiers_, lhs);
    let context = await this.getContext();
    let preedit = context.composition.preedit ?? '';
    preedit =
      preedit.slice(0, context.composition.cursor_pos) + this.ui.cursor + preedit.slice(context.composition.cursor_pos);
    let candidates = context.menu.candidates ?? [];
    if (candidates.length === 0) {
      let text = await this.getCommit();
      if (text !== '') {
        // don't use nvim_feedkeys() due to InsertCharPre recursively
        let [r, c] = await workspace.nvim.request('nvim_win_get_cursor', [0]);
        await workspace.nvim.request('nvim_buf_set_text', [0, r - 1, c, r - 1, c, [text]]);
        await workspace.nvim.request('nvim_win_set_cursor', [0, [r, c + Buffer.from(text).length]]);
        if (this.win && (await this.win.valid)) {
          await this.win.close(false);
          this.win = null;
        }
        return;
      }
    }
    let candidates_ = '';
    let indices = this.ui.indices;
    for (const index in candidates) {
      let candidate = candidates[index];
      let text = indices[index] + ' ' + candidate.text;
      if (candidate.comment) {
        text = text + ' ' + candidate.comment;
      }
      if (context.menu.highlighted_candidate_index + '' === index) {
        text = this.ui.left_sep + text;
      } else if (context.menu.highlighted_candidate_index + 1 + '' === index) {
        text = this.ui.right_sep + text;
      } else {
        text = ' ' + text;
      }
      candidates_ = candidates_ + text;
    }
    if (context.menu.page_size === context.menu.highlighted_candidate_index + 1) {
      candidates_ = candidates_ + this.ui.right_sep;
    } else {
      candidates_ = candidates_ + ' ';
    }
    let col = 0;
    let left = this.ui.left;
    if (context.menu.page_no !== 0) {
      let num = await workspace.nvim.request('nvim_strwidth', [left]);
      candidates_ = left + candidates_;
      preedit = ' '.repeat(num) + preedit;
      col = col - num;
    }
    if (!context.menu.is_last_page && candidates.length) {
      candidates_ = candidates_ + this.ui.right;
    }
    let lines = [preedit, candidates_];
    let width = 0;
    for (const line of lines) {
      width = Math.max(await workspace.nvim.request('nvim_strwidth', [line]), width);
    }
    let config: NvimFloatOptions = {
      relative: 'cursor',
      height: 2,
      // https://github.com/neoclide/coc.nvim/discussions/5053
      // @ts-ignore
      style: 'minimal',
      width: width,
      row: 1,
      col: col,
    };
    if (this.win === null) {
      let buffer = await workspace.nvim.createNewBuffer(false, true);
      buffer.setLines(lines);
      this.win = await workspace.nvim.openFloatWindow(buffer, false, config);
    } else {
      (await this.win.buffer).setLines(lines);
      await this.win.setConfig(config);
    }
  }

  register(): Promise<void> {
    workspace.registerAutocmd({
      event: 'InsertCharPre',
      pattern: '<buffer>',
      arglist: ['v:char', 'execute("let v:char = \'\'")'],
      callback: async (character, _) => {
        this.drawUI(character, [], '');
      },
    });

    workspace.registerAutocmd({
      event: ['InsertLeave', 'WinLeave'],
      callback: async () => {
        this.clearComposition();
        if (this.win && (await this.win.valid)) {
          await this.win.close(false);
          this.win = null;
        }
      },
    });

    workspace.nvim.request('nvim_buf_set_keymap', [0, 'i', '<Space>', '<Space>', { noremap: true, nowait: true }]);
    for (const number of Array.from(Array(0x7b - 0x21).keys())) {
      let char = String.fromCharCode(0x21 + number);
      workspace.nvim.request('nvim_buf_set_keymap', [0, 'i', char, char, { noremap: true, nowait: true }]);
    }
    workspace.nvim.request('nvim_buf_set_keymap', [0, 'i', '<Bar>', '<Bar>', { noremap: true, nowait: true }]);
    for (const number of Array.from(Array(0x7e - 0x7d).keys())) {
      let char = String.fromCharCode(0x7d + number);
      workspace.nvim.request('nvim_buf_set_keymap', [0, 'i', char, char, { noremap: true, nowait: true }]);
    }

    for (const keymap of this.keymaps) {
      workspace.nvim.request('nvim_buf_set_keymap', [
        0,
        'i',
        keymap.lhs,
        ['<Plug>(coc-rime', ...keymap.modifiers, keymap.key + ')'].join('-'),
        { nowait: true },
      ]);
    }

    this.isRegisterd = true;
    return;
  }

  unregister(): Promise<void> {
    // https://github.com/neoclide/coc.nvim/discussions/5054
    workspace.nvim.command('au! coc_dynamic_autocmd InsertCharPre');
    workspace.nvim.command('au! coc_dynamic_autocmd InsertLeave');
    workspace.nvim.command('au! coc_dynamic_autocmd WinLeave');
    workspace.nvim.command('imapclear <buffer>');
    this.isRegisterd = false;
    return;
  }

  toggleRegister(): Promise<void> {
    if (this.isRegisterd) {
      this.unregister();
    } else {
      this.register();
    }
    return;
  }

  async getContextWithAllCandidates(input: string): Promise<Context> {
    return new Promise<Context>((resolve, reject) => {
      try {
        for (const singleChar of input) {
          this.processKey(singleChar, [], '');
        }
        let context = binding.getContext(this.sessionId);
        let result = context;
        if (input !== '')
          while (!context.menu.is_last_page) {
            this.processKey('=', [], '');
            context = binding.getContext(this.sessionId);
            result.menu.num_candidates += context.menu.num_candidates;
            if (result.menu?.select_keys && context.menu?.select_keys) {
              result.menu.select_keys.push(...context.menu.select_keys);
            }
            if (result.menu?.candidates && context.menu?.candidates) {
              result.menu.candidates.push(...context.menu.candidates);
            }
          }
        resolve(result);
      } catch (e) {
        reject(e);
      } finally {
        binding.clearComposition(this.sessionId);
      }
    });
  }

  async getSchemaList(): Promise<Schema[]> {
    return new Promise<Schema[]>((resolve, reject) => {
      try {
        if (this.schemaList === undefined) this.schemaList = binding.getSchemaList();
        resolve(this.schemaList);
      } catch (e) {
        reject(e);
      }
    });
  }

  async getSchema(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      try {
        if (this.schemaId === undefined) this.schemaId = binding.getCurrentSchema(this.sessionId);
        resolve(this.schemaId);
      } catch (e) {
        reject(e);
      }
    });
  }

  async setSchema(schemaId: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        resolve(binding.selectSchema(this.sessionId, schemaId));
        this.schemaId = schemaId;
      } catch (e) {
        reject(e);
      }
    });
  }
}
