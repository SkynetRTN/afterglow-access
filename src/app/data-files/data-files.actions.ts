import { DataFile, Header, ImageFile } from './models/data-file';
import { ImageHist } from './models/image-hist';
import { ImageTile } from './models/image-tile';

/**
 * Load Library Actions
 */
export class LoadLibrary {
  public static readonly type = '[DataFile] Load Library';

  constructor(public correlationId?: string) { }
}

export class LoadLibrarySuccess {
  public static readonly type = '[DataFile] Load Library Success';

  constructor(public dataFiles: DataFile[], public correlationId?: string) { }
}

export class LoadLibraryFail {
  public static readonly type = '[DataFile] Load Library Fail';

  constructor(public error: any, public correlationId?: string) { }
}

/**
 * Remove Data File Actions
 */
export class RemoveDataFile {
  public static readonly type = '[DataFile] Remove Data File';

  constructor(public fileId: string) { }
}

export class RemoveDataFileSuccess {
  public static readonly type = '[DataFile] Remove Data File Success';

  constructor(public fileId: string) { }
}

export class RemoveDataFileFail {
  public static readonly type = '[DataFile] Remove Data File Fail';

  constructor(public fileId: string, public error: any) { }
}

export class RemoveAllDataFiles {
  public static readonly type = '[DataFile] Remove All Data Files';
}

export class RemoveAllDataFilesSuccess {
  public static readonly type = '[DataFile] Remove All Data Files Success';
}

export class RemoveAllDataFilesFail {
  public static readonly type = '[DataFile] Remove All Data Files Fail';

  constructor(public errors: any) { }
}

/**
 * Load File Actions
 */

 export class LoadDataFile {
  public static readonly type = '[DataFile] Load Data File';

  constructor(public fileId: string) { }
 }

export class LoadDataFileHdr {
  public static readonly type = '[DataFile] Load Data File Hdr';

  constructor(public fileId: string) { }
}

export class LoadDataFileHdrSuccess {
  public static readonly type = '[DataFile] Load Data File Hdr Success';

  constructor(public fileId: string, public header: Header) { }
}

/**
 * Image File Actions
 */

export class LoadImageHist {
  public static readonly type = '[Image File] Load Image Hist';

  constructor(public fileId: string) { }
}

export class LoadImageHistSuccess {
  public static readonly type = '[Image File] Load Image Hist Success';

  constructor(public fileId: string, public hist: ImageHist) { }
}

export class InitImageTiles {
  public static readonly type = '[Image File] Init Image Tiles';

  constructor(public fileId: string) { }
}

export class LoadImageTilePixels {
  public static readonly type = '[Image File] Load Image Tile';

  constructor(public fileId: string, public tileIndex: number) { }
}

export class LoadImageTilePixelsSuccess {
  public static readonly type = '[Image File] Load Image Tile Success';

  constructor(public fileId: string, public tileIndex: number, public pixels: Float32Array) { }
}

export class LoadImageTilePixelsFail {
  public static readonly type = '[Image File] Load Image Tile Fail';

  constructor(public fileId: string, public tileIndex: number, public error: any) { }
}

export class LoadImageTilePixelsCancel {
  public static readonly type = '[Image File] Load Image Tile Cancel';

  constructor(public fileId: string, public tileIndex: number) { }
}

export class ClearImageDataCache {
  public static readonly type = '[Image File] Clear Image Data';

  constructor(public fileIds: string[]) { }
}