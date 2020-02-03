import { Transformation } from "./transformation";
import { ImageFile } from "../../data-files/models/data-file";
import { Normalization } from "./normalization";
import { PhotometryFileState } from "./photometry-file-state";
import { PlotterFileState } from "./plotter-file-state";
import { SonifierFileState } from "./sonifier-file-state";
import { Marker } from "./marker";

export interface ImageFileState {
  imageFileId: string;
  transformation: Transformation;
  normalization: Normalization;
  plotter: PlotterFileState;
  sonifier: SonifierFileState;
  photometry: PhotometryFileState;
  markers: Marker[];
}