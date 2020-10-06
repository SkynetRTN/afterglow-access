import { DataFile, Header, PixelType, IHdu } from './models/data-file';
import { ImageHist } from './models/image-hist';
import { ImageTile } from './models/image-tile';

/**
 * Load Library Actions
 */
export class LoadLibrary {
  public static readonly type = '[Data File] Load Library';

  constructor(public correlationId?: string) { }
}

export class LoadLibrarySuccess {
  public static readonly type = '[Data File] Load Library Success';

  constructor(public hdus: IHdu[], public correlationId?: string) { }
}

export class LoadLibraryFail {
  public static readonly type = '[Data File] Load Library Fail';

  constructor(public error: any, public correlationId?: string) { }
}

/**
 * Close HDU Events
 */

export class CloseHduSuccess {
  public static readonly type = '[Data File] Close HDU Success';

  constructor(public hduId: string) { }
}

export class CloseHduFail {
  public static readonly type = '[Data File] Close HDU Fail';

  constructor(public hduId: string, public error: any) { }
}

/**
 * Load File Actions
 */

export class LoadHdu {
  public static readonly type = '[Data File] Load HDU';

  constructor(public hduId: string) { 
  }
}



export class LoadHduHeader {
  public static readonly type = '[Data File] Load HDU Header';

  constructor(public hduId: string) { }
}

export class LoadHduHeaderSuccess {
  public static readonly type = '[Data File] Load HDU Header Success';

  constructor(public hduId: string, public header: Header) { }
}

/**
 * Image File Actions
 */

export class LoadImageHduHistogram {
  public static readonly type = '[Data File] Load Image HDU Histogram';

  constructor(public hduId: string) { }
}

export class LoadImageHduHistogramSuccess {
  public static readonly type = '[Data File] Load Image HDU Histogram Success';

  constructor(public hduId: string, public hist: ImageHist) { }
}

export class InitializeFileTiles {
  public static readonly type = '[Data File] Initialize File Tiles';

  constructor(public fileId: string) { }
}

export class InitializeImageTiles {
  public static readonly type = '[Data File] Initialize Image Tiles';

  constructor(public hduId: string) { }
}

export class InitializeImageTilesSuccess {
  public static readonly type = '[Data File] Initialize Image Tiles Success';

  constructor(public hduId: string) { }
}

export class LoadImageTilePixels {
  public static readonly type = '[Data File] Load Image Tile Pixels';

  constructor(public hduId: string, public tileIndex: number) { }
}

export class LoadImageTilePixelsSuccess {
  public static readonly type = '[Data File] Load Image Tile Pixels Success';

  constructor(public hduId: string, public tileIndex: number, public pixels: PixelType) { }
}

export class LoadImageTilePixelsFail {
  public static readonly type = '[Data File] Load Image Tile Pixels Fail';

  constructor(public hduId: string, public tileIndex: number, public error: any) { }
}

export class LoadImageTilePixelsCancel {
  public static readonly type = '[Data File] Load Image Tile Pixels Cancel';

  constructor(public hduId: string, public tileIndex: number) { }
}

export class ClearImageDataCache {
  public static readonly type = '[Data File] Clear Image Data';

  constructor(public hduIds: string[]) { }
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
