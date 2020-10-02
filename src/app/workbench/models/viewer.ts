import { Marker } from './marker';
import { BlendMode } from './blend-mode';

export interface Viewer {
  viewerId: string;
  hduId: string;
  panEnabled: boolean;
  zoomEnabled: boolean;
  markers: Marker[];
  keepOpen: boolean;
}