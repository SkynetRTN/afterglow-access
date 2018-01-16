export interface PlotterFileState {
  centroidClicks: boolean,
  interpolatePixels: boolean,
  measuring: boolean,
  lineMeasureStart: {x: number, y: number}
  lineMeasureEnd: {x: number, y: number}
}