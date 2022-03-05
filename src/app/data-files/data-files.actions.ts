import { DataFile, Header, PixelType, IHdu } from './models/data-file';
import { ImageHist } from './models/image-hist';
import { PixelNormalizer } from './models/pixel-normalizer';
import { Region } from './models/region';
import { Transform } from './models/transformation';
import { Normalization } from './models/normalization';
import { BlendMode } from './models/blend-mode';
import { ColorMap } from './models/color-map';
import { HeaderEntry } from './models/header-entry';

/**
 * Load Library Actions
 */
export class LoadLibrary {
  public static readonly type = '[File] Load Library';

  constructor(public correlationId?: string) { }
}

export class LoadLibrarySuccess {
  public static readonly type = '[File] Load Library Success';

  constructor(public hdus: IHdu[], public correlationId?: string) { }
}

export class LoadLibraryFail {
  public static readonly type = '[File] Load Library Fail';

  constructor(public error: any, public correlationId?: string) { }
}

/**
 * Close HDU Events
 */

export class CloseHduSuccess {
  public static readonly type = '[File] Close HDU Success';

  constructor(public hduId: string) { }
}

export class CloseHduFail {
  public static readonly type = '[File] Close HDU Fail';

  constructor(public hduId: string, public error: any) { }
}

/**
 * Load File Actions
 */

export class LoadHdu {
  public static readonly type = '[File] Load HDU';

  constructor(public hduId: string) { }
}

export class LoadHduHeader {
  public static readonly type = '[File] Load HDU Header';

  constructor(public hduId: string) { }
}

export class LoadHduHeaderSuccess {
  public static readonly type = '[File] Load HDU Header Success';

  constructor(public hduId: string) { }
}

export class UpdateHduHeader {
  public static readonly type = '[File] Update HDU Header';

  constructor(public hduId: string, public changes: HeaderEntry[]) { }
}

/**
 * HDU Actions
 */

export class LoadImageHduHistogram {
  public static readonly type = '[File] Load Image HDU Histogram';

  constructor(public hduId: string) { }
}

export class LoadImageHduHistogramSuccess {
  public static readonly type = '[File] Load Image HDU Histogram Success';

  constructor(public hduId: string, public hist: ImageHist) { }
}

export class InitializeFileTiles {
  public static readonly type = '[File] Initialize File Tiles';

  constructor(public fileId: string) { }
}

export class LoadRawImageTile {
  public static readonly type = '[File] Load Raw Image Tile';

  constructor(public hduId: string, public tileIndex: number) { }
}

export class LoadRawImageTileSuccess {
  public static readonly type = '[File] Load Raw Image Tile Success';

  constructor(public hduId: string, public tileIndex: number, public pixels: PixelType) { }
}

export class LoadRawImageTileFail {
  public static readonly type = '[File] Load Raw Image Tile Fail';

  constructor(public hduId: string, public tileIndex: number, public error: any) { }
}

export class LoadRawImageTileCancel {
  public static readonly type = '[File] Load Raw Image Tile Cancel';

  constructor(public hduId: string, public tileIndex: number) { }
}

export class UpdateChannelMixer {
  public static readonly type = '[File] Update White Balance';

  constructor(public fileId: string, public channelMixer: [[number, number, number], [number, number, number], [number, number, number]]) { }
}

export class UpdateBlendMode {
  public static readonly type = '[File] Update Blend Mode';

  constructor(public hduId: string, public blendMode: BlendMode) { }
}

export class UpdateColorMap {
  public static readonly type = '[File] Update Color map';

  constructor(public hduId: string, public colorMap: string) { }
}

export class UpdateAlpha {
  public static readonly type = '[File] Update Alpha';

  constructor(public hduId: string, public alpha: number) { }
}

export class UpdateVisibility {
  public static readonly type = '[File] Update Visibility';

  constructor(public hduId: string, public value: boolean) { }
}

/**
 * Close File Actions
 */
export class CloseDataFile {
  public static readonly type = '[DataFile] Close File';

  constructor(public fileId: string) { }
}

export class CloseDataFileSuccess {
  public static readonly type = '[DataFile] Close File Success';

  constructor(public fileId: string) { }
}

export class CloseDataFileFail {
  public static readonly type = '[DataFile] Close File Fail';

  constructor(public fileId: string, public error: any) { }
}

export class CloseAllDataFiles {
  public static readonly type = '[DataFile] Close All Files';
}

export class CloseAllDataFilesSuccess {
  public static readonly type = '[DataFile] Close All Files Success';
}

export class CloseAllDataFilesFail {
  public static readonly type = '[DataFile] Close All Files Fail';

  constructor(public errors: any) { }
}

/**
 * Load File Actions
 */

export class LoadDataFile {
  public static readonly type = '[DataFile] Load File';

  constructor(public fileId: string) { }
}

/**
 * Save File Actions
 */

export class SaveDataFile {
  public static readonly type = '[DataFile] Save File';

  constructor(public fileId: string) { }
}

export class SaveDataFileSuccess {
  public static readonly type = '[DataFile] Save File Success';

  constructor(public fileId: string) { }
}

export class SaveDataFileFail {
  public static readonly type = '[DataFile] Save File Fail';

  constructor(public fileId: string, public error: any) { }
}

export class SaveAllDataFiles {
  public static readonly type = '[DataFile] Save All Files';
}

export class SaveAllDataFilesSuccess {
  public static readonly type = '[DataFile] Save All Files Success';
}

export class SaveAllDataFilesFail {
  public static readonly type = '[DataFile] Save All Files Fail';

  constructor(public errors: any) { }
}

export class InvalidateHeader {
  public static readonly type = '[Workbench HDU State] Invalidate Header';

  constructor(public hduId: string) { }
}

export class InvalidateRawImageTiles {
  public static readonly type = '[Workbench HDU State] Invalidate Raw Image Tiles';

  constructor(public hduId: string) { }
}

export class InvalidateRawImageTile {
  public static readonly type = '[Workbench HDU State] Invalidate Raw Image Tile';

  constructor(public hduId: string, public tileIndex: number) { }
}

/**
 * Normalization Actions
 */

export class InvalidateNormalizedImageTiles {
  public static readonly type = '[Workbench HDU State] Invalidate Normalized Image Tiles';

  constructor(public hduId: string) { }
}

export class InvalidateNormalizedImageTile {
  public static readonly type = '[Workbench HDU State] Invalidate Normalized Image Tile';

  constructor(public hduId: string, public tileIndex: number) { }
}

export class UpdateNormalizedImageTile {
  public static readonly type = '[Workbench HDU State] Update Normalized Image Tile';

  constructor(public hduId: string, public tileIndex: number) { }
}

export class CalculateNormalizedPixels {
  public static readonly type = '[Workbench HDU State] Calculate Normalized Pixels';

  constructor(public hduId: string, public tileIndex: number) { }
}

export class CalculateNormalizedPixelsSuccess {
  public static readonly type = '[Workbench HDU State] Calculate Normalized Pixels Success';

  constructor(public hduId: string, public tileIndex: number, public compositePixels: Uint32Array, public redChannel: Uint16Array, public greenChannel: Uint16Array, public blueChannel: Uint16Array,) { }
}

export class UpdateNormalizedImageTileSuccess {
  public static readonly type = '[Workbench HDU State] Update Normalized Image Tile Success';

  constructor(public hduId: string, public tileIndex: number, pixels: Uint32Array) { }
}

export class UpdateNormalizedImageTileFail {
  public static readonly type = '[Workbench HDU State] Update Normalized Image Tile Fail';

  constructor(public hduId: string, public tileIndex: number) { }
}

export class UpdateNormalizer {
  public static readonly type = '[Workbench HDU State] Update Normalizer';

  constructor(public hduId: string, public changes: Partial<PixelNormalizer>) { }
}

export class UpdateNormalizerSuccess {
  public static readonly type = '[Workbench HDU State] Update Normalizer Success';

  constructor(public hduId: string) { }
}

/**
 * Composite Actions
 */

export class InvalidateCompositeImageTiles {
  public static readonly type = '[Workbench HDU State] Invalidate Composite Image Tiles';

  constructor(public fileId: string) { }
}

export class InvalidateCompositeImageTile {
  public static readonly type = '[Workbench HDU State] Invalidate Composite Image Tile';

  constructor(public fileId: string, public tileIndex: number) { }
}

export class UpdateCompositeImageTile {
  public static readonly type = '[Workbench HDU State] Update Composite Image Tile';

  constructor(public fileId: string, public tileIndex: number) { }
}

export class UpdateCompositeImageTileSuccess {
  public static readonly type = '[Workbench HDU State] Update Composite Image Tile Success';

  constructor(public fileId: string, public tileIndex: number, pixels: Uint32Array) { }
}

export class UpdateCompositeImageTileFail {
  public static readonly type = '[Workbench HDU State] Update Composite Image Tile Fail';

  constructor(public fileId: string, public tileIndex: number) { }
}

/**
 * Transformation Actions
 */

export class CenterRegionInViewport {
  public static readonly type = '[Transformation] Center Region In Viewport';

  constructor(
    public imageDataId: string,
    public imageTransformId: string,
    public viewportTransformId: string,
    public viewportSize: { width: number; height: number },
    public region: Region
  ) { }
}

export class ZoomBy {
  public static readonly type = '[Transformation] Zoom By';

  constructor(
    public imageDataId: string,
    public imageTransformId: string,
    public viewportTransformId: string,
    public viewportSize: { width: number; height: number },
    public scaleFactor: number,
    public anchorPoint: { x: number; y: number }
  ) { }
}

export class ZoomTo {
  public static readonly type = '[Transformation] Zoom To';

  constructor(
    public imageDataId: string,
    public imageTransformId: string,
    public viewportTransformId: string,
    public viewportSize: { width: number; height: number },
    public scale: number,
    public anchorPoint: { x: number; y: number }
  ) { }
}

export class MoveBy {
  public static readonly type = '[Transformation] Move By';

  constructor(
    public imageDataId: string,
    public imageTransformId: string,
    public viewportTransformId: string,
    public viewportSize: { width: number; height: number },
    public xShift: number,
    public yShift: number
  ) { }
}

export class RotateBy {
  public static readonly type = '[Transformation] Rotate By';

  constructor(
    public imageDataId: string,
    public imageTransformId: string,
    public viewportTransformId: string,
    public viewportSize: { width: number; height: number },
    public rotationAngle: number,
    public anchorPoint: { x: number; y: number } | null = null
  ) { }
}

// export class RotateTo {
//   public static readonly type = '[Transformation] Rotate To';

//   constructor(public transformation: Transformation, public imageDataId: string, public rotationAngle: number, public anchorPoint?: { x: number, y: number }) { }
// }

export class Flip {
  public static readonly type = '[Transformation] Flip';

  constructor(
    public imageDataId: string,
    public imageTransformId: string,
    public viewportTransformId: string,
    public axis: 'vertical' | 'horizontal',
    public viewportSize: { width: number; height: number },
    public anchorPoint: { x: number; y: number } | null = null
  ) { }
}

export class ResetImageTransform {
  public static readonly type = '[Workbench] Reset Image Transform';

  constructor(public imageDataId: string, public imageTransformId: string, public viewportTransformId: string) { }
}

export class ResetViewportTransform {
  public static readonly type = '[Workbench] Reset Viewport Transform';

  constructor(public imageDataId: string, public imageTransformId: string, public viewportTransformId: string) { }
}

export class UpdateTransform {
  public static readonly type = '[Transformation] Update';

  constructor(public transformId: string, public changes: Partial<Transform>) { }
}
