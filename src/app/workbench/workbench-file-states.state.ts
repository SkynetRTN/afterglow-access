import {
  State,
  Action,
  Selector,
  StateContext,
  Store,
  Actions,
} from "@ngxs/store";
import { Point, Matrix, Rectangle } from "paper";
import {
  RenormalizeImageHdu,
  NormalizeImageTile,
  UpdateNormalizer,
  AddRegionToHistory,
  UndoRegionSelection,
  RedoRegionSelection,
  CenterRegionInViewport,
  UpdatePhotometryFileState,
  ResetImageTransform,
  SetViewportTransform,
  ZoomTo,
  ZoomBy,
  UpdateCurrentViewportSize,
  SetImageTransform,
  MoveBy,
  InitializeWorkbenchHduState,
  RotateBy,
  Flip,
  StartLine,
  UpdateLine,
  UpdatePlotterFileState,
  UpdateSonifierFileState,
  ClearRegionHistory,
  SetProgressLine,
  SonificationRegionChanged,
  UpdateCustomMarker,
  AddCustomMarkers,
  RemoveCustomMarkers,
  SelectCustomMarkers,
  DeselectCustomMarkers,
  SetCustomMarkerSelection,
  AddPhotDatas,
  RemoveAllPhotDatas,
  RemovePhotDatas,
  InitializeHduNormalizationSuccess,
} from "./workbench-file-states.actions";
import {
  WorkbenchImageHduState,
  WorkbenchTableHduState,
  IWorkbenchHduState,
  WorkbenchFileState,
} from "./models/workbench-file-state";
import {
  InitializeImageTiles,
  LoadHduHeaderSuccess,
  CloseHduSuccess,
  LoadImageTilePixelsSuccess,
  CloseDataFileSuccess,
  InitializeImageTilesSuccess,
} from "../data-files/data-files.actions";
import { ImmutableContext } from "@ngxs-labs/immer-adapter";
import { HduType } from "../data-files/models/data-file-type";
import { grayColorMap } from "./models/color-map";
import { StretchMode } from "./models/stretch-mode";
import { SonifierRegionMode } from "./models/sonifier-file-state";
import { ImageTile } from "../data-files/models/image-tile";
import {
  getYTileDim,
  getHeight,
  getXTileDim,
  getWidth,
  ImageLayerMode,
  ImageHdu,
  PixelType,
  ITiledImageData,
} from "../data-files/models/data-file";
import {
  DataFilesState,
  DataFilesStateModel,
} from "../data-files/data-files.state";
import { normalize } from "./models/pixel-normalizer";
import { AfterglowDataFileService } from "./services/afterglow-data-files";
import { CorrelationIdGenerator } from "../utils/correlated-action";
import {
  getViewportRegion,
  getScale,
  matrixToTransform,
  transformToMatrix,
  Transformation,
} from "./models/transformation";
import { ResetState } from "../auth/auth.actions";
import { entries } from "core-js/fn/array";
import { appConfig } from '../../environments/environment';

export interface WorkbenchFileStatesModel {
  version: number;
  fileIds: string[];
  fileStateEntities: { [id: string]: WorkbenchFileState };
  hduIds: string[];
  hduStateEntities: { [id: string]: IWorkbenchHduState };
  nextMarkerId: number;
}

const defaultWorkbenchHduStatesModel: WorkbenchFileStatesModel = {
  version: 1,
  hduIds: [],
  hduStateEntities: {},
  fileIds: [],
  fileStateEntities: {},
  nextMarkerId: 0,
};

@State<WorkbenchFileStatesModel>({
  name: "workbenchFileStates",
  defaults: defaultWorkbenchHduStatesModel,
})
export class WorkbenchFileStates {
  constructor(
    private store: Store,
    private afterglowDataFileService: AfterglowDataFileService,
    private correlationIdGenerator: CorrelationIdGenerator,
    private actions$: Actions
  ) {}

  @Selector()
  public static getState(state: WorkbenchFileStatesModel) {
    return state;
  }

  @Selector()
  public static getFileStateEntities(state: WorkbenchFileStatesModel) {
    return state.fileStateEntities;
  }

  @Selector()
  public static getFileIds(state: WorkbenchFileStatesModel) {
    return state.fileIds;
  }

  @Selector()
  public static getFileStates(state: WorkbenchFileStatesModel) {
    return Object.values(state.fileStateEntities);
  }

  @Selector()
  public static getFileState(state: WorkbenchFileStatesModel) {
    return (fileId: string) => {
      return fileId in state.fileStateEntities
        ? state.fileStateEntities[fileId]
        : null;
    };
  }

  @Selector()
  public static getFileTransformation(state: WorkbenchFileStatesModel) {
    return (fileId: string) => {
      if (!(fileId in state.fileStateEntities)) return null;
      return state.fileStateEntities[fileId].transformation;
    };
  }

  @Selector()
  public static getHduStateEntities(state: WorkbenchFileStatesModel) {
    return state.hduStateEntities;
  }

  @Selector()
  public static getHduIds(state: WorkbenchFileStatesModel) {
    return state.hduIds;
  }

  @Selector()
  public static getHduStates(state: WorkbenchFileStatesModel) {
    return Object.values(state.hduStateEntities);
  }

  @Selector()
  public static getHduState(state: WorkbenchFileStatesModel) {
    return (hduId: string) => {
      return hduId in state.hduStateEntities
        ? state.hduStateEntities[hduId]
        : null;
    };
  }

  @Selector()
  public static getNormalization(state: WorkbenchFileStatesModel) {
    return (hduId: string) => {
      if (
        !(hduId in state.hduStateEntities) ||
        state.hduStateEntities[hduId].hduType != HduType.IMAGE
      )
        return null;
      return (state.hduStateEntities[hduId] as WorkbenchImageHduState)
        .normalization;
    };
  }

  @Selector()
  public static getTransformation(state: WorkbenchFileStatesModel) {
    return (hduId: string) => {
      if (
        !(hduId in state.hduStateEntities) ||
        state.hduStateEntities[hduId].hduType != HduType.IMAGE
      )
        return null;
      return (state.hduStateEntities[hduId] as WorkbenchImageHduState)
        .transformation;
    };
  }

  @Selector()
  public static getPlottingPanelState(state: WorkbenchFileStatesModel) {
    return (hduId: string) => {
      if (
        !(hduId in state.hduStateEntities) ||
        state.hduStateEntities[hduId].hduType != HduType.IMAGE
      )
        return null;
      return (state.hduStateEntities[hduId] as WorkbenchImageHduState)
        .plottingPanelState;
    };
  }

  @Selector()
  public static getSonificationPanelState(state: WorkbenchFileStatesModel) {
    return (hduId: string) => {
      if (
        !(hduId in state.hduStateEntities) ||
        state.hduStateEntities[hduId].hduType != HduType.IMAGE
      )
        return null;
      return (state.hduStateEntities[hduId] as WorkbenchImageHduState)
        .sonificationPanelState;
    };
  }

  @Selector()
  public static getPhotometryPanelState(state: WorkbenchFileStatesModel) {
    return (hduId: string) => {
      if (
        !(hduId in state.hduStateEntities) ||
        state.hduStateEntities[hduId].hduType != HduType.IMAGE
      )
        return null;
      return (state.hduStateEntities[hduId] as WorkbenchImageHduState)
        .photometryPanelState;
    };
  }

  @Selector()
  public static getCustomMarkerPanelState(state: WorkbenchFileStatesModel) {
    return (hduId: string) => {
      if (
        !(hduId in state.hduStateEntities) ||
        state.hduStateEntities[hduId].hduType != HduType.IMAGE
      )
        return null;
      return (state.hduStateEntities[hduId] as WorkbenchImageHduState)
        .customMarkerPanelState;
    };
  }

  @Action(ResetState)
  @ImmutableContext()
  public resetState(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    {}: ResetState
  ) {
    setState((state: WorkbenchFileStatesModel) => {
      return defaultWorkbenchHduStatesModel;
    });
  }

  @Action(InitializeWorkbenchHduState)
  @ImmutableContext()
  public initializeWorkbenchHduState(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduIds }: InitializeWorkbenchHduState
  ) {
    setState((state: WorkbenchFileStatesModel) => {
      hduIds.forEach((hduId) => {
        let hduEntities = this.store.selectSnapshot(
          DataFilesState.getHduEntities
        );
        if (!(hduId in hduEntities)) return;
        let hdu = hduEntities[hduId];

        //initialize HDU states
        let hduState: IWorkbenchHduState = {
          id: hdu.id,
          hduType: hdu.hduType,
        };

        if (hdu.hduType == HduType.IMAGE) {
          hduState = {
            ...hduState,
            normalization: {
              width: null,
              height: null,
              tiles: [],
              initialized: false,
              tilesInitialized: false,
              normalizer: {
                backgroundPercentile: 10,
                peakPercentile: 99,
                colorMapName: grayColorMap.name,
                stretchMode: StretchMode.Linear,
                inverted: false,
              },
            },
            transformation: {
              imageTransform: null,
              viewportTransform: null,
              imageToViewportTransform: null,
              viewportSize: null,
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
            },
          } as WorkbenchImageHduState;
        } else if (hdu.hduType == HduType.TABLE) {
        }

        state.hduStateEntities[hduState.id] = hduState;
        state.hduIds.push(hdu.id);

        let fileEntities = this.store.selectSnapshot(
          DataFilesState.getDataFileEntities
        );
        if (!(hdu.fileId in fileEntities)) return;
        let file = fileEntities[hdu.fileId];

        if (file.id in state.fileStateEntities) return;

        state.fileStateEntities[file.id] = {
          id: file.id,
          transformation: {
            imageTransform: null,
            viewportTransform: null,
            imageToViewportTransform: null,
            viewportSize: null,
          },
        };
        state.fileIds.push(file.id);
      });

      return state;
    });
  }

  @Action(CloseDataFileSuccess)
  @ImmutableContext()
  public closeDataFileSuccess(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { fileId }: CloseDataFileSuccess
  ) {
    setState((state: WorkbenchFileStatesModel) => {
      state.fileIds = state.fileIds.filter((id) => id != fileId);
      if (fileId in state.fileStateEntities)
        delete state.fileStateEntities[fileId];
      return state;
    });
  }

  @Action(CloseHduSuccess)
  @ImmutableContext()
  public closeHduSuccess(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId }: CloseHduSuccess
  ) {
    setState((state: WorkbenchFileStatesModel) => {
      state.hduIds = state.hduIds.filter((id) => id != hduId);
      if (hduId in state.hduStateEntities) delete state.hduStateEntities[hduId];
      return state;
    });
  }

  @Action(InitializeHduNormalizationSuccess)
  @ImmutableContext()
  public initializeFileNormalizationTiles(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId }: InitializeHduNormalizationSuccess
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    //wait until all HDU normalizations which belong to the file have been initialized
    let fileEntities = this.store.selectSnapshot(
      DataFilesState.getDataFileEntities
    );
    let hduEntities = this.store.selectSnapshot(
      DataFilesState.getHduEntities
    );
    
    let hdu = hduEntities[hduId];
    let hduState = state.hduStateEntities[hduId] as ImageHdu;
    let file = fileEntities[hdu.fileId];
    let fileHduStates = file.hduIds.map(id => state.hduStateEntities[id]).filter(hdu => hdu.hduType == HduType.IMAGE) as WorkbenchImageHduState[];
    let allHdusinitialized = fileHduStates.filter(fileHduState => fileHduState.normalization.initialized).length == fileHduStates.length;

    if(!allHdusinitialized) return;

    setState((state: WorkbenchFileStatesModel) => {

      let fileState = state.fileStateEntities[file.id];
      let width = Math.min(...fileHduStates.map((fileHduState) => fileHduState.normalization.width));
      let height = Math.min(...fileHduStates.map((fileHduState) => fileHduState.normalization.height));

      let composite: ITiledImageData<Uint32Array> = {
        width: width,
        height: height,
        tileWidth: appConfig.tileSize,
        tileHeight: appConfig.tileSize,
        tilesInitialized: false,
        tiles: null
      }

      let tiles: ImageTile<Uint32Array>[] = [];

      for (let j = 0; j < getYTileDim(composite); j += 1) {
        let tw = composite.tileWidth;
        let th = composite.tileHeight;

        if (j === getYTileDim(composite) - 1) {
          th -= (j + 1) * composite.tileHeight - composite.height;
        }
        for (let i = 0; i < getXTileDim(composite); i += 1) {
          if (i === getXTileDim(composite) - 1) {
            tw -= (i + 1) * composite.tileWidth - composite.width;
          }
          tiles.push({
            index: j * getXTileDim(composite) + i,
            x: i * composite.tileWidth,
            y: j * composite.tileHeight,
            width: tw,
            height: th,
            pixelsLoaded: false,
            pixelsLoading: false,
            pixelLoadingFailed: false,
            pixels: null,
          });
        }
      }
      composite.tiles = tiles;
      composite.tilesInitialized = true;

      let imageMatrix = new Matrix(1, 0, 0, -1, 0, height);
      let viewportMatrix = new Matrix(1, 0, 0, 1, 0, 0);
      let imageToViewportMatrix = viewportMatrix.appended(imageMatrix);

      fileState.transformation.imageTransform = matrixToTransform(imageMatrix);
      fileState.transformation.viewportTransform = matrixToTransform(viewportMatrix);
      fileState.transformation.imageToViewportTransform = matrixToTransform(
        imageToViewportMatrix
      );

      return state;
    });
  }

  @Action(InitializeImageTilesSuccess)
  @ImmutableContext()
  public initializeHduNormalization(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId }: InitializeImageTilesSuccess
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let normalization = hduState.normalization;
      let hduEntities = this.store.selectSnapshot(
        DataFilesState.getHduEntities
      );
      let hdu = hduEntities[hduId] as ImageHdu;
      let tiles: ImageTile<Uint32Array>[] = [];

      for (let j = 0; j < getYTileDim(hdu); j += 1) {
        let tw = hdu.tileWidth;
        let th = hdu.tileHeight;

        if (j === getYTileDim(hdu) - 1) {
          th -= (j + 1) * hdu.tileHeight - hdu.height;
        }
        for (let i = 0; i < getXTileDim(hdu); i += 1) {
          if (i === getXTileDim(hdu) - 1) {
            tw -= (i + 1) * hdu.tileWidth - hdu.width;
          }
          tiles.push({
            index: j * getXTileDim(hdu) + i,
            x: i * hdu.tileWidth,
            y: j * hdu.tileHeight,
            width: tw,
            height: th,
            pixelsLoaded: false,
            pixelsLoading: false,
            pixelLoadingFailed: false,
            pixels: null,
          });
        }
      }
      hduState.normalization = {
        ...normalization,
        tiles: tiles,
        width: hdu.width,
        height: hdu.height,
        tileWidth: hdu.tileWidth,
        tileHeight: hdu.tileHeight,
        tilesInitialized: true,
        initialized: true,
      };

      // also initialize the transformation matrix since it requires the
      // image height
      let transformation = hduState.transformation;
      let imageMatrix = new Matrix(1, 0, 0, -1, 0, getHeight(hdu));
      let viewportMatrix = new Matrix(1, 0, 0, 1, 0, 0);
      let imageToViewportMatrix = viewportMatrix.appended(imageMatrix);

      if (
        !transformation.imageTransform ||
        !transformation.viewportTransform ||
        !transformation.imageToViewportTransform
      ) {
        transformation.imageTransform = matrixToTransform(imageMatrix);
        transformation.viewportTransform = matrixToTransform(viewportMatrix);
        transformation.imageToViewportTransform = matrixToTransform(
          imageToViewportMatrix
        );
      }

      return state;
    });

    dispatch(new InitializeHduNormalizationSuccess(hduId));
  }

  @Action(RenormalizeImageHdu)
  @ImmutableContext()
  public renormalizeImageHdu(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId }: RenormalizeImageHdu
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let normalization = hduState.normalization;
      normalization.tiles.forEach((tile) => {
        tile.pixelsLoaded = false;
        tile.pixelsLoading = false;
        tile.pixels = null;
      });
      return state;
    });
  }

  @Action([NormalizeImageTile, LoadImageTilePixelsSuccess])
  @ImmutableContext()
  public normalizeImageTile(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId, tileIndex }: NormalizeImageTile
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[
        hduId
      ] as ImageHdu;
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let normalization = hduState.normalization;
      let tile = normalization.tiles[tileIndex];
      tile.pixelsLoaded = true;
      tile.pixelsLoading = false;
      tile.pixels = normalize(
        hdu.tiles[tileIndex].pixels,
        hdu.hist,
        normalization.normalizer
      );

      return state;
    });
  }

  @Action(UpdateNormalizer)
  @ImmutableContext()
  public updateNormalizer(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId, changes }: UpdateNormalizer
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[
        hduId
      ] as ImageHdu;
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let normalizer = hduState.normalization.normalizer;
      hduState.normalization.normalizer = {
        ...normalizer,
        ...changes,
      };
      return state;
    });

    return dispatch(new RenormalizeImageHdu(hduId));
  }

  @Action(LoadHduHeaderSuccess)
  @ImmutableContext()
  public loadDataFileHdrSuccess(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId, header }: LoadHduHeaderSuccess
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[
      hduId
    ] as ImageHdu;
    let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
    let sonifierState = hduState.sonificationPanelState;
    
    if (!sonifierState.regionHistoryInitialized) {
      dispatch(
        new AddRegionToHistory(hduId, {
          x: 0,
          y: 0,
          width: getWidth(hdu),
          height: getHeight(hdu),
        })
      );
    }
  }

  @Action([AddRegionToHistory, UndoRegionSelection, RedoRegionSelection])
  @ImmutableContext()
  public regionHistoryChanged(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId }: AddRegionToHistory | UndoRegionSelection | RedoRegionSelection
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[
      hduId
    ] as ImageHdu;
    let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
    if (
      hduState.sonificationPanelState.regionMode == SonifierRegionMode.CUSTOM
    ) {
      dispatch(new SonificationRegionChanged(hduId));
    }
  }

  @Action(SonificationRegionChanged)
  @ImmutableContext()
  public sonificationRegionChanged(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId }: SonificationRegionChanged
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;
    let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[
      hduId
    ] as ImageHdu;
    let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
    let sonifierState = hduState.sonificationPanelState;
    let transformationState = hduState.transformation;
    let sourceExtractorState = hduState.photometryPanelState;

    if (
      sonifierState.regionMode == SonifierRegionMode.CUSTOM &&
      sonifierState.viewportSync
    ) {
      let region =
        sonifierState.regionHistory[sonifierState.regionHistoryIndex];
      dispatch(
        new CenterRegionInViewport(
          hduId,
          region,
          transformationState.viewportSize
        )
      );
    }
  }

  @Action(UpdateSonifierFileState)
  @ImmutableContext()
  public updateSonifierFileState(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId, changes }: UpdateSonifierFileState
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      hduState.sonificationPanelState = {
        ...hduState.sonificationPanelState,
        ...changes,
      };

      dispatch(new SonificationRegionChanged(hduId));

      return state;
    });
  }

  @Action(AddRegionToHistory)
  @ImmutableContext()
  public addRegionToHistory(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId, region }: AddRegionToHistory
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let sonifierState = hduState.sonificationPanelState;
      if (!sonifierState.regionHistoryInitialized) {
        sonifierState.regionHistoryIndex = 0;
        sonifierState.regionHistory = [region];
        sonifierState.regionHistoryInitialized = true;
      } else {
        sonifierState.regionHistory = [
          ...sonifierState.regionHistory.slice(
            0,
            sonifierState.regionHistoryIndex + 1
          ),
          region,
        ];
        sonifierState.regionHistoryIndex++;
      }
      return state;
    });
  }

  @Action(UndoRegionSelection)
  @ImmutableContext()
  public undoRegionSelection(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId }: UndoRegionSelection
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let sonifierState = hduState.sonificationPanelState;
      if (
        !sonifierState.regionHistoryInitialized ||
        sonifierState.regionHistoryIndex == 0
      )
        return state;
      sonifierState.regionHistoryIndex--;
      return state;
    });
  }

  @Action(RedoRegionSelection)
  @ImmutableContext()
  public redoRegionSelection(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId }: RedoRegionSelection
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let sonifierState = hduState.sonificationPanelState;
      if (
        !sonifierState.regionHistoryInitialized ||
        sonifierState.regionHistoryIndex ==
          sonifierState.regionHistory.length - 1
      )
        return state;
      sonifierState.regionHistoryIndex++;
      return state;
    });
  }

  @Action(ClearRegionHistory)
  @ImmutableContext()
  public clearRegionHistory(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId }: ClearRegionHistory
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let sonifierState = hduState.sonificationPanelState;
      if (
        !sonifierState.regionHistoryInitialized ||
        sonifierState.regionHistoryIndex ==
          sonifierState.regionHistory.length - 1
      )
        return state;
      sonifierState.regionHistoryIndex = null;
      sonifierState.regionHistory = [];
      sonifierState.regionHistoryInitialized = false;
      return state;
    });
  }

  @Action(SetProgressLine)
  @ImmutableContext()
  public setProgressLine(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId, line }: SetProgressLine
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let sonifierState = hduState.sonificationPanelState;
      sonifierState.progressLine = line;
      return state;
    });
  }

  @Action(UpdatePhotometryFileState)
  @ImmutableContext()
  public updatePhotometryFileState(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId, changes }: UpdatePhotometryFileState
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      hduState.photometryPanelState = {
        ...hduState.photometryPanelState,
        ...changes,
      };
      return state;
    });
  }

  /* Transformation */
  @Action(CenterRegionInViewport)
  @ImmutableContext()
  public centerRegionInViewport(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { targetId, region, viewportSize, isFile }: CenterRegionInViewport
  ) {
    let state = getState();
    if (isFile) {
      if (
        !(targetId in state.hduStateEntities) ||
        state.hduStateEntities[targetId].hduType != HduType.IMAGE
      )
        return;
    } else {
      if (!(targetId in state.fileStateEntities)) return;
    }

    let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[
      targetId
    ] as ImageHdu;
    let hduState = state.hduStateEntities[targetId] as WorkbenchImageHduState;
    let transformationState = hduState.transformation;

    if (!viewportSize) viewportSize = transformationState.viewportSize;

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
      scale * (getHeight(hdu) - (region.y + region.height / 2));
    let viewportTransform = new Matrix(scale, 0, 0, scale, xShift, yShift);

    return dispatch([
      new ResetImageTransform(targetId),
      new SetViewportTransform(targetId, viewportTransform),
    ]);
  }

  @Action(ZoomTo)
  @ImmutableContext()
  public zoomTo(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { targetId, scale, anchorPoint, isFile }: ZoomTo
  ) {
    let state = getState();
    if (isFile) {
      if (
        !(targetId in state.hduStateEntities) ||
        state.hduStateEntities[targetId].hduType != HduType.IMAGE
      )
        return;
    } else {
      if (!(targetId in state.fileStateEntities)) return;
    }
    let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
    let fileEntities = this.store.selectSnapshot(
      DataFilesState.getDataFileEntities
    );

    let transformation: Transformation;
    let width: number;
    let height: number;

    if (isFile) {
      let file = fileEntities[targetId];
      let hdus = file.hduIds
        .map((id) => hduEntities[id])
        .filter((hdu) => hdu.hduType == HduType.IMAGE);
      if (hdus.length == 0) return state;
      transformation = state.fileStateEntities[targetId].transformation;
      width = Math.max(...hdus.map((hdu) => getWidth(hdu as ImageHdu)));
      height = Math.max(...hdus.map((hdu) => getHeight(hdu as ImageHdu)));
    } else {
      let hdu = hduEntities[targetId] as ImageHdu;
      let hduState = state.hduStateEntities[targetId] as WorkbenchImageHduState;
      transformation = hduState.transformation;
      width = getWidth(hdu);
      height = getHeight(hdu);
    }

    let zoomByFactor = scale / getScale(transformation);

    return dispatch(new ZoomBy(targetId, zoomByFactor, anchorPoint, isFile));
  }

  @Action(ZoomBy)
  @ImmutableContext()
  public zoomBy(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { targetId, scaleFactor, viewportAnchor, isFile }: ZoomBy
  ) {
    let state = getState();
    if (isFile) {
      if (
        !(targetId in state.hduStateEntities) ||
        state.hduStateEntities[targetId].hduType != HduType.IMAGE
      )
        return;
    } else {
      if (!(targetId in state.fileStateEntities)) return;
    }

    setState((state: WorkbenchFileStatesModel) => {
      let hduEntities = this.store.selectSnapshot(
        DataFilesState.getHduEntities
      );
      let fileEntities = this.store.selectSnapshot(
        DataFilesState.getDataFileEntities
      );

      let transformation: Transformation;
      let width: number;
      let height: number;

      if (isFile) {
        let file = fileEntities[targetId];
        let hdus = file.hduIds
          .map((id) => hduEntities[id])
          .filter((hdu) => hdu.hduType == HduType.IMAGE);
        if (hdus.length == 0) return state;
        transformation = state.fileStateEntities[targetId].transformation;
        width = Math.max(...hdus.map((hdu) => getWidth(hdu as ImageHdu)));
        height = Math.max(...hdus.map((hdu) => getHeight(hdu as ImageHdu)));
      } else {
        let hdu = hduEntities[targetId] as ImageHdu;
        let hduState = state.hduStateEntities[
          targetId
        ] as WorkbenchImageHduState;
        transformation = hduState.transformation;
        width = getWidth(hdu);
        height = getHeight(hdu);
      }

      let viewportMatrix = transformToMatrix(transformation.viewportTransform);
      let imageMatrix = transformToMatrix(transformation.imageTransform);
      let imageToViewportMatrix = transformToMatrix(
        transformation.imageToViewportTransform
      );

      // max zoom reached when 1 pixel fills viewport
      let viewportULP = imageToViewportMatrix.transform(new Point(0.5, 0.5));
      let viewportLRP = imageToViewportMatrix.transform(new Point(1.5, 1.5));

      let d = viewportULP.getDistance(viewportLRP);
      let reachedMaxZoom =
        d > transformation.viewportSize.width ||
        d > transformation.viewportSize.height;

      // min zoom reached when image fits in viewer
      viewportLRP = imageToViewportMatrix.transform(
        new Point(width - 0.5, height - 0.5)
      );
      d = viewportULP.getDistance(viewportLRP);
      let reachedMinZoom =
        d < transformation.viewportSize.width &&
        d < transformation.viewportSize.height;

      if (
        scaleFactor === 1 ||
        (scaleFactor > 1 && reachedMaxZoom) ||
        (scaleFactor < 1 && reachedMinZoom)
      ) {
        return state;
      }

      // if image anchor is null, set to center of image viewer
      let anchorPoint = viewportAnchor;
      if (anchorPoint == null) {
        anchorPoint = {
          x: transformation.viewportSize.width / 2.0,
          y: transformation.viewportSize.height / 2.0,
        };
        // let centerViewerPoint = new Point(transformation.viewportSize.width / 2.0, transformation.viewportSize.height / 2.0);
        //let newAnchor = imageToViewportMatrix.inverted().transform(centerViewerPoint);
        //anchorPoint = {x: newAnchor.x+0.5, y: newAnchor.y+0.5};
      }

      anchorPoint = viewportMatrix
        .inverted()
        .transform(new Point(anchorPoint.x, anchorPoint.y));

      viewportMatrix.scale(scaleFactor, anchorPoint);

      imageToViewportMatrix = viewportMatrix.appended(imageMatrix);

      transformation.imageTransform = matrixToTransform(imageMatrix);
      transformation.viewportTransform = matrixToTransform(viewportMatrix);
      transformation.imageToViewportTransform = matrixToTransform(
        imageToViewportMatrix
      );

      return state;
    });
  }

  @Action(MoveBy)
  @ImmutableContext()
  public moveBy(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { targetId, xShift, yShift, isFile }: MoveBy
  ) {
    let state = getState();
    if (isFile) {
      if (
        !(targetId in state.hduStateEntities) ||
        state.hduStateEntities[targetId].hduType != HduType.IMAGE
      )
        return;
    } else {
      if (!(targetId in state.fileStateEntities)) return;
    }

    setState((state: WorkbenchFileStatesModel) => {
      let hduEntities = this.store.selectSnapshot(
        DataFilesState.getHduEntities
      );
      let fileEntities = this.store.selectSnapshot(
        DataFilesState.getDataFileEntities
      );

      let transformation: Transformation;
      let width: number;
      let height: number;

      if (isFile) {
        let file = fileEntities[targetId];
        let hdus = file.hduIds
          .map((id) => hduEntities[id])
          .filter((hdu) => hdu.hduType == HduType.IMAGE);
        if (hdus.length == 0) return state;
        transformation = state.fileStateEntities[targetId].transformation;
        width = Math.max(...hdus.map((hdu) => getWidth(hdu as ImageHdu)));
        height = Math.max(...hdus.map((hdu) => getHeight(hdu as ImageHdu)));
      } else {
        let hdu = hduEntities[targetId] as ImageHdu;
        let hduState = state.hduStateEntities[
          targetId
        ] as WorkbenchImageHduState;
        transformation = hduState.transformation;
        width = getWidth(hdu);
        height = getHeight(hdu);
      }

      let viewportMatrix = transformToMatrix(transformation.viewportTransform);
      let imageMatrix = transformToMatrix(transformation.imageTransform);
      let imageToViewportMatrix = transformToMatrix(
        transformation.imageToViewportTransform
      );

      // test if image is almost entirely out of viewer
      let buffer = 50;
      let c1 = imageToViewportMatrix.transform(new Point(width, height));
      let c2 = imageToViewportMatrix.transform(new Point(0, 0));
      let c3 = imageToViewportMatrix.transform(new Point(0, height));
      let c4 = imageToViewportMatrix.transform(new Point(width, 0));
      let maxPoint = new Point(
        Math.max(c1.x, c2.x, c3.x, c4.x),
        Math.max(c1.y, c2.y, c3.y, c4.y)
      );
      let minPoint = new Point(
        Math.min(c1.x, c2.x, c3.x, c4.x),
        Math.min(c1.y, c2.y, c3.y, c4.y)
      );
      let imageRect = new Rectangle(
        minPoint.x + buffer + xShift,
        minPoint.y + buffer + yShift,
        maxPoint.x - minPoint.x - buffer * 2,
        maxPoint.y - minPoint.y - buffer * 2
      );

      let viewportRect = new Rectangle(
        0,
        0,
        transformation.viewportSize.width,
        transformation.viewportSize.height
      );
      if (!imageRect.intersects(viewportRect)) {
        return state;
      }

      let xScale = Math.abs(transformation.viewportTransform.a);
      let yScale = Math.abs(transformation.viewportTransform.d);
      viewportMatrix.translate(xShift / xScale, yShift / yScale);
      imageToViewportMatrix = viewportMatrix.appended(imageMatrix);

      transformation.imageTransform = matrixToTransform(imageMatrix);
      transformation.viewportTransform = matrixToTransform(viewportMatrix);
      transformation.imageToViewportTransform = matrixToTransform(
        imageToViewportMatrix
      );

      return state;
    });
  }

  @Action(SetViewportTransform)
  @ImmutableContext()
  public setViewportTransform(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { targetId, transform, isFile }: SetViewportTransform
  ) {
    let state = getState();
    if (isFile) {
      if (
        !(targetId in state.hduStateEntities) ||
        state.hduStateEntities[targetId].hduType != HduType.IMAGE
      )
        return;
    } else {
      if (!(targetId in state.fileStateEntities)) return;
    }

    setState((state: WorkbenchFileStatesModel) => {
      let hduEntities = this.store.selectSnapshot(
        DataFilesState.getHduEntities
      );
      let fileEntities = this.store.selectSnapshot(
        DataFilesState.getDataFileEntities
      );
      let transformation: Transformation;

      if (isFile) {
        let file = fileEntities[targetId];
        transformation = state.fileStateEntities[targetId].transformation;
      } else {
        let hdu = hduEntities[targetId] as ImageHdu;
        let hduState = state.hduStateEntities[
          targetId
        ] as WorkbenchImageHduState;
        transformation = hduState.transformation;
      }

      let viewportMatrix = transformToMatrix(transform);
      let imageMatrix = transformToMatrix(transformation.imageTransform);
      let imageToViewportMatrix = transformToMatrix(
        transformation.imageToViewportTransform
      );

      imageToViewportMatrix = viewportMatrix.appended(imageMatrix);

      transformation.imageTransform = matrixToTransform(imageMatrix);
      transformation.viewportTransform = matrixToTransform(viewportMatrix);
      transformation.imageToViewportTransform = matrixToTransform(
        imageToViewportMatrix
      );
      return state;
    });
  }

  @Action(SetImageTransform)
  @ImmutableContext()
  public setImageTransform(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { targetId, transform, isFile }: SetImageTransform
  ) {
    let state = getState();
    if (isFile) {
      if (
        !(targetId in state.hduStateEntities) ||
        state.hduStateEntities[targetId].hduType != HduType.IMAGE
      )
        return;
    } else {
      if (!(targetId in state.fileStateEntities)) return;
    }

    setState((state: WorkbenchFileStatesModel) => {
      let hduEntities = this.store.selectSnapshot(
        DataFilesState.getHduEntities
      );
      let fileEntities = this.store.selectSnapshot(
        DataFilesState.getDataFileEntities
      );
      let transformation: Transformation;

      if (isFile) {
        let file = fileEntities[targetId];
        transformation = state.fileStateEntities[targetId].transformation;
      } else {
        let hdu = hduEntities[targetId] as ImageHdu;
        let hduState = state.hduStateEntities[
          targetId
        ] as WorkbenchImageHduState;
        transformation = hduState.transformation;
      }

      let viewportMatrix = transformToMatrix(transformation.viewportTransform);
      let imageMatrix = transformToMatrix(transform);
      let imageToViewportMatrix = transformToMatrix(
        transformation.imageToViewportTransform
      );

      imageToViewportMatrix = viewportMatrix.appended(imageMatrix);

      transformation.imageTransform = matrixToTransform(imageMatrix);
      transformation.viewportTransform = matrixToTransform(viewportMatrix);
      transformation.imageToViewportTransform = matrixToTransform(
        imageToViewportMatrix
      );
      return state;
    });
  }

  @Action(ResetImageTransform)
  @ImmutableContext()
  public resetImageTransform(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { targetId, isFile }: ResetImageTransform
  ) {
    let state = getState();
    if (isFile) {
      if (
        !(targetId in state.hduStateEntities) ||
        state.hduStateEntities[targetId].hduType != HduType.IMAGE
      )
        return;
    } else {
      if (!(targetId in state.fileStateEntities)) return;
    }

    setState((state: WorkbenchFileStatesModel) => {
      let hduEntities = this.store.selectSnapshot(
        DataFilesState.getHduEntities
      );
      let fileEntities = this.store.selectSnapshot(
        DataFilesState.getDataFileEntities
      );
      let transformation: Transformation;
      let width: number;
      let height: number;

      if (isFile) {
        let file = fileEntities[targetId];
        let hdus = file.hduIds
          .map((id) => hduEntities[id])
          .filter((hdu) => hdu.hduType == HduType.IMAGE);
        if (hdus.length == 0) return state;
        transformation = state.fileStateEntities[targetId].transformation;
        width = Math.max(...hdus.map((hdu) => getWidth(hdu as ImageHdu)));
        height = Math.max(...hdus.map((hdu) => getHeight(hdu as ImageHdu)));
      } else {
        let hdu = hduEntities[targetId] as ImageHdu;
        let hduState = state.hduStateEntities[
          targetId
        ] as WorkbenchImageHduState;
        transformation = hduState.transformation;
        width = getWidth(hdu);
        height = getHeight(hdu);
      }

      let viewportMatrix = transformToMatrix(transformation.viewportTransform);
      let imageMatrix = transformToMatrix(transformation.imageTransform);
      let imageToViewportMatrix = transformToMatrix(
        transformation.imageToViewportTransform
      );

      imageMatrix = new Matrix(1, 0, 0, -1, 0, height);
      imageToViewportMatrix = viewportMatrix.appended(imageMatrix);

      transformation.imageTransform = matrixToTransform(imageMatrix);
      transformation.viewportTransform = matrixToTransform(viewportMatrix);
      transformation.imageToViewportTransform = matrixToTransform(
        imageToViewportMatrix
      );
      return state;
    });
  }

  @Action(RotateBy)
  @ImmutableContext()
  public rotateBy(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { targetId, rotationAngle, anchorPoint, isFile }: RotateBy
  ) {
    let state = getState();
    if (isFile) {
      if (
        !(targetId in state.hduStateEntities) ||
        state.hduStateEntities[targetId].hduType != HduType.IMAGE
      )
        return;
    } else {
      if (!(targetId in state.fileStateEntities)) return;
    }
    setState((state: WorkbenchFileStatesModel) => {
      let hduEntities = this.store.selectSnapshot(
        DataFilesState.getHduEntities
      );
      let fileEntities = this.store.selectSnapshot(
        DataFilesState.getDataFileEntities
      );
      let transformation: Transformation;
      let width: number;
      let height: number;

      if (isFile) {
        let file = fileEntities[targetId];
        let hdus = file.hduIds
          .map((id) => hduEntities[id])
          .filter((hdu) => hdu.hduType == HduType.IMAGE);
        if (hdus.length == 0) return state;
        transformation = state.fileStateEntities[targetId].transformation;
        width = Math.max(...hdus.map((hdu) => getWidth(hdu as ImageHdu)));
        height = Math.max(...hdus.map((hdu) => getHeight(hdu as ImageHdu)));
      } else {
        let hdu = hduEntities[targetId] as ImageHdu;
        let hduState = state.hduStateEntities[
          targetId
        ] as WorkbenchImageHduState;
        transformation = hduState.transformation;
        width = getWidth(hdu);
        height = getHeight(hdu);
      }

      let viewportMatrix = transformToMatrix(transformation.viewportTransform);
      let imageMatrix = transformToMatrix(transformation.imageTransform);
      let imageToViewportMatrix = transformToMatrix(
        transformation.imageToViewportTransform
      );

      if (anchorPoint == null) {
        anchorPoint = new Point(
          transformation.viewportSize.width / 2.0,
          transformation.viewportSize.height / 2.0
        );
      }

      anchorPoint = imageToViewportMatrix
        .inverted()
        .transform(new Point(anchorPoint.x, anchorPoint.y));

      imageMatrix.rotate(-rotationAngle, anchorPoint);
      imageToViewportMatrix = viewportMatrix.appended(imageMatrix);

      transformation.imageTransform = matrixToTransform(imageMatrix);
      transformation.viewportTransform = matrixToTransform(viewportMatrix);
      transformation.imageToViewportTransform = matrixToTransform(
        imageToViewportMatrix
      );

      return state;
    });
  }

  @Action(Flip)
  @ImmutableContext()
  public flip(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { targetId, isFile }: Flip
  ) {
    let state = getState();
    if (isFile) {
      if (
        !(targetId in state.hduStateEntities) ||
        state.hduStateEntities[targetId].hduType != HduType.IMAGE
      )
        return;
    } else {
      if (!(targetId in state.fileStateEntities)) return;
    }

    setState((state: WorkbenchFileStatesModel) => {
      let hduEntities = this.store.selectSnapshot(
        DataFilesState.getHduEntities
      );
      let fileEntities = this.store.selectSnapshot(
        DataFilesState.getDataFileEntities
      );
      let transformation: Transformation;
      let width: number;
      let height: number;

      if (isFile) {
        let file = fileEntities[targetId];
        let hdus = file.hduIds
          .map((id) => hduEntities[id])
          .filter((hdu) => hdu.hduType == HduType.IMAGE);
        if (hdus.length == 0) return state;
        transformation = state.fileStateEntities[targetId].transformation;
        width = Math.max(...hdus.map((hdu) => getWidth(hdu as ImageHdu)));
        height = Math.max(...hdus.map((hdu) => getHeight(hdu as ImageHdu)));
      } else {
        let hdu = hduEntities[targetId] as ImageHdu;
        let hduState = state.hduStateEntities[
          targetId
        ] as WorkbenchImageHduState;
        transformation = hduState.transformation;
        width = getWidth(hdu);
        height = getHeight(hdu);
      }

      let viewportMatrix = transformToMatrix(transformation.viewportTransform);
      let imageMatrix = transformToMatrix(transformation.imageTransform);
      let imageToViewportMatrix = transformToMatrix(
        transformation.imageToViewportTransform
      );

      imageMatrix.scale(-1, 1, width / 2, height / 2);
      imageToViewportMatrix = viewportMatrix.appended(imageMatrix);

      transformation.imageTransform = matrixToTransform(imageMatrix);
      transformation.viewportTransform = matrixToTransform(viewportMatrix);
      transformation.imageToViewportTransform = matrixToTransform(
        imageToViewportMatrix
      );

      return state;
    });
  }

  @Action(UpdateCurrentViewportSize)
  @ImmutableContext()
  public updateCurrentViewportSize(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { targetId, viewportSize, isFile }: UpdateCurrentViewportSize
  ) {
    let state = getState();
    if (isFile) {
      if (
        !(targetId in state.hduStateEntities) ||
        state.hduStateEntities[targetId].hduType != HduType.IMAGE
      )
        return;
    } else {
      if (!(targetId in state.fileStateEntities)) return;
    }

    setState((state: WorkbenchFileStatesModel) => {
      let hduEntities = this.store.selectSnapshot(
        DataFilesState.getHduEntities
      );
      let fileEntities = this.store.selectSnapshot(
        DataFilesState.getDataFileEntities
      );
      let transformation: Transformation;

      if (isFile) {
        let file = fileEntities[targetId];
        let hdus = file.hduIds
          .map((id) => hduEntities[id])
          .filter((hdu) => hdu.hduType == HduType.IMAGE);
        if (hdus.length == 0) return state;
        transformation = state.fileStateEntities[targetId].transformation;
      } else {
        let hdu = hduEntities[targetId] as ImageHdu;
        let hduState = state.hduStateEntities[
          targetId
        ] as WorkbenchImageHduState;
        transformation = hduState.transformation;
      }

      transformation.viewportSize = viewportSize;
      return state;
    });
  }

  @Action(StartLine)
  @ImmutableContext()
  public startLine(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId, point }: StartLine
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[
        hduId
      ] as ImageHdu;
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let plotterState = hduState.plottingPanelState;

      if (!plotterState.measuring) {
        plotterState.lineMeasureStart = { ...point };
        plotterState.lineMeasureEnd = { ...point };
      } else {
        plotterState.lineMeasureEnd = { ...point };
      }
      plotterState.measuring = !plotterState.measuring;

      return state;
    });
  }

  @Action(UpdateLine)
  @ImmutableContext()
  public updateLine(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId, point }: UpdateLine
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[
        hduId
      ] as ImageHdu;
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let plotterState = hduState.plottingPanelState;

      if (!plotterState.measuring) return state;

      plotterState.lineMeasureEnd = point;

      return state;
    });
  }

  @Action(UpdatePlotterFileState)
  @ImmutableContext()
  public updatePlotterFileState(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId, changes }: UpdatePlotterFileState
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[
        hduId
      ] as ImageHdu;
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let plotterState = hduState.plottingPanelState;

      plotterState = {
        ...plotterState,
        ...changes,
      };
      return state;
    });
  }

  /*  Custom Markers */
  @Action(UpdateCustomMarker)
  @ImmutableContext()
  public updateCustomMarker(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId, markerId, changes }: UpdateCustomMarker
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[
        hduId
      ] as ImageHdu;
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let markerState = hduState.customMarkerPanelState;
      if (markerState.ids.includes(markerId)) {
        markerState.entities[markerId] = {
          ...markerState.entities[markerId],
          ...changes,
        };
      }
      return state;
    });
  }

  @Action(AddCustomMarkers)
  @ImmutableContext()
  public addCustomMarkers(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId, markers }: AddCustomMarkers
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[
        hduId
      ] as ImageHdu;
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let markerState = hduState.customMarkerPanelState;

      markers.forEach((marker) => {
        let nextSeed = state.nextMarkerId++;
        if (marker.label == null || marker.label == undefined) {
          // marker.marker.label = `M${nextSeed}`;
          marker.label = "";
        }
        let id = `CUSTOM_MARKER_${hdu.fileId}_${hduId}_${nextSeed.toString()}`;
        markerState.ids.push(id);
        markerState.entities[id] = {
          ...marker,
          id: id,
        };
      });

      return state;
    });
  }

  @Action(RemoveCustomMarkers)
  @ImmutableContext()
  public removeCustomMarkers(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId, markers }: RemoveCustomMarkers
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[
        hduId
      ] as ImageHdu;
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let markerState = hduState.customMarkerPanelState;

      let idsToRemove = markers.map((m) => m.id);
      markerState.ids = markerState.ids.filter(
        (id) => !idsToRemove.includes(id)
      );
      markers.forEach((marker) => {
        if (marker.id in markerState.entities)
          delete markerState.entities[marker.id];
      });

      return state;
    });
  }

  @Action(SelectCustomMarkers)
  @ImmutableContext()
  public selectCustomMarkers(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId, markers }: SelectCustomMarkers
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[
        hduId
      ] as ImageHdu;
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let markerState = hduState.customMarkerPanelState;
      markers.forEach((marker) => {
        if (markerState.ids.includes(marker.id)) {
          markerState.entities[marker.id].selected = true;
        }
      });
      return state;
    });
  }

  @Action(DeselectCustomMarkers)
  @ImmutableContext()
  public deselectCustomMarkers(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId, markers }: DeselectCustomMarkers
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[
        hduId
      ] as ImageHdu;
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let markerState = hduState.customMarkerPanelState;
      markers.forEach((marker) => {
        if (markerState.ids.includes(marker.id)) {
          markerState.entities[marker.id].selected = false;
        }
      });
      return state;
    });
  }

  @Action(SetCustomMarkerSelection)
  @ImmutableContext()
  public setCustomMarkerSelection(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId, markers }: SetCustomMarkerSelection
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[
        hduId
      ] as ImageHdu;
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let markerState = hduState.customMarkerPanelState;

      let selectedMarkerIds = markers.map((m) => m.id);
      markerState.ids.forEach((markerId) => {
        markerState.entities[markerId].selected = selectedMarkerIds.includes(
          markerId
        );
      });
      return state;
    });
  }

  @Action(AddPhotDatas)
  @ImmutableContext()
  public addPhotDatas(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { photDatas }: AddPhotDatas
  ) {
    setState((state: WorkbenchFileStatesModel) => {
      photDatas.forEach((d) => {
        if (
          !d.hduId ||
          !(d.hduId in state.hduStateEntities) ||
          state.hduStateEntities[d.hduId].hduType != HduType.IMAGE ||
          !d.sourceId
        )
          return;
        let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[
          d.hduId
        ] as ImageHdu;
        let hduState = state.hduStateEntities[
          d.hduId
        ] as WorkbenchImageHduState;
        let photometryPanelState = hduState.photometryPanelState;
        photometryPanelState.sourcePhotometryData[d.sourceId] = d;
      });

      return state;
    });
  }

  @Action(RemoveAllPhotDatas)
  @ImmutableContext()
  public removeAllPhotDatas(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    {}: RemoveAllPhotDatas
  ) {
    setState((state: WorkbenchFileStatesModel) => {
      state.hduIds.forEach((hduId) => {
        if (state.hduStateEntities[hduId].hduType != HduType.IMAGE) return;
        (state.hduStateEntities[
          hduId
        ] as WorkbenchImageHduState).photometryPanelState.sourcePhotometryData = {};
      });
      return state;
    });
  }

  @Action(RemovePhotDatas)
  @ImmutableContext()
  public removePhotDatas(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { sourceId }: RemovePhotDatas
  ) {
    setState((state: WorkbenchFileStatesModel) => {
      state.hduIds.forEach((hduId) => {
        if (state.hduStateEntities[hduId].hduType != HduType.IMAGE) return;
        let photometryPanelState = (state.hduStateEntities[
          hduId
        ] as WorkbenchImageHduState).photometryPanelState;
        if (sourceId in photometryPanelState.sourcePhotometryData) {
          delete photometryPanelState.sourcePhotometryData[sourceId];
        }
      });
      return state;
    });
  }
}
