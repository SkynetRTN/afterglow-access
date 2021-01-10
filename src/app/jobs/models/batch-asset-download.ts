import { JobType } from "./job-types";
import { JobBase, JobResultBase } from "./job-base";


export interface BatchAssetDownloadJob extends JobBase {
  readonly type: JobType.BatchAssetDownload;
  provider_id: number;
  paths: string[]
}
