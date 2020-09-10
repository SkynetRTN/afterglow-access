import { Region } from './region';
import { Marker } from './marker';


export interface CustomMarkerPanelState {
  ids: string[];
  entities: { [id: string]: Marker };
}