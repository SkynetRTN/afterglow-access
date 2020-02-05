import { State, Action, Selector, StateContext, Store, Actions} from '@ngxs/store';
import { Point, Matrix, Rectangle } from 'paper';
import { RenormalizeImageFile, NormalizeImageTile, UpdateNormalizer, AddRegionToHistory, UndoRegionSelection, RedoRegionSelection, CenterRegionInViewport, UpdatePhotometryFileState, ResetImageTransform, SetViewportTransform, ZoomTo, ZoomBy, UpdateCurrentViewportSize, SetImageTransform, MoveBy, InitializeImageFileState, RotateBy, Flip, StartLine, UpdateLine, UpdatePlotterFileState, UpdateSonifierFileState, ClearRegionHistory, SetProgressLine, SonificationRegionChanged } from './image-files.actions';
import { ImageFileState } from './models/image-file-state';
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

export interface ImageFilesStateModel {
  version: number;
  ids: string[];
  entities: { [id: string]: ImageFileState };
}

const imageFilesDefaultState : ImageFilesStateModel = {
  version: 1,
  ids: [],
  entities: {}
}

@State<ImageFilesStateModel>({
  name: 'imageFiles',
  defaults: imageFilesDefaultState
})
export class ImageFilesState {

  constructor(private store: Store, private afterglowDataFileService: AfterglowDataFileService, private correlationIdGenerator: CorrelationIdGenerator, private actions$: Actions) { }

  @Selector()
  public static getState(state: ImageFilesStateModel) {
    return state;
  }

  @Selector()
  public static getEntities(state: ImageFilesStateModel) {
    return state.entities;
  }

  @Selector()
  public static getIds(state: ImageFilesStateModel) {
    return state.ids;
  }

  @Selector()
  public static getImageFileStates(state: ImageFilesStateModel) {
    return Object.values(state.entities);
  }


  @Action(ResetState)
  @ImmutableContext()
  public resetState({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { }: ResetState) {
    setState((state: ImageFilesStateModel) => {
      return imageFilesDefaultState
    });
  }



  @Action(InitializeImageFileState)
  @ImmutableContext()
  public initializeImageFileState({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileIds }: InitializeImageFileState) {
    setState((state: ImageFilesStateModel) => {
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
          plotter: {
            measuring: false,
            lineMeasureStart: null,
            lineMeasureEnd: null,
          },
          sonifier: {
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
          photometry: {
            selectedSourceIds: [],
            sourceExtractionJobId: null,
          },
          markers: []
        }

        state.ids.push(fileId);

      });
      return state;
    })
  }

  @Action(RemoveDataFileSuccess)
  @ImmutableContext()
  public removeDataFileSuccess({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId }: RemoveDataFileSuccess) {
    setState((state: ImageFilesStateModel) => {
      state.ids = state.ids.filter(id => id != fileId);
      if (fileId in state.entities) delete state.entities[fileId];
      return state;
    });
  }

  @Action(InitImageTiles)
  @ImmutableContext()
  public initImageTiles({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId }: InitImageTiles) {
    setState((state: ImageFilesStateModel) => {
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
  public renormalizeImageFile({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId }: RenormalizeImageFile) {
    setState((state: ImageFilesStateModel) => {
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
  public normalizeImageTile({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, tileIndex }: NormalizeImageTile) {
    setState((state: ImageFilesStateModel) => {
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
  public updateNormalizer({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, changes }: UpdateNormalizer) {
    setState((state: ImageFilesStateModel) => {
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
  public loadDataFileHdrSuccess({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, header }: LoadDataFileHdrSuccess) {
    let state = getState();
    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
    let dataFile = dataFiles[fileId];
    let result = [];

    if (dataFile.type == DataFileType.IMAGE) {
      let sonifierState = state.entities[dataFile.id].sonifier;
      let sourceExtractorState = state.entities[dataFile.id].photometry;
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
  public regionHistoryChanged({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId }: AddRegionToHistory | UndoRegionSelection | RedoRegionSelection) {
    let state = getState();
    if (state.entities[fileId].sonifier.regionMode == SonifierRegionMode.CUSTOM) {
      dispatch(new SonificationRegionChanged(fileId));
    }
  }

  @Action(SonificationRegionChanged)
  @ImmutableContext()
  public sonificationRegionChanged({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId }: SonificationRegionChanged) {
    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
    let imageFile = dataFiles[fileId] as ImageFile;
    let sonifierState = getState().entities[fileId].sonifier;
    let transformationState = getState().entities[fileId].transformation;
    let sourceExtractorState = getState().entities[fileId].photometry;

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
  public updateSonifierFileState({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, changes }: UpdateSonifierFileState) {
    setState((state: ImageFilesStateModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let sonifierState = state.entities[fileId].sonifier;
      state.entities[fileId].sonifier = {
        ...state.entities[fileId].sonifier,
        ...changes
      }

      dispatch(new SonificationRegionChanged(fileId));

      return state;
    });
  }

  @Action(AddRegionToHistory)
  @ImmutableContext()
  public addRegionToHistory({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, region }: AddRegionToHistory) {
    setState((state: ImageFilesStateModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let sonifierState = state.entities[fileId].sonifier;
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
  public undoRegionSelection({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId }: UndoRegionSelection) {
    setState((state: ImageFilesStateModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let sonifierState = state.entities[fileId].sonifier;
      if (!sonifierState.regionHistoryInitialized || sonifierState.regionHistoryIndex == 0) return state;
      sonifierState.regionHistoryIndex--;
      return state;
    });

  }

  @Action(RedoRegionSelection)
  @ImmutableContext()
  public redoRegionSelection({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId }: RedoRegionSelection) {
    setState((state: ImageFilesStateModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let sonifierState = state.entities[fileId].sonifier;
      if (!sonifierState.regionHistoryInitialized || sonifierState.regionHistoryIndex == sonifierState.regionHistory.length-1) return state;
      sonifierState.regionHistoryIndex++;
      return state;
    });

  }

  @Action(ClearRegionHistory)
  @ImmutableContext()
  public clearRegionHistory({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId }: ClearRegionHistory) {
    setState((state: ImageFilesStateModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let sonifierState = state.entities[fileId].sonifier;
      if (!sonifierState.regionHistoryInitialized || sonifierState.regionHistoryIndex == (sonifierState.regionHistory.length - 1)) return state;
      sonifierState.regionHistoryIndex = null
      sonifierState.regionHistory = [];
      sonifierState.regionHistoryInitialized = false;
      return state;
    });
  }

  @Action(SetProgressLine)
  @ImmutableContext()
  public setProgressLine({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, line }: SetProgressLine) {
    setState((state: ImageFilesStateModel) => {
      let sonifierState = state.entities[fileId].sonifier;
      sonifierState.progressLine = line;
      return state;
    })
  }

  @Action(UpdatePhotometryFileState)
  @ImmutableContext()
  public updatePhotometryFileState({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, changes }: UpdatePhotometryFileState) {
    setState((state: ImageFilesStateModel) => {
      state.entities[fileId].photometry = {
        ...state.entities[fileId].photometry,
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
  public centerRegionInViewport({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, region, viewportSize }: CenterRegionInViewport) {
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
  public zoomTo({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, scale, anchorPoint }: ZoomTo) {
    let state = getState();
    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
    let transformationState = state.entities[fileId].transformation;

    let zoomByFactor = scale / getScale(transformationState);

    return dispatch(new ZoomBy(fileId, zoomByFactor, anchorPoint))
  }

  @Action(ZoomBy)
  @ImmutableContext()
  public zoomBy({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, scaleFactor, viewportAnchor }: ZoomBy) {
    setState((state: ImageFilesStateModel) => {
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
  public moveBy({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, xShift, yShift }: MoveBy) {
    setState((state: ImageFilesStateModel) => {
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
  public setViewportTransform({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, transform }: SetViewportTransform) {
    setState((state: ImageFilesStateModel) => {
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
  public setImageTransform({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, transform }: SetImageTransform) {
    setState((state: ImageFilesStateModel) => {
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
  public resetImageTransform({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId }: ResetImageTransform) {
    setState((state: ImageFilesStateModel) => {
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
  public rotateBy({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, rotationAngle, anchorPoint }: RotateBy) {
    setState((state: ImageFilesStateModel) => {
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
  public flip({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId }: Flip) {
    setState((state: ImageFilesStateModel) => {
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
  public updateCurrentViewportSize({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, viewportSize }: UpdateCurrentViewportSize) {
    setState((state: ImageFilesStateModel) => {
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
  public startLine({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, point }: StartLine) {
    setState((state: ImageFilesStateModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let plotterState = state.entities[fileId].plotter;

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
  public updateLine({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, point }: UpdateLine) {
    setState((state: ImageFilesStateModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let plotterState = state.entities[fileId].plotter;

      if (!plotterState.measuring) return state;

      plotterState.lineMeasureEnd = point;

      return state;
    });
  }

  @Action(UpdatePlotterFileState)
  @ImmutableContext()
  public updatePlotterFileState({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, changes }: UpdatePlotterFileState) {
    setState((state: ImageFilesStateModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      state.entities[fileId].plotter = {
        ...state.entities[fileId].plotter,
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
}