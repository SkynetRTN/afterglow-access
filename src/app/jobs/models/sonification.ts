import { JobBase, JobResultBase } from "./job-base";
import { JobType } from "./job-types";

export interface SonificationJobSettings {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  coord?: "rect" | "radial" | "circ";
  barycenter?: boolean;
  tempo?: number;
  samplingRate?: number;
  startTone?: number;
  numTones?: number;
  volume?: number;
  noiseVolume?: number;
  bkgScale?: number;
  threshold?: number;
  minConnected?: number;
  hiClip?: number;
  noiseLo?: number;
  noiseHi?: number;
  indexSounds?: boolean;
}

export interface SonificationJobResult extends JobResultBase {
  readonly type: JobType.Sonification;
  soundFileId: string;
}

export interface SonificationJob extends JobBase {
  readonly type: JobType.Sonification;
  fileId: string;
  settings?: SonificationJobSettings;
  result: SonificationJobResult | null;
}


