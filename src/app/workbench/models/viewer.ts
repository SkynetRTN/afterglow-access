import { Marker } from "./marker";
import { DataFile, IHdu } from "../../data-files/models/data-file";

export type ViewerType = "image" | "table";

export interface Viewer {
  id: string;
  type: ViewerType;
  fileId: string;
  hduId: string;
  keepOpen: boolean;
  viewportSize: { width: number; height: number };
}

export interface ImageViewer extends Viewer {
  type: "image";
  panEnabled: boolean;
  zoomEnabled: boolean;
}

export interface TableViewer extends Viewer {
  type: "table";
}
