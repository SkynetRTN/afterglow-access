import { Region } from './region';

export enum SonifierRegionOption {
  VIEWPORT,
  CUSTOM
}

export interface SonifierFileState {
  regionHistoryInitialized: boolean;
  region: Region | null;
  regionHistory: Array<Region>;
  regionHistoryIndex: number | null;
  regionOption: SonifierRegionOption;
  viewportSync: boolean;
  duration: number;
  toneCount: number;
}