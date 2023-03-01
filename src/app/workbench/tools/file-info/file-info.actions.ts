import { FileInfoPanelConfig } from "./models/file-info-panel-config";

export class UpdateConfig {
  public static readonly type = '[Custom Marker] Update Config';

  constructor(public changes: Partial<FileInfoPanelConfig>) { }
}


