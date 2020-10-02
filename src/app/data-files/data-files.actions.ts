import { DataFile, Header, PixelType, IHdu } from './models/data-file';
import { ImageHist } from './models/image-hist';
import { ImageTile } from './models/image-tile';

/**
 * CRUD
 */

export class CreateDataFile {
  public static readonly type = '[DataFile] Create Data File';

  constructor(public dataFile: DataFile) { }
}

export class UpdateDataFile {
  public static readonly type = '[DataFile] Update Data File';

  constructor(public fileId: string, public changes: Partial<DataFile>) { }
}

export class DeleteDataFile {
  public static readonly type = '[DataFile] Delete Data File';

  constructor(public fileId: string) { }
}

/**
 * Close Data File Actions
 */
export class CloseDataFile {
  public static readonly type = '[DataFile] Close Data File';

  constructor(public fileId: string) { }
}

export class CloseDataFileSuccess {
  public static readonly type = '[DataFile] Close Data File Success';

  constructor(public fileId: string) { }
}

export class CloseDataFileFail {
  public static readonly type = '[DataFile] Close Data File Fail';

  constructor(public fileId: string, public error: any) { }
}

export class CloseAllDataFiles {
  public static readonly type = '[DataFile] Close All Data Files';
}

export class CloseAllDataFilesSuccess {
  public static readonly type = '[DataFile] Close All Data Files Success';
}

export class CloseAllDataFilesFail {
  public static readonly type = '[DataFile] Close All Data Files Fail';

  constructor(public errors: any) { }
}

/**
 * Load File Actions
 */

 export class LoadDataFile {
  public static readonly type = '[DataFile] Load Data File';

  constructor(public fileId: string) { }
 }
