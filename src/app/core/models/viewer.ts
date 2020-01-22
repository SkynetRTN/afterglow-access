import { Marker } from './marker';

export interface Viewer {
  viewerId: string;
  fileId: string;
  panEnabled: boolean;
  zoomEnabled: boolean;
  markers: Marker[];
  hidden: boolean;
}