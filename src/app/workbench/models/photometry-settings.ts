export interface PhotometrySettings {
  gain: number;
  centroidRadius: number;
  zeroPoint: number;
  mode: "adaptive" | "constant";
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
}
