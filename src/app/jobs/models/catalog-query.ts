import { JobBase, JobResultBase } from './job-base';
import { JobType } from './job-types';
import { CatalogSource } from '../../core/models/source';

export interface CatalogQueryJob extends JobBase {
    readonly type: JobType.CatalogQuery;
    catalogs: Array<string>;
    ra_hours?: number;
    dec_degs?: number;
    radius_arcmins?: number;
    width_arcmins?: number;
    height_arcmins?: number;
    file_ids?: Array<number>;
    constraints: {[column: string]: string};
    source_ids?: Array<string>;
  }
  
  
  export interface CatalogQueryJobResult extends JobResultBase {
    readonly type: JobType.CatalogQuery;
    data: Array<CatalogSource>;
  }