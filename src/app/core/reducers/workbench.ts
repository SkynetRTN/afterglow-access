import { createSelector} from '@ngrx/store';
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';

import { Point, Matrix } from 'paper';

import * as dataFileActions from '../../data-files/actions/data-file';
import * as imageFileActions from '../../data-files/actions/image-file';
import * as authActions from '../../auth/actions/auth';
import { ImageTile } from '../../data-files/models/image-tile';
import { DataFile, ImageFile, getYTileDim, getXTileDim, getHeight, getWidth} from '../../data-files/models/data-file';
import { centroidPsf, centroidDisk } from '../models/centroider';
import { calcLevels } from '../../data-files/models/image-hist';
import { DataFileType } from '../../data-files/models/data-file-type';

import * as workbenchActions from '../actions/workbench';
import { WorkbenchFileState } from '../models/workbench-file-state';
import { ViewerFileState, getViewportRegion, getScale } from '../models/viewer-file-state';
import { grayColorMap } from '../models/color-map';
import { SonifierFileState, SonifierRegionOption} from '../models/sonifier-file-state';
import { StretchMode } from '../models/stretch-mode';
import { SourceExtractorFileState, SourceExtractorRegionOption } from '../models/source-extractor-file-state';
import { SourceExtractionSettings } from '../models/source-extraction-settings';
import { SourceExtractorModeOption } from '../models/source-extractor-mode-option';
import { PhotSettings } from '../models/phot-settings';
import { CentroidSettings, CentroidMethod } from '../models/centroid-settings'
import { PlotterSettings } from '../models/plotter-settings';
/**
 * @ngrx/entity provides a predefined interface for handling
 * a structured dictionary of records. This interface
 * includes an array of ids, and a dictionary of the provided
 * model type by id. This interface is extended to include
 * any additional interface properties.
 */
export interface State extends EntityState<WorkbenchFileState> {
  selectedDataFileId: string | null;
  imageViewerViewportSize: {width: number, height: number};
  photSettings: PhotSettings,
  sourceExtractionSettings: SourceExtractionSettings,
  sourceExtractorModeOption: SourceExtractorModeOption,
  centroidSettings: CentroidSettings,
  plotterSettings: PlotterSettings
}

/**
 * createEntityAdapter creates many an object of helper
 * functions for single or multiple operations
 * against the dictionary of records. The configuration
 * object takes a record id selector function and
 * a sortComparer option which is set to a compare
 * function if the records are to be sorted.
 */
export const adapter: EntityAdapter<WorkbenchFileState> = createEntityAdapter<WorkbenchFileState>({
  selectId: (workbenchState: WorkbenchFileState) => workbenchState.fileId,
  sortComparer: false,
});

/** getInitialState returns the default initial state
 * for the generated entity state. Initial state
 * additional properties can also be defined.
*/
export const initialState: State = adapter.getInitialState({
  selectedDataFileId: null,
  imageViewerViewportSize: {width: 0, height: 0},
  photSettings: {
    aperture: 10,
    annulus: 10,
    dannulus: 10,
    centroid: true,
    centroidRadius: 10,
    centroidMethod: CentroidMethod.COM
  },
  sourceExtractionSettings: {
    threshold: 10,
    fwhm: 3,
    deblend: false,
  },
  centroidSettings: {
    centroidClicks: false,
    useDiskCentroiding: false,
    psfCentroiderSettings: null,
    diskCentroiderSettings:null,
  },
  plotterSettings: {
    interpolatePixels: false,
  },
  sourceExtractorModeOption: SourceExtractorModeOption.MOUSE

});

export function reducer(
  state = initialState,
  action: workbenchActions.Actions | dataFileActions.Actions | imageFileActions.Actions | authActions.Actions
): State {
  switch (action.type) {
    case authActions.LOGOUT: {
      return {
        ...adapter.removeAll(initialState)
      }
    }

    case dataFileActions.LOAD_LIBRARY_SUCCESS: {
      let fileStates: WorkbenchFileState[] = [];
      action.payload.filter(dataFile => dataFile.type == DataFileType.IMAGE).map(dataFile => {
        fileStates.push({
          fileId: dataFile.id,
          viewer: {
            normalizedTiles: null,
            autoLevelsInitialized: false,
            panEnabled: true,
            zoomEnabled: true,
            imageToViewportTransform:  new Matrix(1, 0, 0, 1, 0, 0),
            normalizer: {
              backgroundLevel: 0,
              peakLevel: 0,
              colorMap: grayColorMap,
              stretchMode: StretchMode.Linear
            }
          },
          plotter: {
            measuring: false,
            lineMeasureStart: null,
            lineMeasureEnd: null,
          },
          sonifier: {
            region: null,
            regionHistory: [],
            regionHistoryIndex: null,
            regionHistoryInitialized: false,
            regionOption: SonifierRegionOption.VIEWPORT,
            viewportSync: true,
            duration: 10,
            toneCount: 22
          },
          sourceExtractor: {
            regionOption: SourceExtractorRegionOption.VIEWPORT,
            region: null,
            sources: [],
            selectedSourceIds: [],
          },
        })
      })
        
      return {
        ...adapter.addMany(fileStates, state)
      };
    }

    case workbenchActions.SELECT_DATA_FILE: {
      return {
        ...state,
        selectedDataFileId: action.payload
      }
    }

    case workbenchActions.INIT_AUTO_LEVELS: {
      if(action.payload.file.type == DataFileType.IMAGE) {
        let imageFile = action.payload.file;
        let levels = calcLevels(imageFile.hist, 10.0, 98.0)
        
        let viewerState : ViewerFileState = {
          ...state.entities[imageFile.id].viewer,
          autoBkgLevel: levels.backgroundLevel,
          autoPeakLevel: levels.peakLevel,
          autoLevelsInitialized: true
        };
        return {
          ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
            viewer: viewerState,
          }}, state),
        }
      }
      return state;
    }
    case imageFileActions.INIT_IMAGE_TILES: {
      if(action.payload.file.type == DataFileType.IMAGE) {
        let imageFile = action.payload.file;
        let viewer = Object.assign({}, state.entities[imageFile.id].viewer);

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

        viewer.normalizedTiles = tiles;

        return {
          ...adapter.updateOne({'id': imageFile.id, 'changes': {
            viewer: viewer,
          }}, state),
        }
      }
      return state;
      
    }
    case workbenchActions.RENORMALIZE_IMAGE_FILE: {
      if(action.payload.file.type == DataFileType.IMAGE) {
        let imageFile = action.payload.file;
        let viewer = Object.assign({}, state.entities[imageFile.id].viewer);

        let tiles = imageFile.tiles.map(tile => Object.assign({}, tile));
        tiles.forEach(tile => {
          tile.pixelsLoaded = false;
          tile.pixelsLoading = false;
          tile.pixels = null;
        })

        viewer.normalizedTiles = tiles;

        return {
          ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
            viewer: viewer,
          }}, state),
        }
      }
      return state;
    }
    case workbenchActions.NORMALIZE_IMAGE_TILE: {
      if(action.payload.file.type == DataFileType.IMAGE) {
        let imageFile = action.payload.file;
        let viewer = Object.assign({}, state.entities[imageFile.id].viewer);
        let tile = Object.assign({}, viewer.normalizedTiles[action.payload.tile.index]);
        tile.pixelsLoaded = false;
        tile.pixelsLoading = true;
        let tiles = [...viewer.normalizedTiles]; 
        tiles[tile.index] = tile;
        viewer.normalizedTiles = tiles;

        return {
          ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
            viewer: viewer,
          }}, state),
        }
      }
      return state;
    }
    case workbenchActions.NORMALIZE_IMAGE_TILE_SUCCESS: {
      let viewer = Object.assign({}, state.entities[action.payload.fileId].viewer);
      let tile = Object.assign({}, viewer.normalizedTiles[action.payload.tileIndex]);
      tile.pixelsLoaded = true;
      tile.pixelsLoading = false;
      tile.pixels = action.payload.pixels;
      let tiles = [...viewer.normalizedTiles]; 
      tiles[tile.index] = tile;
      viewer.normalizedTiles = tiles;

      return {
        ...adapter.updateOne({'id': action.payload.fileId, 'changes': {
          viewer: viewer
        }}, state),
      }
    }
    
    case workbenchActions.NORMALIZE_IMAGE_TILE_FAIL: {
      let viewer = Object.assign({}, state.entities[action.payload.fileId].viewer);
      let tile = Object.assign({}, viewer.normalizedTiles[action.payload.tileIndex]);
      tile.pixelsLoaded = false;
      tile.pixelsLoading = false;
      let tiles = [...viewer.normalizedTiles]; 
      tiles[tile.index] = tile;
      viewer.normalizedTiles = tiles;

      return {
        ...adapter.updateOne({'id': action.payload.fileId, 'changes': {
          viewer: viewer,
        }}, state),
      }
    }
    
    /**
     * Viewer
     */

    case workbenchActions.UPDATE_VIEWPORT_SIZE: {
      return {
        ...state,
        imageViewerViewportSize: {width: action.payload.width, height: action.payload.height}
      };
     
    }

    case workbenchActions.UPDATE_NORMALIZER: {
      if(action.payload.file.type == DataFileType.IMAGE) {
        let imageFile = action.payload.file;
        let viewer = Object.assign({}, state.entities[imageFile.id].viewer);
        let normalizer = Object.assign({}, viewer.normalizer);
        normalizer = Object.assign(normalizer, action.payload.changes);
        viewer.normalizer = normalizer;
        
        return {
          ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
            viewer: viewer
          }}, state),
        }
      }
      return state;
    }

    case workbenchActions.ZOOM_TO: {
      if(action.payload.file.type == DataFileType.IMAGE) {
        let imageFile = action.payload.file;
        let viewer = Object.assign({}, state.entities[imageFile.id].viewer);
        let transform = viewer.imageToViewportTransform.clone();
        let scaleFactor = action.payload.scale/getScale(viewer);
        transform.scale(scaleFactor, new Point(action.payload.anchorPoint.x, action.payload.anchorPoint.y))
        viewer.imageToViewportTransform = transform;
        return {
          ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
            viewer: viewer,
          }}, state),
        }
      }
      return state;
    }

    case workbenchActions.ZOOM_BY: {
      if(action.payload.file.type == DataFileType.IMAGE) {
        let imageFile = action.payload.file;
        let viewer = Object.assign({}, state.entities[imageFile.id].viewer);
        let transform = viewer.imageToViewportTransform.clone();
        transform.scale(action.payload.scaleFactor, new Point(action.payload.anchorPoint.x, action.payload.anchorPoint.y))
        viewer.imageToViewportTransform = transform;
        return {
          ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
            viewer: viewer
          }}, state),
        }
      }
      return state;
    }


    case workbenchActions.MOVE_TO: {
      if(action.payload.file.type == DataFileType.IMAGE) {
        let imageFile = action.payload.file;
        let viewer = Object.assign({}, state.entities[imageFile.id].viewer);
        let transform = viewer.imageToViewportTransform.clone();
        let viewportSize = state.imageViewerViewportSize;
        let scale = getScale(viewer);
        let viewportTopLeft = {
          x: -viewer.imageToViewportTransform.tx,
          y: -viewer.imageToViewportTransform.ty
        };
    
        let imagePoint = action.payload.imagePoint;
        let viewportPoint = action.payload.viewportPoint;
        if(!viewportPoint) {
          viewportPoint = {x: viewportSize.width/2, y: viewportSize.height/2};
        }
        
        let xShift = viewportTopLeft.x - (imagePoint.x * scale - viewportPoint.x);
        let yShift = viewportTopLeft.y - (imagePoint.y * scale - viewportPoint.y);
        
        transform.translate(xShift / scale, yShift / scale);
        viewer.imageToViewportTransform = transform;
        return {
          ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
            viewer: viewer,
          }}, state),
        }
      }
      return state;
    }

   

    case workbenchActions.MOVE_BY: {
      if(action.payload.file.type == DataFileType.IMAGE) {
        let imageFile = action.payload.file;
        let viewer = Object.assign({}, state.entities[imageFile.id].viewer);
        let transform = viewer.imageToViewportTransform.clone();
        let scale = getScale(viewer);
        transform.translate(action.payload.xShift / scale, action.payload.yShift / scale);
        viewer.imageToViewportTransform = transform;
        return {
          ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
            viewer: viewer
          }}, state),
        }
      }
      return state;
    }

    /**
     * Markers
     */

    // case workbenchActions.ADD_MARKER: {
    //   if(state.entities[action.payload.file.id].type == DataFileType.IMAGE) {
    //     let imageFile = state.entities[action.payload.file.id] as ImageFile;
    //     let marker = Object.assign({}, action.payload.marker);
    //     marker.id = (MARKER_ID++).toString();
    //     let markerEntities = {
    //       ...imageFile.markerEntities,
    //       marker
    //     };

    //     let markerIds = [...imageFile.markerIds, marker.id];

    //     return {
    //       ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
    //         markerEntities: markerEntities,
    //         markerIds: markerIds
    //       }}, state),
    //     }
    //   }
    //   return state;
    // }

    // case workbenchActions.REMOVE_MARKER: {
    //   if(state.entities[action.payload.fileId].type == DataFileType.IMAGE) {
    //     let imageFile = state.entities[action.payload.fileId] as ImageFile;

    //     if(!(action.payload.markerId in imageFile.markerEntities)) return state;

    //     let markerEntities = {...imageFile.markerEntities};
    //     delete markerEntities[action.payload.markerId];

    //     let markerIds = [...imageFile.markerIds];
    //     markerIds.splice(markerIds.indexOf(action.payload.markerId), 1);
        
    //     return {
    //       ...adapter.updateOne({'id': action.payload.fileId, 'changes': {
    //         markerEntities: markerEntities,
    //         markerIds: markerIds
    //       }}, state),
    //     }
    //   }
    //   return state;
    // }

    // case workbenchActions.UPDATE_MARKER: {
    //   if(state.entities[action.payload.fileId].type == DataFileType.IMAGE) {
    //     let imageFile = state.entities[action.payload.fileId] as ImageFile;

    //     if(!(action.payload.markerId in imageFile.markerEntities)) return state;
    //     let marker = Object.assign({}, imageFile.markerEntities[action.payload.markerId]);
    //     marker = Object.assign(marker, action.payload.changes);
    //     let markerEntities = {...imageFile.markerEntities};
    //     markerEntities[action.payload.markerId] = marker;

    //     let markerIds = [...imageFile.markerIds];
        
    //     return {
    //       ...adapter.updateOne({'id': action.payload.fileId, 'changes': {
    //         markerEntities: markerEntities,
    //         markerIds: markerIds,
    //       }}, state),
    //     }
    //   }
    //   return state;
    // }

    /**
     * Sonifier
     */

    case workbenchActions.UPDATE_SONIFIER_CONFIG: {
      if(action.payload.file.type == DataFileType.IMAGE) {
        let imageFile = action.payload.file;
        let sonifier = Object.assign({}, state.entities[imageFile.id].sonifier);
        sonifier = Object.assign(sonifier, action.payload.changes);
        
        return {
          ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
            sonifier: sonifier
          }}, state),
        }
      }
      return state;
    }

    case workbenchActions.SET_SONIFIER_REGION: {
      if(action.payload.file.type == DataFileType.IMAGE) {
        let imageFile = action.payload.file;
        let sonifier = Object.assign({}, state.entities[imageFile.id].sonifier);
        let region = Object.assign({}, action.payload.region);
        if(action.payload.storeInHistory) {
          if(!sonifier.regionHistoryInitialized) {
            sonifier.regionHistoryIndex = 0;
            sonifier.regionHistory = [region];
            sonifier.regionHistoryInitialized = true;
          }
          else {
            sonifier.regionHistory = [...sonifier.regionHistory.slice(0,sonifier.regionHistoryIndex+1), region];
            sonifier.regionHistoryIndex++;
          }
        }
        
        sonifier.region = region;
        
        return {
          ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
          sonifier: sonifier
          }}, state),
        }
      }
      return state;
    }

    case workbenchActions.UNDO_SONIFIER_REGION_SELECTION: {
      if(action.payload.file.type == DataFileType.IMAGE) {
        let imageFile = action.payload.file;
        let sonifier = Object.assign({}, state.entities[imageFile.id].sonifier);
        if(!sonifier.regionHistoryInitialized || sonifier.regionHistoryIndex == 0) return state;
        sonifier.regionHistoryIndex--;
        sonifier.region = sonifier.regionHistory[sonifier.regionHistoryIndex];
        
        return {
          ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
          sonifier: sonifier
          }}, state),
        }
      }
      return state;
    }

    case workbenchActions.REDO_SONIFIER_REGION_SELECTION: {
      if(action.payload.file.type == DataFileType.IMAGE) {
        let imageFile = action.payload.file;
        let sonifier = Object.assign({}, state.entities[imageFile.id].sonifier);
        if(!sonifier.regionHistoryInitialized || sonifier.regionHistoryIndex == (sonifier.regionHistory.length -1)) return state;
        sonifier.regionHistoryIndex++;
        sonifier.region = sonifier.regionHistory[sonifier.regionHistoryIndex];
        
        return {
          ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
          sonifier: sonifier
          }}, state),
        }
      }
      return state;
    }

    case workbenchActions.CLEAR_SONIFIER_REGION_HISTORY: {
      if(action.payload.file.type == DataFileType.IMAGE) {
        let imageFile = action.payload.file;
        let sonifier = Object.assign({}, state.entities[imageFile.id].sonifier);
        if(!sonifier.regionHistoryInitialized || sonifier.regionHistoryIndex == (sonifier.regionHistory.length -1)) return state;
        sonifier.region = null;
        sonifier.regionHistoryIndex = null
        sonifier.regionHistory = [];
        sonifier.regionHistoryInitialized = false;
        
        return {
          ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
          sonifier: sonifier
          }}, state),
        }
      }
      return state;
    }

    /**
     * Source Extractor
     */

    case workbenchActions.SET_SOURCE_EXTRACTOR_MODE: {
      return {
        ...state,
        sourceExtractorModeOption: action.payload.mode
      }
    }

    case workbenchActions.UPDATE_PHOT_SETTINGS: {
      return {
        ...state,
        photSettings: {
          ...state.photSettings,
          ...action.payload.changes
        }
      }
    }

    case workbenchActions.UPDATE_SOURCE_EXTRACTION_SETTINGS: {
      return {
        ...state,
        sourceExtractionSettings: {
          ...state.sourceExtractionSettings,
          ...action.payload.changes
        }
      }
    }

    // case workbenchActions.UPDATE_FILTERED_SOURCES: {
    //   let imageFile = action.payload.file as ImageFile;
    //   let sourceExtractor = state.entities[imageFile.id].sourceExtractor;
    //   let region = sourceExtractor.region;
    //   if(!region) return state;


    //   let filteredSources = sourceExtractor.sources.filter(source => {
    //     return source.x >= region.x && source.x < (region.x + region.width) &&
    //       source.y >= region.y && source.y < (region.y + region.height);
    //   })

    //   sourceExtractor = {
    //     ...sourceExtractor,
    //     filteredSources: filteredSources
    //   }

    //   return {
    //     ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
    //     sourceExtractor: sourceExtractor
    //     }}, state),
    //   }
    
    // }


    case workbenchActions.UPDATE_SOURCE_EXTRACTOR_REGION: {
      if(action.payload.file.type == DataFileType.IMAGE) {
        let imageFile = action.payload.file;
        let viewer = state.entities[imageFile.id].viewer;
        let sourceExtractor = state.entities[imageFile.id].sourceExtractor;
        let sonifier = state.entities[imageFile.id].sonifier;

        let region = null;
        if(sourceExtractor.regionOption == SourceExtractorRegionOption.ENTIRE_IMAGE) {
          region = {x: 0, y: 0, width: getWidth(imageFile), height: getHeight(imageFile)};
        }
        else if(sourceExtractor.regionOption == SourceExtractorRegionOption.SONIFIER_REGION) {
          region = {...sonifier.region};
        }
        else {
          region = getViewportRegion(
            getWidth(imageFile),
            getHeight(imageFile),
            state.imageViewerViewportSize.width,
            state.imageViewerViewportSize.height,
            viewer.imageToViewportTransform
          );
        }

     

        sourceExtractor = {
          ...sourceExtractor,
          region: region
        }

        return {
          ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
          sourceExtractor: sourceExtractor
          }}, state),
        }
      }
      return state;
    }


    // case workbenchActions.SET_SOURCE_EXTRACTOR_REGION: {
    //   if(action.payload.file.type == DataFileType.IMAGE) {
    //     let imageFile = action.payload.file;
    //     let sourceExtractor = {
    //       ...state.entities[imageFile.id].sourceExtractor,
    //       region: {
    //         ...action.payload.region
    //       }
    //     };

    //     return {
    //       ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
    //       sourceExtractor: sourceExtractor
    //       }}, state),
    //     }
    //   }
    //   return state;
    // }

    case workbenchActions.UPDATE_SOURCE_EXTRACTOR_FILE_STATE: {
      if(action.payload.file.type == DataFileType.IMAGE) {
        let imageFile = action.payload.file;
        let sourceExtractor = {
          ...state.entities[imageFile.id].sourceExtractor,
          ...action.payload.changes
        };

        return {
          ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
          sourceExtractor: sourceExtractor
          }}, state),
        }
      }
      return state;
    }

    case workbenchActions.EXTRACT_SOURCES_SUCCESS: {
      let sourceExtractor = {
        ...state.entities[action.payload.file.id].sourceExtractor,
        sources: [...action.payload.sources]
      };

      return {
        ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
        sourceExtractor: sourceExtractor
        }}, state),
      }
    }

    case workbenchActions.SELECT_SOURCES: {
      let sourceExtractor = state.entities[action.payload.file.id].sourceExtractor;
      let sourceIds = action.payload.sources
        .map(source => source.id)
        .filter(sourceId => {
          return sourceExtractor.selectedSourceIds.indexOf(sourceId) == -1;
        });
        
      
      sourceExtractor = {
        ...sourceExtractor,
        selectedSourceIds: [...sourceExtractor.selectedSourceIds, ...sourceIds]
      };
      

      return {
        ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
        sourceExtractor: sourceExtractor
        }}, state),
      }
    }

    case workbenchActions.DESELECT_SOURCES: {
      let sourceExtractor = state.entities[action.payload.file.id].sourceExtractor;
      let deselectedSourceIds = action.payload.sources.map(source => source.id);
      let selectedSourceIds = sourceExtractor.selectedSourceIds
        .filter(sourceId => {
          return deselectedSourceIds.indexOf(sourceId) == -1;
        });
    

      sourceExtractor = {
        ...sourceExtractor,
        selectedSourceIds: selectedSourceIds
      }
      

      return {
        ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
        sourceExtractor: sourceExtractor
        }}, state),
      }
    }

    case workbenchActions.SET_SOURCE_SELECTION: {
      let sourceExtractor = state.entities[action.payload.file.id].sourceExtractor;
      
      sourceExtractor = {
        ...sourceExtractor,
        selectedSourceIds: action.payload.sources.map(source => source.id)
      };
      

      return {
        ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
        sourceExtractor: sourceExtractor
        }}, state),
      }
    }

    case workbenchActions.REMOVE_ALL_SOURCES: {
      let sourceExtractor = state.entities[action.payload.file.id].sourceExtractor;
     
      sourceExtractor = {
        ...sourceExtractor,
        selectedSourceIds: [],
        sources: []
      }
      

      return {
        ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
        sourceExtractor: sourceExtractor
        }}, state),
      }
    }



    case workbenchActions.REMOVE_SELECTED_SOURCES: {
      let sourceExtractor = state.entities[action.payload.file.id].sourceExtractor;
      let sources = sourceExtractor.sources.filter(source => {
        return sourceExtractor.selectedSourceIds.indexOf(source.id) == -1;
      })
     
      sourceExtractor = {
        ...sourceExtractor,
        selectedSourceIds: [],
        sources: sources
      }
      

      return {
        ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
        sourceExtractor: sourceExtractor
        }}, state),
      }
    }

    case workbenchActions.PHOTOMETER_SOURCES_SUCCESS: {
      let sourceExtractor = state.entities[action.payload.file.id].sourceExtractor;
      sourceExtractor = {
        ...sourceExtractor,
        sources: [...sourceExtractor.sources, ...action.payload.sources]
      }
      
      
      return {
        ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
        sourceExtractor: sourceExtractor
        }}, state),
      }
    }


    /**
    * Plotter
    */

    case workbenchActions.UPDATE_CENTROID_SETTINGS: {
      let centroidSettings = {
        ...state.centroidSettings,
        ...action.payload.changes
      }
      
      return {
        ...state,
        centroidSettings: centroidSettings
      }
      
    }

    case workbenchActions.UPDATE_PLOTTER_SETTINGS: {
      let plotterSettings = {
        ...state.plotterSettings,
        ...action.payload.changes
      }
      
      return {
        ...state,
        plotterSettings: plotterSettings
      }
      
    }


    case workbenchActions.START_PLOTTER_LINE: {
      let imageFile = action.payload.file as ImageFile;
      let point = action.payload.point;
      let plotter = {
        ...state.entities[action.payload.file.id].plotter
      };

      let xc = action.payload.point.x;
      let yc = action.payload.point.y;
      if(state.centroidSettings.centroidClicks) {
        let result;
        if(state.centroidSettings.useDiskCentroiding) {
          result = centroidDisk(imageFile, point.x, point.y);
        }
        else {
          result = centroidPsf(imageFile, point.x, point.y);
        }
        
        xc = result.x;
        yc = result.y;
      }
      if(!plotter.measuring) {
        plotter.lineMeasureStart = {x: xc, y: yc};
        plotter.lineMeasureEnd = {x: point.x, y: point.y};
      }
      else {
        plotter.lineMeasureEnd = {x: xc, y: yc};
      }
      
      plotter.measuring = !plotter.measuring;

      
      return {
        ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
        plotter: plotter
        }}, state),
      }
    }

    case workbenchActions.UPDATE_PLOTTER_LINE: {
      let imageFile = action.payload.file as ImageFile;
      let point = action.payload.point;
      
      let plotter = {
        ...state.entities[action.payload.file.id].plotter
      };

      if(!plotter.measuring) return state;

      plotter.lineMeasureEnd = point;

      
      return {
        ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
        plotter: plotter
        }}, state),
      }
    }

    case workbenchActions.UPDATE_PLOTTER_FILE_STATE: {
      let imageFile = action.payload.file as ImageFile;
      let plotter = {
        ...state.entities[imageFile.id].plotter,
        ...action.payload.changes
      }
      
      return {
        ...adapter.updateOne({'id': action.payload.file.id, 'changes': {
        plotter: plotter
        }}, state),
      }
      
    }


    
    default: {
      return state;
    }
  }
}

/**
 * Because the data structure is defined within the reducer it is optimal to
 * locate our selector functions at this level. If store is to be thought of
 * as a database, and reducers the tables, selectors can be considered the
 * queries into said database. Remember to keep your selectors small and
 * focused so they can be combined and composed to fit each particular
 * use-case.
 */

export const getSelectedId = (state: State) => state.selectedDataFileId;
export const getImageViewerViewportSize = (state: State) => state.imageViewerViewportSize;