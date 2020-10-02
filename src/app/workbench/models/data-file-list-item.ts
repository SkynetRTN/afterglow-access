import { DataFile, IHdu } from '../../data-files/models/data-file';

export interface IDataFileListItem {
    id: string;
    type: 'file' | 'hdu';
  }