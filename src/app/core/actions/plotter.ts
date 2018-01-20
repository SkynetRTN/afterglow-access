import { Action } from '@ngrx/store';

import { ImageFile } from '../../data-files/models/data-file';
import { CentroidSettings } from '../models/centroid-settings';
import { PlotterSettings } from '../models/plotter-settings';
import { PlotterFileState } from '../models/plotter-file-state';

export const START_LINE = '[Plotter] Start Line';
export const UPDATE_LINE = '[Plotter] Update Line';

export const UPDATE_CENTROID_SETTINGS = '[Plotter] Update Centroid Settings';
export const UPDATE_PLOTTER_SETTINGS = '[Plotter] Update Plotter Settings';

/**
 * Plotter
 */

export class UpdateCentroidSettings implements Action {
  readonly type = UPDATE_CENTROID_SETTINGS

  constructor(public payload: {changes: Partial<CentroidSettings>}) {}
}

export class UpdatePlotterSettings implements Action {
  readonly type = UPDATE_PLOTTER_SETTINGS

  constructor(public payload: {changes: Partial<PlotterSettings>}) {}
}

export class StartLine implements Action {
  readonly type = START_LINE
  
  constructor(public payload: {file: ImageFile, point: {x: number, y: number}}) {}
}

export class UpdateLine implements Action {
  readonly type = UPDATE_LINE
  
  constructor(public payload: {file: ImageFile, point: {x: number, y: number}}) {}
}

export type Actions =
| UpdateCentroidSettings
| UpdatePlotterSettings
| StartLine
| UpdateLine;