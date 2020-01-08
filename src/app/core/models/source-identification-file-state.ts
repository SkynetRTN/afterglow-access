import { Region } from './region';
import { Source } from './source';

export enum SourceIdentificationRegionOption {
  ENTIRE_IMAGE,
  VIEWPORT,
  SONIFIER_REGION,
}

export interface SourceIdentificationFileState {
  sourceExtractionJobId: string;
  regionOption: SourceIdentificationRegionOption,
  region: Region,
  selectedSourceIds: Array<string>
}