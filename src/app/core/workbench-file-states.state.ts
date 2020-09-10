import { State, Action, Selector, StateContext, Store, Actions} from '@ngxs/store';
import { Point, Matrix, Rectangle } from 'paper';
import { RenormalizeImageFile, NormalizeImageTile, UpdateNormalizer, AddRegionToHistory, UndoRegionSelection, RedoRegionSelection, CenterRegionInViewport, UpdatePhotometryFileState, ResetImageTransform, SetViewportTransform, ZoomTo, ZoomBy, UpdateCurrentViewportSize, SetImageTransform, MoveBy, InitializeImageFileState, RotateBy, Flip, StartLine, UpdateLine, UpdatePlotterFileState, UpdateSonifierFileState, ClearRegionHistory, SetProgressLine, SonificationRegionChanged, UpdateCustomMarker, AddCustomMarkers, RemoveCustomMarkers, SelectCustomMarkers, DeselectCustomMarkers, SetCustomMarkerSelection, AddPhotDatas, RemoveAllPhotDatas, RemovePhotDatas } from './workbench-file-states.actions';
import { WorkbenchFileState } from './models/workbench-file-state';
import { RemoveDataFileSuccess, InitImageTiles, LoadDataFileHdrSuccess } from '../data-files/data-files.actions';
import { ImmutableContext } from '@ngxs-labs/immer-adapter';
import { DataFileType } from '../data-files/models/data-file-type';
import { grayColorMap } from './models/color-map';
import { StretchMode } from './models/stretch-mode';
import { SonifierRegionMode } from './models/sonifier-file-state';
import { ImageTile } from '../data-files/models/image-tile';
import { getYTileDim, getHeight, getXTileDim, getWidth, ImageFile } from '../data-files/models/data-file';
import { DataFilesState, DataFilesStateModel } from '../data-files/data-files.state';
import { normalize } from './models/pixel-normalizer';
import { AfterglowDataFileService } from './services/afterglow-data-files';
import { CorrelationIdGenerator } from '../utils/correlated-action';
import { getViewportRegion, getScale, matrixToTransform, transformToMatrix } from './models/transformation';
import { ResetState } from '../auth/auth.actions';
import { entries } from 'core-js/fn/array';

export interface WorkbenchFileStatesModel {
  version: number;
  ids: string[];
  entities: { [id: string]: WorkbenchFileState };
  nextMarkerId: number;
}

const defaultWorkbenchFileStatesModel : WorkbenchFileStatesModel = {
  version: 1,
  ids: [],
  entities: {},
  nextMarkerId: 0
}

@State<WorkbenchFileStatesModel>({
  name: 'imageFiles',
  defaults: defaultWorkbenchFileStatesModel
})
export class WorkbenchFileStates {

  constructor(private store: Store, private afterglowDataFileService: AfterglowDataFileService, private correlationIdGenerator: CorrelationIdGenerator, private actions$: Actions) { }

  @Selector()
  public static getState(state: WorkbenchFileStatesModel) {
    return state;
  }

  @Selector()
  public static getEntities(state: WorkbenchFileStatesModel) {
    return state.entities;
  }

  @Selector()
  public static getIds(state: WorkbenchFileStatesModel) {
    return state.ids;
  }

  @Selector()
  public static getImageFileStates(state: WorkbenchFileStatesModel) {
    return Object.values(state.entities);
  }

  @Selector()
  public static getWorkbenchFileStateByFileId(state: WorkbenchFileStatesModel) {
    return (id: string) => {
      return state.entities[id];
    };
  }

  @Selector()
  public static getNormalization(state: WorkbenchFileStatesModel) {
    return (id: string) => {
      return state.entities[id].normalization;
    };
  }

  @Selector()
  public static getTransformation(state: WorkbenchFileStatesModel) {
    return (id: string) => {
      return state.entities[id].transformation;
    };
  }

  @Selector()
  public static getPlottingPanelState(state: WorkbenchFileStatesModel) {
    return (id: string) => {
      return state.entities[id].plottingPanelState;
    };
  }

  @Selector()
  public static getSonificationPanelState(state: WorkbenchFileStatesModel) {
    return (id: string) => {
      return state.entities[id].sonificationPanelState;
    };
  }

  @Selector()
  public static getPhotometryPanelState(state: WorkbenchFileStatesModel) {
    return (id: string) => {
      return state.entities[id].photometryPanelState;
    };
  }

  @Selector()
  public static getCustomMarkerPanelState(state: WorkbenchFileStatesModel) {
    return (id: string) => {
      return state.entities[id].customMarkerPanelState;
    };
  }


  @Action(ResetState)
  @ImmutableContext()
  public resetState({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { }: ResetState) {
    setState((state: WorkbenchFileStatesModel) => {
      return defaultWorkbenchFileStatesModel
    });
  }



  @Action(InitializeImageFileState)
  @ImmutableContext()
  public initializeImageFileState({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileIds }: InitializeImageFileState) {
    setState((state: WorkbenchFileStatesModel) => {
      fileIds.forEach(fileId => {
        state.entities[fileId] = {
          imageFileId: fileId,
          normalization: {
            normalizedTiles: null,
            initialized: false,
            normalizer: {
              backgroundPercentile: 10,
              peakPercentile: 99,
              colorMapName: grayColorMap.name,
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
          plottingPanelState: {
            measuring: false,
            lineMeasureStart: null,
            lineMeasureEnd: null,
          },
          sonificationPanelState: {
            sonificationUri: null,
            regionHistory: [],
            regionHistoryIndex: null,
            regionHistoryInitialized: false,
            regionMode: SonifierRegionMode.VIEWPORT,
            viewportSync: true,
            duration: 10,
            toneCount: 22,
            progressLine: null,
          },
          photometryPanelState: {
            sourceExtractionJobId: null,
            sourcePhotometryData: {},
          },
          customMarkerPanelState: {
            entities: {},
            ids: [],
          }
        }

        state.ids.push(fileId);

      });
      return state;
    })
  }

  @Action(RemoveDataFileSuccess)
  @ImmutableContext()
  public removeDataFileSuccess({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId }: RemoveDataFileSuccess) {
    setState((state: WorkbenchFileStatesModel) => {
      state.ids = state.ids.filter(id => id != fileId);
      if (fileId in state.entities) delete state.entities[fileId];
      return state;
    });
  }

  @Action(InitImageTiles)
  @ImmutableContext()
  public initImageTiles({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId }: InitImageTiles) {
    setState((state: WorkbenchFileStatesModel) => {
      let normalization = state.entities[fileId].normalization;
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
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
            x: i * imageFile.tileWidth,
            y: j * imageFile.tileHeight,
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
      let transformation = state.entities[fileId].transformation;
      let imageMatrix = new Matrix(1, 0, 0, -1, 0, getHeight(imageFile));
      let viewportMatrix = new Matrix(1, 0, 0, 1, 0, 0);
      let imageToViewportMatrix = viewportMatrix.appended(imageMatrix);

      if(!transformation.imageTransform || !transformation.viewportTransform || !transformation.imageToViewportTransform) {
        transformation.imageTransform = matrixToTransform(imageMatrix);
        transformation.viewportTransform = matrixToTransform(viewportMatrix);
        transformation.imageToViewportTransform = matrixToTransform(imageToViewportMatrix);
      }
      return state;
    });
  }


  @Action(RenormalizeImageFile)
  @ImmutableContext()
  public renormalizeImageFile({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId }: RenormalizeImageFile) {
    setState((state: WorkbenchFileStatesModel) => {
      let normalization = state.entities[fileId].normalization;
      normalization.normalizedTiles.forEach(tile => {
        tile.pixelsLoaded = false;
        tile.pixelsLoading = false;
        tile.pixels = null;
      })
      return state;
    });
  }

  @Action(NormalizeImageTile)
  @ImmutableContext()
  public normalizeImageTile({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId, tileIndex }: NormalizeImageTile) {
    setState((state: WorkbenchFileStatesModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let normalization = state.entities[fileId].normalization;
      let tile = normalization.normalizedTiles[tileIndex];
      tile.pixelsLoaded = true;
      tile.pixelsLoading = false;
      tile.pixels = normalize(imageFile.tiles[tileIndex].pixels, imageFile.hist, normalization.normalizer);

      return state;
    });
  }

  @Action(UpdateNormalizer)
  @ImmutableContext()
  public updateNormalizer({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId, changes }: UpdateNormalizer) {
    setState((state: WorkbenchFileStatesModel) => {
      let normalizer = state.entities[fileId].normalization.normalizer;
      state.entities[fileId].normalization.normalizer = {
        ...normalizer,
        ...changes
      }
      return state;
    });

    return dispatch(new RenormalizeImageFile(fileId))
  }


  /*Sonification*/
  @Action(LoadDataFileHdrSuccess)
  @ImmutableContext()
  public loadDataFileHdrSuccess({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId, header }: LoadDataFileHdrSuccess) {
    let state = getState();
    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
    let dataFile = dataFiles[fileId];
    let result = [];

    if (dataFile.type == DataFileType.IMAGE) {
      let sonifierState = state.entities[dataFile.id].sonificationPanelState;
      let sourceExtractorState = state.entities[dataFile.id].photometryPanelState;
      //add effects for image file selection
      let imageFile = dataFile as ImageFile;
      dispatch(new InitImageTiles(fileId));

      if (!sonifierState.regionHistoryInitialized) {
        dispatch(new AddRegionToHistory(
          imageFile.id,
          {
            x: 0,
            y: 0,
            width: getWidth(imageFile),
            height: getHeight(imageFile)
          }
        ))
      }

    }

  }


  @Action([AddRegionToHistory, UndoRegionSelection, RedoRegionSelection])
  @ImmutableContext()
  public regionHistoryChanged({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId }: AddRegionToHistory | UndoRegionSelection | RedoRegionSelection) {
    let state = getState();
    if (state.entities[fileId].sonificationPanelState.regionMode == SonifierRegionMode.CUSTOM) {
      dispatch(new SonificationRegionChanged(fileId));
    }
  }

  @Action(SonificationRegionChanged)
  @ImmutableContext()
  public sonificationRegionChanged({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId }: SonificationRegionChanged) {
    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
    let imageFile = dataFiles[fileId] as ImageFile;
    let sonifierState = getState().entities[fileId].sonificationPanelState;
    let transformationState = getState().entities[fileId].transformation;
    let sourceExtractorState = getState().entities[fileId].photometryPanelState;

    if (
      sonifierState.regionMode == SonifierRegionMode.CUSTOM &&
      sonifierState.viewportSync
    ) {
      let region = sonifierState.regionHistory[sonifierState.regionHistoryIndex];
      dispatch(
        new CenterRegionInViewport(
          fileId,
          region,
          transformationState.viewportSize)
      );
    }

  }

  @Action(UpdateSonifierFileState)
  @ImmutableContext()
  public updateSonifierFileState({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId, changes }: UpdateSonifierFileState) {
    setState((state: WorkbenchFileStatesModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let sonifierState = state.entities[fileId].sonificationPanelState;
      state.entities[fileId].sonificationPanelState = {
        ...state.entities[fileId].sonificationPanelState,
        ...changes
      }

      dispatch(new SonificationRegionChanged(fileId));

      return state;
    });
  }

  @Action(AddRegionToHistory)
  @ImmutableContext()
  public addRegionToHistory({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId, region }: AddRegionToHistory) {
    setState((state: WorkbenchFileStatesModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let sonifierState = state.entities[fileId].sonificationPanelState;
      if (!sonifierState.regionHistoryInitialized) {
        sonifierState.regionHistoryIndex = 0;
        sonifierState.regionHistory = [region];
        sonifierState.regionHistoryInitialized = true;
      }
      else {
        sonifierState.regionHistory = [...sonifierState.regionHistory.slice(0, sonifierState.regionHistoryIndex + 1), region];
        sonifierState.regionHistoryIndex++;
      }
      return state;
    });

  }

  @Action(UndoRegionSelection)
  @ImmutableContext()
  public undoRegionSelection({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId }: UndoRegionSelection) {
    setState((state: WorkbenchFileStatesModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let sonifierState = state.entities[fileId].sonificationPanelState;
      if (!sonifierState.regionHistoryInitialized || sonifierState.regionHistoryIndex == 0) return state;
      sonifierState.regionHistoryIndex--;
      return state;
    });

  }

  @Action(RedoRegionSelection)
  @ImmutableContext()
  public redoRegionSelection({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId }: RedoRegionSelection) {
    setState((state: WorkbenchFileStatesModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let sonifierState = state.entities[fileId].sonificationPanelState;
      if (!sonifierState.regionHistoryInitialized || sonifierState.regionHistoryIndex == sonifierState.regionHistory.length-1) return state;
      sonifierState.regionHistoryIndex++;
      return state;
    });

  }

  @Action(ClearRegionHistory)
  @ImmutableContext()
  public clearRegionHistory({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId }: ClearRegionHistory) {
    setState((state: WorkbenchFileStatesModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let sonifierState = state.entities[fileId].sonificationPanelState;
      if (!sonifierState.regionHistoryInitialized || sonifierState.regionHistoryIndex == (sonifierState.regionHistory.length - 1)) return state;
      sonifierState.regionHistoryIndex = null
      sonifierState.regionHistory = [];
      sonifierState.regionHistoryInitialized = false;
      return state;
    });
  }

  @Action(SetProgressLine)
  @ImmutableContext()
  public setProgressLine({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId, line }: SetProgressLine) {
    setState((state: WorkbenchFileStatesModel) => {
      let sonifierState = state.entities[fileId].sonificationPanelState;
      sonifierState.progressLine = line;
      return state;
    })
  }

  @Action(UpdatePhotometryFileState)
  @ImmutableContext()
  public updatePhotometryFileState({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId, changes }: UpdatePhotometryFileState) {
    setState((state: WorkbenchFileStatesModel) => {
      state.entities[fileId].photometryPanelState = {
        ...state.entities[fileId].photometryPanelState,
        ...changes
      }
      return state;
    });
  }

  // @Action(SetSourceExtractorRegion)
  // @ImmutableContext()
  // public setSourceExtractorRegion({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, region }: SetSourceExtractorRegion) {
  //   setState((state: ImageFilesStateModel) => {
  //     state.entities[fileId].sourceExtractor.region = region;
  //     return state;
  //   });

  // }

  // @Action(UpdateSourceExtractorRegion)
  // @ImmutableContext()
  // public updateSourceExtractorRegion({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId }: UpdateSourceExtractorRegion) {
  //   let state = getState();
  //   let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
  //   let imageFile = dataFiles[fileId] as ImageFile;
  //   let sonifierState = state.entities[fileId].sonifier;
  //   let transformationState = state.entities[fileId].transformation;
  //   let sourceExtractorState = state.entities[fileId].sourceExtractor;
  //   let region = null;
  //   if (
  //     sourceExtractorState.regionOption ==
  //     PhotometryRegionOption.VIEWPORT
  //   ) {
  //     region = getViewportRegion(
  //       transformationState,
  //       imageFile
  //     );
  //     // region = {
  //     //   x: imageFileGlobalState.viewport.imageX,
  //     //   y: imageFileGlobalState.viewport.imageY,
  //     //   width: imageFileGlobalState.viewport.imageWidth,
  //     //   height: imageFileGlobalState.viewport.imageHeight
  //     // }
  //   } else if (
  //     sourceExtractorState.regionOption ==
  //     PhotometryRegionOption.SONIFIER_REGION
  //   ) {
  //     region = sonifierState.region;
  //   } else {
  //     region = {
  //       x: 0,
  //       y: 0,
  //       width: getWidth(imageFile),
  //       height: getHeight(imageFile)
  //     };
  //   }

  //   return dispatch(new SetSourceExtractorRegion(fileId, region));

  // }

  /* Transformation */
  @Action(CenterRegionInViewport)
  @ImmutableContext()
  public centerRegionInViewport({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId, region, viewportSize }: CenterRegionInViewport) {
    let state = getState();
    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
    let imageFile = dataFiles[fileId] as ImageFile;
    let transformationState = state.entities[fileId].transformation;

    if (!viewportSize)
      viewportSize = transformationState.viewportSize;

    let viewportAnchor = new Point(
      viewportSize.width / 2,
      viewportSize.height / 2
    );
    let scale = Math.min(
      (viewportSize.width - 20) / region.width,
      (viewportSize.height - 20) / region.height
    );

    let xShift = viewportAnchor.x - scale * (region.x + region.width / 2);
    let yShift =
      viewportAnchor.y -
      scale * (getHeight(imageFile) - (region.y + region.height / 2));
    let viewportTransform = new Matrix(scale, 0, 0, scale, xShift, yShift);

    return dispatch([
      new ResetImageTransform(fileId),
      new SetViewportTransform(fileId, viewportTransform)
    ])
  }

  @Action(ZoomTo)
  @ImmutableContext()
  public zoomTo({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId, scale, anchorPoint }: ZoomTo) {
    let state = getState();
    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
    let transformationState = state.entities[fileId].transformation;

    let zoomByFactor = scale / getScale(transformationState);

    return dispatch(new ZoomBy(fileId, zoomByFactor, anchorPoint))
  }

  @Action(ZoomBy)
  @ImmutableContext()
  public zoomBy({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId, scaleFactor, viewportAnchor }: ZoomBy) {
    setState((state: WorkbenchFileStatesModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let transformation = state.entities[fileId].transformation;

      let viewportMatrix = transformToMatrix(transformation.viewportTransform);
      let imageMatrix = transformToMatrix(transformation.imageTransform);
      let imageToViewportMatrix = transformToMatrix(transformation.imageToViewportTransform);

      // max zoom reached when 1 pixel fills viewport
      let viewportULP = imageToViewportMatrix.transform(new Point(0.5, 0.5));
      let viewportLRP = imageToViewportMatrix.transform(new Point(1.5, 1.5));

      let d = viewportULP.getDistance(viewportLRP);
      let reachedMaxZoom = d > transformation.viewportSize.width || d > transformation.viewportSize.height;

      // min zoom reached when image fits in viewer
      viewportLRP = imageToViewportMatrix.transform(new Point(getWidth(imageFile) - 0.5, getHeight(imageFile) - 0.5));
      d = viewportULP.getDistance(viewportLRP);
      let reachedMinZoom = d < transformation.viewportSize.width && d < transformation.viewportSize.height;

      if (scaleFactor === 1 || (scaleFactor > 1 && reachedMaxZoom) || (scaleFactor < 1 && reachedMinZoom)) {
        return state;
      }

      // if image anchor is null, set to center of image viewer
      let anchorPoint = viewportAnchor;
      if (anchorPoint == null) {
        anchorPoint = { x: transformation.viewportSize.width / 2.0, y: transformation.viewportSize.height / 2.0 };
        // let centerViewerPoint = new Point(transformation.viewportSize.width / 2.0, transformation.viewportSize.height / 2.0);
        //let newAnchor = imageToViewportMatrix.inverted().transform(centerViewerPoint);
        //anchorPoint = {x: newAnchor.x+0.5, y: newAnchor.y+0.5};
      }

      anchorPoint = viewportMatrix.inverted().transform(new Point(anchorPoint.x, anchorPoint.y));

      viewportMatrix.scale(scaleFactor, anchorPoint);

      imageToViewportMatrix = viewportMatrix.appended(imageMatrix);

      transformation.imageTransform = matrixToTransform(imageMatrix);
      transformation.viewportTransform = matrixToTransform(viewportMatrix);
      transformation.imageToViewportTransform = matrixToTransform(imageToViewportMatrix);

      return state;
    });
  }

  @Action(MoveBy)
  @ImmutableContext()
  public moveBy({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId, xShift, yShift }: MoveBy) {
    setState((state: WorkbenchFileStatesModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let transformation = state.entities[fileId].transformation;

      let viewportMatrix = transformToMatrix(transformation.viewportTransform);
      let imageMatrix = transformToMatrix(transformation.imageTransform);
      let imageToViewportMatrix = transformToMatrix(transformation.imageToViewportTransform);


      // test if image is almost entirely out of viewer
      let buffer = 50;
      let c1 = imageToViewportMatrix.transform(new Point(getWidth(imageFile), getHeight(imageFile)));
      let c2 = imageToViewportMatrix.transform(new Point(0, 0));
      let c3 = imageToViewportMatrix.transform(new Point(0, getHeight(imageFile)));
      let c4 = imageToViewportMatrix.transform(new Point(getWidth(imageFile), 0));
      let maxPoint = new Point(Math.max(c1.x, c2.x, c3.x, c4.x), Math.max(c1.y, c2.y, c3.y, c4.y));
      let minPoint = new Point(Math.min(c1.x, c2.x, c3.x, c4.x), Math.min(c1.y, c2.y, c3.y, c4.y));
      let imageRect = new Rectangle(minPoint.x + buffer + xShift,
        minPoint.y + buffer + yShift,
        maxPoint.x - minPoint.x - (buffer * 2),
        maxPoint.y - minPoint.y - (buffer * 2)
      );


      let viewportRect = new Rectangle(0, 0, transformation.viewportSize.width, transformation.viewportSize.height);
      if (!imageRect.intersects(viewportRect)) {
        return state;
      }

      let xScale = Math.abs(transformation.viewportTransform.a);
      let yScale = Math.abs(transformation.viewportTransform.d);
      viewportMatrix.translate(xShift / xScale, yShift / yScale);
      imageToViewportMatrix = viewportMatrix.appended(imageMatrix);

      transformation.imageTransform = matrixToTransform(imageMatrix);
      transformation.viewportTransform = matrixToTransform(viewportMatrix);
      transformation.imageToViewportTransform = matrixToTransform(imageToViewportMatrix);


      return state;
    });
  }

  @Action(SetViewportTransform)
  @ImmutableContext()
  public setViewportTransform({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId, transform }: SetViewportTransform) {
    setState((state: WorkbenchFileStatesModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let transformation = state.entities[fileId].transformation;

      let viewportMatrix = transformToMatrix(transform);
      let imageMatrix = transformToMatrix(transformation.imageTransform);
      let imageToViewportMatrix = transformToMatrix(transformation.imageToViewportTransform);

      imageToViewportMatrix = viewportMatrix.appended(imageMatrix);

      transformation.imageTransform = matrixToTransform(imageMatrix);
      transformation.viewportTransform = matrixToTransform(viewportMatrix);
      transformation.imageToViewportTransform = matrixToTransform(imageToViewportMatrix);
      return state;
    });
  }

  @Action(SetImageTransform)
  @ImmutableContext()
  public setImageTransform({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId, transform }: SetImageTransform) {
    setState((state: WorkbenchFileStatesModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let transformation = state.entities[fileId].transformation;

      let viewportMatrix = transformToMatrix(transformation.viewportTransform);
      let imageMatrix = transformToMatrix(transform);
      let imageToViewportMatrix = transformToMatrix(transformation.imageToViewportTransform);

      imageToViewportMatrix = viewportMatrix.appended(imageMatrix);

      transformation.imageTransform = matrixToTransform(imageMatrix);
      transformation.viewportTransform = matrixToTransform(viewportMatrix);
      transformation.imageToViewportTransform = matrixToTransform(imageToViewportMatrix);
      return state;
    });
  }

  @Action(ResetImageTransform)
  @ImmutableContext()
  public resetImageTransform({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId }: ResetImageTransform) {
    setState((state: WorkbenchFileStatesModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let transformation = state.entities[fileId].transformation;

      let viewportMatrix = transformToMatrix(transformation.viewportTransform);
      let imageMatrix = transformToMatrix(transformation.imageTransform);
      let imageToViewportMatrix = transformToMatrix(transformation.imageToViewportTransform);

      imageMatrix = new Matrix(1, 0, 0, -1, 0, getHeight(imageFile));
      imageToViewportMatrix = viewportMatrix.appended(imageMatrix);

      transformation.imageTransform = matrixToTransform(imageMatrix);
      transformation.viewportTransform = matrixToTransform(viewportMatrix);
      transformation.imageToViewportTransform = matrixToTransform(imageToViewportMatrix);
      return state;
    });
  }

  @Action(RotateBy)
  @ImmutableContext()
  public rotateBy({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId, rotationAngle, anchorPoint }: RotateBy) {
    setState((state: WorkbenchFileStatesModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let transformation = state.entities[fileId].transformation;

      let viewportMatrix = transformToMatrix(transformation.viewportTransform);
      let imageMatrix = transformToMatrix(transformation.imageTransform);
      let imageToViewportMatrix = transformToMatrix(transformation.imageToViewportTransform);

      if (anchorPoint == null) {
        anchorPoint = new Point(transformation.viewportSize.width / 2.0, transformation.viewportSize.height / 2.0);
      }

      anchorPoint = imageToViewportMatrix.inverted().transform(new Point(anchorPoint.x, anchorPoint.y));

      imageMatrix.rotate(-rotationAngle, anchorPoint);
      imageToViewportMatrix = viewportMatrix.appended(imageMatrix);

      transformation.imageTransform = matrixToTransform(imageMatrix);
      transformation.viewportTransform = matrixToTransform(viewportMatrix);
      transformation.imageToViewportTransform = matrixToTransform(imageToViewportMatrix);

      return state;
    });
  }

  @Action(Flip)
  @ImmutableContext()
  public flip({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId }: Flip) {
    setState((state: WorkbenchFileStatesModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let transformation = state.entities[fileId].transformation;

      let viewportMatrix = transformToMatrix(transformation.viewportTransform);
      let imageMatrix = transformToMatrix(transformation.imageTransform);
      let imageToViewportMatrix = transformToMatrix(transformation.imageToViewportTransform);

      imageMatrix.scale(-1, 1, getWidth(imageFile) / 2, getHeight(imageFile) / 2);
      imageToViewportMatrix = viewportMatrix.appended(imageMatrix);

      transformation.imageTransform = matrixToTransform(imageMatrix);
      transformation.viewportTransform = matrixToTransform(viewportMatrix);
      transformation.imageToViewportTransform = matrixToTransform(imageToViewportMatrix);

      return state;
    });
  }

  @Action(UpdateCurrentViewportSize)
  @ImmutableContext()
  public updateCurrentViewportSize({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId, viewportSize }: UpdateCurrentViewportSize) {
    setState((state: WorkbenchFileStatesModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      if (!imageFile || !state.entities[imageFile.id]) return state;
      let transformation = state.entities[fileId].transformation;

      transformation.viewportSize = viewportSize;
      return state;
    });
  }

  @Action(StartLine)
  @ImmutableContext()
  public startLine({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId, point }: StartLine) {
    setState((state: WorkbenchFileStatesModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let plotterState = state.entities[fileId].plottingPanelState;

      if (!plotterState.measuring) {
        plotterState.lineMeasureStart = { ...point };
        plotterState.lineMeasureEnd = { ...point };
      }
      else {
        plotterState.lineMeasureEnd = { ...point };
      }
      plotterState.measuring = !plotterState.measuring;

      return state;
    });
  }

  @Action(UpdateLine)
  @ImmutableContext()
  public updateLine({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId, point }: UpdateLine) {
    setState((state: WorkbenchFileStatesModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let plotterState = state.entities[fileId].plottingPanelState;

      if (!plotterState.measuring) return state;

      plotterState.lineMeasureEnd = point;

      return state;
    });
  }

  @Action(UpdatePlotterFileState)
  @ImmutableContext()
  public updatePlotterFileState({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId, changes }: UpdatePlotterFileState) {
    setState((state: WorkbenchFileStatesModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      state.entities[fileId].plottingPanelState = {
        ...state.entities[fileId].plottingPanelState,
        ...changes
      }
      return state;
    });
  }





//   @Action([MoveBy, ZoomBy, UpdateCurrentViewportSize, ResetImageTransform, SetViewportTransform, SetImageTransform])
//   @ImmutableContext()
//   public viewportChanged({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId }: MoveBy | ZoomBy | UpdateCurrentViewportSize | ResetImageTransform | SetViewportTransform | SetImageTransform) {
//     let imageFileState = getState().entities[fileId];
//     let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
//     let imageFile = dataFiles[fileId] as ImageFile;

//     let result = [];
//     if (
//       imageFile.headerLoaded &&
//       imageFileState &&
//       imageFileState.transformation.viewportSize
//     ) {
//       let sonifier = imageFileState.sonifier;
//       let sourceExtractor = imageFileState.sourceExtractor;
//       if (sonifier.regionMode == SonifierRegionMode.VIEWPORT) {
//         result.push(new UpdateSonifierRegion(fileId));
//       }

      
//             // region = {
//             //   x: imageFileGlobalState.viewport.imageX,
//             //   y: imageFileGlobalState.viewport.imageY,
//             //   width: imageFileGlobalState.viewport.imageWidth,
//             //   height: imageFileGlobalState.viewport.imageHeight
//             // }

//       if (sourceExtractor.regionOption == PhotometryRegionOption.VIEWPORT) {
//         result.push(new UpdateSourceExtractorRegion(fileId));
//       }

//     }
//     return dispatch(result);
//   }


/*  Custom Markers */
@Action(UpdateCustomMarker)
  @ImmutableContext()
  public updateCustomMarker({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId, markerId, changes }: UpdateCustomMarker) {
    let state = getState();
   
    setState((state: WorkbenchFileStatesModel) => {
      let markerState = state.entities[fileId].customMarkerPanelState
      if(markerState.ids.includes(markerId)) {
        markerState.entities[markerId] = {
          ...markerState.entities[markerId],
          ...changes
        }
      }
      return state;
    });
  }

  @Action(AddCustomMarkers)
  @ImmutableContext()
  public addCustomMarkers({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId, markers }: AddCustomMarkers) {
    let state = getState();
   
    setState((state: WorkbenchFileStatesModel) => {
      let markerState = state.entities[fileId].customMarkerPanelState

      markers.forEach(marker => {
        let nextSeed = state.nextMarkerId++;
        if(marker.label == null || marker.label == undefined) {
          // marker.marker.label = `M${nextSeed}`;
          marker.label = '';
        }
        let id =  `CUSTOM_MARKER_${fileId}_${nextSeed.toString()}`;
        markerState.ids.push(id);
        markerState.entities[id] = {
          ...marker,
          id: id
        }
      });
      
      return state;
    });
  }

  @Action(RemoveCustomMarkers)
  @ImmutableContext()
  public removeCustomMarkers({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId, markers }: RemoveCustomMarkers) {
    let state = getState();
   
    setState((state: WorkbenchFileStatesModel) => {
      let markerState = state.entities[fileId].customMarkerPanelState

      let idsToRemove = markers.map(m => m.id);
      markerState.ids = markerState.ids.filter(id => !idsToRemove.includes(id));
      markers.forEach(marker => {
        if(marker.id in markerState.entities) delete markerState.entities[marker.id];
      })
      
      return state;
    });
  }

  @Action(SelectCustomMarkers)
  @ImmutableContext()
  public selectCustomMarkers({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId, markers }: SelectCustomMarkers) {
    let state = getState();
   
    setState((state: WorkbenchFileStatesModel) => {
      let markerState = state.entities[fileId].customMarkerPanelState
      markers.forEach(marker => {
        if(markerState.ids.includes(marker.id)) {
          markerState.entities[marker.id].selected = true
        }
      })
      return state;
    });
  }

  @Action(DeselectCustomMarkers)
  @ImmutableContext()
  public deselectCustomMarkers({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId, markers }: DeselectCustomMarkers) {
    let state = getState();
   
    setState((state: WorkbenchFileStatesModel) => {
      let markerState = state.entities[fileId].customMarkerPanelState
      markers.forEach(marker => {
        if(markerState.ids.includes(marker.id)) {
          markerState.entities[marker.id].selected = false
        }
      })
      return state;
    });
  }

  @Action(SetCustomMarkerSelection)
  @ImmutableContext()
  public setCustomMarkerSelection({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { fileId, markers }: SetCustomMarkerSelection) {
    setState((state: WorkbenchFileStatesModel) => {
      let markerState = state.entities[fileId].customMarkerPanelState
      let selectedMarkerIds = markers.map(m => m.id);
      markerState.ids.forEach(markerId => {
        markerState.entities[markerId].selected = selectedMarkerIds.includes(markerId);
      })
      return state;
    });
  }


  @Action(AddPhotDatas)
  @ImmutableContext()
  public addPhotDatas({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { photDatas }: AddPhotDatas) {
    setState((state: WorkbenchFileStatesModel) => {
      photDatas.forEach(d => {
        if(!d.fileId || !(d.fileId in state.entities) || !d.sourceId) return;
        state.entities[d.fileId].photometryPanelState.sourcePhotometryData[d.sourceId] = d;
      });
      
      return state;
    });
  }

  @Action(RemoveAllPhotDatas)
  @ImmutableContext()
  public removeAllPhotDatas({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { }: RemoveAllPhotDatas) {
    setState((state: WorkbenchFileStatesModel) => {
      state.ids.forEach(fileId => {
        state.entities[fileId].photometryPanelState.sourcePhotometryData = {};
      })
      return state;
    });
  }

  @Action(RemovePhotDatas)
  @ImmutableContext()
  public removePhotDatas({ getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>, { sourceId }: RemovePhotDatas) {
    setState((state: WorkbenchFileStatesModel) => {
      state.ids.forEach(fileId => {
        if(sourceId in state.entities[fileId].photometryPanelState.sourcePhotometryData) {
          delete state.entities[fileId].photometryPanelState.sourcePhotometryData[sourceId];
        }
      })
      return state;
    });
  }

}