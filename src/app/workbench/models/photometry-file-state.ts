import { PhotData } from './source-phot-data';
import { PhotometryData } from '../../jobs/models/photometry';
import { Region } from '../../data-files/models/region';

export interface PhotometryPanelState {
  id: string;
  sourceExtractionJobId: string;
  sourcePhotometryData: { [sourceId: string]: PhotometryData };
  autoPhotIsValid: boolean;
  autoPhotJobId: string;
  autoCalIsValid: boolean;
  autoCalJobId: string;
}
