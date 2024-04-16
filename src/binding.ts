import { resolve } from 'path';
import { default as build } from 'node-gyp-build';

export default build(resolve(__dirname, '..'));

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
