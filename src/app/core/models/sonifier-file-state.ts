import { Region } from './region';

export enum SonifierRegionMode {
  VIEWPORT,
  CUSTOM
}

export interface SonifierFileState {
  sonificationUri: string,
  regionHistoryInitialized: boolean;
  region: Region | null;
  regionHistory: Array<Region>;
  regionHistoryIndex: number | null;
  regionMode: SonifierRegionMode;
  viewportSync: boolean;
  duration: number;
  toneCount: number;
}