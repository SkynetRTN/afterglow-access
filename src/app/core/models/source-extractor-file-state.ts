import { Region } from './region';
import { Source } from './source';
import { PhotSettings } from './phot-settings';
import { SourceExtractionSettings } from './source-extraction-settings';

export enum SourceExtractorRegionOption {
  ENTIRE_IMAGE,
  VIEWPORT,
  SONIFIER_REGION,
}

export interface SourceExtractorFileState {
  regionOption: SourceExtractorRegionOption,
  region: Region,
  // sources: Array<Source>,
  // filteredSources: Array<Source>,
  selectedSourceIds: Array<string>,
  // filteredSources: Array<Source>,
  // photSettingsLookup: {[sourceId: string]: PhotSettings};
  // extractionSettingsLookup: {[sourceId: string]: SourceExtractionSettings};
}