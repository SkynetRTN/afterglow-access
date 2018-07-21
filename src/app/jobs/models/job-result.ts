import { SourceExtractionJobResult } from "./source-extraction";
import { SourceMergeJobResult } from "./source-merge";
import { PhotometryJobResult } from "./photometry";

export type JobResult = 
| SourceExtractionJobResult
| SourceMergeJobResult
| PhotometryJobResult;