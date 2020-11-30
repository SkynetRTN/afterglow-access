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
  sampling_rate?: number;
  start_tone?: number;
  num_tones?: number;
  volume?: number;
  noise_volume?: number;
  bkg_scale?: number;
  threshold?: number;
  min_connected?: number;
  hi_clip?: number;
  noise_lo?: number;
  noise_hi?: number;
  index_sounds?: boolean;
}

export interface SonificationJob extends JobBase {
  readonly type: JobType.Sonification;
  file_id: number;
  settings?: SonificationJobSettings;
}

export interface SonificationJobResult extends JobResultBase {
  readonly type: JobType.Sonification;
  sound_file_id: number;
}
