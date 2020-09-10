import { Transformation } from "./transformation";
import { ImageFile } from "../../data-files/models/data-file";
import { Normalization } from "./normalization";
import { PhotometryPanelState } from "./photometry-file-state";
import { PlottingPanelState } from "./plotter-file-state";
import { SonificationPanelState } from "./sonifier-file-state";
import { Marker } from "./marker";
import { CustomMarkerPanelState } from './marker-file-state';

export interface WorkbenchFileState {
  imageFileId: string;
  transformation: Transformation;
  normalization: Normalization;
  customMarkerPanelState: CustomMarkerPanelState;
  plottingPanelState: PlottingPanelState;
  sonificationPanelState: SonificationPanelState;
  photometryPanelState: PhotometryPanelState;
}