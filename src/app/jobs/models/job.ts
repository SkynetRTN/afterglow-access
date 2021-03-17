import { SourceExtractionJob } from './source-extraction';
import { SourceMergeJob } from './source-merge';
import { PhotometryJob } from './photometry';
import { PixelOpsJob } from './pixel-ops';
import { CatalogQueryJob } from './catalog-query';
import { AlignmentJob } from './alignment';
import { StackingJob } from './stacking';
import { BatchImportJob } from './batch-import';
import { SonificationJob } from './sonification';
import { BatchDownloadJob } from './batch-download';
import { BatchAssetDownloadJob } from './batch-asset-download';
import { WcsCalibrationJob } from './wcs_calibration';

export type Job =
  | SourceExtractionJob
  | SourceMergeJob
  | PhotometryJob
  | PixelOpsJob
  | CatalogQueryJob
  | AlignmentJob
  | StackingJob
  | BatchImportJob
  | SonificationJob
  | BatchDownloadJob
  | BatchAssetDownloadJob
  | WcsCalibrationJob;
