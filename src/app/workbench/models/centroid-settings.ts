export enum CentroidNoiseModel {
  POISSON,
  CONSTANT,
}

export interface CentroidSettings {
  useDiskCentroiding: boolean;
  centeringBoxWidth: number;
  minSignalToNoise: number;
  maxIterations: number;
  maxCenterShift: number;
  noiseModel: CentroidNoiseModel;
  gain: number;
  diskSearchBoxWidth: number;
}

export let defaults: CentroidSettings = {
  useDiskCentroiding: false,
  centeringBoxWidth: 5,
  minSignalToNoise: 1.0,
  maxIterations: 10,
  maxCenterShift: 0.2,
  noiseModel: CentroidNoiseModel.POISSON,
  gain: 10.0,
  diskSearchBoxWidth: 200,
}
