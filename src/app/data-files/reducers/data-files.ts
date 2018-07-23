import { createSelector } from '@ngrx/store';
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';

import { Point, Matrix, Rectangle } from "paper";

import {
  DataFile, ImageFile, TableFile,
  getYTileDim, getXTileDim, getWidth, getHeight
} from '../models/data-file';
import { calcLevels } from '../models/image-hist';
import { ImageTile } from '../models/image-tile';
import { DataFileType } from '../models/data-file-type';

import * as dataFileActions from '../actions/data-file';
import * as imageFileActions from '../actions/image-file';
import * as authActions from '../../auth/actions/auth';

let MARKER_ID = 0;

/**
 * @ngrx/entity provides a predefined interface for handling
 * a structured dictionary of records. This interface
 * includes an array of ids, and a dictionary of the provided
 * model type by id. This interface is extended to include
 * any additional interface properties.
 */
export interface State extends EntityState<DataFile> {
  libraryLoading: boolean;
}

/**
 * createEntityAdapter creates many an object of helper
 * functions for single or multiple operations
 * against the dictionary of records. The configuration
 * object takes a record id selector function and
 * a sortComparer option which is set to a compare
 * function if the records are to be sorted.
 */
export const adapter: EntityAdapter<DataFile> = createEntityAdapter<DataFile>({
  selectId: (dataFile: DataFile) => dataFile.id,
  sortComparer: false,
});

/** getInitialState returns the default initial state
 * for the generated entity state. Initial state
 * additional properties can also be defined.
*/
export const initialState: State = adapter.getInitialState({
  libraryLoading: false,
});

export function reducer(
  state = initialState,
  action: dataFileActions.Actions | imageFileActions.Actions | authActions.Actions
): State {
  switch (action.type) {
    case authActions.LOGOUT: {
      return {
        ...adapter.removeAll(initialState)
      }
    }

    case dataFileActions.LOAD_LIBRARY: {
      return {
        ...state,
        libraryLoading: true
      };
    }

    case dataFileActions.LOAD_LIBRARY_SUCCESS: {
      let newFileIds = action.payload.map(file => file.id);
      let currentFileIds = Object.keys(state.entities);

      let defunctFileIds = currentFileIds.filter(id => {
        return !newFileIds.includes(id);
      });

      let newFiles = action.payload.filter(dataFile => {
        return !currentFileIds.includes(dataFile.id);
      })

      let result = adapter.removeMany(defunctFileIds, state);
      result = adapter.addMany(newFiles, result);
      return {
        ...result,
        libraryLoading: false,
      };
    }

    case dataFileActions.LOAD_LIBRARY_FAIL: {
      return {
        ...state,
        libraryLoading: false
      };
    }

    case dataFileActions.REMOVE_DATA_FILE_SUCCESS: {
      return {
        ...adapter.removeOne(action.payload.file.id, state),
      }
    }
    
    case dataFileActions.LOAD_DATA_FILE_HDR: {
      return {
        ...adapter.updateOne({
          'id': action.payload.file.id, 'changes': {
            headerLoaded: false,
            headerLoading: true
          }
        }, state),
      };
    }
    case dataFileActions.LOAD_DATA_FILE_HDR_SUCCESS: {
      return {
        ...adapter.updateOne({
          'id': action.payload.file.id, 'changes': {
            header: action.payload.header,
            headerLoaded: true,
            headerLoading: false
          }
        }, state),
      };
    }
    case dataFileActions.LOAD_DATA_FILE_HDR_FAIL: {
      return {
        ...adapter.updateOne({
          'id': action.payload.file.id, 'changes': {
            headerLoaded: false,
            headerLoading: false
          }
        }, state),
      };
    }
    case imageFileActions.LOAD_IMAGE_HIST: {
      if (state.entities[action.payload.file.id].type == DataFileType.IMAGE) {
        return {
          ...adapter.updateOne({
            'id': action.payload.file.id, 'changes': {
              histLoaded: false,
              histLoading: true
            }
          }, state),
        }
      }
      return state;
    }
    case imageFileActions.LOAD_IMAGE_HIST_SUCCESS: {
      if (state.entities[action.payload.file.id].type == DataFileType.IMAGE) {
        return {
          ...adapter.updateOne({
            'id': action.payload.file.id, 'changes': {
              histLoaded: true,
              histLoading: false,
              hist: action.payload.hist
            }
          }, state),
        }
      }
      return state;
    }
    case imageFileActions.LOAD_IMAGE_HIST_FAIL: {
      if (state.entities[action.payload.file.id].type == DataFileType.IMAGE) {
        return {
          ...adapter.updateOne({
            'id': action.payload.file.id, 'changes': {
              histLoaded: false,
              histLoading: false
            }
          }, state),
        }
      }
      return state;
    }

    case imageFileActions.INIT_IMAGE_TILES: {
      if (state.entities[action.payload.file.id].type == DataFileType.IMAGE) {
        let imageFile = state.entities[action.payload.file.id] as ImageFile;
        let tiles: ImageTile[] = [];

        for (let j = 0; j < getYTileDim(imageFile); j += 1) {
          let tw = imageFile.tileWidth;
          let th = imageFile.tileHeight;

          if (j === getYTileDim(imageFile) - 1) {
            th -= (j + 1) * imageFile.tileHeight - getHeight(imageFile);
          }
          for (let i = 0; i < getXTileDim(imageFile); i += 1) {
            if (i === getXTileDim(imageFile) - 1) {
              tw -= (i + 1) * imageFile.tileWidth - getWidth(imageFile);
            }
            let index = j * getXTileDim(imageFile) + i;
            let x = i * imageFile.tileWidth;
            let y = j * imageFile.tileHeight;
            tiles.push({
              index: index,
              x: x,
              y: y,
              width: tw,
              height: th,
              pixelsLoaded: false,
              pixelsLoading: false,
              pixelLoadingFailed: false,
              pixels: null,
            });
          }
        }

        return {
          ...adapter.updateOne({
            'id': imageFile.id, 'changes': {
              tiles: tiles,
              tilesInitialized: true
            }
          }, state),
        }
      }
      return state;

    }

    case imageFileActions.LOAD_IMAGE_TILE_PIXELS: {
      if (state.entities[action.payload.file.id].type == DataFileType.IMAGE) {
        let imageFile = state.entities[action.payload.file.id] as ImageFile
        let tile = Object.assign({}, imageFile.tiles[action.payload.tile.index]);
        tile.pixelsLoaded = false;
        tile.pixelsLoading = true;
        let tiles = [...imageFile.tiles];
        tiles[tile.index] = tile;

        return {
          ...adapter.updateOne({
            'id': action.payload.file.id, 'changes': {
              tiles: tiles
            }
          }, state),
        }
      }
      return state;
    }
    case imageFileActions.LOAD_IMAGE_TILE_PIXELS_SUCCESS: {
      if (state.entities[action.payload.file.id].type == DataFileType.IMAGE) {
        let imageFile = state.entities[action.payload.file.id] as ImageFile
        let tile = Object.assign({}, (state.entities[action.payload.file.id] as ImageFile).tiles[action.payload.tileIndex]);
        tile.pixelsLoaded = true;
        tile.pixelsLoading = false;
        tile.pixels = action.payload.pixels;
        let tiles = [...imageFile.tiles];
        tiles[tile.index] = tile;

        return {
          ...adapter.updateOne({
            'id': action.payload.file.id, 'changes': {
              tiles: tiles
            }
          }, state),
        }
      }
      return state;
    }

    case imageFileActions.LOAD_IMAGE_TILE_PIXELS_FAIL: {
      //verify that file is still in library
      if(!state.entities[action.payload.file.id]) return state;

      // must save failure to state so that no more requests are sent by draw function
      if (state.entities[action.payload.file.id].type == DataFileType.IMAGE) {
        let imageFile = state.entities[action.payload.file.id] as ImageFile;
        let tile = Object.assign({}, (state.entities[action.payload.file.id] as ImageFile).tiles[action.payload.tileIndex]);
        tile.pixelsLoaded = false;
        tile.pixelsLoading = false;
        tile.pixelLoadingFailed = true;
        let tiles = [...imageFile.tiles];
        tiles[tile.index] = tile;

        return {
          ...adapter.updateOne({
            'id': action.payload.file.id, 'changes': {
              tiles: tiles
            }
          }, state),
        }
      }
      return state;
    }

    case imageFileActions.LOAD_IMAGE_TILE_PIXELS_CANCEL: {
      let imageFile = state.entities[action.payload.file.id] as ImageFile;
      let tile = Object.assign({}, (state.entities[action.payload.file.id] as ImageFile).tiles[action.payload.tileIndex]);
      tile.pixelsLoaded = false;
      tile.pixelsLoading = false;
      tile.pixelLoadingFailed = false;
      let tiles = [...imageFile.tiles];
      tiles[tile.index] = tile;

      return {
        ...adapter.updateOne({
          'id': action.payload.file.id, 'changes': {
            tiles: tiles
          }
        }, state),
      }
    }






    default: {
      return state;
    }
  }
}
