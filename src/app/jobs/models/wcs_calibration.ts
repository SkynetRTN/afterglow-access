import { JobBase, JobResultBase } from './job-base';
import { JobType } from './job-types';
import { SourceExtractionJobSettings } from './source-extraction';

export interface WcsCalibrationJobSettings {
  raHours?: number;
  decDegs?: number;
  radius?: number;
  minScale?: number;
  maxScale?: number;
  maxSources?: number;
}

export interface WcsCalibrationJobResult extends JobResultBase {
  readonly type: JobType.WcsCalibration;
  fileIds: string[];
}

export interface WcsCalibrationJob extends JobBase {
  readonly type: JobType.WcsCalibration;
  fileIds: string[];
  settings?: WcsCalibrationJobSettings;
  sourceExtractionSettings: SourceExtractionJobSettings;
  inplace: boolean;
  result: WcsCalibrationJobResult | null;
}
