import { Region } from './region';
import { Marker } from './marker';


export interface MarkerFileState {
  ids: string[];
  entities: { [id: string]: Marker };
}