import { existsSync } from 'fs';
import { resolve } from 'path';
import { default as build } from 'node-gyp-build';
import { execSync } from 'child_process';

let binding;
const root = resolve(__dirname, '..');
try {
  binding = build(root);
} catch (e) {
  let cmd = 'npm rebuild';
  if (existsSync('/run/current-system/nixos-version')) {
    cmd = `nix-shell --pure --run "${cmd}"`;
  }
  execSync(cmd, { cwd: resolve(__dirname, '..') });
  binding = build(root);
}
export default binding;

export interface Traits {
  shared_data_dir?: string | null;
  user_data_dir?: string | null;
  log_dir?: string | null;
  distribution_name?: string | null;
  distribution_code_name: string;
  distribution_version: string;
  app_name?: string | null;
  min_log_level?: 0 | 1 | 2 | 3;
}

export interface RimeComposition {
  length: number;
  cursor_pos: number;
  sel_start: number;
  sel_end: number;
  preedit?: string;
}

export interface RimeCandidate {
  text: string;
  comment?: string;
}

export interface RimeMenu {
  page_size: number;
  page_no: number;
  is_last_page: boolean;
  highlighted_candidate_index: number;
  num_candidates: number;
  candidates?: RimeCandidate[];
  select_keys?: string[];
}

export interface RimeContext {
  composition: RimeComposition;
  menu: RimeMenu;
}

export interface RimeSchema {
  schema_id: string;
  name: string;
}

export interface RimeCommit {
  text: string;
}
