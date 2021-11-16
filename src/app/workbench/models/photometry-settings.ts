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
  calibrationMode: 'fixed' | 'catalog';
  zeroPoint: number;
  catalog: string;
  sourceInclusionPercentageEnabled: boolean;
  sourceInclusionPercentage: number;
  minSnrEnabled: boolean;
  minSnr: number;
  maxSnrEnable: boolean;
  maxSnr: number;
  sourceMatchTolerance: number;
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
  calibrationMode: 'fixed',
  zeroPoint: 20,
  catalog: 'APASS',
  sourceInclusionPercentageEnabled: true,
  sourceInclusionPercentage: 100,
  minSnrEnabled: false,
  minSnr: null,
  maxSnrEnable: false,
  maxSnr: null,
  sourceMatchTolerance: 5
};
