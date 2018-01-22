import { createSelector} from '@ngrx/store';
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { Point, Matrix } from 'paper';

import { CoordinateMode } from '../models/coordinate-mode';
import { calcLevels } from '../../data-files/models/image-hist';
import { DataFileType } from '../../data-files/models/data-file-type';
import { ImageTile } from '../../data-files/models/image-tile';
import { DataFile, ImageFile, getYTileDim, getXTileDim, getHeight, getWidth} from '../../data-files/models/data-file';
import { ViewerFileState, getViewportRegion, getScale } from '../models/viewer-file-state';
import { grayColorMap } from '../models/color-map';
import { StretchMode } from '../models/stretch-mode';

import * as viewerActions from '../actions/viewer';
import * as imageFileActions from '../../data-files/actions/image-file';
import * as dataFileActions from '../../data-files/actions/data-file';

export interface State extends EntityState<ViewerFileState> {
  imageViewerViewportSize: {width: number, height: number};
}

export const adapter: EntityAdapter<ViewerFileState> = createEntityAdapter<ViewerFileState>({
  selectId: (workbenchState: ViewerFileState) => workbenchState.fileId,
  sortComparer: false,
});

export const initialState: State = adapter.getInitialState({
  imageViewerViewportSize: {width: 0, height: 0},
});


export function reducer(state = initialState, action: viewerActions.Actions | imageFileActions.Actions | dataFileActions.Actions): State {
  switch (action.type) {
    case dataFileActions.LOAD_LIBRARY_SUCCESS: {
      let viewerFileStates: ViewerFileState[] = [];
      action.payload.filter(dataFile => dataFile.type == DataFileType.IMAGE).map(dataFile => {
        viewerFileStates.push({
          fileId: dataFile.id,
          normalizedTiles: null,
          autoLevelsInitialized: false,
          panEnabled: true,
          zoomEnabled: true,
          imageToViewportTransform:  null,
          normalizer: {
            backgroundLevel: 0,
            peakLevel: 0,
            colorMap: grayColorMap,
            stretchMode: StretchMode.Linear
          }
        })
      });
        
      return {
        ...adapter.addMany(viewerFileStates, state)
      };
    }

    case viewerActions.INIT_AUTO_LEVELS: {
      if(action.payload.file.type == DataFileType.IMAGE) {
        let imageFile = action.payload.file;
        let levels = calcLevels(imageFile.hist, 10.0, 98.0)
        
        return {
          ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
            autoBkgLevel: levels.backgroundLevel,
            autoPeakLevel: levels.peakLevel,
            autoLevelsInitialized: true
          }}, state),
        }
      }
      return state;
    }
    case imageFileActions.INIT_IMAGE_TILES: {
      let imageFile = action.payload.file;

      // also initialize the transformation matrix since it requires the 
      // image height
      let transform = new Matrix(1, 0, 0, -1, 0, getHeight(imageFile));

      let tiles : ImageTile[] = [];

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
              tiles.push({
                index: j * getXTileDim(imageFile) + i,
                x: i * tw,
                y: j * th,
                width: tw,
                height: th,
                pixelsLoaded: false,
                pixelsLoading: false,
                pixelLoadingFailed: false,
                pixels: null
              });
          }
      }

      return {
        ...adapter.updateOne({'id': imageFile.id, 'changes': {
          normalizedTiles: tiles,
          imageToViewportTransform: transform
        }}, state),
      }
      
    }
    case viewerActions.RENORMALIZE_IMAGE_FILE: {
      let imageFile = action.payload.file;

      let tiles = imageFile.tiles.map(tile => Object.assign({}, tile));
      tiles.forEach(tile => {
        tile.pixelsLoaded = false;
        tile.pixelsLoading = false;
        tile.pixels = null;
      })

      return {
        ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
          normalizedTiles: tiles,
        }}, state),
      }
    }
    case viewerActions.NORMALIZE_IMAGE_TILE: {
      let imageFile = action.payload.file;
      let viewerFileState = state.entities[imageFile.id]
      let tile = Object.assign({}, viewerFileState.normalizedTiles[action.payload.tile.index]);
      tile.pixelsLoaded = false;
      tile.pixelsLoading = true;
      let tiles = [...viewerFileState.normalizedTiles]; 
      tiles[tile.index] = tile;

      return {
        ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
          normalizedTiles: tiles,
        }}, state),
      }
    }
    case viewerActions.NORMALIZE_IMAGE_TILE_SUCCESS: {
      let viewerFileState = state.entities[action.payload.fileId]
      let tile = Object.assign({}, viewerFileState.normalizedTiles[action.payload.tileIndex]);
      tile.pixelsLoaded = true;
      tile.pixelsLoading = false;
      tile.pixels = action.payload.pixels;
      let tiles = [...viewerFileState.normalizedTiles]; 
      tiles[tile.index] = tile;

      return {
        ...adapter.updateOne({'id': action.payload.fileId, 'changes': {
          normalizedTiles: tiles
        }}, state),
      }
    }
    
    case viewerActions.NORMALIZE_IMAGE_TILE_FAIL: {
      let viewerFileState = state.entities[action.payload.fileId]
      let tile = Object.assign({}, viewerFileState.normalizedTiles[action.payload.tileIndex]);
      tile.pixelsLoaded = false;
      tile.pixelsLoading = false;
      let tiles = [...viewerFileState.normalizedTiles]; 
      tiles[tile.index] = tile;

      return {
        ...adapter.updateOne({'id': action.payload.fileId, 'changes': {
          normalizedTiles: tiles,
        }}, state),
      }
    }
    
    /**
     * Viewer
     */

    case viewerActions.UPDATE_VIEWPORT_SIZE: {
      return {
        ...state,
        imageViewerViewportSize: {width: action.payload.width, height: action.payload.height}
      };
     
    }

    case viewerActions.UPDATE_NORMALIZER: {
      let imageFile = action.payload.file;
      let viewerFileState = state.entities[imageFile.id];
      let normalizer = Object.assign({}, viewerFileState.normalizer);
      normalizer = Object.assign(normalizer, action.payload.changes);
      
      return {
        ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
          normalizer: normalizer
        }}, state),
      }
    }

    case viewerActions.ZOOM_TO: {
      let imageFile = action.payload.file;
      let viewerFileState = state.entities[imageFile.id];
      let transform = viewerFileState.imageToViewportTransform.clone();
      let scaleFactor = action.payload.scale/getScale(viewerFileState);
      transform.scale(scaleFactor, new Point(action.payload.anchorPoint.x-0.5, action.payload.anchorPoint.y-0.5))
      return {
        ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
          imageToViewportTransform: transform,
        }}, state),
      }
    }

    case viewerActions.ZOOM_BY: {
      let imageFile = action.payload.file;
      let viewerFileState = state.entities[imageFile.id];
      let transform = viewerFileState.imageToViewportTransform.clone();
      transform.scale(action.payload.scaleFactor, new Point(action.payload.anchorPoint.x-0.5, action.payload.anchorPoint.y-0.5));
      return {
        ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
          imageToViewportTransform: transform
        }}, state),
      }
    }


    case viewerActions.MOVE_TO: {
      let imageFile = action.payload.file;
      let viewerFileState = state.entities[imageFile.id];
      let imageToViewport = viewerFileState.imageToViewportTransform.clone();
      let viewportToImage = imageToViewport.inverted();
      let viewportSize = state.imageViewerViewportSize;
      let viewportAnchor = action.payload.viewportAnchor;
      if(!viewportAnchor) {
        viewportAnchor = {x: viewportSize.width/2, y: viewportSize.height/2};
      }

      let anchor = viewportToImage.transform(new Point(viewportAnchor.x, viewportAnchor.y))
      let xShift = anchor.x - action.payload.imagePoint.x;
      let yShift = anchor.y - action.payload.imagePoint.y;

      imageToViewport.translate(xShift, yShift);
      return {
        ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
          imageToViewportTransform: imageToViewport,
        }}, state),
      }
    }

   

    case viewerActions.MOVE_BY: {
      let imageFile = action.payload.file;
      let viewerFileState = state.entities[imageFile.id];
      let transform = viewerFileState.imageToViewportTransform.clone();
      let scale = getScale(viewerFileState);
      transform.translate(action.payload.xShift / scale, -action.payload.yShift / scale);
      return {
        ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
          imageToViewportTransform: transform
        }}, state),
      }
    }

    default:
      return state;
  }
}

export const getImageViewerViewportSize = (state: State) => state.imageViewerViewportSize;
