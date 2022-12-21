import { Marker } from './marker';
import { DataFile, IHdu } from '../../data-files/models/data-file';
import { TypeGuard } from '../../utils/guard-type.pipe';

export enum ViewerType {
  IMAGE,
  TABLE,
}

export interface IViewer {
  id: string;
  type: ViewerType;
  fileId: string;
  layerId: string;
  keepOpen: boolean;
  viewportSize: { width: number; height: number };
}

export interface ImageViewer extends IViewer {
  type: ViewerType.IMAGE;
  panEnabled: boolean;
  zoomEnabled: boolean;
}

export interface TableViewer extends IViewer {
  type: ViewerType.TABLE;
}

export type Viewer = ImageViewer | TableViewer;

export const isImageViewer: TypeGuard<Viewer, ImageViewer> = (viewer: Viewer): viewer is ImageViewer =>
  viewer.type === ViewerType.IMAGE;

export const isTableViewer: TypeGuard<Viewer, TableViewer> = (viewer: Viewer): viewer is TableViewer =>
  viewer.type === ViewerType.TABLE;
