import { Action } from '@ngrx/store';

export const INITIALIZE = '[Core] Initialize';

export class Initialize implements Action {
  readonly type = INITIALIZE;
}

export type Actions =
  | Initialize