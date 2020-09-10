import { Region } from './region';

export enum SonifierRegionMode {
  VIEWPORT,
  CUSTOM
}

export interface SonificationPanelState {
  sonificationUri: string,
  regionHistoryInitialized: boolean;
  regionHistory: Array<Region>;
  regionHistoryIndex: number | null;
  regionMode: SonifierRegionMode;
  viewportSync: boolean;
  duration: number;
  toneCount: number;
  progressLine: { x1: number, y1: number, x2: number, y2: number };
}