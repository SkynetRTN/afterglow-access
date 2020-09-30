import { Marker } from './marker';
import { BlendMode } from './blend-mode';

export interface Viewer {
  viewerId: string;
  fileId: string;
  hduIndex: number;
  panEnabled: boolean;
  zoomEnabled: boolean;
  markers: Marker[];
  keepOpen: boolean;
}