import { Marker } from './marker';
import { DataFile, IHdu } from '../../data-files/models/data-file';

export type ViewerType = 'image' | 'table';

export interface Viewer {
  id: string;
  type: ViewerType;
  fileId: string;
  hduId: string;
  headerId: string;
  keepOpen: boolean;
  viewportSize: {width: number, height: number};
}

export interface ImageViewer extends Viewer{
  type: 'image';
  normalizedImageDataId: string;
  rawImageDataId: string;
  viewportTransformId: string;
  imageTransformId: string;

  customMarkerPanelStateId: string;
  plottingPanelStateId: string;
  sonificationPanelStateId: string;
  photometryPanelStateId: string;

  panEnabled: boolean;
  zoomEnabled: boolean;
}

export interface TableViewer extends Viewer {
  type: 'table';
}