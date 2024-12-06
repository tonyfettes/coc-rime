import { existsSync } from 'fs';
import { resolve } from 'path';
import { default as build, Options } from 'pkg-prebuilds';
import { execSync } from 'child_process';

let options: Options = { name: 'rime', napi_versions: [7] };
let binding;
const root = resolve(__dirname, '..');
try {
  binding = build(root, options);
} catch (e) {
  let cmd = 'npm rebuild';
  if (existsSync('/run/current-system/nixos-version')) {
    cmd = `nix-shell --pure --run "${cmd}"`;
  }
  execSync(cmd, { cwd: resolve(__dirname, '..') });
  binding = build(root, options);
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

export interface Composition {
  length: number;
  cursor_pos: number;
  sel_start: number;
  sel_end: number;
  preedit?: string;
}

export interface Candidate {
  text: string;
  comment?: string;
}

export interface Menu {
  page_size: number;
  page_no: number;
  is_last_page: boolean;
  highlighted_candidate_index: number;
  num_candidates: number;
  candidates?: Candidate[];
  select_keys?: string[];
}

export interface Context {
  composition: Composition;
  menu: Menu;
}

export interface Schema {
  schema_id: string;
  name: string;
}

export interface Commit {
  text: string;
}
