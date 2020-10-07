import { DataFile, Header, PixelType, IHdu } from './models/data-file';
import { ImageHist } from './models/image-hist';
import { PixelNormalizer } from './models/pixel-normalizer';
import { Transform, Transformation } from './models/transformation';
import { Region } from './models/region';

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

export class LoadRawImageTile {
  public static readonly type = '[Data File] Load Raw Image Tile';

  constructor(public hduId: string, public tileIndex: number) { }
}

export class LoadRawImageTileSuccess {
  public static readonly type = '[Data File] Load Raw Image Tile Success';

  constructor(public hduId: string, public tileIndex: number, public pixels: PixelType) { }
}

export class LoadRawImageTileFail {
  public static readonly type = '[Data File] Load Raw Image Tile Fail';

  constructor(public hduId: string, public tileIndex: number, public error: any) { }
}

export class LoadRawImageTileCancel {
  public static readonly type = '[Data File] Load Raw Image Tile Cancel';

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

 /**
  * Normalization Actions
  */

export class ClearNormalizedImageTiles {
  public static readonly type = '[Workbench HDU State] Clear Normalized Image Data';

  constructor(public hduId: string) { }
}

export class UpdateNormalizedImageTile {
  public static readonly type = '[Workbench HDU State] Load Normalized Image Tile';

  constructor(public hduId: string, public tileIndex: number) { }
}

export class UpdateNormalizedImageTileSuccess {
  public static readonly type = '[Workbench HDU State] Load Normalized Image Tile Success';

  constructor(public hduId: string, public tileIndex: number, pixels: PixelType) { }
}

export class UpdateNormalizer {
  public static readonly type = '[Workbench HDU State] Update Normalizer';

  constructor(public hduId: string, public changes: Partial<PixelNormalizer>) { }
}

export class SyncFileNormalizations {
  public static readonly type = '[Workbench] Sync File Normalizations';

  constructor(public referenceHduId: string, public hduIds: string[]) { }
}

 /**
 * Transformation Actions
 */

 export class CenterRegionInViewport {
  public static readonly type = '[Transformation] Center Region In Viewport';

  constructor(public transformation: Transformation, public imageDataId: string, public viewportSize: { width: number, height: number }, public region: Region) { }
}

export class ZoomBy {
  public static readonly type = '[Transformation] Zoom By';

  constructor(public transformation: Transformation, public imageDataId: string, public viewportSize: {width: number, height: number}, public scaleFactor: number, public anchorPoint: { x: number, y: number }, ) { }
}

export class ZoomTo {
  public static readonly type = '[Transformation] Zoom To';

  constructor(public transformation: Transformation, public imageDataId: string, public viewportSize: {width: number, height: number}, public scale: number, public anchorPoint: { x: number, y: number }) { }
}

export class MoveBy {
  public static readonly type = '[Transformation] Move By';

  constructor(public transformation: Transformation, public imageDataId: string, public viewportSize: {width: number, height: number}, public xShift: number, public yShift: number) { }
}

export class RotateBy {
  public static readonly type = '[Transformation] Rotate By';

  constructor(public transformation: Transformation, public imageDataId: string, public viewportSize: {width: number, height: number}, public rotationAngle: number, public anchorPoint: { x: number, y: number } = null) { }
}

// export class RotateTo {
//   public static readonly type = '[Transformation] Rotate To';

//   constructor(public transformation: Transformation, public imageDataId: string, public rotationAngle: number, public anchorPoint?: { x: number, y: number }) { }
// }

export class Flip {
  public static readonly type = '[Transformation] Flip';

  constructor(public transformation: Transformation, public imageDataId: string) { }
}

export class ResetImageTransform {
  public static readonly type = '[Workbench] Reset Image Transform';

  constructor(public transformation: Transformation, public imageDataId: string) { }
}

export class SyncFileTransformations {
  public static readonly type = '[Workbench] Sync File Transformations';

  constructor(public referenceHduId: string, public hduIds: string[]) { }
}