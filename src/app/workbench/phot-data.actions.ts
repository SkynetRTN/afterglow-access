import { PhotData } from './models/source-phot-data';

export class UpdatePhotData {
  public static readonly type = '[Sources Phot Data] Update Source Phot Data'

  constructor(public photDataId: string, public changes: Partial<PhotData>) { }
}







