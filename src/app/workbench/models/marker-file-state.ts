import { Region } from '../../data-files/models/region';
import { Marker } from './marker';

export interface CustomMarkerPanelState {
  id: string;
  markerIds: string[];
  markerEntities: { [id: string]: Marker };
  markerSelectionRegion: Region | null;
}
