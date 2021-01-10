export interface Catalog {
  name: string;
  displayName: string;
  numSources: number;
  mags: string[];
  filterLookup: { filterName: string; expression: string };
}
