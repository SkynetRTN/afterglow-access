import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { Point, Matrix, Rectangle } from 'paper';

import { calcLevels } from '../../data-files/models/image-hist';
import { DataFileType } from '../../data-files/models/data-file-type';
import { ImageTile } from '../../data-files/models/image-tile';
import { DataFile, ImageFile, getYTileDim, getXTileDim, getHeight, getWidth } from '../../data-files/models/data-file';
import { Normalization } from '../models/normalization';
import { grayColorMap } from '../models/color-map';
import { StretchMode } from '../models/stretch-mode';

import * as normalizationActions from '../actions/normalization';
import * as transformationActions from '../actions/transformation';
import * as plotterActions from '../actions/plotter';
import * as sonifierActions from '../actions/sonifier';
import * as markerActions from '../actions/markers';
import * as sourceExtractorActions from '../actions/source-extractor';
import * as imageFileActions from '../../data-files/actions/image-file';
import * as dataFileActions from '../../data-files/actions/data-file';
import { ImageFileState } from '../models/image-file-state';
import { getScale, Transformation, getViewportRegion } from '../models/transformation';
import { SonifierRegionMode, SonifierFileState } from '../models/sonifier-file-state';
import { SourceExtractorRegionOption, SourceExtractorFileState } from '../models/source-extractor-file-state';
import { CentroidSettings } from '../models/centroid-settings';
import { PlotterSettings } from '../models/plotter-settings';
import { centroidDisk, centroidPsf } from '../models/centroider';
import { PlotterFileState } from '../models/plotter-file-state';
import { SourceExtractorModeOption } from '../models/source-extractor-mode-option';

export interface State extends EntityState<ImageFileState> {}

export const adapter: EntityAdapter<ImageFileState> = createEntityAdapter<ImageFileState>({
  selectId: (imageFileState: ImageFileState) => imageFileState.imageFileId,
  sortComparer: false,
});

export const initialState: State = adapter.getInitialState();


export function reducer(state = initialState, action: dataFileActions.Actions |
  imageFileActions.Actions |
  normalizationActions.Actions |
  transformationActions.Actions |
  plotterActions.Actions |
  sonifierActions.Actions |
  sourceExtractorActions.Actions
): State {
  switch (action.type) {
    case dataFileActions.LOAD_LIBRARY_SUCCESS: {
      let imageFileStates: ImageFileState[] = [];
      action.payload.filter(dataFile => dataFile.type == DataFileType.IMAGE).map(dataFile => {
        imageFileStates.push({
          imageFileId: dataFile.id,
          normalization: {
            normalizedTiles: null,
            autoLevelsInitialized: false,
            autoUpperPercentile: 99,
            autoLowerPercentile: 10,
            normalizer: {
              backgroundLevel: 0,
              peakLevel: 0,
              colorMap: grayColorMap,
              stretchMode: StretchMode.Linear,
              inverted: false
            }
          },
          transformation: {
            imageTransform: null,
            viewportTransform: null,
            imageToViewportTransform: null,
            viewportSize: null
          },
          plotter: {
            measuring: false,
            lineMeasureStart: null,
            lineMeasureEnd: null,
          },
          sonifier: {
            sonificationUri: null,
            region: null,
            regionHistory: [],
            regionHistoryIndex: null,
            regionHistoryInitialized: false,
            regionMode: SonifierRegionMode.VIEWPORT,
            viewportSync: true,
            duration: 10,
            toneCount: 22,
            progressLine: null,
          },
          sourceExtractor: {
            regionOption: SourceExtractorRegionOption.VIEWPORT,
            region: null,
            selectedSourceIds: [],
            sourceExtractionJobId: null,
          },
          markers: []
        })
      });

      return {
        ...adapter.addMany(imageFileStates, state)
      };
    }

    case dataFileActions.REMOVE_DATA_FILE_SUCCESS: {
      return {
        ...adapter.removeOne(action.payload.file.id, state),
      }
    }

    // case normalizationActions.INIT_AUTO_LEVELS: {
    //   if (action.payload.file.type == DataFileType.IMAGE) {
    //     let imageFile = action.payload.file;
    //     let normalization: Normalization = { ...state.entities[imageFile.id].normalization };
    //     let levels = calcLevels(imageFile.hist, 10.0, 98.0);
    //     normalization.autoBkgLevel = levels.backgroundLevel;
    //     normalization.autoPeakLevel = levels.peakLevel;
    //     normalization.autoLevelsInitialized = true;

    //     return {
    //       ...adapter.updateOne({
    //         id: action.payload.file.id,
    //         changes: {
    //           normalization: normalization,
    //         }
    //       }, state)
    //     }
    //   }
    //   return state;
    // }
    case imageFileActions.INIT_IMAGE_TILES: {
      let imageFile = action.payload.file;
      let normalization: Normalization = { ...state.entities[imageFile.id].normalization };
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


      normalization.normalizedTiles = tiles;

      // also initialize the transformation matrix since it requires the 
      // image height
      let transformation: Transformation = { ...state.entities[imageFile.id].transformation };
      transformation.imageTransform = new Matrix(1, 0, 0, -1, 0, getHeight(imageFile));
      transformation.viewportTransform = new Matrix(1, 0, 0, 1, 0, 0);

      transformation.imageToViewportTransform = transformation.viewportTransform.appended(transformation.imageTransform);

      return {
        ...adapter.updateOne({
          id: action.payload.file.id,
          changes: {
            normalization: normalization,
            transformation: transformation
          }
        }, state)
      }

    }
    case normalizationActions.RENORMALIZE_IMAGE_FILE: {
      let imageFile = action.payload.file;
      let normalization: Normalization = { ...state.entities[imageFile.id].normalization };
      let tiles = imageFile.tiles.map(tile => Object.assign({}, tile));
      tiles.forEach(tile => {
        tile.pixelsLoaded = false;
        tile.pixelsLoading = false;
        tile.pixels = null;
      })

      normalization.normalizedTiles = tiles;

      return {
        ...adapter.updateOne({
          id: action.payload.file.id,
          changes: {
            normalization: normalization,
          }
        }, state)
      }
    }
    case normalizationActions.NORMALIZE_IMAGE_TILE: {
      let imageFile = action.payload.file;
      let normalization: Normalization = { ...state.entities[imageFile.id].normalization };
      normalization.normalizedTiles = [...normalization.normalizedTiles];
      let tile = { ...normalization.normalizedTiles[action.payload.tile.index] }
      tile.pixelsLoaded = false;
      tile.pixelsLoading = true;
      normalization.normalizedTiles[tile.index] = tile;

      return {
        ...adapter.updateOne({
          id: action.payload.file.id,
          changes: {
            normalization: normalization,
          }
        }, state)
      }
    }
    case normalizationActions.NORMALIZE_IMAGE_TILE_SUCCESS: {
      let normalization: Normalization = { ...state.entities[action.payload.fileId].normalization };
      normalization.normalizedTiles = [...normalization.normalizedTiles];
      let tile = { ...normalization.normalizedTiles[action.payload.tileIndex] };
      tile.pixelsLoaded = true;
      tile.pixelsLoading = false;
      tile.pixels = action.payload.pixels;
      normalization.normalizedTiles[tile.index] = tile;

      return {
        ...adapter.updateOne({
          id: action.payload.fileId,
          changes: {
            normalization: normalization,
          }
        }, state)
      }
    }

    case normalizationActions.NORMALIZE_IMAGE_TILE_FAIL: {
      let normalization: Normalization = state.entities[action.payload.fileId].normalization;
      normalization.normalizedTiles = [...normalization.normalizedTiles];
      let tile = { ...normalization.normalizedTiles[action.payload.tileIndex] };
      tile.pixelsLoaded = false;
      tile.pixelsLoading = false;
      normalization.normalizedTiles[tile.index] = tile;

      return {
        ...adapter.updateOne({
          id: action.payload.fileId,
          changes: {
            normalization: normalization,
          }
        }, state)
      }
    }

    case normalizationActions.UPDATE_NORMALIZER: {
      let imageFile = action.payload.file;
      let normalization: Normalization = { ...state.entities[imageFile.id].normalization };
      normalization.normalizer = {
        ...normalization.normalizer,
        ...action.payload.changes
      };
      normalization.autoLevelsInitialized = true;

      return {
        ...adapter.updateOne({
          id: imageFile.id,
          changes: {
            normalization: normalization,
          }
        }, state)
      }
    }



    // case transformationActions.ZOOM_TO: {
    //   let imageFile = action.payload.file;
    //   let transformation: Transformation = { ...state.entities[imageFile.id].transformation };
    //   transformation.imageToViewportTransform = transformation.imageToViewportTransform.clone();
    //   let scaleFactor = action.payload.scale / getScale(transformation);
    //   transformation.imageToViewportTransform.scale(scaleFactor, new Point(action.payload.anchorPoint.x - 0.5, action.payload.anchorPoint.y - 0.5));
    //   return {
    //     ...adapter.updateOne({
    //       id: imageFile.id,
    //       changes: {
    //         transformation: transformation,
    //       }
    //     }, state)
    //   }
    // }

    case transformationActions.ZOOM_BY: {
      let imageFile = action.payload.file;
      let transformation: Transformation = { ...state.entities[imageFile.id].transformation };
      transformation.viewportTransform = transformation.viewportTransform.clone();

      // max zoom reached when 1 pixel fills viewport
      let viewportULP = transformation.imageToViewportTransform.transform(new Point(0.5, 0.5));
      let viewportLRP = transformation.imageToViewportTransform.transform(new Point(1.5, 1.5));

      let d = viewportULP.getDistance(viewportLRP);
      let reachedMaxZoom = d > transformation.viewportSize.width || d > transformation.viewportSize.height;

      // min zoom reached when image fits in viewer
      viewportLRP = transformation.imageToViewportTransform.transform(new Point(getWidth(action.payload.file) - 0.5, getHeight(action.payload.file) - 0.5));
      d = viewportULP.getDistance(viewportLRP);
      let reachedMinZoom = d < transformation.viewportSize.width && d < transformation.viewportSize.height;

      if (action.payload.scaleFactor === 1 || (action.payload.scaleFactor > 1 && reachedMaxZoom) || (action.payload.scaleFactor < 1 && reachedMinZoom)) {
        return state;
      }

      // if image anchor is null, set to center of image viewer
      let anchorPoint = action.payload.viewportAnchor;
      if (anchorPoint == null) {
        anchorPoint = { x: transformation.viewportSize.width / 2.0, y: transformation.viewportSize.height / 2.0 };
        // let centerViewerPoint = new Point(transformation.viewportSize.width / 2.0, transformation.viewportSize.height / 2.0);
        //let newAnchor = transformation.imageToViewportTransform.inverted().transform(centerViewerPoint);
        //anchorPoint = {x: newAnchor.x+0.5, y: newAnchor.y+0.5};
      }

      anchorPoint = transformation.viewportTransform.inverted().transform(new Point(anchorPoint.x, anchorPoint.y));

      transformation.viewportTransform.scale(action.payload.scaleFactor, anchorPoint);

      transformation.imageToViewportTransform = transformation.viewportTransform.appended(transformation.imageTransform);

      return {
        ...adapter.updateOne({
          id: imageFile.id,
          changes: {
            transformation: transformation,
          }
        }, state)
      }
    }


    // case transformationActions.MOVE_TO: {
    //   let imageFile = action.payload.file;
    //   let transformation: Transformation = { ...state.entities[imageFile.id].transformation };
    //   transformation.imageToViewportTransform = transformation.imageToViewportTransform.clone();
    //   let viewportToImage = transformation.imageToViewportTransform.inverted();
    //   let viewportSize = action.payload.viewportSize;
    //   let viewportAnchor = action.payload.viewportAnchor;
    //   if (!viewportAnchor) {
    //     viewportAnchor = { x: viewportSize.width / 2, y: viewportSize.height / 2 };
    //   }

    //   let anchor = viewportToImage.transform(new Point(viewportAnchor.x, viewportAnchor.y))
    //   let xShift = anchor.x - action.payload.imagePoint.x;
    //   let yShift = anchor.y - action.payload.imagePoint.y;

    //   transformation.imageToViewportTransform.translate(xShift, yShift);
    //   return {
    //     ...adapter.updateOne({
    //       id: imageFile.id,
    //       changes: {
    //         transformation: transformation,
    //       }
    //     }, state)
    //   }
    // }

    case transformationActions.MOVE_BY: {

      let imageFile = action.payload.file;
      let transformation: Transformation = { ...state.entities[imageFile.id].transformation };
      let imageToViewportTransform = transformation.imageToViewportTransform;
      // test if image is almost entirely out of viewer
      let buffer = 50;
      let c1 = imageToViewportTransform.transform(new Point(getWidth(imageFile), getHeight(imageFile)));
      let c2 = imageToViewportTransform.transform(new Point(0, 0));
      let c3 = imageToViewportTransform.transform(new Point(0, getHeight(imageFile)));
      let c4 = imageToViewportTransform.transform(new Point(getWidth(imageFile), 0));
      let maxPoint = new Point(Math.max(c1.x, c2.x, c3.x, c4.x), Math.max(c1.y, c2.y, c3.y, c4.y));
      let minPoint = new Point(Math.min(c1.x, c2.x, c3.x, c4.x), Math.min(c1.y, c2.y, c3.y, c4.y));
      let imageRect = new Rectangle(minPoint.x + buffer + action.payload.xShift,
        minPoint.y + buffer + action.payload.yShift,
        maxPoint.x - minPoint.x - (buffer * 2),
        maxPoint.y - minPoint.y - (buffer * 2)
      );


      let viewportRect = new Rectangle(0, 0, transformation.viewportSize.width, transformation.viewportSize.height);
      if (!imageRect.intersects(viewportRect)) {
        return state;
      }

      transformation.viewportTransform = transformation.viewportTransform.clone();
      let xScale = Math.abs(transformation.viewportTransform.a);
      let yScale = Math.abs(transformation.viewportTransform.d);
      transformation.viewportTransform.translate(action.payload.xShift / xScale, action.payload.yShift / yScale);
      transformation.imageToViewportTransform = transformation.viewportTransform.appended(transformation.imageTransform);
      return {
        ...adapter.updateOne({
          id: imageFile.id,
          changes: {
            transformation: transformation,
          }
        }, state)
      }
    }

    case transformationActions.SET_VIEWPORT_TRANSFORM: {
      let imageFile = action.payload.file;
      let transformation: Transformation = { ...state.entities[imageFile.id].transformation };
      transformation.viewportTransform = action.payload.transform.clone();
      transformation.imageToViewportTransform = transformation.viewportTransform.appended(transformation.imageTransform);
      return {
        ...adapter.updateOne({
          id: imageFile.id,
          changes: {
            transformation: transformation,
          }
        }, state)
      }
    }

    case transformationActions.SET_IMAGE_TRANSFORM: {
      let imageFile = action.payload.file;
      let transformation: Transformation = { ...state.entities[imageFile.id].transformation };
      transformation.imageTransform = action.payload.transform.clone();
      transformation.imageToViewportTransform = transformation.viewportTransform.appended(transformation.imageTransform);
      return {
        ...adapter.updateOne({
          id: imageFile.id,
          changes: {
            transformation: transformation,
          }
        }, state)
      }
    }

    case transformationActions.RESET_IMAGE_TRANSFORM: {
      let imageFile = action.payload.file;
      let transformation: Transformation = { ...state.entities[imageFile.id].transformation };
      transformation.imageTransform = new Matrix(1, 0, 0, -1, 0, getHeight(imageFile));
      transformation.imageToViewportTransform = transformation.viewportTransform.appended(transformation.imageTransform);
      return {
        ...adapter.updateOne({
          id: imageFile.id,
          changes: {
            transformation: transformation,
          }
        }, state)
      }
    }

    case transformationActions.ROTATE_BY: {
      let imageFile = action.payload.file;
      let transformation: Transformation = { ...state.entities[imageFile.id].transformation };
      transformation.imageTransform = transformation.imageTransform.clone();
      transformation.imageTransform.rotate(-action.payload.rotationAngle, getWidth(imageFile) / 2, getHeight(imageFile) / 2);
      transformation.imageToViewportTransform = transformation.viewportTransform.appended(transformation.imageTransform);
      return {
        ...adapter.updateOne({
          id: imageFile.id,
          changes: {
            transformation: transformation,
          }
        }, state)
      }
    }

    case transformationActions.FLIP: {
      let imageFile = action.payload.file;
      let transformation: Transformation = { ...state.entities[imageFile.id].transformation };
      transformation.imageTransform = transformation.imageTransform.clone();
      transformation.imageTransform.scale(-1, 1, getWidth(imageFile) / 2, getHeight(imageFile) / 2);
      transformation.imageToViewportTransform = transformation.viewportTransform.appended(transformation.imageTransform);
      return {
        ...adapter.updateOne({
          id: imageFile.id,
          changes: {
            transformation: transformation,
          }
        }, state)
      }
    }

    case transformationActions.UPDATE_CURRENT_VIEWPORT_SIZE: {
      let imageFile = action.payload.file;
      /*verify that the image was not just removed from the library*/
      if (!state.entities[imageFile.id]) return state;

      let transformation: Transformation = { ...state.entities[imageFile.id].transformation };
      transformation.viewportSize = action.payload.viewportSize;
      return {
        ...adapter.updateOne({
          id: imageFile.id,
          changes: {
            transformation: transformation,
          }
        }, state)
      }
    }

   


    case plotterActions.START_LINE: {
      let imageFile = action.payload.file as ImageFile;
      let point = action.payload.point;
      let plotterState: PlotterFileState = { ...state.entities[imageFile.id].plotter };
      
      if (!plotterState.measuring) {
        plotterState.lineMeasureStart = { ...action.payload.point };
        plotterState.lineMeasureEnd = { ...action.payload.point };
      }
      else {
        plotterState.lineMeasureEnd = { ...action.payload.point };
      }
      plotterState.measuring = !plotterState.measuring;


      return {
        ...adapter.updateOne({
          id: imageFile.id,
          changes: {
            plotter: plotterState,
          }
        }, state)
      }
    }

    case plotterActions.UPDATE_LINE: {
      let imageFile = action.payload.file as ImageFile;
      let point = action.payload.point;
      let plotterState: PlotterFileState = { ...state.entities[imageFile.id].plotter };

      if (!plotterState.measuring) return state;

      plotterState.lineMeasureEnd = point;

      return {
        ...adapter.updateOne({
          id: imageFile.id,
          changes: {
            plotter: plotterState,
          }
        }, state)
      }
    }

    case plotterActions.UPDATE_PLOTTER_FILE_STATE: {
      let imageFile = action.payload.file as ImageFile;
      let plotterState: PlotterFileState = {
        ...state.entities[imageFile.id].plotter,
        ...action.payload.changes
      };

      return {
        ...adapter.updateOne({
          id: imageFile.id,
          changes: {
            plotter: plotterState,
          }
        }, state)
      }
    }


    case sonifierActions.UPDATE_FILE_STATE: {
      let sonifierState: SonifierFileState = Object.assign({ ...state.entities[action.payload.file.id].sonifier }, action.payload.changes);
      return {
        ...adapter.updateOne({
          id: action.payload.file.id,
          changes: {
            sonifier: sonifierState,
          }
        }, state)
      }
    }

    case sonifierActions.SET_REGION_MODE: {
      let sonifierState: SonifierFileState = { ...state.entities[action.payload.file.id].sonifier };
      sonifierState.regionMode = action.payload.mode;
      return {
        ...adapter.updateOne({
          id: action.payload.file.id,
          changes: {
            sonifier: sonifierState,
          }
        }, state)
      }
    }


    case sonifierActions.UPDATE_REGION: {
      let imageFile = action.payload.file;
      let sonifierState: SonifierFileState = { ...state.entities[imageFile.id].sonifier };

      if (sonifierState.regionMode == SonifierRegionMode.VIEWPORT) {
        let transformation: Transformation = state.entities[imageFile.id].transformation;
        sonifierState.region = getViewportRegion(transformation, imageFile);
      }
      else if (sonifierState.regionMode == SonifierRegionMode.CUSTOM) {
        if (sonifierState.regionHistoryIndex < sonifierState.regionHistory.length) {
          sonifierState.region = sonifierState.regionHistory[sonifierState.regionHistoryIndex];
        }
      }

      return {
        ...adapter.updateOne({
          id: action.payload.file.id,
          changes: {
            sonifier: sonifierState,
          }
        }, state)
      }

    }

    case sonifierActions.ADD_REGION_TO_HISTORY: {
      if (action.payload.file.type == DataFileType.IMAGE) {
        let imageFile = action.payload.file;
        let sonifierState = { ...state.entities[imageFile.id].sonifier };
        let region = Object.assign({}, action.payload.region);
        if (!sonifierState.regionHistoryInitialized) {
          sonifierState.regionHistoryIndex = 0;
          sonifierState.regionHistory = [region];
          sonifierState.regionHistoryInitialized = true;
        }
        else {
          sonifierState.regionHistory = [...sonifierState.regionHistory.slice(0, sonifierState.regionHistoryIndex + 1), region];
          sonifierState.regionHistoryIndex++;
        }


        return {
          ...adapter.updateOne({
            id: action.payload.file.id,
            changes: {
              sonifier: sonifierState,
            }
          }, state)
        }
      }
      return state;
    }

    case sonifierActions.UNDO_REGION_SELECTION: {
      if (action.payload.file.type == DataFileType.IMAGE) {
        let imageFile = action.payload.file;
        let sonifierState = { ...state.entities[imageFile.id].sonifier };
        if (!sonifierState.regionHistoryInitialized || sonifierState.regionHistoryIndex == 0) return state;
        sonifierState.regionHistoryIndex--;
        sonifierState.region = sonifierState.regionHistory[sonifierState.regionHistoryIndex];

        return {
          ...adapter.updateOne({
            id: action.payload.file.id,
            changes: {
              sonifier: sonifierState,
            }
          }, state)
        }
      }
      return state;
    }

    case sonifierActions.REDO_REGION_SELECTION: {
      if (action.payload.file.type == DataFileType.IMAGE) {
        let imageFile = action.payload.file;
        let sonifierState = { ...state.entities[imageFile.id].sonifier };
        if (!sonifierState.regionHistoryInitialized || sonifierState.regionHistoryIndex == (sonifierState.regionHistory.length - 1)) return state;
        sonifierState.regionHistoryIndex++;
        sonifierState.region = sonifierState.regionHistory[sonifierState.regionHistoryIndex];

        return {
          ...adapter.updateOne({
            id: action.payload.file.id,
            changes: {
              sonifier: sonifierState,
            }
          }, state)
        }
      }
      return state;
    }

    case sonifierActions.CLEAR_REGION_HISTORY: {
      if (action.payload.file.type == DataFileType.IMAGE) {
        let imageFile = action.payload.file;
        let sonifierState = { ...state.entities[imageFile.id].sonifier };
        if (!sonifierState.regionHistoryInitialized || sonifierState.regionHistoryIndex == (sonifierState.regionHistory.length - 1)) return state;
        sonifierState.region = null;
        sonifierState.regionHistoryIndex = null
        sonifierState.regionHistory = [];
        sonifierState.regionHistoryInitialized = false;

        return {
          ...adapter.updateOne({
            id: action.payload.file.id,
            changes: {
              sonifier: sonifierState,
            }
          }, state)
        }
      }
      return state;
    }

    case sonifierActions.UPDATE_SONIFICATION_URI: {
      let sonifierState = { ...state.entities[action.payload.file.id].sonifier };
      sonifierState.sonificationUri = action.payload.uri;
      return {
        ...adapter.updateOne({
          id: action.payload.file.id,
          changes: {
            sonifier: sonifierState,
          }
        }, state)
      }
    }

    case sonifierActions.SET_PROGRESS_LINE: {
      let sonifierState = { ...state.entities[action.payload.file.id].sonifier };
      sonifierState.progressLine = action.payload.line ? {...action.payload.line}: null;
      return {
        ...adapter.updateOne({
          id: action.payload.file.id,
          changes: {
            sonifier: sonifierState,
          }
        }, state)
      }
    }

   

    case sourceExtractorActions.SET_REGION: {
      let imageFile = action.payload.file;
      let sourceExtractorState = { ...state.entities[imageFile.id].sourceExtractor };
      sourceExtractorState.region = action.payload.region;
      return {
        ...adapter.updateOne({
          id: action.payload.file.id,
          changes: {
            sourceExtractor: sourceExtractorState,
          }
        }, state)
      }
    }

    case sourceExtractorActions.UPDATE_FILE_STATE: {
      let imageFile = action.payload.file;
      let sourceExtractorState: SourceExtractorFileState = Object.assign({ ...state.entities[action.payload.file.id].sourceExtractor }, action.payload.changes);
      return {
        ...adapter.updateOne({
          id: action.payload.file.id,
          changes: {
            sourceExtractor: sourceExtractorState,
          }
        }, state)
      }
    }

    case sourceExtractorActions.SET_SOURCE_EXTRACTION_JOB: {
      let fileId = action.payload.job.file_ids[0];
      let sourceExtractorState: SourceExtractorFileState = Object.assign(
        { ...state.entities[fileId].sourceExtractor },
        {
          sourceExtractionJobId: action.payload.job.id
        }
      );
      return {
        ...adapter.updateOne({
          id: fileId,
          changes: {
            sourceExtractor: sourceExtractorState,
          }
        }, state)
      }
    }

    // case sourceExtractorActions.EXTRACT_SOURCES_SUCCESS: {
    //   let sourceExtractorState = { ...state.entities[action.payload.file.id].sourceExtractor };
    //   sourceExtractorState.sources = [...action.payload.sources];
    //   return {
    //     ...adapter.updateOne({
    //       id: action.payload.file.id,
    //       changes: {
    //         sourceExtractor: sourceExtractorState,
    //       }
    //     }, state)
    //   }
    // }

    // case sourceExtractorActions.UPDATE_SOURCE: {
    //   let sourceExtractorState = { ...state.entities[action.payload.file.id].sourceExtractor };
    //   sourceExtractorState.sources = [...sourceExtractorState.sources];
    //   let source = sourceExtractorState.sources.find(s => s.id == action.payload.sourceId)
    //   if(!source) return state;
    //   let sourceIndex = sourceExtractorState.sources.indexOf(source);
    //   sourceExtractorState.sources[sourceIndex] = {...source, ...action.payload.changes};
    //   return {
    //     ...adapter.updateOne({
    //       id: action.payload.file.id,
    //       changes: {
    //         sourceExtractor: sourceExtractorState,
    //       }
    //     }, state)
    //   }
    // }

    

    // case sourceExtractorActions.REMOVE_ALL_SOURCES: {
    //   let sourceExtractorState = { ...state.entities[action.payload.file.id].sourceExtractor };
    //   sourceExtractorState.selectedSourceIds = [];
    //   sourceExtractorState.sources = [];
    //   return {
    //     ...adapter.updateOne({
    //       id: action.payload.file.id,
    //       changes: {
    //         sourceExtractor: sourceExtractorState,
    //       }
    //     }, state)
    //   }
    // }

    // case sourceExtractorActions.REMOVE_SELECTED_SOURCES: {
    //   let sourceExtractorState = { ...state.entities[action.payload.file.id].sourceExtractor };
    //   let sources = sourceExtractorState.sources.filter(source => {
    //     return sourceExtractorState.selectedSourceIds.indexOf(source.id) == -1;
    //   })
    //   sourceExtractorState.selectedSourceIds = [];
    //   sourceExtractorState.sources = sources;

    //   return {
    //     ...adapter.updateOne({
    //       id: action.payload.file.id,
    //       changes: {
    //         sourceExtractor: sourceExtractorState,
    //       }
    //     }, state)
    //   }
    // }

    // case sourceExtractorActions.PHOTOMETER_SOURCES_SUCCESS: {
    //   let sourceExtractorState = { ...state.entities[action.payload.file.id].sourceExtractor };
    //   sourceExtractorState.sources = [...sourceExtractorState.sources, ...action.payload.sources];
    //   return {
    //     ...adapter.updateOne({
    //       id: action.payload.file.id,
    //       changes: {
    //         sourceExtractor: sourceExtractorState,
    //       }
    //     }, state)
    //   }
    // }

    // case sourceExtractorActions.SET_SOURCE_LABEL: {
    //   let sourceExtractorState = {...state.entities[action.payload.file.id].sourceExtractor};
    //   let sources = [...sourceExtractorState.sources];
    //   let sourceIndex = sources.map(source => source.id).indexOf(action.payload.source.id);
    //   if(sourceIndex == -1) return state;
    //   sources[sourceIndex] = {...sources[sourceIndex], label: action.payload.label};
    //   sourceExtractorState.sources = sources;

    //   return {
    //     ...adapter.updateOne({
    //       id: action.payload.file.id,
    //       changes: {
    //         sourceExtractor: sourceExtractorState,
    //       }
    //     }, state)
    //   }
    // }






    default:
      return state;
  }
}

