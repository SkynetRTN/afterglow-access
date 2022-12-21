import { PhotometryPanelState } from './photometry-file-state';
import { PlottingPanelState } from './plotter-file-state';
import { SonificationPanelState } from './sonifier-file-state';
import { CustomMarkerPanelState } from './marker-file-state';
import { HduType } from '../../data-files/models/data-file-type';

export enum WorkbenchStateType {
  FILE = 'file',
  IMAGE_HDU = 'image',
  TABLE_HDU = 'table',
}
export interface IWorkbenchState {
  id: string;
  type: WorkbenchStateType;
}

export interface WorkbenchFileState extends IWorkbenchState {
  type: WorkbenchStateType.FILE;
  plottingPanelStateId: string;
  customMarkerPanelStateId: string;
}

export interface WorkbenchImageHduState extends IWorkbenchState {
  type: WorkbenchStateType.IMAGE_HDU;
  plottingPanelStateId: string;
  customMarkerPanelStateId: string;
  sonificationPanelStateId: string;
  photometryPanelStateId: string;
  sourcePanelStateId: string;
  wcsCalibrationPanelStateId: string;
}

export interface WorkbenchTableHduState extends IWorkbenchState {
  type: WorkbenchStateType.TABLE_HDU;
}
