import { PsfCentroiderSettings, DiskCentroiderSettings } from './centroider';

export enum CentroidMethod {
  GAUSSIAN_2D,
  GAUSSIAN_1D,
  COM
}

export interface CentroidSettings {
  centroidClicks: boolean,
  useDiskCentroiding: boolean,
  psfCentroiderSettings: PsfCentroiderSettings,
  diskCentroiderSettings: DiskCentroiderSettings,
}