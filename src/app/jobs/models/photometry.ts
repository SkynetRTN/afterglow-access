import { JobBase, JobResultBase } from "./job-base";
import { JobType } from "./job-types";
import { Astrometry } from "./astrometry";
import { SourceId } from "./source-id";
import { SourceMeta } from "./source-meta";

export interface Photometry {
  mag: number;
  magError: number;
  flux: number;
  fluxError: number;
  annulusAIn: number;
  annulusBIn: number;
  annulusAOut: number;
  annulusBOut: number;
  aperA: number;
  aperB: number;
  aperTheta: number;
}

export interface PhotometryJobSettings {
  mode?: "aperture" | "auto";
  a?: number; // aperture radius/semi-major axis [pixels]
  b?: number; // (optional) semi-minor axis
  theta?: number; // (optional) position angle of semi-major axis
  aIn?: number; // (optional = a) inner annulus radius/semi-major axis
  aOut?: number; // outer annulus radius/semi-major axis
  bOut?: number; // (optional) outer annulus semi-minor axis
  thetaOut?: number; // (optional) annulus position angle
  gain?: number; // (optional) default gain if not present in FITS headers
  centroidRadius?: number; // 0 = disable centroiding
  zeroPoint?: number;
}

export interface PhotometryData extends SourceMeta, Astrometry, Photometry, SourceId {}

export interface PhotometryJobResult extends JobResultBase {
  readonly type: JobType.Photometry;
  data: Array<PhotometryData>;
}

export interface PhotometryJob extends JobBase {
  readonly type: JobType.Photometry;
  fileIds: string[];
  sources: Array<Astrometry & SourceId>;
  settings?: PhotometryJobSettings;
  result: PhotometryJobResult;
}


