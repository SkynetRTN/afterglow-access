export interface DataProviderAsset {
  assetPath: string;
  dataProviderId: string;
  name: string;
  isDirectory: boolean;
  metadata: { [key: string]: any };
}
