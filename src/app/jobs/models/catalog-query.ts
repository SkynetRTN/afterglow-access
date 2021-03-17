import { JobBase, JobResultBase } from './job-base';
import { JobType } from './job-types';
import { CatalogSource } from '../../workbench/models/source';

export interface CatalogQueryJobResult extends JobResultBase {
  readonly type: JobType.CatalogQuery;
  data: Array<CatalogSource>;
}

export interface CatalogQueryJob extends JobBase {
  readonly type: JobType.CatalogQuery;
  catalogs: Array<string>;
  raHours?: number;
  decDegs?: number;
  radiusArcmins?: number;
  widthArcmins?: number;
  heightArcmins?: number;
  fileIds?: string[];
  constraints: { [column: string]: string };
  sourceIds?: string[];
  result: CatalogQueryJobResult;
}
