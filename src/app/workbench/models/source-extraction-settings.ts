export interface SourceExtractionSettings {
  threshold: number;
  bkSize: number;
  bkFilterSize: number;
  fwhm: number;
  minPixels: number;
  minFwhm: number;
  maxFwhm: number;
  maxEllipticity: number;
  deblend: boolean;
  deblendLevels: number;
  deblendContrast: number;
  clean: number;
  centroid: boolean;
  limit?: number;
  satLevel: number;
  discardSaturated: boolean;
}

export const defaults: SourceExtractionSettings = {
  threshold: 3,
  bkSize: 1 / 64,
  bkFilterSize: 3,
  fwhm: 0,
  minPixels: 3,
  minFwhm: 0.8,
  maxFwhm: 10,
  maxEllipticity: 2,
  deblend: false,
  deblendLevels: 32,
  deblendContrast: 0.005,
  centroid: true,
  clean: 1,
  satLevel: 63000,
  discardSaturated: true

};
