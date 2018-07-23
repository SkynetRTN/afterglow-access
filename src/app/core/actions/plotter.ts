import { Action } from '@ngrx/store';

import { ImageFile } from '../../data-files/models/data-file';
import { CentroidSettings } from '../models/centroid-settings';
import { PlotterSettings } from '../models/plotter-settings';
import { PlotterFileState } from '../models/plotter-file-state';
import { PosType } from '../models/source';

export const START_LINE = '[Plotter] Start Line';
export const UPDATE_LINE = '[Plotter] Update Line';
export const UPDATE_PLOTTER_FILE_STATE = '[Plotter] Update Plotter File State';


/**
 * Plotter
 */



export class UpdatePlotterFileState implements Action {
  readonly type = UPDATE_PLOTTER_FILE_STATE

  constructor(public payload: { file: ImageFile, changes: Partial<PlotterFileState> }) { }
}

export class StartLine implements Action {
  readonly type = START_LINE

  constructor(public payload: { file: ImageFile, point: { primaryCoord: number, secondaryCoord: number, posType: PosType } }) { }
}

export class UpdateLine implements Action {
  readonly type = UPDATE_LINE

  constructor(public payload: { file: ImageFile, point: { primaryCoord: number, secondaryCoord: number, posType: PosType } }) { }
}

export type Actions =
  | UpdatePlotterFileState
  | StartLine
  | UpdateLine;