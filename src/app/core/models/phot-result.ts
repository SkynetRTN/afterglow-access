export interface PhotResult {
  fileId: number;
  sourceId: number;
  raHours: number;
  decDegs: number;
  x: number;
  y: number;
  raHoursCen: number;
  decDegsCen: number;
  xCen: number;
  yCen: number;
  mag: number;
  magError: number;
  fwhmX: number;
  fwhmY: number;
  theta: number;
  time: Date;
  filter: string;
  telescope: string;
  expLength: number;
}