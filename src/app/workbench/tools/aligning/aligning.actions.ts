import { AlignmentJobSettings } from "src/app/jobs/models/alignment";
import { AlignmentSettings } from "../../models/alignment-settings";
import { AligningFormData } from "./models/aligning-form-data";

export class UpdateFormData {
  public static readonly type = '[Aligning] Update Form Data';

  constructor(public changes: Partial<AligningFormData>) { }
}

export class SetCurrentJobId {
  public static readonly type = '[Aligning] Set Current Job Id';

  constructor(public jobId: string) { }
}

export class CreateAligningJob {
  public static readonly type = '[Aligning] Create Aligning Job';
  constructor(public layerIds: string[], public crop: boolean, public settings: AlignmentJobSettings) { }
}


