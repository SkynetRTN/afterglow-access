import { Region } from './region';
import { Source } from './source';

export enum SourceExtractorRegionOption {
  ENTIRE_IMAGE,
  VIEWPORT,
  SONIFIER_REGION,
}

export interface SourceExtractorFileState {
  sourceExtractionJobId: string;
  regionOption: SourceExtractorRegionOption,
  region: Region,
  selectedSourceIds: Array<string>
}