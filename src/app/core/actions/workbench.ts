import { Action } from '@ngrx/store';

import { ImageFile } from '../../data-files/models/data-file';
import { ImageTile } from '../../data-files/models/image-tile';


import { Region } from '../models/region';
import { Marker } from '../models/marker';
import { PixelNormalizer } from '../models/pixel-normalizer';
import { SonifierFileState } from '../models/sonifier-file-state';
import { SourceExtractorFileState } from '../models/source-extractor-file-state';
import { PlotterFileState } from '../models/plotter-file-state';
import { SourceExtractorModeOption } from '../models/source-extractor-mode-option'
import { PhotSettings } from '../models/phot-settings';
import { SourceExtractionSettings } from '../models/source-extraction-settings';
import { Source } from '../models/source';


export const SELECT_DATA_FILE = '[Workbench] Select Data File';

export const INIT_AUTO_LEVELS = '[Workbench] Init Auto Levels';

export const NORMALIZE_IMAGE_TILE = '[Workbench] Normalize Image Tile';
export const NORMALIZE_IMAGE_TILE_SUCCESS = '[Workbench] Normalize Image Tile Success';
export const NORMALIZE_IMAGE_TILE_FAIL = '[Workbench] Normalize Image Tile Fail';

export const RENORMALIZE_IMAGE_FILE = '[Workbench] Renormalize Image File';

export const UPDATE_VIEWPORT_SIZE = '[Workbench] Update Viewport Size';
export const ZOOM_BY = '[Workbench] Zoom By';
export const ZOOM_TO = '[Workbench] Zoom To';
export const MOVE_BY = '[Workbench] Move By';
export const MOVE_TO = '[Workbench] Move To';
export const UPDATE_NORMALIZER = '[Workbench] Update Normalizer';

export const ADD_MARKER = '[Workbench] Add Marker';
export const REMOVE_MARKER = '[Workbench] Remove Marker';
export const UPDATE_MARKER = '[Workbench] Update Marker';

export const SET_SONIFIER_REGION = '[Workbench] Set Sonifier Region';
export const CLEAR_SONIFIER_REGION_HISTORY = '[Workbench] Clear Sonifier Region History';
export const UNDO_SONIFIER_REGION_SELECTION = '[Workbench] Undo Sonifier Region Selection';
export const REDO_SONIFIER_REGION_SELECTION = '[Workbench] Redo Sonifier Region Selection';
export const UPDATE_SONIFIER_CONFIG = '[Workbench] Update Sonifier Config';

export const UPDATE_SOURCE_EXTRACTOR_REGION = '[Workbench] Update Source Extractor Region';
export const UPDATE_FILTERED_SOURCES = '[Workbench] Update Filtered Sources';
export const SET_SOURCE_EXTRACTOR_MODE = '[Workbench] Set Source Extractor Mode';
export const UPDATE_SOURCE_EXTRACTOR_FILE_STATE = '[Workbench] Update Source Extractor File State';
export const EXTRACT_SOURCES = '[Workbench] Extract Sources';
export const EXTRACT_SOURCES_SUCCESS = '[Workbench] Extract Sources Success';
export const EXTRACT_SOURCES_FAIL = '[Workbench] Extract Sources Fail';
export const SELECT_SOURCES = '[Workbench] Select Sources';
export const DESELECT_SOURCES = '[Workbench] Deselect Sources';
export const SET_SOURCE_SELECTION = '[Workbench] Set Source Selection';
export const REMOVE_SELECTED_SOURCES = '[Workbench] Remove Selected Sources';
export const REMOVE_ALL_SOURCES = '[Workbench] Remove All Sources';
export const PHOTOMETER_XY_SOURCES = '[Workbench] Photometer XY Sources';
export const PHOTOMETER_RADEC_SOURCES = '[Workbench] Photometer RADEC Sources';
export const PHOTOMETER_SOURCES_SUCCESS = '[Workbench] Photometer Sources Success';
export const PHOTOMETER_SOURCES_FAIL = '[Workbench] Photometer Sources Fail';

export const UPDATE_PHOT_SETTINGS = '[Workbench] Update Phot Settings';
export const UPDATE_SOURCE_EXTRACTION_SETTINGS = '[Workbench] Update Source Extraction Settings';

export const START_PLOTTER_LINE = '[Workbench] Set Plotter Line';
export const UPDATE_PLOTTER_LINE = '[Workbench] Update Plotter Line';
export const UPDATE_PLOTTER_FILE_STATE = '[Workbench] Update Plotter File State';

/**
 * Selection
 */

export class SelectDataFile implements Action {
  readonly type = SELECT_DATA_FILE;

  constructor(public payload: string) {}
}

export class InitAutoLevels implements Action {
  readonly type = INIT_AUTO_LEVELS;
  
  constructor(public payload: {file: ImageFile}) {}
}

export class RenormalizeImageFile implements Action {
  readonly type = RENORMALIZE_IMAGE_FILE;
  
  constructor(public payload: {file: ImageFile}) {}
}

export class NormalizeImageTile implements Action {
  readonly type = NORMALIZE_IMAGE_TILE;
  
  constructor(public payload: {file: ImageFile, tile: ImageTile}) {}
}

export class NormalizeImageTileSuccess implements Action {
  readonly type = NORMALIZE_IMAGE_TILE_SUCCESS;
  
  constructor(public payload: {fileId: string, tileIndex: number, pixels: Uint32Array}) {}
}

export class NormalizeImageTileFail implements Action {
  readonly type = NORMALIZE_IMAGE_TILE_FAIL;
  
  constructor(public payload: {fileId: string, tileIndex: number, error: any}) {}
}

/**
 * Viewer
 */

 export class UpdateViewportSize implements Action {
  readonly type = UPDATE_VIEWPORT_SIZE;
  
    constructor(public payload: {width: number, height: number}) {}
 }

export class ZoomBy implements Action {
  readonly type = ZOOM_BY;

  constructor(public payload: {file: ImageFile, scaleFactor: number, anchorPoint: {x: number, y: number}}) {}
}

export class ZoomTo implements Action {
  readonly type = ZOOM_TO;

  constructor(public payload: {file: ImageFile, scale: number, anchorPoint: {x: number, y: number}}) {}
}

export class MoveBy implements Action {
  readonly type = MOVE_BY;

  constructor(public payload: {file: ImageFile, xShift: number, yShift: number}) {}
}

export class MoveTo implements Action {
  readonly type = MOVE_TO;

  constructor(public payload: {file: ImageFile, imagePoint: {x: number, y: number}, viewportPoint?: {x: number, y: number}}) {}
}

export class UpdateNormalizer implements Action {
  readonly type = UPDATE_NORMALIZER;

  constructor(public payload: {file: ImageFile, changes: Partial<PixelNormalizer>}) {}
}




/**
 * Markers
 */

export class AddMarker implements Action {
  readonly type = ADD_MARKER;
  
  constructor(public payload: {file: ImageFile, marker: Marker}) {}
}

export class RemoveMarker implements Action {
  readonly type = REMOVE_MARKER;
  
  constructor(public payload: {fileId: string, markerId: string}) {}
}

export class UpdateMarker implements Action {
  readonly type = UPDATE_MARKER;
  
  constructor(public payload: {fileId: string, markerId: string, changes: Partial<Marker>}) {}
}

/**
 * Sonification
 */

export class SetSonifierRegion implements Action {
  readonly type = SET_SONIFIER_REGION;
  
  constructor(public payload: {file: ImageFile, region: Region, storeInHistory: boolean}) {}
}

export class ClearSonifierRegionHistory implements Action {
  readonly type = CLEAR_SONIFIER_REGION_HISTORY;
  
  constructor(public payload: {file: ImageFile}) {}
}

export class UndoSonifierRegionSelection implements Action {
  readonly type = UNDO_SONIFIER_REGION_SELECTION;
  
  constructor(public payload: {file: ImageFile}) {}
}

export class RedoSonifierRegionSelection implements Action {
  readonly type = REDO_SONIFIER_REGION_SELECTION;
  
  constructor(public payload: {file: ImageFile}) {}
}

export class UpdateSonifierConfig implements Action {
  readonly type = UPDATE_SONIFIER_CONFIG;
  
  constructor(public payload: {file: ImageFile, changes: Partial<SonifierFileState>}) {}
}

/**
 * Source Extractor
 */

export class UpdateFilteredSources implements Action {
  readonly type = UPDATE_FILTERED_SOURCES
  
  constructor(public payload: {file: ImageFile}) {}
}

export class UpdateSourceExtractorRegion implements Action {
  readonly type = UPDATE_SOURCE_EXTRACTOR_REGION
  
  constructor(public payload: {file: ImageFile}) {}
}

export class SetSourceExtractorMode implements Action {
  readonly type = SET_SOURCE_EXTRACTOR_MODE;
  
  constructor(public payload: {mode: SourceExtractorModeOption}) {}
}

export class UpdateSourceExtractorFileState implements Action {
  readonly type = UPDATE_SOURCE_EXTRACTOR_FILE_STATE;
  
  constructor(public payload: {file: ImageFile, changes: Partial<SourceExtractorFileState>}) {}
}

export class UpdatePhotSettings implements Action {
  readonly type = UPDATE_PHOT_SETTINGS;
  
  constructor(public payload: {changes: Partial<PhotSettings>}) {}
}

export class UpdateSourceExtractionSettings implements Action {
  readonly type = UPDATE_SOURCE_EXTRACTION_SETTINGS
  
  constructor(public payload: {changes: Partial<SourceExtractionSettings>}) {}
}

export class ExtractSources implements Action {
  readonly type = EXTRACT_SOURCES
  
  constructor(public payload: {file: ImageFile}) {}
}

export class ExtractSourcesSuccess implements Action {
  readonly type = EXTRACT_SOURCES_SUCCESS
  
  constructor(public payload: {file: ImageFile, sources: Source[]}) {}
}

export class ExtractSourcesFail implements Action {
  readonly type = EXTRACT_SOURCES_FAIL
  
  constructor(public payload: {file: ImageFile, error: any}) {}
}

export class SelectSources implements Action {
  readonly type = SELECT_SOURCES
  
  constructor(public payload: {file: ImageFile, sources: Source[]}) {}
}

export class DeselectSources implements Action {
  readonly type = DESELECT_SOURCES
  
  constructor(public payload: {file: ImageFile, sources: Source[]}) {}
}

export class SetSourceSelection implements Action {
  readonly type = SET_SOURCE_SELECTION
  
  constructor(public payload: {file: ImageFile, sources: Source[]}) {}
}

export class RemoveSelectedSources implements Action {
  readonly type = REMOVE_SELECTED_SOURCES
  
  constructor(public payload: {file: ImageFile}) {}
}

export class RemoveAllSources implements Action {
  readonly type = REMOVE_ALL_SOURCES
  
  constructor(public payload: {file: ImageFile}) {}
}

export class PhotometerXYSources implements Action {
  readonly type = PHOTOMETER_XY_SOURCES
  
  constructor(public payload: {file: ImageFile, coords: Array<{x: number, y: number}>}) {}
}

export class PhotometerRaDecSources implements Action {
  readonly type = PHOTOMETER_RADEC_SOURCES
  
  constructor(public payload: {file: ImageFile, coords: Array<{raHours: number, decDegs: number}>}) {}
}

export class PhotometerSourcesSuccess implements Action {
  readonly type = PHOTOMETER_SOURCES_SUCCESS
  
  constructor(public payload: {file: ImageFile, sources: Source[]}) {}
}

export class PhotometerSourcesFail implements Action {
  readonly type = PHOTOMETER_SOURCES_FAIL
  
  constructor(public payload: {file: ImageFile, error: any}) {}
}

/**
 * Plotter
 */

export class StartPlotterLine implements Action {
  readonly type = START_PLOTTER_LINE
  
  constructor(public payload: {file: ImageFile, point: {x: number, y: number}}) {}
}

export class UpdatePlotterLine implements Action {
  readonly type = UPDATE_PLOTTER_LINE
  
  constructor(public payload: {file: ImageFile, point: {x: number, y: number}}) {}
}

export class UpdatePlotterFileState implements Action {
  readonly type = UPDATE_PLOTTER_FILE_STATE
  
  constructor(public payload: {file: ImageFile, changes: Partial<PlotterFileState>}) {}
}





export type Actions =
| SelectDataFile
| InitAutoLevels
| RenormalizeImageFile
| NormalizeImageTile
| NormalizeImageTileSuccess
| NormalizeImageTileFail
| UpdateViewportSize
| ZoomBy
| ZoomTo
| MoveBy
| MoveTo
| UpdateNormalizer
| AddMarker
| RemoveMarker
| UpdateMarker
| SetSonifierRegion
| ClearSonifierRegionHistory
| UndoSonifierRegionSelection
| RedoSonifierRegionSelection
| UpdateSonifierConfig
| UpdateFilteredSources
| UpdateSourceExtractorRegion
| SetSourceExtractorMode
| UpdateSourceExtractionSettings
| UpdatePhotSettings
| UpdateSourceExtractorFileState
| ExtractSources
| ExtractSourcesSuccess
| ExtractSourcesFail
| SelectSources
| DeselectSources
| SetSourceSelection
| RemoveAllSources
| RemoveSelectedSources
| PhotometerXYSources
| PhotometerRaDecSources
| PhotometerSourcesSuccess
| PhotometerSourcesFail
| StartPlotterLine
| UpdatePlotterLine
| UpdatePlotterFileState;

