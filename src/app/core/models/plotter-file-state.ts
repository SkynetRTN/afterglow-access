import { LineMarker } from "./marker";
import { PosType } from "./source";

export interface PlottingPanelState {
  measuring: boolean,
  lineMeasureStart: { primaryCoord: number, secondaryCoord: number, posType: PosType }
  lineMeasureEnd: { primaryCoord: number, secondaryCoord: number, posType: PosType },
}