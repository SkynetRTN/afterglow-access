import { CatalogSource } from "./source";
import { PhotResult } from "./phot-result";

export interface FieldCal {
  id: string;
  name: string;
  catalogSources: Array<CatalogSource>;
  customFilterLookup: {[custom_filer_name: string]: string};
  sourceMatchThresh: number;
}

export interface FieldCalResult {
  fileId: string;
  photResults: Array<PhotResult>;
  zeroPoint: number;
  zeroPointError: number;
}