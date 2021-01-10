export interface PhotometrySettings {
  gain: number;
  centroidRadius: number;
  zeroPoint: number;
  mode: "adaptive" | "constant";
  //constant
  a: number;
  b: number;
  theta: number;
  aIn: number;
  aOut: number;
  bOut: number;
  thetaOut: number;

  //adaptive
  aKrFactor: number;
  aInKrFactor: number;
  aOutKrFactor: number;
}
