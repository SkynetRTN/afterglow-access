import { DataFile, Header, PixelType, IHdu } from './models/data-file';
import { ImageHist } from './models/image-hist';
import { ImageTile } from './models/image-tile';

/**
 * Load Library Actions
 */
export class LoadLibrary {
  public static readonly type = '[HDU] Load Library';

  constructor(public correlationId?: string) { }
}

export class LoadLibrarySuccess {
  public static readonly type = '[HDU] Load Library Success';

  constructor(public hdus: IHdu[], public correlationId?: string) { }
}

export class LoadLibraryFail {
  public static readonly type = '[HDU] Load Library Fail';

  constructor(public error: any, public correlationId?: string) { }
}

/**
 * Close HDU Actions
 */

export class CloseHdu {
  public static readonly type = '[HDU] Close HDU';

  constructor(public hduId: string) { }
}

export class CloseHduSuccess {
  public static readonly type = '[HDU] Close HDU Success';

  constructor(public hduId: string) { }
}

export class CloseHduFail {
  public static readonly type = '[HDU] Close HDU Fail';

  constructor(public hduId: string, public error: any) { }
}

/**
 * Load File Actions
 */

export class LoadHdu {
  public static readonly type = '[HDU] Load HDU';

  constructor(public hduId: string) { }
}



export class LoadHduHeader {
  public static readonly type = '[HDU] Load HDU Header';

  constructor(public hduId: string) { }
}

export class LoadHduHeaderSuccess {
  public static readonly type = '[HDU] Load HDU Header Success';

  constructor(public hduId: string, public header: Header) { }
}

/**
 * Image File Actions
 */

export class LoadImageHduHistogram {
  public static readonly type = '[HDU] Load Image HDU Histogram';

  constructor(public hduId: string) { }
}

export class LoadImageHduHistogramSuccess {
  public static readonly type = '[HDU] Load Image HDU Histogram Success';

  constructor(public hduId: string, public hist: ImageHist) { }
}

export class InitializeImageTiles {
  public static readonly type = '[HDU] Initialize Image Tiles';

  constructor(public hduId: string) { }
}

export class LoadImageTilePixels {
  public static readonly type = '[HDU] Load Image Tile Pixels';

  constructor(public hduId: string, public tileIndex: number) { }
}

export class LoadImageTilePixelsSuccess {
  public static readonly type = '[HDU] Load Image Tile Pixels Success';

  constructor(public hduId: string, public tileIndex: number, public pixels: PixelType) { }
}

export class LoadImageTilePixelsFail {
  public static readonly type = '[HDU] Load Image Tile Pixels Fail';

  constructor(public hduId: string, public tileIndex: number, public error: any) { }
}

export class LoadImageTilePixelsCancel {
  public static readonly type = '[HDU] Load Image Tile Pixels Cancel';

  constructor(public hduId: string, public tileIndex: number) { }
}

export class ClearImageDataCache {
  public static readonly type = '[HDU] Clear Image Data';

  constructor(public hduIds: string[]) { }
}