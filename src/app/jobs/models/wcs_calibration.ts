import { JobBase, JobResultBase } from "./job-base";
import { JobType } from "./job-types";
import { SourceExtractionJobSettings } from "./source-extraction";

export interface WcsCalibrationJobSettings {
  ra_hours: number;
  dec_degs: number;
  radius: number;
  min_scale: number;
  max_scale: number;
  max_sources: number;
}

export interface WcsCalibrationJobResult extends JobResultBase {
  readonly type: JobType.WcsCalibration;
  file_ids: number[];
}

export interface WcsCalibrationJob extends JobBase {
  readonly type: JobType.WcsCalibration;
  file_ids: number[];
  settings?: WcsCalibrationJobSettings;
  source_extraction_settings: SourceExtractionJobSettings;
  inplace: boolean;
  result: WcsCalibrationJobResult;
}


