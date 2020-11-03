import { PhotometryPanelState } from "./photometry-file-state";
import { PlottingPanelState } from "./plotter-file-state";
import { SonificationPanelState } from "./sonifier-file-state";
import { CustomMarkerPanelState } from './marker-file-state';
import { HduType } from '../../data-files/models/data-file-type';

export interface WorkbenchFileState {
  id: string;
  plottingPanelStateId: string;
  customMarkerPanelStateId: string;
}

export interface IWorkbenchHduState {
  id: string;
  hduType: HduType;
}

export interface WorkbenchImageHduState extends IWorkbenchHduState {
  hduType: HduType.IMAGE;
  plottingPanelStateId: string;
  customMarkerPanelStateId: string;
  sonificationPanelState: SonificationPanelState;
  photometryPanelState: PhotometryPanelState;
}

export interface WorkbenchTableHduState extends IWorkbenchHduState {
  hduType: HduType.TABLE;
}

