import { PsfCentroiderSettings, DiskCentroiderSettings } from './centroider';

export interface CentroidSettings {
  centroidClicks: boolean,
  useDiskCentroiding: boolean,
  psfCentroiderSettings: PsfCentroiderSettings,
  diskCentroiderSettings: DiskCentroiderSettings,
}