export enum SourceExtractionRegionOption {
  ENTIRE_IMAGE,
  VIEWPORT,
  SONIFIER_REGION,
}

export interface SourceExtractionSettings {
  threshold: number;
  fwhm: number;
  deblend: boolean;
  limit?: number;
  region: SourceExtractionRegionOption;
}
