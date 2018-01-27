import { Action } from '@ngrx/store';
import { ImageFile } from '../../data-files/models/data-file';
import { Region } from '../models/region';
import { SourceExtractorFileState } from '../models/source-extractor-file-state';
import { SourceExtractorModeOption } from '../models/source-extractor-mode-option'
import { PhotSettings } from '../models/phot-settings';
import { SourceExtractionSettings } from '../models/source-extraction-settings';
import { Source } from '../models/source';

export const UPDATE_VIEWPORT = '[Source Extractor] Update Viewport';
export const SET_REGION = '[Source Extractor] Set Region';
export const UPDATE_REGION = '[Source Extractor] Update Region';
export const UPDATE_FILTERED_SOURCES = '[Source Extractor] Update Filtered Sources';
export const SET_SOURCE_EXTRACTION_MODE = '[Source Extractor] Set Source Extraction Mode';
export const UPDATE_FILE_STATE = '[Source Extractor] Update File State';
export const UPDATE_PHOT_SETTINGS = '[Source Extractor] Update Phot Settings';
export const UPDATE_SOURCE_EXTRACTION_SETTINGS = '[Source Extractor] Update Source Extraction Settings';
export const EXTRACT_SOURCES = '[Source Extractor] Extract Sources';
export const EXTRACT_SOURCES_SUCCESS = '[Source Extractor] Extract Sources Success';
export const EXTRACT_SOURCES_FAIL = '[Source Extractor] Extract Sources Fail';
export const SELECT_SOURCES = '[Source Extractor] Select Sources';
export const DESELECT_SOURCES = '[Source Extractor] Deselect Sources';
export const SET_SOURCE_SELECTION = '[Source Extractor] Set Source Selection';
export const REMOVE_SELECTED_SOURCES = '[Source Extractor] Remove Selected Sources';
export const REMOVE_ALL_SOURCES = '[Source Extractor] Remove All Sources';
export const PHOTOMETER_XY_SOURCES = '[Source Extractor] Photometer XY Sources';
export const PHOTOMETER_RADEC_SOURCES = '[Source Extractor] Photometer RADEC Sources';
export const PHOTOMETER_SOURCES_SUCCESS = '[Source Extractor] Photometer Sources Success';
export const PHOTOMETER_SOURCES_FAIL = '[Source Extractor] Photometer Sources Fail';


export class UpdateViewport implements Action {
  readonly type = UPDATE_VIEWPORT;

  constructor(public payload: { file: ImageFile, viewport: { imageX: number, imageY: number, imageWidth: number, imageHeight: number, viewportWidth: number, viewportHeight: number } }) { }
}

export class UpdateFilteredSources implements Action {
  readonly type = UPDATE_FILTERED_SOURCES

  constructor(public payload: { file: ImageFile }) { }
}

export class SetRegion implements Action {
  readonly type = SET_REGION

  constructor(public payload: { file: ImageFile, region: Region }) { }
}

export class UpdateRegion implements Action {
  readonly type = UPDATE_REGION

  constructor(public payload: { file: ImageFile }) { }
}

export class SetSourceExtractionMode implements Action {
  readonly type = SET_SOURCE_EXTRACTION_MODE;

  constructor(public payload: { mode: SourceExtractorModeOption }) { }
}

export class UpdateFileState implements Action {
  readonly type = UPDATE_FILE_STATE;

  constructor(public payload: { file: ImageFile, changes: Partial<SourceExtractorFileState> }) { }
}

export class UpdatePhotSettings implements Action {
  readonly type = UPDATE_PHOT_SETTINGS;

  constructor(public payload: { changes: Partial<PhotSettings> }) { }
}

export class UpdateSourceExtractionSettings implements Action {
  readonly type = UPDATE_SOURCE_EXTRACTION_SETTINGS

  constructor(public payload: { changes: Partial<SourceExtractionSettings> }) { }
}

export class ExtractSources implements Action {
  readonly type = EXTRACT_SOURCES

  constructor(public payload: { file: ImageFile }) { }
}

export class ExtractSourcesSuccess implements Action {
  readonly type = EXTRACT_SOURCES_SUCCESS

  constructor(public payload: { file: ImageFile, sources: Source[] }) { }
}

export class ExtractSourcesFail implements Action {
  readonly type = EXTRACT_SOURCES_FAIL

  constructor(public payload: { file: ImageFile, error: any }) { }
}

export class SelectSources implements Action {
  readonly type = SELECT_SOURCES

  constructor(public payload: { file: ImageFile, sources: Source[] }) { }
}

export class DeselectSources implements Action {
  readonly type = DESELECT_SOURCES

  constructor(public payload: { file: ImageFile, sources: Source[] }) { }
}

export class SetSourceSelection implements Action {
  readonly type = SET_SOURCE_SELECTION

  constructor(public payload: { file: ImageFile, sources: Source[] }) { }
}

export class RemoveSelectedSources implements Action {
  readonly type = REMOVE_SELECTED_SOURCES

  constructor(public payload: { file: ImageFile }) { }
}

export class RemoveAllSources implements Action {
  readonly type = REMOVE_ALL_SOURCES

  constructor(public payload: { file: ImageFile }) { }
}

export class PhotometerXYSources implements Action {
  readonly type = PHOTOMETER_XY_SOURCES

  constructor(public payload: { file: ImageFile, coords: Array<{ x: number, y: number }> }) { }
}

export class PhotometerRaDecSources implements Action {
  readonly type = PHOTOMETER_RADEC_SOURCES

  constructor(public payload: { file: ImageFile, coords: Array<{ raHours: number, decDegs: number }> }) { }
}

export class PhotometerSourcesSuccess implements Action {
  readonly type = PHOTOMETER_SOURCES_SUCCESS

  constructor(public payload: { file: ImageFile, sources: Source[] }) { }
}

export class PhotometerSourcesFail implements Action {
  readonly type = PHOTOMETER_SOURCES_FAIL

  constructor(public payload: { file: ImageFile, error: any }) { }
}


export type Actions =
  | UpdateViewport
  | UpdateFilteredSources
  | SetRegion
  | UpdateRegion
  | SetSourceExtractionMode
  | UpdateSourceExtractionSettings
  | UpdatePhotSettings
  | UpdateFileState
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
  | PhotometerSourcesFail;
