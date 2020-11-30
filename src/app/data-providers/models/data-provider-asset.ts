export interface DataProviderAsset {
  name: string;
  collection: boolean;
  path: string;
  metadata: { [key: string]: any };
}
