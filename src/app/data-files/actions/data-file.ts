import { Action } from '@ngrx/store';
import { DataFile, Header } from '../models/data-file';

export const LOAD_LIBRARY = '[DataFile] Load Library';
export const LOAD_LIBRARY_SUCCESS = '[DataFile] Load Library Success';
export const LOAD_LIBRARY_FAIL = '[DataFile] Load Library Fail';
export const REMOVE_DATA_FILE = '[DataFile] Remove Data File';
export const REMOVE_DATA_FILE_SUCCESS = '[DataFile] Remove Data File Success';
export const REMOVE_DATA_FILE_FAIL = '[DataFile] Remove Data File Fail';
export const REMOVE_ALL_DATA_FILES = '[DataFile] Remove All Data Files';
export const LOAD_DATA_FILE_HDR = '[DataFile] Load Data File Hdr';
export const LOAD_DATA_FILE_HDR_FAIL = '[DataFile] Load Data File Hdr Fail';
export const LOAD_DATA_FILE_HDR_SUCCESS = '[DataFile] Load Data File Hdr Success';


/**
 * Load Library Actions
 */
export class LoadLibrary implements Action {
  readonly type = LOAD_LIBRARY;
}

export class LoadLibrarySuccess implements Action {
  readonly type = LOAD_LIBRARY_SUCCESS;

  constructor(public payload: DataFile[]) { }
}

export class LoadLibraryFail implements Action {
  readonly type = LOAD_LIBRARY_FAIL;

  constructor(public payload: any) { }
}

/**
 * Remove Data File Actions
 */
export class RemoveDataFile implements Action {
  readonly type = REMOVE_DATA_FILE;

  constructor(public payload: { file: DataFile }) { }
}

export class RemoveDataFileSuccess implements Action {
  readonly type = REMOVE_DATA_FILE_SUCCESS;

  constructor(public payload: { file: DataFile }) { }
}

export class RemoveDataFileFail implements Action {
  readonly type = REMOVE_DATA_FILE_FAIL;

  constructor(public payload: any) { }
}

export class RemoveAllDataFiles implements Action {
  readonly type = REMOVE_ALL_DATA_FILES;
}

/**
 * Load File Actions
 */

export class LoadDataFileHdr implements Action {
  readonly type = LOAD_DATA_FILE_HDR;

  constructor(public payload: {file: DataFile}) { }
}

export class LoadDataFileHdrSuccess implements Action {
  readonly type = LOAD_DATA_FILE_HDR_SUCCESS;

  constructor(public payload: { file: DataFile, header: Header }) { }
}

export class LoadDataFileHdrFail implements Action {
  readonly type = LOAD_DATA_FILE_HDR_FAIL;

  constructor(public payload: { file: DataFile, error: any }) { }
}

export type Actions =
  | LoadLibrary
  | LoadLibrarySuccess
  | LoadLibraryFail
  | LoadDataFileHdr
  | LoadDataFileHdrSuccess
  | LoadDataFileHdrFail
  | RemoveDataFile
  | RemoveDataFileSuccess
  | RemoveDataFileFail;

