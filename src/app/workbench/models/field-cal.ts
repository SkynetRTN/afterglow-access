import { CatalogSource } from './source';

export interface FieldCal {
    id: string,
    name: string,
    catalogSources: Array<CatalogSource>,
    customFilterLookup: {[catalogName: string]: {[customFilterName: string]: string}}
    sourceInclusionPercent: number,
    sourceMatchTol: number,
    minSnr: number,
    maxSnr: number
}