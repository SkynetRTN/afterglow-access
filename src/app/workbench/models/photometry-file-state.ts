import { PhotData } from "./source-phot-data";
import { PhotometryData } from '../../jobs/models/photometry';

export interface PhotometryPanelState {
  id: string;
  sourceExtractionJobId: string;
  sourcePhotometryData: { [sourceId: string]: PhotometryData };
}
