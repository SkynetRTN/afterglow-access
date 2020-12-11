export interface FileSystemItem {
  assetPath: string;
  dataProviderId: string;
  name: string;
  isDirectory: boolean;
  items: FileSystemItem[];
  metadata: {[key: string]: any}
}
