import { FieldCalibration } from "src/app/jobs/models/field-calibration";
import { PhotometryJobSettings } from "src/app/jobs/models/photometry";
import { SourceExtractionJobSettings } from "src/app/jobs/models/source-extraction";

export interface PhotometrySettings {
  gain: number;
  centroidRadius: number;
  aperCorrTol: number;
  constantAperCorr: boolean;
  adaptiveAperCorr: boolean;

  mode: 'adaptive' | 'constant';
  //constant
  a: number;
  aIn: number;
  aOut: number;
  elliptical: boolean;
  b: number;
  bOut: number;
  theta: number;
  thetaOut: number;

  //adaptive
  aKrFactor: number;
  aInKrFactor: number;
  aOutKrFactor: number;
  autoAper: boolean;
  fixAper: boolean;
  fixEll: boolean;
  fixRot: boolean;

  //calibration
  calibrationEnabled: boolean;
  zeroPoint: number;
  catalog: string;
  sourceInclusionPercentageEnabled: boolean;
  sourceInclusionPercentage: number;
  minSnrEnabled: boolean;
  minSnr: number;
  maxSnrEnabled: boolean;
  maxSnr: number;
  sourceMatchTol: number;

  //source extraction
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

export const defaults: PhotometrySettings = {
  gain: 1,
  centroidRadius: 5,
  mode: 'constant',
  a: 5,
  aIn: 10,
  aOut: 15,
  elliptical: false,
  b: 5,
  bOut: 15,
  theta: 0,
  thetaOut: 0,
  aKrFactor: 7,
  aInKrFactor: 10,
  aOutKrFactor: 15,
  autoAper: true,
  fixAper: false,
  fixEll: true,
  fixRot: true,
  constantAperCorr: false,
  adaptiveAperCorr: true,
  aperCorrTol: 0.0001,
  calibrationEnabled: false,
  zeroPoint: 20,
  catalog: 'APASS',
  sourceInclusionPercentageEnabled: true,
  sourceInclusionPercentage: 100,
  minSnrEnabled: true,
  minSnr: 10,
  maxSnrEnabled: false,
  maxSnr: 800,
  sourceMatchTol: 5,
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


export function toPhotometryJobSettings(settings: PhotometrySettings): PhotometryJobSettings {
  let result: PhotometryJobSettings;
  if (settings.mode == 'adaptive') {
    result = {
      mode: 'auto',
      a: settings.autoAper ? 0 : settings.aKrFactor,
      aIn: settings.aInKrFactor,
      aOut: settings.aOutKrFactor,
      b: null,
      bOut: null,
      centroidRadius: null,
      gain: null,
      theta: null,
      thetaOut: null,
      zeroPoint: null,
      apcorrTol: settings.adaptiveAperCorr ? settings.aperCorrTol : 0,
    };
  } else {
    result = {
      mode: 'aperture',
      a: settings.a,
      b: settings.b,
      aIn: settings.aIn,
      aOut: settings.aOut,
      bOut: settings.bOut,
      theta: settings.theta,
      thetaOut: settings.thetaOut,
      centroidRadius: null,
      gain: null,
      zeroPoint: null,
      apcorrTol: settings.constantAperCorr ? settings.aperCorrTol : 0,
    };
  }

  result.gain = settings.gain;
  result.centroidRadius = settings.centroidRadius;
  result.zeroPoint = settings.zeroPoint;

  return result;
}


export function toFieldCalibration(settings: PhotometrySettings): FieldCalibration {
  let result: FieldCalibration = {
    catalogs: [settings.catalog],
    sourceInclusionPercentage: settings.sourceInclusionPercentageEnabled ? settings.sourceInclusionPercentage : null,
    sourceMatchTol: settings.sourceMatchTol
  }

  if (settings.minSnrEnabled) {
    result.minSnr = settings.minSnr;
  }

  if (settings.maxSnrEnabled) {
    result.maxSnr = settings.maxSnr;
  }

  return result;
}

export function toSourceExtractionJobSettings(settings: PhotometrySettings): SourceExtractionJobSettings {
  return {
    threshold: settings.threshold,
    bkSize: settings.bkSize,
    bkFilterSize: settings.bkFilterSize,
    fwhm: settings.fwhm,
    minPixels: settings.minPixels,
    minFwhm: settings.minFwhm,
    maxFwhm: settings.maxFwhm,
    maxEllipticity: settings.maxEllipticity,
    deblend: settings.deblend,
    deblendLevels: settings.deblendLevels,
    deblendContrast: settings.deblendContrast,
    centroid: settings.centroid,
    clean: settings.clean,
    satLevel: settings.satLevel,
    discardSaturated: settings.discardSaturated
  }
}