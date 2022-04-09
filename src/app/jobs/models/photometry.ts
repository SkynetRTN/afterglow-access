import { JobBase, JobResultBase } from './job-base';
import { JobType } from './job-types';
import { Astrometry } from './astrometry';
import { SourceId } from './source-id';
import { SourceMeta } from './source-meta';
import { TypeGuard } from 'src/app/utils/guard-type.pipe';
import { Job } from './job';
import { JobResult } from './job-result';

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
  fixAper: boolean;
  fixEll: boolean;
  fixRot: boolean;
}

export interface PhotometryData extends SourceMeta, Astrometry, Photometry, SourceId { }

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

export const isPhotometryJob: TypeGuard<Job, PhotometryJob> = (
  job: Job
): job is PhotometryJob => job.type === JobType.Photometry;

export const isPhotometryJobResult: TypeGuard<JobResult, PhotometryJobResult> = (
  result: JobResult
): result is PhotometryJobResult => result.type === JobType.Photometry;
