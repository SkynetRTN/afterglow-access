import { PhotData } from './source-phot-data';

export interface PhotometryPanelState {
  id: string;
  sourceExtractionJobId: string;
  sourcePhotometryData: { [sourceId: string]: PhotData };
}