import { JobBase, JobResultBase } from './job-base';
import { JobType } from './job-types';

export interface Mag {
  value: number;
  error: number;
}

export interface Catalog {
  name: string;
  t: CatalogSource
  displayName: string;
  numSources: number;
  mags: { [filter: string]: string[] };
  filterLookup: { [filter: string]: string };
}

export interface CatalogSource {
  id: string;
  fileId: string;
  label: string;
  catalogName: string;
  mags: { [filter: string]: Mag }
}

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
