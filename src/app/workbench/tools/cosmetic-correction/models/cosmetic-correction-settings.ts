export interface CosmeticCorrectionSettings {
  mCol: number;
  nuCol: number;
  mPixel: number;
  nuPixel: number;
  mCorrCol: number;
  mCorrPixel: number;
  groupByInstrument: boolean;
  groupByFilter: boolean;
  groupByExpLength: boolean;
  maxGroupLen: number;
  maxGroupSpanHours: number;
  minGroupSepHours: number;
}

export const defaults: CosmeticCorrectionSettings = {
  mCol: 10,
  nuCol: 0,
  mPixel: 2,
  nuPixel: 2,
  mCorrCol: 2,
  mCorrPixel: 1,
  groupByInstrument: true,
  groupByFilter: true,
  groupByExpLength: false,
  maxGroupLen: 0,
  maxGroupSpanHours: 16,
  minGroupSepHours: 12
}