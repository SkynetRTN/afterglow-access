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

  markerColor: string;
  selectedMarkerColor: string;
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
  markerColor: "#002175",
  selectedMarkerColor: "#ff8b00"
};

