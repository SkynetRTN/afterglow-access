import { Marker } from './marker';
import { DataFile, IHdu } from '../../data-files/models/data-file';

export interface Viewer {
  viewerId: string;
  data: {id: string, type: 'file' | 'hdu'};
  panEnabled: boolean;
  zoomEnabled: boolean;
  markers: Marker[];
  keepOpen: boolean;
  viewportSize: {width: number, height: number};
}