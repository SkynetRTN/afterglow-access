import { PsfCentroiderSettings, DiskCentroiderSettings } from "./centroider";

export interface CentroidSettings {
  useDiskCentroiding: boolean;
  psfCentroiderSettings: PsfCentroiderSettings;
  diskCentroiderSettings: DiskCentroiderSettings;
}
