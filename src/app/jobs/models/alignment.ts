import { TypeGuard } from 'src/app/utils/guard-type.pipe';
import { SourceExtractionSettings } from 'src/app/workbench/models/source-extraction-settings';
import { Job } from './job';
import { JobBase, JobResultBase } from './job-base';
import { JobResult } from './job-result';
import { JobType } from './job-types';
import { SourceExtractionData, SourceExtractionJobSettings } from './source-extraction';

export enum AlignmentMode {
  wcs = 'WCS',
  sources_manual = 'sources_manual',
  sources_auto = 'sources_auto',
  features = 'features',
  pixels = 'pixels'
}

export enum FeatureAlignmentAlgorithm {
  AKAZE = 'AKAZE',
  BRISK = 'BRISK',
  KAZE = 'KAZE',
  ORB = 'ORB',
  SIFT = 'SIFT',
  SURF = 'SURF'
}

export interface AlignmentJobSettingsBase {
  refImage: 'first' | 'central' | 'last' | number;
  prefilter?: boolean;
  enableRot: boolean;
  enableScale: boolean;
  enableSkew: boolean;
}

export interface WcsAlignmentSettings extends AlignmentJobSettingsBase {
  readonly mode: AlignmentMode.wcs;
  wcsGridPoints: number;
}

export interface SourceAlignmentSettings extends AlignmentJobSettingsBase {
  scaleInvariant: boolean;
  matchTol: number;
  minEdge: number;
  ratioLimit: number;
  confidence: number;
}

export interface ManualSourceAlignmentSettings extends SourceAlignmentSettings {
  readonly mode: AlignmentMode.sources_manual;
  maxSources: number;
  sources: SourceExtractionData[]
}

export interface AutoSourceAlignmentSettings extends SourceAlignmentSettings {
  readonly mode: AlignmentMode.sources_auto;
  sourceExtractionSettings: SourceExtractionJobSettings;
}

export interface FeatureAlignmentSettings extends AlignmentJobSettingsBase {
  readonly mode: AlignmentMode.features;
  ratioThreshold: number;
  detectEdges: boolean;
}

export interface AKAZEFeatureAlignmentSettings extends FeatureAlignmentSettings {
  readonly algorithm: FeatureAlignmentAlgorithm.AKAZE
  descriptorType: string;
  descriptorSize: number;
  descriptorChannels: number;
  threshold: number;
  octaves: number;
  octaveLayers: number;
  diffusivity: string;
}

export interface BRISKFeatureAlignmentSettings extends FeatureAlignmentSettings {
  readonly algorithm: FeatureAlignmentAlgorithm.BRISK
  threshold: number;
  octaves: number;
  patternScale: number;
}

export interface KAZEFeatureAlignmentSettings extends FeatureAlignmentSettings {
  readonly algorithm: FeatureAlignmentAlgorithm.KAZE
  extended: boolean;
  upright: boolean;
  threshold: number;
  octaves: number;
  octaveLayers: number;
  diffusivity: string;
}

export interface ORBFeatureAlignmentSettings extends FeatureAlignmentSettings {
  readonly algorithm: FeatureAlignmentAlgorithm.ORB
  nfeatures: number;
  scaleFactor: number;
  nlevels: number;
  edgeThreshold: number;
  firstLevel: number;
  wtaK: number;
  scoreType: string;
  patchSize: number;
  fastThreshold: number;
}

export interface SIFTFeatureAlignmentSettings extends FeatureAlignmentSettings {
  readonly algorithm: FeatureAlignmentAlgorithm.SIFT
  nfeatures: number;
  octaveLayers: number;
  contrastThreshold: number;
  edgeThreshold: number;
  sigma: number;
  descriptorType: string;
}

export interface SURFFeatureAlignmentSettings extends FeatureAlignmentSettings {
  readonly algorithm: FeatureAlignmentAlgorithm.SURF
  hessianThreshold: number;
  octaves: number;
  octaveLayers: number;
  extended: boolean;
  upright: boolean;
}

export interface PixelAlignmentSettings extends AlignmentJobSettingsBase {
  readonly mode: AlignmentMode.pixels;
  detectEdges: boolean;
}

export type AlignmentJobSettings = WcsAlignmentSettings | ManualSourceAlignmentSettings |
  AutoSourceAlignmentSettings | AKAZEFeatureAlignmentSettings | BRISKFeatureAlignmentSettings |
  KAZEFeatureAlignmentSettings | ORBFeatureAlignmentSettings | SIFTFeatureAlignmentSettings | SURFFeatureAlignmentSettings | PixelAlignmentSettings;

export interface AlignmentJobResult extends JobResultBase {
  readonly type: JobType.Alignment;
  fileIds: string[];
}

export interface AlignmentJob extends JobBase {
  readonly type: JobType.Alignment;
  fileIds: string[];
  settings?: AlignmentJobSettings;
  sources?: SourceExtractionData[];
  inplace: boolean;
  crop: boolean;
  result?: AlignmentJobResult;
}


export const isAlignmentJob: TypeGuard<Job, AlignmentJob> = (
  job: Job
): job is AlignmentJob => job.type === JobType.Alignment;

export const isAlignmentJobResult: TypeGuard<JobResult, AlignmentJobResult> = (
  result: JobResult
): result is AlignmentJobResult => result.type === JobType.Alignment;
