export interface FileSystemItemData {
  assetPath: string;
  dataProviderId: string;
  name: string;
  isDirectory: boolean;
  items: FileSystemItemData[];
  metadata: {[key: string]: any}
}
