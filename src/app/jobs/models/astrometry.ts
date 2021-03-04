export interface Astrometry {
  raHours: number | null;
  decDegs: number | null;
  pmSky: number | null;
  pmPosAngleSky: number | null;

  x: number | null;
  y: number | null;
  pmPixel: number | null;
  pmPosAnglePixel: number | null;
  pmEpoch: string | null;

  fwhmX: number | null;
  fwhmY: number | null;
  theta: number | null;
}
