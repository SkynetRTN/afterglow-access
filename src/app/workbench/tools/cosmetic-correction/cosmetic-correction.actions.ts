import { CosmeticCorrectionJobSettings } from "src/app/jobs/models/cosmetic-correction";
import { CosmeticCorrectionSettings } from "./models/cosmetic-correction-settings";

export class UpdateSettings {
  public static readonly type = '[Cosmetic Correction] Update Settings';

  constructor(public changes: Partial<CosmeticCorrectionSettings>) { }
}

export class SetSelectedLayerIds {
  public static readonly type = '[Cosmetic Correction] Set Selected Layer Ids';

  constructor(public layerIds: string[]) { }
}

export class SetCurrentJobId {
  public static readonly type = '[Cosmetic Correction] Set Current Job Id';

  constructor(public jobId: string) { }
}


export class CreateCosmeticCorrectionJob {
  public static readonly type = '[Cosmetic Correction] Create Cosmetic Correction Job';
  constructor(public layerIds: string[], public settings: CosmeticCorrectionJobSettings) { }
}
