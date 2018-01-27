export interface PlotterFileState {
  fileId: string,
  measuring: boolean,
  lineMeasureStart: { x: number, y: number }
  lineMeasureEnd: { x: number, y: number }
}