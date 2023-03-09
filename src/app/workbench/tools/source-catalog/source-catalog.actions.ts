import { Region } from "src/app/data-files/models/region";
import { SourcePanelConfig } from "./models/source-panel-config";

export class UpdateConfig {
  public static readonly type = '[Source Catalog] Update Form Data';

  constructor(public changes: Partial<SourcePanelConfig>) { }
}


export class UpdateSourceSelectionRegion {
  public static readonly type = '[Sources] Update Source Selection Region';

  constructor(public layerId: string, public region: Region) { }
}

export class EndSourceSelectionRegion {
  public static readonly type = '[Sources] End Source Selection Region';

  constructor(public layerId: string, public mode: 'append' | 'remove') { }
}


