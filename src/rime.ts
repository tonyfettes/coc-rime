import { window } from 'coc.nvim';
import { Traits, UI } from './config';
import { default as binding, RimeContext, RimeSchema, RimeCommit } from './binding';
import { default as modifiers } from './modifiers.json';
import { default as keys } from './keys.json';

export class Rime {
  private isEnabled: boolean = true;
  private readonly traits: Traits;
  private readonly ui: UI;
  private sessionId: BigInt;
  private schemaList: RimeSchema[];
  private schemaId: string;

  constructor(traits: Traits, ui: UI) {
    this.traits = traits;
    this.ui = ui;
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

  async processKey(key: string, modifiers_: string | string[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        if (typeof modifiers_ === 'string') {
          modifiers_ = [modifiers_];
        }
        let sum = 0;
        for (const modifier of modifiers_) {
          let mask = modifiers.indexOf(modifier);
          if (mask !== -1) {
            sum += 2 ** mask;
          } else {
            window.showErrorMessage(`${modifiers_} is not a legal modifier!`);
          }
        }
        if (key in keys) {
          let keycode = keys[key];
          binding.processKey(this.sessionId, keycode, sum);
        } else if (key.length === 1) {
          let keycode = key.charCodeAt(0);
          binding.processKey(this.sessionId, keycode, sum);
        } else {
          window.showErrorMessage(`${key} is not a legal key!`);
        }
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  async getContext(): Promise<RimeContext> {
    return new Promise<RimeContext>((resolve, reject) => {
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
          let commit: RimeCommit = binding.getCommit(this.sessionId);
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

  async getContextWithAllCandidates(input: string): Promise<RimeContext> {
    return new Promise<RimeContext>((resolve, reject) => {
      try {
        for (const singleChar of input) {
          this.processKey(singleChar, []);
        }
        let context = binding.getContext(this.sessionId);
        let result = context;
        if (input !== '')
          while (!context.menu.is_last_page) {
            this.processKey('=', []);
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

  async getSchemaList(): Promise<RimeSchema[]> {
    return new Promise<RimeSchema[]>((resolve, reject) => {
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
