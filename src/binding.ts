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
