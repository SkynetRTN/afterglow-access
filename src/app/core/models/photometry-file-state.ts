import { PhotData } from './source-phot-data';

export interface PhotometryPanelState {
  sourceExtractionJobId: string;
  sourcePhotometryData: { [sourceId: string]: PhotData };
}