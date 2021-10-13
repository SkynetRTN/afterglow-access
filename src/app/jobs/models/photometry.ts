import { JobBase, JobResultBase } from './job-base';
import { JobType } from './job-types';
import { Astrometry } from './astrometry';
import { SourceId } from './source-id';
import { SourceMeta } from './source-meta';

export interface Photometry {
  mag: number | null;
  magError: number | null;
  flux: number | null;
  fluxError: number | null;
  annulusAIn: number | null;
  annulusBIn: number | null;
  annulusAOut: number | null;
  annulusBOut: number | null;
  aperA: number | null;
  aperB: number | null;
  aperTheta: number | null;
}

export interface PhotometryJobSettings {
  mode: 'aperture' | 'auto';
  a: number | null; // aperture radius/semi-major axis [pixels]
  b: number | null; // (optional) semi-minor axis
  theta: number | null; // (optional) position angle of semi-major axis
  aIn: number | null; // (optional = a) inner annulus radius/semi-major axis
  aOut: number | null; // outer annulus radius/semi-major axis
  bOut: number | null; // (optional) outer annulus semi-minor axis
  thetaOut: number | null; // (optional) annulus position angle
  gain: number | null; // (optional) default gain if not present in FITS headers
  centroidRadius: number | null; // 0 = disable centroiding
  zeroPoint: number | null;
  apcorrTol: number | null; // 0 = disable aperture correction
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
  result: PhotometryJobResult | null;
}
