import * as path from 'path';
import { exec } from 'child_process';
import { Traits } from './config';
import { default as binding, RimeContext, RimeSchema } from './binding';

export class RimeCLI {
  private isEnabled: boolean = true;
  private readonly traits: Traits;
  private sessionId: BigInt;
  private schemaList: RimeSchema[];
  private schemaId: string;

  constructor(traits: Traits) {
    this.traits = traits;
    try {
      binding.init(traits);
    } catch (e) {
      exec('npm rebuild', { cwd: path.resolve(__dirname, '..') });
      binding.init(traits);
    }
    this.sessionId = binding.createSession();
  }

  private destroy() {
    binding.destroySession(this.sessionId);
  }

  public async setCompletionStatus(status: boolean): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      try {
        this.isEnabled = status;
        resolve(this.isEnabled);
      } catch (e) {
        reject(e);
      }
    });
  }

  public async toggleCompletionStatus(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      try {
        this.isEnabled = !this.isEnabled;
        resolve(this.isEnabled);
      } catch (e) {
        reject(e);
      }
    });
  }

  public getCompletionStatus(): boolean {
    return this.isEnabled;
  }

  public async getContext(input: string): Promise<RimeContext> {
    return new Promise<RimeContext>((resolve, reject) => {
      try {
        for (const singleChar of input) {
          binding.processKey(this.sessionId, singleChar.charCodeAt(0), 0);
        }
        let context = binding.getContext(this.sessionId);
        let result = context;
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
        binding.processKey(this.sessionId, '；'.charCodeAt(0), 0);
      }
    });
  }

  public async getSchemaList(): Promise<RimeSchema[]> {
    return new Promise<RimeSchema[]>((resolve, reject) => {
      try {
        if (this.schemaList === undefined) this.schemaList = binding.getSchemaList();
        resolve(this.schemaList);
      } catch (e) {
        reject(e);
      }
    });
  }

  public async getSchema(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      try {
        if (this.schemaId === undefined) this.schemaId = binding.getCurrentSchema(this.sessionId);
        resolve(this.schemaId);
      } catch (e) {
        reject(e);
      }
    });
  }

  public async setSchema(schemaId: string): Promise<void> {
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
