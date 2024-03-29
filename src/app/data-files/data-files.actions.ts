import { DataFile, Header, PixelType, ILayer, ColorBalanceMode } from './models/data-file';
import { ImageHistogram } from './models/image-histogram';
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

  constructor(public layers: ILayer[], public correlationId?: string) { }
}

export class LoadLibraryFail {
  public static readonly type = '[File] Load Library Fail';

  constructor(public error: any, public correlationId?: string) { }
}

/**
 * Close Layer Events
 */

export class CloseLayerSuccess {
  public static readonly type = '[File] Close Layer Success';

  constructor(public layerId: string) { }
}

export class CloseLayerFail {
  public static readonly type = '[File] Close Layer Fail';

  constructor(public layerId: string, public error: any) { }
}

/**
 * Load File Actions
 */

export class InitializeFile {
  public static readonly type = '[File] Initialize File';

  constructor(public fileId: string) { }

}

export class LoadLayer {
  public static readonly type = '[File] Load Layer';

  constructor(public layerId: string) { }
}

export class LoadLayerHeader {
  public static readonly type = '[File] Load Layer Header';

  constructor(public layerId: string) { }
}

export class LoadLayerHeaderSuccess {
  public static readonly type = '[File] Load Layer Header Success';

  constructor(public layerId: string) { }
}

export class LoadImageLayerHistogram {
  public static readonly type = '[File] Load Image Layer Histogram';

  constructor(public layerId: string) { }
}

export class LoadImageLayerHistogramSuccess {
  public static readonly type = '[File] Load Image Layer Histogram Success';

  constructor(public layerId: string, public hist: ImageHistogram) { }
}




/**
 * Layer Actions
 */

export class UpdateLayerHeader {
  public static readonly type = '[File] Update Layer Header';

  constructor(public layerId: string, public changes: HeaderEntry[]) { }
}

export class InitializeFileTiles {
  public static readonly type = '[File] Initialize File Tiles';

  constructor(public fileId: string) { }
}

export class LoadRawImageTile {
  public static readonly type = '[File] Load Raw Image Tile';

  constructor(public layerId: string, public tileIndex: number) { }
}

export class LoadRawImageTileSuccess {
  public static readonly type = '[File] Load Raw Image Tile Success';

  constructor(public layerId: string, public tileIndex: number, public pixels: PixelType) { }
}

export class LoadRawImageTileFail {
  public static readonly type = '[File] Load Raw Image Tile Fail';

  constructor(public layerId: string, public tileIndex: number, public error: any) { }
}

export class LoadRawImageTileCancel {
  public static readonly type = '[File] Load Raw Image Tile Cancel';

  constructor(public layerId: string, public tileIndex: number) { }
}

export class UpdateChannelMixer {
  public static readonly type = '[File] Update White Balance';

  constructor(public fileId: string, public channelMixer: [[number, number, number], [number, number, number], [number, number, number]]) { }
}

export class UpdateBlendMode {
  public static readonly type = '[File] Update Blend Mode';

  constructor(public layerId: string, public blendMode: BlendMode) { }
}

export class UpdateBlendModeSuccess {
  public static readonly type = '[File] Update Blend Mode Success';

  constructor(public layerId: string) { }
}

export class UpdateColorMap {
  public static readonly type = '[File] Update Color map';

  constructor(public layerId: string, public colorMap: string) { }
}

export class UpdateColorMapSuccess {
  public static readonly type = '[File] Update Color Map Success';

  constructor(public layerId: string) { }
}

export class UpdateAlpha {
  public static readonly type = '[File] Update Alpha';

  constructor(public layerId: string, public alpha: number) { }
}

export class UpdateAlphaSuccess {
  public static readonly type = '[File] Update Alpha Success';

  constructor(public layerId: string) { }
}

export class UpdateVisibility {
  public static readonly type = '[File] Update Visibility';

  constructor(public layerId: string, public value: boolean) { }
}

export class UpdateVisibilitySuccess {
  public static readonly type = '[File] Update Visibility Success';

  constructor(public layerId: string) { }
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
  public static readonly type = '[Workbench Layer State] Invalidate Header';

  constructor(public layerId: string) { }
}

export class InvalidateRawImageTiles {
  public static readonly type = '[Workbench Layer State] Invalidate Raw Image Tiles';

  constructor(public layerId: string) { }
}

export class InvalidateRawImageTile {
  public static readonly type = '[Workbench Layer State] Invalidate Raw Image Tile';

  constructor(public layerId: string, public tileIndex: number) { }
}

/**
 * Normalization Actions
 */

export class SetFileColorBalanceMode {
  public static readonly type = '[Workbench Layer State] Set File Color Balance Mode';

  constructor(public fileId: string, public value: ColorBalanceMode) { }
}

// export class SetFileNormalizerSync {
//   public static readonly type = '[Workbench Layer State] SetFileNormalizerSync';

//   constructor(public fileId: string, public value: boolean) { }
// }

export class SyncFileNormalizers {
  public static readonly type = '[Workbench Layer State] Sync File Normalizers';

  constructor(public fileId: string, public refLayerId: string) { }
}

export class InvalidateNormalizedImageTiles {
  public static readonly type = '[Workbench Layer State] Invalidate Normalized Image Tiles';

  constructor(public layerId: string) { }
}

export class InvalidateNormalizedImageTile {
  public static readonly type = '[Workbench Layer State] Invalidate Normalized Image Tile';

  constructor(public layerId: string, public tileIndex: number) { }
}

export class UpdateNormalizedImageTile {
  public static readonly type = '[Workbench Layer State] Update Normalized Image Tile';

  constructor(public layerId: string, public tileIndex: number) { }
}

export class CalculateNormalizedPixels {
  public static readonly type = '[Workbench Layer State] Calculate Normalized Pixels';

  constructor(public layerId: string, public tileIndex: number) { }
}

export class CalculateNormalizedPixelsSuccess {
  public static readonly type = '[Workbench Layer State] Calculate Normalized Pixels Success';

  constructor(public layerId: string, public tileIndex: number, public rgba: Uint32Array) { }
}

export class UpdateNormalizedImageTileSuccess {
  public static readonly type = '[Workbench Layer State] Update Normalized Image Tile Success';

  constructor(public layerId: string, public tileIndex: number, pixels: Uint32Array) { }
}

export class UpdateNormalizedImageTileFail {
  public static readonly type = '[Workbench Layer State] Update Normalized Image Tile Fail';

  constructor(public layerId: string, public tileIndex: number) { }
}

export class UpdateNormalizer {
  public static readonly type = '[Workbench Layer State] Update Normalizer';

  constructor(public layerId: string, public changes: Partial<PixelNormalizer>, public skipFileSync = false) { }
}

export class UpdateNormalizerSuccess {
  public static readonly type = '[Workbench Layer State] Update Normalizer Success';

  constructor(public layerId: string) { }
}

/**
 * Composite Actions
 */

export class InvalidateCompositeImageTiles {
  public static readonly type = '[Workbench Layer State] Invalidate Composite Image Tiles';

  constructor(public fileId: string) { }
}

export class InvalidateCompositeImageTile {
  public static readonly type = '[Workbench Layer State] Invalidate Composite Image Tile';

  constructor(public fileId: string, public tileIndex: number) { }
}

export class UpdateCompositeImageTile {
  public static readonly type = '[Workbench Layer State] Update Composite Image Tile';

  constructor(public fileId: string, public tileIndex: number) { }
}

export class UpdateCompositeImageTileSuccess {
  public static readonly type = '[Workbench Layer State] Update Composite Image Tile Success';

  constructor(public fileId: string, public tileIndex: number, pixels: Uint32Array) { }
}

export class UpdateCompositeImageTileFail {
  public static readonly type = '[Workbench Layer State] Update Composite Image Tile Fail';

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
