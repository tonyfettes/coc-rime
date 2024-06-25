import { Traits, UI } from './config';
import { default as binding, RimeContext, RimeSchema } from './binding';

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

  async getContextWithAllCandidates(input: string): Promise<RimeContext> {
    return new Promise<RimeContext>((resolve, reject) => {
      try {
        for (const singleChar of input) {
          binding.processKey(this.sessionId, singleChar.charCodeAt(0), 0);
        }
        let context = binding.getContext(this.sessionId);
        let result = context;
        if (input !== '')
          while (!context.menu.is_last_page) {
            binding.processKey(this.sessionId, '='.charCodeAt(0), 0);
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
