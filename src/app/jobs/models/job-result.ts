import { SourceExtractionJobResult } from './source-extraction';
import { SourceMergeJobResult } from './source-merge';
import { PhotometryJobResult } from './photometry';
import { CatalogQueryJobResult } from './catalog-query';
import { PixelOpsJobResult } from './pixel-ops';
import { AlignmentJobResult } from './alignment';
import { StackingJobResult } from './stacking';
import { BatchImportJobResult } from './batch-import';
import { SonificationJobResult } from './sonification';
import { WcsCalibrationJobResult } from './wcs_calibration';
import { FieldCalibrationJobResult } from './field-calibration';
import { CosmeticCorrectionJobResult } from './cosmetic-correction';

export type JobResult =
  | SourceExtractionJobResult
  | SourceMergeJobResult
  | PhotometryJobResult
  | CatalogQueryJobResult
  | PixelOpsJobResult
  | AlignmentJobResult
  | StackingJobResult
  | BatchImportJobResult
  | SonificationJobResult
  | WcsCalibrationJobResult
  | FieldCalibrationJobResult
  | CosmeticCorrectionJobResult;
