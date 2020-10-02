import { ImageTile } from '../data-files/models/image-tile';
import { PixelNormalizer } from './models/pixel-normalizer';
import { Region } from './models/region';
import { SonificationPanelState, SonifierRegionMode } from './models/sonifier-file-state';
import { PlottingPanelState } from './models/plotter-file-state';
import { PosType, Source } from './models/source';
import { Matrix } from 'svgjs';
import { PhotometryPanelState } from './models/photometry-file-state';
import { SourceExtractionJobSettings } from '../jobs/models/source-extraction';
import { SourceExtractionSettings } from './models/source-extraction-settings';
import { Transform } from './models/transformation';
import { CustomMarker } from './models/custom-marker';
import { Marker } from './models/marker';
import { PhotData } from './models/source-phot-data';

export class InitializeWorkbenchHduState {
  public static readonly type = '[Workbench HDU State] Initialize Workbench HDU State';

  constructor(public hduIds: string[]) { }
}

/* Normalization */
export class RenormalizeImageHdu {
  public static readonly type = '[Workbench HDU State] Renormalize Image Hdu';

  constructor(public hduId: string) { }
}

export class NormalizeImageTile {
  public static readonly type = '[Workbench HDU State] Normalize Image Tile';

  constructor(public hduId: string, public tileIndex: number) { }
}

export class UpdateNormalizer {
  public static readonly type = '[Workbench HDU State] Update Normalizer';

  constructor(public hduId: string, public changes: Partial<PixelNormalizer>) { }
}

/* Sonification */
export class SonificationViewportSync {
  public static readonly type = '[Sonifier] Sonification Viewport Sync';

  constructor(public hduId: string) { }
}

export class SonificationRegionChanged {
  public static readonly type = '[Sonifier] Region Changed';

  constructor(public hduId: string) { }
}

export class AddRegionToHistory {
  public static readonly type = '[Sonifier] Add Region to History';

  constructor(public hduId: string, public region: Region) { }
}

export class ClearRegionHistory {
  public static readonly type = '[Sonifier] Clear Region History';

  constructor(public hduId: string) { }
}

export class UndoRegionSelection {
  public static readonly type = '[Sonifier] Undo Region Selection';

  constructor(public hduId: string) { }
}

export class RedoRegionSelection {
  public static readonly type = '[Sonifier] Redo Region Selection';

  constructor(public hduId: string) { }
}

export class UpdateSonifierFileState {
  public static readonly type = '[Sonifier] Update File State';

  constructor(public hduId: string, public changes: Partial<SonificationPanelState>) { }
}

export class SetProgressLine {
  public static readonly type = '[Sonifier] Set Progress Line';

  constructor(public hduId: string, public line: { x1: number, y1: number, x2: number, y2: number }) { }
}

/* Plotting */

export class UpdatePlotterFileState {
  public static readonly type = '[Plotter] Update Plotter File State'

  constructor(public hduId: string, public changes: Partial<PlottingPanelState>) { }
}

export class StartLine {
  public static readonly type = '[Plotter] Start Line'

  constructor(public hduId: string, public point: { primaryCoord: number, secondaryCoord: number, posType: PosType }) { }
}

export class UpdateLine {
  public static readonly type = '[Plotter] Update Line'

  constructor(public hduId: string, public point: { primaryCoord: number, secondaryCoord: number, posType: PosType }) { }
}

/* Transformations */

export class ZoomBy {
  public static readonly type = '[Transformation] Zoom By';

  constructor(public hduId: string, public scaleFactor: number, public viewportAnchor: { x: number, y: number }) { }
}

export class ZoomTo {
  public static readonly type = '[Transformation] Zoom To';

  constructor(public hduId: string, public scale: number, public anchorPoint: { x: number, y: number }) { }
}

export class MoveBy {
  public static readonly type = '[Transformation] Move By';

  constructor(public hduId: string, public xShift: number, public yShift: number) { }
}

export class SetImageTransform {
  public static readonly type = '[Transformation] Set Image Transform';

  constructor(public hduId: string, public transform: Transform) { }
}

export class ResetImageTransform {
  public static readonly type = '[Transformation] Reset Image Transform';

  constructor(public hduId: string) { }
}

export class SetViewportTransform {
  public static readonly type = '[Transformation] Set Viewport Transform';

  constructor(public hduId: string, public transform: Transform) { }
}

export class RotateBy {
  public static readonly type = '[Transformation] Rotate By';

  constructor(public hduId: string, public rotationAngle: number, public anchorPoint?: { x: number, y: number }) { }
}

export class RotateTo {
  public static readonly type = '[Transformation] Rotate To';

  constructor(public hduId: string, public rotationAngle: number, public anchorPoint?: { x: number, y: number }) { }
}

export class Flip {
  public static readonly type = '[Transformation] Flip';

  constructor(public hduId: string) { }
}

export class CenterRegionInViewport {
  public static readonly type = '[Transformation] Center Region In Viewport';

  constructor(public hduId: string, public region: Region, public viewportSize?: { width: number, height: number }) { }
}


export class UpdateCurrentViewportSize {
  public static readonly type = '[Transformation] Update Current Viewport Size'

  constructor(public hduId: string, public viewportSize: { width: number, height: number }) { }
}



/*Source Extractor*/
export class UpdateFilteredSources {
  public static readonly type = '[Source Extractor] Update Filtered Sources'

  constructor(public hduId: string) { }
}

export class UpdatePhotometryFileState {
  public static readonly type = '[Source Extractor] Update File State';

  constructor(public hduId: string, public changes: Partial<PhotometryPanelState>) { }
}

export class RemoveSelectedSources {
  public static readonly type = '[Source Extractor] Remove Selected Sources'

  constructor(public hduId: string) { }
}

export class RemoveAllSources {
  public static readonly type = '[Source Extractor] Remove All Sources'

  constructor(public hduId: string) { }
}

export class SetSourceLabel {
  public static readonly type = '[Source Extractor] Set Source Label'

  constructor(public hduId: string, public source: Source, public label: string) { }
}

/* Markers */
export class UpdateCustomMarker {
  public static readonly type = '[Markers] Update Custom Marker'

  /* TODO:  Figure out why error TS2322 is thrown by compiler when changes type is set to Partial<Marker> */
  constructor(public hduId: string, public markerId: string, public changes: any) { }
}

export class AddCustomMarkers {
  public static readonly type = '[Markers] Add Custom Marker'

  constructor(public hduId: string, public markers: Marker[]) { }
}

export class RemoveCustomMarkers {
  public static readonly type = '[Markers] Remove Custom Marker'

  constructor(public hduId: string, public markers: Marker[]) { }
}

export class SelectCustomMarkers {
  public static readonly type = '[Markers] Select Custom Markers'

  constructor(public hduId: string, public markers: Marker[]) { }
}

export class DeselectCustomMarkers {
  public static readonly type = '[Markers] Deselect Custom Markers'

  constructor(public hduId: string, public markers: Marker[]) { }
}

export class SetCustomMarkerSelection {
  public static readonly type = '[Markers] Set Custom Marker Selection'

  constructor(public hduId: string, public markers: Marker[]) { }
}

export class AddPhotDatas {
  public static readonly type = '[Sources Phot Data] Add Source Phot Datas'

  constructor(public photDatas: PhotData[]) { }
}

export class RemoveAllPhotDatas {
  public static readonly type = '[Phot Data] Remove All Phot Data'

  constructor() { }
}

export class RemovePhotDatas {
  public static readonly type = '[Phot Data] Remove Source Phot Datas'

  constructor(public sourceId: string) { }
}

