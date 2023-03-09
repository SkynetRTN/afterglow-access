import { StackSettings } from "src/app/jobs/models/stacking";
import { StackFormData } from "./models/stacking-form-data";

export class UpdateFormData {
  public static readonly type = '[Stacking] Update Form Data';

  constructor(public changes: Partial<StackFormData>) { }
}

export class SetSelectedLayerIds {
  public static readonly type = '[Stacking] Set Selected Layer Ids';

  constructor(public layerIds: string[]) { }
}

export class SetCurrentJobId {
  public static readonly type = '[Stacking] Set Current Job Id';

  constructor(public jobId: string) { }
}

export class CreateStackingJob {
  public static readonly type = '[Stacking] Create Stacking Job';
  constructor(public layerIds: string[], public settings: StackSettings, public outFilename: string) { }
}


