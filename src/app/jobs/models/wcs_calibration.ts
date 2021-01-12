import { SourceExtractionSettings } from '../../workbench/models/source-extraction-settings';
import { JobBase, JobResultBase } from "./job-base";
import { JobType } from "./job-types";
import { SourceExtractionData } from "./source-extraction";

export interface WcsCalibrationSettings {
  ra_hours: number;
  dec_degs: number;
  radius: number;
  min_scale: number;
  max_scale: number;
  max_sources: number;
}

export interface WcsCalibrationJob extends JobBase {
  readonly type: JobType.WcsCalibration;
  file_ids: number[];
  settings?: WcsCalibrationSettings;
  source_extraction_settings: SourceExtractionSettings;
  inplace: boolean;
}

export interface WcsCalibrationJobResult extends JobResultBase {
  readonly type: JobType.WcsCalibration;
  file_ids: number[];
}
