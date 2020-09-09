import { Region } from './region';
import { Marker } from './marker';


export interface CustomMarkerState {
  ids: string[];
  entities: { [id: string]: Marker };
}