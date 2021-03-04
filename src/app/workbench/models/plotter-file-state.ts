import { LineMarker } from "./marker";
import { PosType } from "./source";

export interface PlottingPanelState {
  id: string;
  measuring: boolean;
  lineMeasureStart: { primaryCoord: number; secondaryCoord: number; posType: PosType } | null;
  lineMeasureEnd: { primaryCoord: number; secondaryCoord: number; posType: PosType } | null;
}
