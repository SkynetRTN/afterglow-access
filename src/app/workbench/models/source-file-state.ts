import { PhotData } from './source-phot-data';
import { PhotometryData } from '../../jobs/models/photometry';
import { Region } from '../../data-files/models/region';

export interface SourcePanelState {
  id: string;
  markerSelectionRegion: Region | null;
}
