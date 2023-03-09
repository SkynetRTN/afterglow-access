import { PixelOpsFormData } from "./models/pixel-ops-form-data";

export class UpdateFormData {
  public static readonly type = '[Pixel Ops] Update Form Data';

  constructor(public changes: Partial<PixelOpsFormData>) { }
}

export class SetSelectedLayerIds {
  public static readonly type = '[Pixel Ops] Set Selected Layer Ids';

  constructor(public layerIds: string[]) { }
}

export class SetCurrentJobId {
  public static readonly type = '[Pixel Ops] Set Current Job Id';

  constructor(public jobId: string) { }
}

export class CreatePixelOpsJob {
  public static readonly type = '[Pixel Ops] Create Pixel Ops Job';
}

export class CreateAdvPixelOpsJob {
  public static readonly type = '[Pixel Ops] Create Adv Pixel Ops Job';
}

export class HideCurrentPixelOpsJobState {
  public static readonly type = '[Pixel Ops] Hide Current Pixel Ops Job State';
}