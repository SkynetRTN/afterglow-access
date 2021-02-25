export interface Astrometry {
  raHours: number;
  decDegs: number;
  pmSky: number;
  pmPosAngleSky: number;

  x: number;
  y: number;
  pmPixel: number;
  pmPosAnglePixel: number;
  pmEpoch: string;

  fwhmX: number;
  fwhmY: number;
  theta: number;
}
