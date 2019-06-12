import { SourceExtractionJob } from "./source-extraction";
import { SourceMergeJob } from "./source-merge";
import { PhotometryJob } from "./photometry";
import { PixelOpsJob } from './pixel-ops';
import { CatalogQueryJob } from './catalog-query';
import { AlignmentJob } from './alignment';
import { StackingJob } from './stacking';

export type Job =
| SourceExtractionJob
| SourceMergeJob
| PhotometryJob
| PixelOpsJob
| CatalogQueryJob
| AlignmentJob
| StackingJob;

