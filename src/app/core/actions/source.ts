import { Action } from '@ngrx/store';
import { Source } from '../models/source';

export const UPDATE_SOURCE = '[Sources] Update Source';
export const ADD_SOURCES = '[Sources] Add Source';
export const REMOVE_SOURCES = '[Sources] Remove Source';

export const SELECT_SOURCES = '[Sources] Select Sources';
export const DESELECT_SOURCES = '[Sources] Deselect Sources';
export const SET_SOURCE_SELECTION = '[Sources] Set Source Selection';


export class UpdateSource implements Action {
  readonly type = UPDATE_SOURCE

  constructor(public payload: { sourceId: string, changes: Partial<Source> }) { }
}

export class AddSources implements Action {
  readonly type = ADD_SOURCES

  constructor(public payload: { sources: Source[] }) { }
}

export class RemoveSources implements Action {
  readonly type = REMOVE_SOURCES

  constructor(public payload: { sources: Source[] }) { }
}

export class SelectSources implements Action {
  readonly type = SELECT_SOURCES

  constructor(public payload: { sources: Source[] }) { }
}

export class DeselectSources implements Action {
  readonly type = DESELECT_SOURCES

  constructor(public payload: { sources: Source[] }) { }
}

export class SetSourceSelection implements Action {
  readonly type = SET_SOURCE_SELECTION

  constructor(public payload: { sources: Source[] }) { }
}

export type Actions =
  | UpdateSource
  | AddSources
  | RemoveSources
  | SelectSources
  | DeselectSources
  | SetSourceSelection