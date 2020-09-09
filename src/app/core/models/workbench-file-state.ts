import { Transformation } from "./transformation";
import { ImageFile } from "../../data-files/models/data-file";
import { Normalization } from "./normalization";
import { PhotometryFileState } from "./photometry-file-state";
import { PlottingState } from "./plotter-file-state";
import { SonifierFileState } from "./sonifier-file-state";
import { Marker } from "./marker";
import { CustomMarkerState } from './marker-file-state';

export interface WorkbenchFileState {
  imageFileId: string;
  transformation: Transformation;
  normalization: Normalization;
  customMarkerState: CustomMarkerState;
  plottingState: PlottingState;
  sonificationState: SonifierFileState;
  photometryState: PhotometryFileState;
  
}