import { JobBase, JobResultBase } from "./job-base";
import { JobType } from "./job-types";

export interface PixelOpsJob extends JobBase {
  readonly type: JobType.PixelOps;
  file_ids: number[];
  aux_file_ids: number[];
  op: string;
  inplace: boolean;
}

export interface PixelOpsJobResult extends JobResultBase {
  readonly type: JobType.PixelOps;
  file_ids: number[];
  data: Array<number>;
}
