import { CosmeticCorrectionSettings } from "./models/cosmetic-correction-settings";

export class UpdateSettings {
  public static readonly type = '[Cosmet Correction] Update Settings';

  constructor(public changes: Partial<CosmeticCorrectionSettings>) { }
}

export class SetSelectedLayerIds {
  public static readonly type = '[Cosmet Correction] Set Selected Layer Ids';

  constructor(public layerIds: string[]) { }
}

export class SetCurrentJobId {
  public static readonly type = '[Cosmet Correction] Set Current Job Id';

  constructor(public jobId: string) { }
}