import { SourceExtractionJob } from "./source-extraction";
import { SourceMergeJob } from "./source-merge";
import { PhotometryJob } from "./photometry";

export type Job =
| SourceExtractionJob
| SourceMergeJob
| PhotometryJob;

