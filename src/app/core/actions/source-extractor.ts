import { Action } from '@ngrx/store';
import { ImageFile } from '../../data-files/models/data-file';
import { Region } from '../models/region';
import { SourceExtractorFileState } from '../models/source-extractor-file-state';
import { SourceExtractorModeOption } from '../models/source-extractor-mode-option'
import { Source } from '../models/source';
import { SourceExtractionJob } from '../../jobs/models/source-extraction';

export const SET_REGION = '[Source Extractor] Set Region';
export const UPDATE_REGION = '[Source Extractor] Update Region';
export const UPDATE_FILTERED_SOURCES = '[Source Extractor] Update Filtered Sources';
export const UPDATE_FILE_STATE = '[Source Extractor] Update File State';
export const EXTRACT_SOURCES = '[Source Extractor] Extract Sources';
export const EXTRACT_SOURCES_SUCCESS = '[Source Extractor] Extract Sources Success';
export const EXTRACT_SOURCES_FAIL = '[Source Extractor] Extract Sources Fail';
export const SET_SOURCE_EXTRACTION_JOB = '[Source Extractor] Set Source Extraction Job';

export const UPDATE_SOURCE = '[Source Extractor] Update Source';


export const REMOVE_SELECTED_SOURCES = '[Source Extractor] Remove Selected Sources';
export const REMOVE_ALL_SOURCES = '[Source Extractor] Remove All Sources';
// export const PHOTOMETER_XY_SOURCES = '[Source Extractor] Photometer XY Sources';
// export const PHOTOMETER_RADEC_SOURCES = '[Source Extractor] Photometer RADEC Sources';
// export const PHOTOMETER_SOURCES_SUCCESS = '[Source Extractor] Photometer Sources Success';
// export const PHOTOMETER_SOURCES_FAIL = '[Source Extractor] Photometer Sources Fail';

export const SET_SOURCE_LABEL = '[Source Extractor] Set Source Label';

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

export class UpdateFileState implements Action {
  readonly type = UPDATE_FILE_STATE;

  constructor(public payload: { file: ImageFile, changes: Partial<SourceExtractorFileState> }) { }
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

  constructor(public payload: { error: string }) { }
}

export class SetSourceExtractionJob implements Action {
  readonly type = SET_SOURCE_EXTRACTION_JOB;

  constructor(public payload: { job: SourceExtractionJob }) { }
}

export class UpdateSource implements Action {
  readonly type = UPDATE_SOURCE

  constructor(public payload: { file: ImageFile, sourceId: string, changes: Partial<Source> }) { }
}


export class RemoveSelectedSources implements Action {
  readonly type = REMOVE_SELECTED_SOURCES

  constructor(public payload: { file: ImageFile }) { }
}

export class RemoveAllSources implements Action {
  readonly type = REMOVE_ALL_SOURCES

  constructor(public payload: { file: ImageFile }) { }
}

// export class PhotometerXYSources implements Action {
//   readonly type = PHOTOMETER_XY_SOURCES

//   constructor(public payload: { file: ImageFile, coords: Array<{ x: number, y: number }> }) { }
// }

// export class PhotometerRaDecSources implements Action {
//   readonly type = PHOTOMETER_RADEC_SOURCES

//   constructor(public payload: { file: ImageFile, coords: Array<{ raHours: number, decDegs: number }> }) { }
// }

// export class PhotometerSourcesSuccess implements Action {
//   readonly type = PHOTOMETER_SOURCES_SUCCESS

//   constructor(public payload: { file: ImageFile, sources: Source[] }) { }
// }

// export class PhotometerSourcesFail implements Action {
//   readonly type = PHOTOMETER_SOURCES_FAIL

//   constructor(public payload: { file: ImageFile, error: any }) { }
// }

export class SetSourceLabel implements Action {
  readonly type = SET_SOURCE_LABEL

  constructor(public payload: { file: ImageFile, source: Source, label: string }) { }
}


export type Actions =
  | UpdateFilteredSources
  | SetRegion
  | UpdateRegion
  | UpdateFileState
  | ExtractSources
  | SetSourceExtractionJob
  | ExtractSourcesSuccess
  | ExtractSourcesFail
  | UpdateSource
  | RemoveAllSources
  | RemoveSelectedSources
  // | PhotometerXYSources
  // | PhotometerRaDecSources
  // | PhotometerSourcesSuccess
  // | PhotometerSourcesFail
  | SetSourceLabel;
