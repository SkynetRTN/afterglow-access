import { JobBase, JobResultBase } from './job-base';
import { JobType } from './job-types';

export interface PixelOpsJobResult extends JobResultBase {
  readonly type: JobType.PixelOps;
  fileIds: string[];
  data: Array<number>;
}

export interface PixelOpsJob extends JobBase {
  readonly type: JobType.PixelOps;
  fileIds: string[];
  auxFileIds: string[];
  op: string;
  inplace: boolean;
  result: PixelOpsJobResult | null;
}
