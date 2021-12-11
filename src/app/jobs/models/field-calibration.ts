import { JobBase, JobResultBase } from './job-base';
import { JobType } from './job-types';
import { Astrometry } from './astrometry';
import { SourceExtractionJobSettings } from './source-extraction';
import { CatalogSource } from './catalog-query';
import { Photometry, PhotometryData, PhotometryJobSettings } from './photometry';


export interface FieldCalibration {
  id?: string;
  name?: string;
  catalogSources?: Array<CatalogSource & Astrometry & Photometry>;
  catalogs: string[];
  customFilterLookup?: { [catalogName: string]: { [filter: string]: string } };
  sourceInclusionPercentage?: number;
  minSnr?: number;
  maxSnr?: number;
  sourceMatchTol: number;
  variableCheckTol: number;
  maxStarRms: number;
  maxStars: number;
}


export interface FieldCalibrationJobResult extends JobResultBase {
  readonly type: JobType.FieldCalibration;
  data: Array<{
    fileId: string;
    photResults: PhotometryData[];
    zeroPointCorr: number;
    zeroPointError: number;
  }>

}

export interface FieldCalibrationJob extends JobBase {
  readonly type: JobType.FieldCalibration;
  fileIds: string[];
  fieldCal: FieldCalibration;
  sourceExtractionSettings: SourceExtractionJobSettings;
  photometrySettings: PhotometryJobSettings;
  result: FieldCalibrationJobResult | null;
}
