import { PhotData } from './models/source-phot-data';

export class UpdatePhotData {
  public static readonly type = '[Sources Phot Data] Update Source Phot Data'

  constructor(public photDataId: string, public changes: Partial<PhotData>) { }
}

export class AddPhotDatas {
  public static readonly type = '[Sources Phot Data] Add Source Phot Datas'

  constructor(public photDatas: PhotData[]) { }
}

export class RemovePhotDatas {
  public static readonly type = '[Phot Data] Remove Source Phot Datas'

  constructor(public ids: string[]) { }
}

export class RemoveAllPhotDatas {
  public static readonly type = '[Phot Data] Remove All Phot Data'

  constructor() { }
}

