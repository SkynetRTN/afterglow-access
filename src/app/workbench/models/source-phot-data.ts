export interface PhotData {
  id: string;
  sourceId: string;
  fileId: string;
  time: string;
  filter: string;
  telescope: string;
  expLength: number;
  raHours: number;
  decDegs: number;
  x: number;
  y: number;
  mag: number;
  magError: number;
  flux: number;
  fluxError: number;
}
