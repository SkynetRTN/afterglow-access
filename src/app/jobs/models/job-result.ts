import { SourceExtractionJobResult } from "./source-extraction";
import { SourceMergeJobResult } from "./source-merge";
import { PhotometryJobResult } from "./photometry";
import { CatalogQueryJobResult } from './catalog-query';
import { PixelOpsJobResult } from './pixel-ops';
import { AlignmentJobResult } from './alignment';
import { StackingJobResult } from './stacking';

export type JobResult = 
  SourceExtractionJobResult
| SourceMergeJobResult
| PhotometryJobResult
| CatalogQueryJobResult
| PixelOpsJobResult
| AlignmentJobResult
| StackingJobResult;