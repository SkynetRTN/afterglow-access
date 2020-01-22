import { JobBase, JobResultBase } from "./job-base";
import { JobType } from "./job-types";
import { Astrometry } from "./astrometry";
import { SourceId } from "./source-id";
import { SourceMeta } from "./source-meta";

export interface Photometry {
  mag: number;
  mag_error: number;
  flux: number;
  flux_error: number;
}

export interface PhotometryJobSettings {
  mode?: 'aperture' | 'auto';
  a?: number;  // aperture radius/semi-major axis [pixels]
  b?: number; // (optional) semi-minor axis
  theta?: number; // (optional) position angle of semi-major axis
  a_in?: number; // (optional = a) inner annulus radius/semi-major axis
  a_out?: number; // outer annulus radius/semi-major axis
  b_out?: number; // (optional) outer annulus semi-minor axis
  theta_out?: number; // (optional) annulus position angle
  gain?: number; // (optional) default gain if not present in FITS headers
  centroid_radius?: number; // 0 = disable centroiding
}

export interface PhotometryJob extends JobBase {
  readonly type: JobType.Photometry;
  file_ids: number[];
  sources: Array<Astrometry & SourceId>;
  settings?: PhotometryJobSettings;
}

export interface PhotometryData extends SourceMeta, Astrometry, Photometry, SourceId {
  
}

export interface PhotometryJobResult extends JobResultBase {
  readonly type: JobType.Photometry;
  data: Array<PhotometryData>;
}