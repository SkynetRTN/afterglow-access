import {
  State,
  Action,
  Selector,
  StateContext,
  Actions,
  Store,
  ofActionSuccessful,
  ofActionCompleted,
  createSelector,
  ofActionDispatched,
} from '@ngxs/store';
import { Point, Matrix, Rectangle } from 'paper';
import {
  DataFile,
  ImageLayer,
  ILayer,
  PixelType,
  getWidth,
  getHeight,
  PixelPrecision,
  TableLayer,
  hasOverlap,
  Header,
  getFilter,
  isImageLayer,
  hasKey,
  getHeaderEntry,
  ColorBalanceMode,
} from './models/data-file';
import { ImmutableContext } from '@ngxs-labs/immer-adapter';
import { merge, combineLatest, fromEvent, of, forkJoin } from 'rxjs';
import { catchError, tap, flatMap, filter, takeUntil, take, skip, finalize } from 'rxjs/operators';
import { AfterglowDataFileService } from '../workbench/services/afterglow-data-files';
import { mergeDelayError } from '../utils/rxjs-extensions';
import { ResetState } from '../auth/auth.actions';
import { WasmService } from '../wasm.service';
import {
  CloseAllDataFiles,
  CloseAllDataFilesFail,
  CloseDataFile,
  LoadDataFile,
  LoadLibrary,
  LoadLibrarySuccess,
  LoadLibraryFail,
  LoadLayerHeader,
  LoadLayerHeaderSuccess,
  LoadImageLayerHistogram,
  LoadImageLayerHistogramSuccess,
  LoadRawImageTile,
  LoadRawImageTileSuccess,
  CloseLayerSuccess,
  CloseLayerFail,
  LoadLayer,
  CloseDataFileSuccess,
  CloseDataFileFail,
  InvalidateRawImageTiles,
  InvalidateRawImageTile,
  InvalidateNormalizedImageTiles,
  UpdateNormalizedImageTile,
  UpdateNormalizer,
  CenterRegionInViewport,
  ZoomTo,
  ZoomBy,
  MoveBy,
  Flip,
  RotateBy,
  UpdateNormalizedImageTileSuccess,
  ResetImageTransform,
  ResetViewportTransform,
  UpdateCompositeImageTile,
  UpdateCompositeImageTileSuccess,
  InvalidateNormalizedImageTile,
  InvalidateCompositeImageTiles,
  InvalidateCompositeImageTile,
  LoadRawImageTileFail,
  UpdateNormalizedImageTileFail,
  UpdateCompositeImageTileFail,
  UpdateTransform,
  SaveDataFile,
  SaveDataFileFail,
  InvalidateHeader,
  CalculateNormalizedPixelsSuccess,
  CalculateNormalizedPixels,
  UpdateBlendMode,
  UpdateAlpha,
  UpdateVisibility,
  UpdateColorMap,
  UpdateLayerHeader,
  UpdateNormalizerSuccess,
  UpdateChannelMixer,
  InitializeFile,
  SetFileColorBalanceMode,
  UpdateColorMapSuccess,
  UpdateVisibilitySuccess,
  UpdateAlphaSuccess,
  UpdateBlendModeSuccess,
  SyncFileNormalizers,
} from './data-files.actions';
import { LayerType } from './models/data-file-type';
import { env } from '../../environments/environment';
import { Wcs } from '../image-tools/wcs';
import { Initialize } from '../workbench/workbench.actions';
import { IImageData, createTiles } from './models/image-data';
import { grayColorMap, COLOR_MAPS_BY_NAME } from './models/color-map';
import { PixelNormalizer, normalize } from './models/pixel-normalizer';
import {
  transformToMatrix,
  Transform,
  getScale,
  getImageToViewportTransform,
  transformPoint,
  getDistance,
  invertTransform,
  scaleTransform,
  intersects,
  translateTransform,
  rotateTransform,
  appendTransform,
} from './models/transformation';
import { StretchMode } from './models/stretch-mode';
import { BlendMode } from './models/blend-mode';
import { compose } from './models/pixel-composer';
import { AfterglowConfigService } from '../afterglow-config.service';
import { Injectable } from '@angular/core';
import { AfterglowHeaderKey } from './models/afterglow-header-key';
import { calcLevels, calcPercentiles } from './models/image-histogram';
import { view } from 'paper/dist/paper-core';

export interface DataFilesStateModel {
  version: string;
  nextIdSeed: number;
  fileIds: string[];
  fileEntities: { [id: string]: DataFile };
  layerIds: string[];
  layerEntities: { [id: string]: ILayer };
  headerIds: string[];
  headerEntities: { [id: string]: Header };
  imageDataEntities: { [id: string]: IImageData<PixelType> };
  imageDataIds: string[];
  transformEntities: { [id: string]: Transform };
  transformIds: string[];
  removingAll: boolean;
  loading: boolean;
}

const dataFilesDefaultState: DataFilesStateModel = {
  version: 'e25126c8-b3fc-4e85-a588-02594cd09ef6',
  nextIdSeed: 0,
  fileIds: [],
  fileEntities: {},
  layerIds: [],
  layerEntities: {},
  headerIds: [],
  headerEntities: {},
  imageDataIds: [],
  imageDataEntities: {},
  transformIds: [],
  transformEntities: {},
  loading: false,
  removingAll: false,
};

@State<DataFilesStateModel>({
  name: 'dataFiles',
  defaults: dataFilesDefaultState,
})
@Injectable()
export class DataFilesState {
  constructor(
    private dataFileService: AfterglowDataFileService,
    private actions$: Actions,
    private wasmService: WasmService,
    private store: Store,
    private config: AfterglowConfigService
  ) { }

  @Selector()
  public static getState(state: DataFilesStateModel) {
    return state;
  }

  @Selector()
  static getLoading(state: DataFilesStateModel) {
    return state.loading;
  }

  /** File Selectors */

  @Selector()
  public static getFileEntities(state: DataFilesStateModel) {
    return state.fileEntities;
  }

  @Selector()
  static getFiles(state: DataFilesStateModel) {
    return Object.values(state.fileEntities);
  }

  @Selector([DataFilesState.getFiles])
  static getFilesSorted(files: DataFile[]) {
    return files.sort((a, b) => a.name.localeCompare(b.name));
  }

  @Selector()
  static getFileIds(state: DataFilesStateModel) {
    return state.fileIds;
  }

  public static getFileById(id: string) {
    return createSelector([DataFilesState.getFileEntities], (fileEntities: { [id: string]: DataFile }) => {
      return fileEntities[id] || null;
    });
  }

  /** HDU Selectors */

  @Selector()
  public static getLayerEntities(state: DataFilesStateModel) {
    return state.layerEntities;
  }

  @Selector()
  static getLayers(state: DataFilesStateModel) {
    return Object.values(state.layerEntities);
  }

  public static getLayerById(id: string) {
    return createSelector([DataFilesState.getLayerEntities], (layerEntities: { [id: string]: ILayer }) => {
      return layerEntities[id] || null;
    });
  }

  public static getLayersByIds(ids: string[]) {
    return createSelector([DataFilesState.getLayerEntities], (layerEntities: { [id: string]: ILayer }) => {
      return ids.map((id) => layerEntities[id]);
    });
  }

  /** Header Selectors */

  @Selector()
  public static getHeaderEntities(state: DataFilesStateModel) {
    return state.headerEntities;
  }

  @Selector()
  static getHeaders(state: DataFilesStateModel) {
    return Object.values(state.headerEntities);
  }

  public static getHeaderById(id: string) {
    return createSelector([DataFilesState.getHeaderEntities], (headerEntities: { [id: string]: Header }) => {
      return headerEntities[id] || null;
    });
  }

  /** File/HDU/Header Join Selectors */

  public static getFileByLayerId(id: string) {
    return createSelector(
      [DataFilesState.getLayerById(id), DataFilesState.getFileEntities],
      (layer: ILayer, fileEntities: { [id: string]: DataFile }) => {
        return fileEntities[layer?.fileId] || null;
      }
    );
  }

  public static getLayersByFileId(id: string) {
    return createSelector(
      [DataFilesState.getFileById(id), DataFilesState.getLayerEntities],
      (file: DataFile, layerEntities: { [id: string]: ILayer }) => {
        if (!file) return [];
        return file.layerIds.map((layerId) => layerEntities[layerId]).sort((a, b) => (a?.order > b?.order ? 1 : -1));
      }
    );
  }

  public static getFirstLayerByFileId(id: string) {
    return createSelector([DataFilesState.getLayersByFileId(id)], (layers: ILayer[]) => {
      if (!layers) return null;
      return layers.length == 0 ? null : layers[0];
    });
  }

  public static getFirstImageLayerByFileId(id: string) {
    return createSelector([DataFilesState.getLayersByFileId(id)], (layers: ILayer[]) => {
      if (!layers) return null;
      layers = layers.filter((layer) => layer.type == LayerType.IMAGE);
      return layers.length == 0 ? null : (layers[0] as ImageLayer);
    });
  }

  public static getFirstTableLayerByFileId(id: string) {
    return createSelector([DataFilesState.getLayersByFileId(id)], (layers: ILayer[]) => {
      if (!layers) return null;
      layers = layers.filter((layer) => layer.type == LayerType.TABLE);
      return layers.length == 0 ? null : (layers[0] as ImageLayer);
    });
  }

  public static getHeaderByLayerId(id: string) {
    return createSelector(
      [DataFilesState.getLayerById(id), DataFilesState.getHeaderEntities],
      (layer: ILayer, headerEntities: { [id: string]: Header }) => {
        return headerEntities[layer?.headerId] || null;
      }
    );
  }

  /** Image Data Selectors */
  @Selector()
  public static getImageDataEntities(state: DataFilesStateModel) {
    return state.imageDataEntities;
  }

  @Selector()
  static getImageDatas(state: DataFilesStateModel) {
    return Object.values(state.imageDataEntities);
  }

  public static getImageDataById(id: string) {
    return createSelector(
      [DataFilesState.getImageDataEntities],
      (imageDataEntities: { [id: string]: IImageData<PixelType> }) => {
        return imageDataEntities[id] || null;
      }
    );
  }

  /** Transform Selectors */
  @Selector()
  public static getTransformEntities(state: DataFilesStateModel) {
    return state.transformEntities;
  }

  @Selector()
  static getTransforms(state: DataFilesStateModel) {
    return Object.values(state.transformEntities);
  }

  public static getTransformById(id: string) {
    return createSelector([DataFilesState.getTransformEntities], (transformEntities: { [id: string]: Transform }) => {
      return transformEntities[id] || null;
    });
  }

  /** Actions */

  @Action(Initialize)
  @ImmutableContext()
  public initialize({ getState, setState, dispatch }: StateContext<DataFilesStateModel>, { }: Initialize) { }

  @Action(ResetState)
  @ImmutableContext()
  public resetState({ getState, setState, dispatch }: StateContext<DataFilesStateModel>, { }: ResetState) {
    setState((state: DataFilesStateModel) => {
      return dataFilesDefaultState;
    });
  }

  @Action(CloseAllDataFiles)
  @ImmutableContext()
  public closeAllDataFiles({ setState, getState, dispatch }: StateContext<DataFilesStateModel>) {
    setState((state: DataFilesStateModel) => {
      state.removingAll = true;
      return state;
    });

    return mergeDelayError(...getState().fileIds.map((id) => dispatch(new CloseDataFile(id)))).pipe(
      catchError((errors) => {
        setState((state: DataFilesStateModel) => {
          state.removingAll = false;
          return state;
        });

        return dispatch(new CloseAllDataFilesFail(errors));
      }),
      tap((v) => this.store.dispatch(new LoadLibrary()))
    );
  }

  @Action(CloseDataFile)
  @ImmutableContext()
  public closeDataFile({ setState, getState, dispatch }: StateContext<DataFilesStateModel>, { fileId }: CloseDataFile) {
    let file = getState().fileEntities[fileId];

    return combineLatest(
      file.layerIds.map((layerId) => {
        return this.dataFileService.removeFile(layerId).pipe(
          flatMap((result) => {
            //allow other modules to react to closing of file prior to removing it from the application state
            return dispatch(new CloseLayerSuccess(layerId)).pipe(
              take(1),
              tap((v) => {
                setState((state: DataFilesStateModel) => {
                  if (state.layerIds.includes(layerId)) {
                    let layer = state.layerEntities[layerId];
                    let file = state.fileEntities[layer.fileId];
                    file.layerIds = file.layerIds.filter((id) => id != layerId);
                    state.layerIds = state.layerIds.filter((id) => id != layerId);
                    delete state.layerEntities[layerId];
                  }
                  return state;
                });
              })
            );
          }),
          catchError((err) => dispatch(new CloseLayerFail(layerId, err)))
        );
      })
    ).pipe(
      flatMap((v) => {
        return dispatch(new CloseDataFileSuccess(fileId)).pipe(
          take(1),
          tap((v) => {
            setState((state: DataFilesStateModel) => {
              if (!state.fileIds.includes(fileId)) {
                return state;
              }

              let file = state.fileEntities[fileId];
              if (file.layerIds.length == 0) {
                //delete file
                state.fileIds = state.fileIds.filter((id) => id != file.id);
                delete state.fileEntities[file.id];
              }
              return state;
            });
          })
        );
      }),
      catchError((err) => dispatch(new CloseDataFileFail(fileId, err)))
    );
  }

  @Action(SaveDataFile)
  @ImmutableContext()
  public saveDataFile({ setState, getState, dispatch }: StateContext<DataFilesStateModel>, { fileId }: SaveDataFile) {
    let file = getState().fileEntities[fileId];
    dispatch(new SaveDataFileFail(fileId, ''));
  }

  @Action(LoadDataFile)
  @ImmutableContext()
  public loadDataFile({ setState, getState, dispatch }: StateContext<DataFilesStateModel>, { fileId }: LoadDataFile) {
    let state = getState();
    let dataFile = state.fileEntities[fileId] as DataFile;
    let actions: any[] = [];

    let layers = this.store.selectSnapshot(DataFilesState.getLayersByFileId(fileId));
    layers.forEach((layer) => {
      let header = state.headerEntities[layer.headerId];
      if (
        !header ||
        ((!header.loaded || !header.isValid) && !header.loading) ||
        (layer.type == LayerType.IMAGE && !(layer as ImageLayer).histogram.loaded && !(layer as ImageLayer).histogram.loading)
      ) {
        actions.push(new LoadLayer(layer.id));
      }
    });
    return dispatch(actions);
  }

  @Action(LoadLibrary)
  @ImmutableContext()
  public loadLibrary({ setState, dispatch }: StateContext<DataFilesStateModel>, { correlationId }: LoadLibrary) {
    setState((state: DataFilesStateModel) => {
      state.loading = true;
      return state;
    });

    return this.dataFileService.getFiles().pipe(
      tap((resp) => {
        let coreFiles = resp.data;
        let actions: any[] = [];
        let layers: ILayer[] = [];
        let dataFiles: DataFile[] = [];

        coreFiles.forEach((coreFile, index) => {
          let layer: ILayer = {
            id: coreFile.id,
            loading: false,
            loaded: false,
            fileId: coreFile.groupName,
            type: coreFile.type,
            order: coreFile.groupOrder,
            modified: coreFile.modified,
            headerId: '',
            name: coreFile.name,
          };

          layers.push(layer);

          let dataFile = dataFiles.find((dataFile) => dataFile.id == layer.fileId);
          if (!dataFile) {
            dataFile = {
              id: layer.fileId,
              assetPath: '/' + coreFile.assetPath,
              dataProviderId: coreFile.dataProvider,
              name: coreFile.groupName,
              layerIds: [layer.id],
              viewportTransformId: '',
              imageTransformId: '',
              rgbaImageDataId: '',
              colorBalanceMode: ColorBalanceMode.PERCENTILE,
              syncLayerNormalizers: false,
              channelMixer: [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
            };
            dataFiles.push(dataFile);
          } else {
            dataFile.layerIds.push(layer.id);
          }
        });

        setState((state: DataFilesStateModel) => {
          //remove layers which are no longer present
          let layerIds = layers.map((layer) => layer.id);
          let deletedLayerIds = state.layerIds.filter((id) => !layerIds.includes(id));
          state.layerIds = state.layerIds.filter((id) => !deletedLayerIds.includes(id));
          deletedLayerIds.forEach((id) => delete state.layerEntities[id]);

          // remove data files which are no longer found in the HDUs
          let fileIds = dataFiles.map((file) => file.id);
          let deletedFileIds = state.fileIds.filter((id) => !fileIds.includes(id));
          state.fileIds = state.fileIds.filter((id) => !deletedFileIds.includes(id));
          deletedFileIds.forEach((id) => delete state.fileEntities[id]);

          layers.forEach((layer) => {
            if (layer.id in state.layerEntities) {
              //update fields which may have been modified on the server
              state.layerEntities[layer.id] = {
                ...state.layerEntities[layer.id],
                fileId: layer.fileId,
                order: layer.order,
                modified: layer.modified,
                name: layer.name
              };
            } else {
              //add the new HDU
              let header: Header = {
                id: `HEADER_${state.nextIdSeed++}`,
                entries: [],
                wcs: null,
                loaded: false,
                loading: false,
                isValid: false,
              };

              state.headerIds.push(header.id);
              state.headerEntities[header.id] = header;

              if (layer.type == LayerType.IMAGE) {
                let imageLayer: ImageLayer = {
                  ...layer,
                  headerId: header.id,
                  type: LayerType.IMAGE,
                  precision: PixelPrecision.float32,
                  blendMode: BlendMode.Screen,
                  visible: true,
                  alpha: 1.0,
                  histogram: {
                    data: new Float32Array(),
                    loaded: false,
                    loading: false,
                    initialized: false,
                    maxBin: 0,
                    minBin: 0,
                  },
                  rawImageDataId: '',
                  viewportTransformId: '',
                  imageTransformId: '',
                  rgbaImageDataId: '',
                  // redChannelId: '',
                  // greenChannelId: '',
                  // blueChannelId: '',
                  normalizer: {
                    mode: 'percentile',
                    backgroundPercentile: 10,
                    midPercentile: 99,
                    peakPercentile: 99,
                    colorMapName: grayColorMap.name,
                    stretchMode: StretchMode.Linear,
                    inverted: false,
                    layerScale: 1,
                    layerOffset: 0,
                  },
                };
                layer = imageLayer;
              } else if (layer.type == LayerType.TABLE) {
                let tableLayer: TableLayer = {
                  ...layer,
                  headerId: header.id,
                  type: LayerType.TABLE,
                };
                layer = tableLayer;
              } else {
                return;
              }
              state.layerIds.push(layer.id);
              state.layerEntities[layer.id] = layer;
            }
          });

          dataFiles.forEach((file) => {
            file.layerIds = file.layerIds.sort((a, b) => {
              return state.layerEntities[a].order - state.layerEntities[b].order
            })
            if (file.id in state.fileEntities) {
              state.fileEntities[file.id] = {
                ...state.fileEntities[file.id],
                assetPath: file.assetPath,
                dataProviderId: file.dataProviderId,
                name: file.name,
                layerIds: file.layerIds,
              };
            } else {
              state.fileIds.push(file.id);
              state.fileEntities[file.id] = file;
              actions.push(new InitializeFile(file.id))

            }
          });

          state.loading = false;
          return state;
        });

        actions.push(new LoadLibrarySuccess(layers, correlationId));
        return dispatch(actions);
      }),
      catchError((err) => {
        setState((state: DataFilesStateModel) => {
          state.loading = false;
          return state;
        });

        return dispatch(new LoadLibraryFail(err, correlationId));
      })
    );
  }

  @Action(LoadLayer)
  @ImmutableContext()
  public loadLayer({ setState, getState, dispatch }: StateContext<DataFilesStateModel>, { layerId }: LoadLayer) {
    let actions: any[] = [];
    let pendingActions = [];
    let state = getState();
    if (!(layerId in state.layerEntities)) return null;
    let layer = state.layerEntities[layerId];
    let header = state.headerEntities[layer.headerId];
    if (header && header.loading) {
      pendingActions.push(
        this.actions$.pipe(
          ofActionCompleted(LoadLayerHeader),
          filter((v) => {
            let action: LoadLayerHeader = v.action;
            return action.layerId == layerId;
          }),
          take(1)
        )
      );
    } else if (!header || !header.loaded || !header.isValid) {
      actions.push(new LoadLayerHeader(layer.id));
    }

    if (layer.type == LayerType.IMAGE) {
      let imageLayer = layer as ImageLayer;
      if (imageLayer.histogram.loading) {
        pendingActions.push(
          this.actions$.pipe(
            ofActionCompleted(LoadImageLayerHistogram),
            filter((v) => {
              let action: LoadImageLayerHistogram = v.action;
              return action.layerId == layerId;
            }),
            take(1)
          )
        );
      } else if (!imageLayer.histogram.loaded) {
        actions.push(new LoadImageLayerHistogram(imageLayer.id));
      }
    }
    if (pendingActions.length == 0 && actions.length == 0) {
      return null;
    }

    if (pendingActions.length != 0 || actions.length != 0) {
      setState((state: DataFilesStateModel) => {
        state.layerEntities[layerId].loading = true;
        return state;
      });
    }
    return forkJoin(...pendingActions, dispatch(actions)).pipe(
      tap(() => {
        setState((state: DataFilesStateModel) => {
          state.layerEntities[layerId].loaded = true;
          return state;
        });
      }),
      finalize(() => {
        setState((state: DataFilesStateModel) => {
          state.layerEntities[layerId].loading = false;
          return state;
        });
      })
    );
  }

  private initializeImageData(state: DataFilesStateModel, id: string, type: string, ref: {
    width: number;
    height: number;
    tileWidth: number;
    tileHeight: number;
    initialized: boolean;
  }) {
    if (id && id in state.imageDataEntities) {
      // HDU already has initialized raw image data
      let imageData = state.imageDataEntities[id];
      if (imageData.width != ref.width ||
        imageData.height != ref.height ||
        imageData.tileWidth != ref.tileHeight ||
        imageData.initialized != ref.initialized) {
        state.imageDataEntities[id] = {
          ...imageData,
          ...ref,
          tiles: createTiles(ref.width, ref.height, this.config.tileSize, this.config.tileSize),
        };
      }
      return id;
    } else {
      let nextId = `${type}_${state.nextIdSeed++}`;
      let imageData: IImageData<PixelType> = {
        id: nextId,
        ...ref,
        tiles: createTiles<PixelType>(ref.width, ref.height, this.config.tileSize, this.config.tileSize),
      };

      state.imageDataEntities[nextId] = imageData;
      state.imageDataIds.push(nextId);
      return nextId;
    }

  }

  @Action(LoadLayerHeader)
  @ImmutableContext()
  public loadLayerHeader({ setState, getState, dispatch }: StateContext<DataFilesStateModel>, { layerId }: LoadLayerHeader) {
    let layer = getState().layerEntities[layerId];
    let header = getState().headerEntities[layer?.headerId];
    if (header && header.loading) return;
    let firstLoad = !header?.loaded;

    let fileId = getState().layerEntities[layerId].fileId;
    const cancel$ = merge(
      this.actions$.pipe(
        ofActionSuccessful(CloseDataFile),
        filter<CloseDataFile>((cancelAction) => cancelAction.fileId == fileId)
      )
    );

    setState((state: DataFilesStateModel) => {
      let layer = state.layerEntities[layerId];
      let header = state.headerEntities[layer.headerId];
      header.loading = true;
      /** Once a header has been loaded,  its loaded flag should remain true so that the data is accessible to other actions
       *  Only the isValid flag should be set to false to trigger reloading.  Some actions filter layers by whether the headers have been loaded.
       *  Changing the loaded flag while getting the  header causes the actions to see different headers and recalculate values such as the composite image size
       */
      // header.loaded = false;   
      return state;
    });

    return this.dataFileService.getHeader(layerId).pipe(
      takeUntil(cancel$),
      tap((resp) => {
        let entries = resp.data;
        let actions: any[] = [];
        setState((state: DataFilesStateModel) => {
          let layer = state.layerEntities[layerId];
          let header = state.headerEntities[layer.headerId];
          header.entries = entries;
          header.loading = false;
          header.loaded = true;
          header.isValid = true;

          let wcsHeader: { [key: string]: any } = {};
          header.entries.forEach((entry) => {
            wcsHeader[entry.key] = entry.value;
          });
          header.wcs = new Wcs(wcsHeader);

          if (isImageLayer(layer)) {
            //extract width and height from the header using FITS standards
            let width = getWidth(header);
            let height = getHeight(header);

            if (firstLoad) {
              let colorMapName = getHeaderEntry(header, AfterglowHeaderKey.AG_CMAP)?.value;
              if (colorMapName !== undefined && COLOR_MAPS_BY_NAME[colorMapName]) {
                layer.normalizer.colorMapName = colorMapName;
              }
              let mode = getHeaderEntry(header, AfterglowHeaderKey.AG_NMODE)?.value;
              if (mode !== undefined && ['percentile', 'pixel'].includes(mode)) {
                layer.normalizer.mode = mode;
              }

              let backgroundPercentile = getHeaderEntry(header, AfterglowHeaderKey.AG_BKGP)?.value;
              if (backgroundPercentile !== undefined) {
                layer.normalizer.backgroundPercentile = backgroundPercentile;
              }
              let midPercentile = getHeaderEntry(header, AfterglowHeaderKey.AG_MIDP)?.value;
              if (midPercentile !== undefined) {
                layer.normalizer.midPercentile = midPercentile;
              }
              let peakPercentile = getHeaderEntry(header, AfterglowHeaderKey.AG_PEAKP)?.value;
              if (peakPercentile !== undefined) {
                layer.normalizer.peakPercentile = peakPercentile;
              }



              let backgroundLevel = getHeaderEntry(header, AfterglowHeaderKey.AG_BKGL)?.value;
              if (backgroundLevel !== undefined) {
                layer.normalizer.backgroundLevel = backgroundLevel;
              }
              let midLevel = getHeaderEntry(header, AfterglowHeaderKey.AG_MIDL)?.value;
              if (midLevel !== undefined) {
                layer.normalizer.midLevel = midLevel;
              }
              let peakLevel = getHeaderEntry(header, AfterglowHeaderKey.AG_PEAKL)?.value;
              if (peakLevel !== undefined) {
                layer.normalizer.peakLevel = peakLevel;
              }

              let stretchMode = getHeaderEntry(header, AfterglowHeaderKey.AG_STRCH)?.value;
              if (stretchMode !== undefined) {
                layer.normalizer.stretchMode = stretchMode;
              }
              let inverted = getHeaderEntry(header, AfterglowHeaderKey.AG_INVRT)?.value;
              if (inverted !== undefined) {
                layer.normalizer.inverted = inverted ? true : false;
              }

              let scale = getHeaderEntry(header, AfterglowHeaderKey.AG_SCALE)?.value;
              if (scale !== undefined) {
                layer.normalizer.layerScale = scale;
              }

              let offset = getHeaderEntry(header, AfterglowHeaderKey.AG_OFFSET)?.value;
              if (offset !== undefined) {
                layer.normalizer.layerOffset = offset;
              }

              let visible = getHeaderEntry(header, AfterglowHeaderKey.AG_VIS)?.value;
              if (visible !== undefined) {
                layer.visible = visible ? true : false;
              }

              let blendMode = getHeaderEntry(header, AfterglowHeaderKey.AG_BLEND)?.value;
              if (blendMode !== undefined) {
                layer.blendMode = blendMode;
              }

              let alpha = getHeaderEntry(header, AfterglowHeaderKey.AG_ALPHA)?.value;
              if (alpha !== undefined) {
                layer.alpha = alpha;
              }


            }




            let layerBase = {
              width: width,
              height: height,
              tileWidth: this.config.tileSize,
              tileHeight: this.config.tileSize,
              initialized: true,
            };


            layer.rawImageDataId = this.initializeImageData(state, layer.rawImageDataId, 'RAW_IMAGE_DATA', layerBase)
            layer.rgbaImageDataId = this.initializeImageData(state, layer.rgbaImageDataId, 'HDU_COMPOSITE_IMAGE_DATA', layerBase)
            // layer.redChannelId = initializeImageData(layer.redChannelId, 'HDU_RED_IMAGE_DATA', layerBase)
            // layer.greenChannelId = initializeImageData(layer.greenChannelId, 'HDU_GREEN_IMAGE_DATA', layerBase)
            // layer.blueChannelId = initializeImageData(layer.blueChannelId, 'HDU_BLUE_IMAGE_DATA', layerBase)

            //initialize transforms
            if (!state.transformEntities[layer.imageTransformId]) {
              let imageTransformId = `IMAGE_TRANSFORM_${state.nextIdSeed++}`;
              let imageTransform: Transform = {
                id: imageTransformId,
                a: 1,
                b: 0,
                c: 0,
                d: -1,
                tx: 0,
                ty: height,
              };
              state.transformEntities[imageTransformId] = imageTransform;
              state.transformIds.push(imageTransformId);
              layer.imageTransformId = imageTransformId;
            }

            if (!state.transformEntities[layer.viewportTransformId]) {
              let viewportTransformId = `VIEWPORT_TRANSFORM_${state.nextIdSeed++}`;
              let viewportTransform: Transform = {
                id: viewportTransformId,
                a: 1,
                b: 0,
                c: 0,
                d: 1,
                tx: 0,
                ty: 0,
              };
              state.transformEntities[viewportTransformId] = viewportTransform;
              state.transformIds.push(viewportTransformId);
              layer.viewportTransformId = viewportTransformId;
            }

            actions.push(new InitializeFile(layer.fileId));


          }

          return state;
        });
        actions.push(new LoadLayerHeaderSuccess(layerId));
        dispatch(actions);
      })
    );
  }

  @Action(InitializeFile)
  @ImmutableContext()
  public initializeFileImageData(
    { setState, getState, dispatch }: StateContext<DataFilesStateModel>,
    { fileId }: InitializeFile
  ) {

    setState((state: DataFilesStateModel) => {
      //initialize file image data
      let file = state.fileEntities[fileId];

      let headers = file.layerIds.map(id => state.layerEntities[id]).map(layer => layer.headerId).map(id => state.headerEntities[id]).filter(header => header.loaded)
      if (headers.length != 0) {
        let compositeWidth = Math.min(...headers.map(header => getWidth(header)));
        let compositeHeight = Math.min(...headers.map(header => getHeight(header)));
        let compositeImageDataBase = {
          width: compositeWidth,
          height: compositeHeight,
          tileWidth: this.config.tileSize,
          tileHeight: this.config.tileSize,
          initialized: true,
        };

        file.rgbaImageDataId = this.initializeImageData(state, file.rgbaImageDataId, 'FILE_COMPOSITE', compositeImageDataBase)


        // initialize file transformation
        if (!state.transformEntities[file.imageTransformId]) {
          let imageTransformId = `IMAGE_TRANSFORM_${state.nextIdSeed++}`;
          let imageTransform: Transform = {
            id: imageTransformId,
            a: 1,
            b: 0,
            c: 0,
            d: -1,
            tx: 0,
            ty: compositeHeight,
          };
          state.transformEntities[imageTransformId] = imageTransform;
          state.transformIds.push(imageTransformId);
          file.imageTransformId = imageTransformId;
        }
        if (!state.transformEntities[file.viewportTransformId]) {
          let viewportTransformId = `VIEWPORT_TRANSFORM_${state.nextIdSeed++}`;
          let viewportTransform: Transform = {
            id: viewportTransformId,
            a: 1,
            b: 0,
            c: 0,
            d: 1,
            tx: 0,
            ty: 0,
          };
          state.transformEntities[viewportTransformId] = viewportTransform;
          state.transformIds.push(viewportTransformId);
          file.viewportTransformId = viewportTransformId;
        }
      }

      return state;
    })

  }

  @Action(LoadImageLayerHistogram)
  @ImmutableContext()
  public loadImageLayerHistogram(
    { setState, getState, dispatch }: StateContext<DataFilesStateModel>,
    { layerId }: LoadImageLayerHistogram
  ) {
    if (getState().layerEntities[layerId].type != LayerType.IMAGE) return null;

    let fileId = getState().layerEntities[layerId].fileId;
    const cancel$ = merge(
      this.actions$.pipe(
        ofActionSuccessful(CloseDataFile),
        filter<CloseDataFile>((cancelAction) => cancelAction.fileId == fileId)
      )
    );

    setState((state: DataFilesStateModel) => {
      let layer = state.layerEntities[layerId] as ImageLayer;
      layer.histogram = {
        ...layer.histogram,
        loading: true,
        loaded: false,
      };
      return state;
    });

    return this.dataFileService.getHist(layerId).pipe(
      takeUntil(cancel$),
      tap((hist) => {
        setState((state: DataFilesStateModel) => {
          let layer = state.layerEntities[layerId] as ImageLayer;
          layer.histogram = {
            ...hist,
            initialized: true,
            loading: false,
            loaded: true,
          };
          return state;
        });
      }),
      flatMap((hist) => {
        let state = getState();
        let layer = state.layerEntities[layerId];
        if (!isImageLayer(layer)) return of()

        return dispatch([
          new LoadImageLayerHistogramSuccess(layerId, layer.histogram),
          new UpdateNormalizer(layerId, {
            mode: layer.normalizer.mode,
            backgroundPercentile: layer.normalizer.backgroundPercentile,
            midPercentile: layer.normalizer.midPercentile,
            peakPercentile: layer.normalizer.peakPercentile,
            backgroundLevel: layer.normalizer.backgroundLevel,
            midLevel: layer.normalizer.midLevel,
            peakLevel: layer.normalizer.peakLevel
          }) //trigger recalculation of background levels and/or percentiles depending on mode
        ]);
      }),
      catchError((err) => {
        setState((state: DataFilesStateModel) => {
          let layer = state.layerEntities[layerId] as ImageLayer;
          layer.histogram = {
            ...layer.histogram,
            loaded: false,
            loading: false,
          };
          return state;
        });
        throw err;
      })
    );
  }

  @Action(LoadRawImageTile)
  @ImmutableContext()
  public loadRawImageTile(
    { setState, dispatch, getState }: StateContext<DataFilesStateModel>,
    { layerId, tileIndex }: LoadRawImageTile
  ) {
    let state = getState();
    if (state.layerEntities[layerId].type != LayerType.IMAGE) return null;

    let fileId = getState().layerEntities[layerId].fileId;
    const cancel$ = merge(
      this.actions$.pipe(
        ofActionSuccessful(CloseDataFile),
        filter<CloseDataFile>((cancelAction) => cancelAction.fileId == fileId)
      )
    );

    setState((state: DataFilesStateModel) => {
      let layer = state.layerEntities[layerId] as ImageLayer;
      let imageData = state.imageDataEntities[layer.rawImageDataId];
      let tile = imageData.tiles[tileIndex];

      tile.pixelsLoading = true;
      tile.pixelsLoaded = false;
      return state;
    });

    let layer = state.layerEntities[layerId] as ImageLayer;
    let imageData = state.imageDataEntities[layer.rawImageDataId];
    let tile = imageData.tiles[tileIndex];
    return this.dataFileService.getPixels(layerId, layer.precision, tile).pipe(
      takeUntil(cancel$),
      tap((pixels) => {
        setState((state: DataFilesStateModel) => {
          let layer = state.layerEntities[layerId] as ImageLayer;
          let imageData = state.imageDataEntities[layer.rawImageDataId];
          let tile = imageData.tiles[tileIndex];
          tile.isValid = true;
          tile.pixelsLoading = false;
          tile.pixelsLoaded = true;
          tile.pixels = pixels;
          state.imageDataEntities[layer.rawImageDataId] = {
            ...imageData,
          };
          return state;
        });
      }),
      flatMap((pixels) => {
        return dispatch([
          new LoadRawImageTileSuccess(layerId, tileIndex, pixels),
        ]);
      }),
      catchError((err) => {
        setState((state: DataFilesStateModel) => {
          let layer = state.layerEntities[layerId] as ImageLayer;
          let imageData = state.imageDataEntities[layer.rawImageDataId];
          let tile = imageData.tiles[tileIndex];
          tile.pixelsLoading = false;
          tile.pixelLoadingFailed = true;
          return state;
        });
        throw err;
      })
    );
  }

  @Action(UpdateLayerHeader)
  @ImmutableContext()
  public addLayerEntries(
    { setState, getState, dispatch }: StateContext<DataFilesStateModel>,
    { layerId, changes }: UpdateLayerHeader) {
    return this.dataFileService.updateHeader(layerId, changes).pipe(
      tap(() => {
        //instead of forcing the library to refresh,  set this datafile as modified

        setState((state: DataFilesStateModel) => {
          let layer = state.layerEntities[layerId] as ImageLayer;
          layer.modified = true;
          return state;
        })
        this.store.dispatch([new InvalidateHeader(layerId), new LoadLayerHeader(layerId)])
      }))
  }

  @Action(InvalidateHeader)
  @ImmutableContext()
  public invalidateHeader(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { layerId }: InvalidateRawImageTiles
  ) {
    let state = getState();
    if (
      !state.layerEntities[layerId] ||
      !state.layerEntities[layerId].headerId ||
      !state.headerEntities[state.layerEntities[layerId].headerId]
    ) {
      return;
    }

    setState((state: DataFilesStateModel) => {
      let header = state.headerEntities[state.layerEntities[layerId].headerId];
      header.isValid = false;

      state.headerEntities[header.id] = { ...header };

      return state;
    });
  }

  @Action(InvalidateRawImageTiles)
  @ImmutableContext()
  public invalidateRawImageTiles(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { layerId }: InvalidateRawImageTiles
  ) {
    let state = getState();
    if (
      !(layerId in state.layerEntities) ||
      state.layerEntities[layerId].type != LayerType.IMAGE ||
      !(state.layerEntities[layerId] as ImageLayer).rawImageDataId
    )
      return null;

    let rawImageData = state.imageDataEntities[(state.layerEntities[layerId] as ImageLayer).rawImageDataId];

    return dispatch(rawImageData.tiles.map((tile) => new InvalidateRawImageTile(layerId, tile.index)));
  }

  @Action(InvalidateRawImageTile)
  @ImmutableContext()
  public invalidateRawImageTile(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { layerId, tileIndex }: InvalidateRawImageTile
  ) {
    let state = getState();
    if (
      !(layerId in state.layerEntities) ||
      state.layerEntities[layerId].type != LayerType.IMAGE ||
      !(state.layerEntities[layerId] as ImageLayer).rawImageDataId
    )
      return null;

    setState((state: DataFilesStateModel) => {
      let rawImageData = state.imageDataEntities[(state.layerEntities[layerId] as ImageLayer).rawImageDataId];
      let tile = rawImageData.tiles[tileIndex];
      tile.isValid = false;

      state.imageDataEntities[rawImageData.id] = { ...rawImageData };

      return state;
    });

    return dispatch(new InvalidateNormalizedImageTile(layerId, tileIndex));
  }

  @Action(InvalidateNormalizedImageTiles)
  @ImmutableContext()
  public invalidateNormalizedImageTiles(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { layerId }: InvalidateNormalizedImageTiles
  ) {
    let state = getState();
    if (
      !(layerId in state.layerEntities) ||
      state.layerEntities[layerId].type != LayerType.IMAGE ||
      !(state.layerEntities[layerId] as ImageLayer).rgbaImageDataId
    )
      return null;

    let normalizedImageData = state.imageDataEntities[(state.layerEntities[layerId] as ImageLayer).rgbaImageDataId];

    return dispatch(normalizedImageData.tiles.map((tile) => new InvalidateNormalizedImageTile(layerId, tile.index)));
  }

  @Action(InvalidateNormalizedImageTile)
  @ImmutableContext()
  public invalidateNormalizedImageTile(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { layerId, tileIndex }: InvalidateNormalizedImageTile
  ) {
    let state = getState();
    if (
      !(layerId in state.layerEntities) ||
      state.layerEntities[layerId].type != LayerType.IMAGE ||
      !(state.layerEntities[layerId] as ImageLayer).rgbaImageDataId
    )
      return null;

    setState((state: DataFilesStateModel) => {
      let imageDataId = (state.layerEntities[layerId] as ImageLayer).rgbaImageDataId;
      let normalizedImageData = state.imageDataEntities[imageDataId];
      let tile = normalizedImageData.tiles[tileIndex];
      tile.isValid = false;
      // tile.pixelsLoaded = false;
      // tile.pixelsLoading = false;
      // tile.pixelLoadingFailed = false;

      state.imageDataEntities[imageDataId] = { ...normalizedImageData };

      return state;
    });

    let fileId = state.layerEntities[layerId].fileId;
    return dispatch(new InvalidateCompositeImageTile(fileId, tileIndex));
  }

  @Action(UpdateNormalizedImageTile)
  @ImmutableContext()
  public updateNormalizedImageTile(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { layerId, tileIndex }: UpdateNormalizedImageTile
  ) {
    let state = getState();
    if (
      !(layerId in state.layerEntities) ||
      state.layerEntities[layerId].type != LayerType.IMAGE ||
      !(state.layerEntities[layerId] as ImageLayer).rgbaImageDataId
    ) {
      return null;
    }

    let layer = state.layerEntities[layerId] as ImageLayer;
    let imageData = state.imageDataEntities[layer.rawImageDataId];
    if (!imageData.initialized) return null;
    let rawTile = imageData.tiles[tileIndex];
    if (rawTile.pixelsLoading) return null;
    let normalizedImageData = state.imageDataEntities[layer.rgbaImageDataId];
    let tile = normalizedImageData.tiles[tileIndex];
    if (tile.pixelsLoading) return null;

    let onRawPixelsLoaded = () => {
      let state = getState();
      return this.store.dispatch(new CalculateNormalizedPixels(layerId, tileIndex));
    };

    if (rawTile.pixelsLoaded && rawTile.isValid) {
      return onRawPixelsLoaded();
    } else if (!rawTile.pixelsLoading) {
      setState((state: DataFilesStateModel) => {
        let normalizedImageData = state.imageDataEntities[layer.rgbaImageDataId];
        let tile = normalizedImageData.tiles[tileIndex];
        tile.pixelsLoading = true;
        state.imageDataEntities[layer.rgbaImageDataId] = {
          ...normalizedImageData,
        };
        return state;
      });

      //trigger load of raw tile
      let loadRawPixelsSuccess$ = this.actions$.pipe(
        ofActionCompleted(LoadRawImageTileSuccess),
        filter((v) => v.action.layerId == layerId && v.action.tileIndex == tileIndex),
        flatMap((v) => onRawPixelsLoaded())
      );

      let loadRawPixelsFail$ = this.actions$.pipe(
        ofActionCompleted(LoadRawImageTileFail),
        filter((v) => v.action.layerId == layerId && v.action.tileIndex == tileIndex),
        tap((v) => {
          setState((state: DataFilesStateModel) => {
            let normalizedImageData = state.imageDataEntities[layer.rgbaImageDataId];
            let tile = normalizedImageData.tiles[tileIndex];
            tile.pixelsLoading = false;
            tile.pixelLoadingFailed = true;
            state.imageDataEntities[layer.rgbaImageDataId] = {
              ...normalizedImageData,
            };
            return state;
          });

          dispatch(new UpdateNormalizedImageTileFail(layerId, tileIndex));
        })
      );

      return merge(
        merge(loadRawPixelsSuccess$, loadRawPixelsFail$).pipe(take(1)),
        dispatch(new LoadRawImageTile(layerId, tileIndex))
      );
    }

    return null;
  }

  @Action(CalculateNormalizedPixels)
  public calculateNormalizedPixels(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { layerId, tileIndex }: CalculateNormalizedPixels
  ) {
    // Cannot use  @ImmutableContext() because it significantly slows down the normalization computations

    let state = getState();
    let layer = state.layerEntities[layerId] as ImageLayer;
    let rawImageData = state.imageDataEntities[layer.rawImageDataId].tiles[tileIndex].pixels;
    if (!rawImageData) return null;

    let hist = (state.layerEntities[layerId] as ImageLayer).histogram;
    let normalizer = (state.layerEntities[layerId] as ImageLayer).normalizer;

    let rgba = state.imageDataEntities[layer.rgbaImageDataId].tiles[tileIndex].pixels as Uint32Array;
    if (!rgba || rgba.length != rawImageData.length) {
      rgba = new Uint32Array(rawImageData.length);
    }


    normalizer = (getState().layerEntities[layerId] as ImageLayer).normalizer;

    normalize(rawImageData, hist, normalizer, rgba);
    return this.store.dispatch(new CalculateNormalizedPixelsSuccess(layerId, tileIndex, rgba));
  }

  @Action(CalculateNormalizedPixelsSuccess)
  @ImmutableContext()
  public calculateNormalizedPixelsSuccess(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { layerId, tileIndex, rgba }: CalculateNormalizedPixelsSuccess
  ) {
    let state = getState();
    let layer = state.layerEntities[layerId] as ImageLayer;
    let actions: any[] = [];

    setState((state: DataFilesStateModel) => {
      let rgbaImageData = state.imageDataEntities[layer.rgbaImageDataId];
      let tile = rgbaImageData.tiles[tileIndex];

      tile.pixelsLoaded = true;
      tile.pixelLoadingFailed = false;
      tile.pixelsLoading = false;
      tile.isValid = true;
      tile.pixels = rgba;

      state.imageDataEntities[layer.rgbaImageDataId] = {
        ...rgbaImageData,
      };

      // let redImageData = state.imageDataEntities[layer.redChannelId];
      // let redTile = redImageData.tiles[tileIndex];
      // redTile.pixelsLoaded = true;
      // redTile.pixelLoadingFailed = false;
      // redTile.pixelsLoading = false;
      // redTile.isValid = true;
      // redTile.pixels = redChannel;
      // state.imageDataEntities[layer.redChannelId] = {
      //   ...redImageData,
      // };

      // let greenImageData = state.imageDataEntities[layer.greenChannelId];
      // let greenTile = greenImageData.tiles[tileIndex];
      // greenTile.pixelsLoaded = true;
      // greenTile.pixelLoadingFailed = false;
      // greenTile.pixelsLoading = false;
      // greenTile.isValid = true;
      // greenTile.pixels = greenChannel;
      // state.imageDataEntities[layer.greenChannelId] = {
      //   ...greenImageData,
      // };

      // let blueImageData = state.imageDataEntities[layer.blueChannelId];
      // let blueTile = blueImageData.tiles[tileIndex];
      // blueTile.pixelsLoaded = true;
      // blueTile.pixelLoadingFailed = false;
      // blueTile.pixelsLoading = false;
      // blueTile.isValid = true;
      // blueTile.pixels = blueChannel;
      // state.imageDataEntities[layer.blueChannelId] = {
      //   ...blueImageData,
      // };

      actions.push(new UpdateNormalizedImageTileSuccess(layerId, tileIndex, tile.pixels));

      //composite tiles need not be invalidated here.  they should have already been invalidated
      // actions.push(new InvalidateCompositeImageTile(layer.fileId, tileIndex));

      return state;
    });

    return dispatch(actions);
  }

  @Action(SetFileColorBalanceMode)
  @ImmutableContext()
  public setFileColorBalanceMode(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { fileId, value }: SetFileColorBalanceMode
  ) {
    setState((state: DataFilesStateModel) => {
      let file = state.fileEntities[fileId];
      if (file) {
        file.colorBalanceMode = value;
      }
      return state;
    })

    // let actions: any[] = []

    // let sync = value != ColorBalanceMode.MANUAL;
    // let layers = this.store.selectSnapshot(DataFilesState.getLayersByFileId(fileId)).filter(isImageLayer);
    // if (value != ColorBalanceMode.HISTOGRAM_FITTING && value != ColorBalanceMode.MANUAL) {
    //   layers.forEach(layer => {
    //     actions.push(new UpdateNormalizer(layer.id, { layerOffset: 0, layerScale: 1 }))
    //   })
    // }
    // if (sync && value == ColorBalanceMode.PERCENTILE) {
    //   let layer = this.store.selectSnapshot(DataFilesState.getFirstImageLayerByFileId(fileId));
    //   if (layer) {
    //     actions.push(new UpdateNormalizer(layer.id, { mode: 'percentile' }));
    //   }
    // }
    // actions.push(new SetFileNormalizerSync(fileId, sync))

    // if (actions.length != 0) dispatch(actions);




  }

  @Action(SyncFileNormalizers)
  @ImmutableContext()
  public syncFileNormalizers(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { fileId, refLayerId }: SyncFileNormalizers
  ) {
    let state = getState();

    let file = state.fileEntities[fileId];
    let refLayer = state.layerEntities[refLayerId];

    if (!isImageLayer(refLayer)) return;

    let getSyncedNormalizerFields = (value: PixelNormalizer): Partial<PixelNormalizer> => {
      let result: Partial<PixelNormalizer> = {
        mode: file.colorBalanceMode == ColorBalanceMode.HISTOGRAM_FITTING ? 'pixel' : 'percentile',
        stretchMode: value.stretchMode
      };
      if (result.mode == 'pixel') {
        result = {
          ...result,
          backgroundLevel: value.backgroundLevel,
          midLevel: value.midLevel,
          peakLevel: value.peakLevel
        }
      } else {
        result = {
          ...result,
          backgroundPercentile: value.backgroundPercentile,
          midPercentile: value.midPercentile,
          peakPercentile: value.peakPercentile,
        }
      }
      return result;
    }
    let actions = [];
    let layers = this.store.selectSnapshot(DataFilesState.getLayersByFileId(fileId)).filter(isImageLayer).filter(layer => layer.id != refLayerId && layer.visible);
    let syncedNormalizerFields = getSyncedNormalizerFields(refLayer.normalizer)
    let syncNormalizerFieldsStr = JSON.stringify(syncedNormalizerFields)
    layers.forEach(layer => {

      if (syncNormalizerFieldsStr === JSON.stringify(getSyncedNormalizerFields(layer.normalizer))) return;

      actions.push(new UpdateNormalizer(layer.id, syncedNormalizerFields, true))
    })


    return this.store.dispatch(actions)
  }


  // @Action(SetFileNormalizerSync)
  // @ImmutableContext()
  // public setFileNormalizerSync(
  //   { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
  //   { fileId, value }: SetFileNormalizerSync
  // ) {
  //   setState((state: DataFilesStateModel) => {
  //     let file = state.fileEntities[fileId];
  //     if (file) {
  //       file.syncLayerNormalizers = value;
  //     }
  //     return state;
  //   })

  //   if (value) {
  //     //trigger sync
  //     // let state = getState()
  //     // let ref = this.store.selectSnapshot(DataFilesState.getFirstImageLayerByFileId(fileId));
  //     // if (ref && ref.normalizer) {
  //     //   dispatch(new UpdateNormalizer(ref.id, ref.normalizer))
  //     // }
  //   }
  // }

  @Action(UpdateNormalizer)
  public updateNormalizer(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { layerId, changes, skipFileSync }: UpdateNormalizer
  ) {
    let actions = [];
    let state = getState();
    let layer = state.layerEntities[layerId];
    if (!layer || !isImageLayer(layer)) return null;

    let normalizer = {
      ...layer.normalizer,
      ...changes
    }

    if (layer.histogram.loaded) {
      if (normalizer.mode == 'percentile') {
        let levels = calcLevels(layer.histogram, normalizer.backgroundPercentile, normalizer.midPercentile, normalizer.peakPercentile);
        normalizer.backgroundLevel = levels.backgroundLevel * normalizer.layerScale + normalizer.layerOffset;
        normalizer.midLevel = levels.midLevel * normalizer.layerScale + normalizer.layerOffset;
        normalizer.peakLevel = levels.peakLevel * normalizer.layerScale + normalizer.layerOffset
      }
      else if (normalizer.mode == 'pixel') {
        let percentiles = calcPercentiles(
          layer.histogram,
          (normalizer.backgroundLevel - normalizer.layerOffset) / normalizer.layerScale,
          (normalizer.midLevel - normalizer.layerOffset) / normalizer.layerScale,
          (normalizer.peakLevel - normalizer.layerOffset) / normalizer.layerScale)
        normalizer.backgroundPercentile = percentiles.lowerPercentile;
        normalizer.midPercentile = percentiles.midPercentile;
        normalizer.peakPercentile = percentiles.upperPercentile;
      }
    }

    setState((state: DataFilesStateModel) => {
      let layer = state.layerEntities[layerId];
      let layerEntities = {
        ...state.layerEntities,
        [layerId]: {
          ...layer,
          normalizer: normalizer
        }
      }

      return {
        ...state,
        layerEntities: layerEntities
      }
    });

    actions.push(new InvalidateNormalizedImageTiles(layerId))
    actions.push(new UpdateNormalizerSuccess(layerId))


    return this.store.dispatch(actions)
  }

  /**
   * Composite
   */

  @Action(UpdateChannelMixer)
  @ImmutableContext()
  public updateWhiteBalance(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { fileId, channelMixer: whiteBalance }: UpdateChannelMixer
  ) {
    let state = getState();
    if (!(fileId in state.fileEntities)) return;

    let actions: any[] = [];
    setState((state: DataFilesStateModel) => {
      let file = state.fileEntities[fileId];
      file.channelMixer = whiteBalance

      actions.push(new InvalidateCompositeImageTiles(fileId));
      return state;
    });

    dispatch(actions);
  }

  @Action(UpdateBlendMode)
  @ImmutableContext()
  public updateBlendMode(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { layerId, blendMode }: UpdateBlendMode
  ) {
    let state = getState();
    if (!(layerId in state.layerEntities)) return;

    let actions: any[] = [];
    setState((state: DataFilesStateModel) => {
      let layer = state.layerEntities[layerId] as ImageLayer;
      layer.blendMode = blendMode;

      actions.push(new InvalidateCompositeImageTiles(layer.fileId));
      return state;
    });

    actions.push(new UpdateBlendModeSuccess(layerId))
    dispatch(actions);
  }

  @Action(UpdateAlpha)
  @ImmutableContext()
  public updateAlpha(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { layerId, alpha }: UpdateAlpha
  ) {
    let state = getState();
    if (!(layerId in state.layerEntities)) return;

    let actions: any[] = [];
    setState((state: DataFilesStateModel) => {
      let layer = state.layerEntities[layerId] as ImageLayer;
      layer.alpha = alpha;

      actions.push(new InvalidateCompositeImageTiles(layer.fileId));
      return state;
    });

    actions.push(new UpdateAlphaSuccess(layerId))
    dispatch(actions);
  }

  @Action(UpdateVisibility)
  @ImmutableContext()
  public updateVisibility(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { layerId, value }: UpdateVisibility
  ) {
    let state = getState();
    if (!(layerId in state.layerEntities)) return;

    let actions: any[] = [];
    setState((state: DataFilesStateModel) => {
      let layer = state.layerEntities[layerId] as ImageLayer;
      layer.visible = value;

      actions.push(new InvalidateCompositeImageTiles(layer.fileId));
      return state;
    });

    actions.push(new UpdateVisibilitySuccess(layerId))
    dispatch(actions);
  }

  @Action(UpdateColorMap)
  @ImmutableContext()
  public updateColorMap(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { layerId, colorMap }: UpdateColorMap
  ) {
    let state = getState();
    if (!(layerId in state.layerEntities)) return;

    let actions: any[] = [];
    setState((state: DataFilesStateModel) => {
      let layer = state.layerEntities[layerId] as ImageLayer;
      layer.normalizer = {
        ...layer.normalizer,
        colorMapName: colorMap,
      };

      actions.push(new InvalidateNormalizedImageTiles(layer.id));
      return state;
    });

    actions.push(new UpdateColorMapSuccess(layerId))
    dispatch(actions);
  }

  @Action(InvalidateCompositeImageTiles)
  @ImmutableContext()
  public invalidateCompositeImageTiles(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { fileId }: InvalidateCompositeImageTiles
  ) {
    let state = getState();
    if (!(fileId in state.fileEntities) || !state.fileEntities[fileId].rgbaImageDataId) return null;

    let compositeImageData = state.imageDataEntities[state.fileEntities[fileId].rgbaImageDataId];

    return dispatch(compositeImageData.tiles.map((tile) => new InvalidateCompositeImageTile(fileId, tile.index)));
  }

  @Action(InvalidateCompositeImageTile)
  @ImmutableContext()
  public invalidateCompositeImageTile(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { fileId, tileIndex }: InvalidateCompositeImageTile
  ) {
    let state = getState();
    if (!(fileId in state.fileEntities) || !state.fileEntities[fileId].rgbaImageDataId) return;

    setState((state: DataFilesStateModel) => {
      let compositeImageData = state.imageDataEntities[state.fileEntities[fileId].rgbaImageDataId];
      let tile = compositeImageData.tiles[tileIndex];
      tile.isValid = false;

      state.imageDataEntities[state.fileEntities[fileId].rgbaImageDataId] = {
        ...compositeImageData,
      };

      return state;
    });
  }

  @Action([UpdateCompositeImageTile])
  public loadCompositeImageTile(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { fileId, tileIndex }: UpdateCompositeImageTile
  ) {

    // Cannot use  @ImmutableContext() because it significantly slows down the computations

    let state = getState();
    if (!(fileId in state.fileEntities)) return;

    let getNormalizationActions = () => {
      let state = getState();
      let file = state.fileEntities[fileId];
      let imageData = state.imageDataEntities[file.rgbaImageDataId];
      if (!imageData.initialized) return [];
      let layers = file.layerIds
        .map((layerId) => state.layerEntities[layerId])
        .filter((layer) => layer.type == LayerType.IMAGE) as ImageLayer[];

      return layers
        .filter((layer) => {
          if (!layer.rgbaImageDataId || !(layer.rgbaImageDataId in state.imageDataEntities)) return false;
          let normalizedImageData = state.imageDataEntities[layer.rgbaImageDataId];
          if (!normalizedImageData.initialized) return false;
          let normalizedTile = normalizedImageData.tiles[tileIndex];
          if (normalizedTile.isValid && (normalizedTile.pixelsLoaded || normalizedTile.pixelsLoading)) return false;
          return true;
        })
        .map((layer) => new UpdateNormalizedImageTile(layer.id, tileIndex));
    };

    let onAllTilesNormalized = () => {

      let file = state.fileEntities[fileId];
      let compositeImageData = state.imageDataEntities[file.rgbaImageDataId];
      let tile = { ...compositeImageData.tiles[tileIndex] };
      let layers = file.layerIds
        .map((layerId) => state.layerEntities[layerId])
        .filter((layer) => {
          if (layer.type != LayerType.IMAGE) {
            return false;
          }
          let imageLayer = layer as ImageLayer;
          if (!imageLayer.rgbaImageDataId || !(imageLayer.rgbaImageDataId in state.imageDataEntities)) {
            return false;
          }
          let normalizedImageData = state.imageDataEntities[imageLayer.rgbaImageDataId];
          if (!normalizedImageData.initialized || !normalizedImageData.tiles[tileIndex].pixelsLoaded) {
            return false;
          }
          return true;
        }) as ImageLayer[];

      //reverse the order since they will be blended from bottom to top
      let layerDatas = layers
        .sort((a, b) => (a.order < b.order ? 1 : -1))
        .map((layer) => {
          let rgbaImageData = state.imageDataEntities[layer.rgbaImageDataId];
          // let redChannel = state.imageDataEntities[layer.redChannelId];
          // let greenChannel = state.imageDataEntities[layer.greenChannelId];
          // let blueChannel = state.imageDataEntities[layer.blueChannelId];
          return {
            // redChannel: redChannel.tiles[tileIndex].pixels as Uint16Array,
            // greenChannel: greenChannel.tiles[tileIndex].pixels as Uint16Array,
            // blueChannel: blueChannel.tiles[tileIndex].pixels as Uint16Array,
            rgba: rgbaImageData.tiles[tileIndex].pixels as Uint32Array,
            blendMode: layer.blendMode,
            alpha: layer.alpha,
            visible: layer.visible,
            width: rgbaImageData.tiles[tileIndex].width,
            height: rgbaImageData.tiles[tileIndex].height
          };
        });

      if (!tile.pixels || tile.pixels.length != tile.width * tile.height) {
        tile.pixels = new Uint32Array(tile.width * tile.height);
      }

      tile.pixels = compose(layerDatas, file.channelMixer, { width: tile.width, height: tile.height, pixels: tile.pixels as Uint32Array });
      tile.pixelsLoaded = true;
      tile.pixelsLoading = false;
      tile.isValid = true;

      setState((state: DataFilesStateModel) => {
        let result = {
          ...state,
          imageDataEntities: {
            ...state.imageDataEntities,
            [file.rgbaImageDataId]: {
              ...state.imageDataEntities[file.rgbaImageDataId],
              tiles: [...state.imageDataEntities[file.rgbaImageDataId].tiles]
            }
          }
        }

        result.imageDataEntities[file.rgbaImageDataId].tiles[tileIndex] = { ...tile };

        return result;
      });

      dispatch(new UpdateCompositeImageTileSuccess(fileId, tileIndex, tile.pixels));
    };

    let actions = getNormalizationActions();
    //trigger load of normalized tiles
    if (actions.length == 0) {
      return onAllTilesNormalized();
    } else {
      setState((state: DataFilesStateModel) => {
        let file = state.fileEntities[fileId];
        let compositeImageData = state.imageDataEntities[file.rgbaImageDataId];
        let tiles = [...compositeImageData.tiles]
        tiles[tileIndex] = {
          ...tiles[tileIndex],
          pixelsLoading: true
        }
        state = {
          ...state,
          imageDataEntities: {
            ...state.imageDataEntities,
            [file.rgbaImageDataId]: {
              ...compositeImageData,
              tiles: tiles
            }
          }
        }

        return state;
      });

      return dispatch(actions).pipe(
        take(1),
        tap((v) => onAllTilesNormalized())
      );
    }
  }

  /**
   * Transformation
   */

  /* Transformation */
  @Action(CenterRegionInViewport)
  @ImmutableContext()
  public centerRegionInViewport(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { imageDataId, imageTransformId, viewportTransformId, viewportSize, region }: CenterRegionInViewport
  ) {
    setState((state: DataFilesStateModel) => {
      let imageData = state.imageDataEntities[imageDataId];
      let ts = state.transformEntities;
      let viewportTransform = ts[viewportTransformId];
      let imageTransform = ts[imageTransformId];

      let viewportAnchor = new Point(viewportSize.width / 2, viewportSize.height / 2);
      let scale = Math.min((viewportSize.width - 20) / region.width, (viewportSize.height - 20) / region.height);

      let xShift = viewportAnchor.x - scale * (region.x + region.width / 2);
      let yShift = viewportAnchor.y - scale * (imageData.height - (region.y + region.height / 2));

      viewportTransform = {
        ...viewportTransform,
        a: scale,
        b: 0,
        c: 0,
        d: scale,
        tx: xShift,
        ty: yShift,
      };

      imageTransform = {
        ...imageTransform,
        a: 1,
        b: 0,
        c: 0,
        d: -1,
        tx: 0,
        ty: imageData.height,
      };

      ts[viewportTransformId] = viewportTransform;
      ts[imageTransformId] = imageTransform;

      return state;
    });
  }

  @Action(ZoomTo)
  @ImmutableContext()
  public zoomTo(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { imageDataId, imageTransformId, viewportTransformId, viewportSize, scale, anchorPoint }: ZoomTo
  ) {
    let state = getState();
    let imageTransform = state.transformEntities[imageTransformId];
    let viewportTransform = state.transformEntities[viewportTransformId];
    let imageToViewportTransform = getImageToViewportTransform(viewportTransform, imageTransform);
    let zoomByFactor = scale / getScale(imageToViewportTransform);

    return dispatch(
      new ZoomBy(imageDataId, imageTransformId, viewportTransformId, viewportSize, zoomByFactor, anchorPoint)
    );
  }

  @Action(ZoomBy)
  @ImmutableContext()
  public zoomBy(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { imageDataId, imageTransformId, viewportTransformId, viewportSize, scaleFactor, anchorPoint }: ZoomBy
  ) {
    let state = getState();

    setState((state: DataFilesStateModel) => {
      let imageData = state.imageDataEntities[imageDataId];
      let ts = state.transformEntities;
      let viewportTransform = ts[viewportTransformId];
      let imageTransform = ts[imageTransformId];
      let imageToViewportTransform = getImageToViewportTransform(viewportTransform, imageTransform);

      // max zoom reached when 1 pixel fills viewport
      let viewportULP = transformPoint({ x: 0.5, y: 0.5 }, imageToViewportTransform);
      let viewportLRP = transformPoint({ x: 1.5, y: 1.5 }, imageToViewportTransform);

      let d = getDistance(viewportULP, viewportLRP);
      let reachedMaxZoom = d > viewportSize.width || d > viewportSize.height;

      // min zoom reached when image fits in viewer
      viewportLRP = transformPoint({ x: imageData.width - 0.5, y: imageData.height - 0.5 }, imageToViewportTransform);
      d = getDistance(viewportULP, viewportLRP);
      let reachedMinZoom = d < viewportSize.width && d < viewportSize.height;

      if (scaleFactor === 1 || (scaleFactor > 1 && reachedMaxZoom) || (scaleFactor < 1 && reachedMinZoom)) {
        return state;
      }

      // if image anchor is null, set to center of image viewer
      if (anchorPoint == null) {
        anchorPoint = {
          x: viewportSize.width / 2.0,
          y: viewportSize.height / 2.0,
        };
        // let centerViewerPoint = new Point(transformation.viewportSize.width / 2.0, transformation.viewportSize.height / 2.0);
        //let newAnchor = imageToViewportMatrix.inverted().transform(centerViewerPoint);
        //anchorPoint = {x: newAnchor.x+0.5, y: newAnchor.y+0.5};
      }

      //TODO:  Verify that viewport transform should be used instead of image to viewport transform for the anchor point
      anchorPoint = transformPoint(anchorPoint, invertTransform(viewportTransform));
      viewportTransform = scaleTransform(viewportTransform, scaleFactor, scaleFactor, anchorPoint);
      imageToViewportTransform = getImageToViewportTransform(viewportTransform, imageTransform);

      ts[viewportTransformId] = viewportTransform;
      ts[imageTransformId] = imageTransform;

      return state;
    });
  }

  @Action(MoveBy)
  @ImmutableContext()
  public moveBy(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { imageDataId, imageTransformId, viewportTransformId, viewportSize, xShift, yShift }: MoveBy
  ) {
    let state = getState();

    setState((state: DataFilesStateModel) => {
      let imageData = state.imageDataEntities[imageDataId];
      let ts = state.transformEntities;
      let viewportTransform = ts[viewportTransformId];
      let imageTransform = ts[imageTransformId];
      let imageToViewportTransform = getImageToViewportTransform(viewportTransform, imageTransform);

      // test if image is almost entirely out of viewer
      let buffer = 50;
      let c1 = transformPoint({ x: imageData.width, y: imageData.height }, imageToViewportTransform);
      let c2 = transformPoint({ x: 0, y: 0 }, imageToViewportTransform);
      let c3 = transformPoint({ x: 0, y: imageData.height }, imageToViewportTransform);
      let c4 = transformPoint({ x: imageData.width, y: 0 }, imageToViewportTransform);
      let maxPoint = {
        x: Math.max(c1.x, c2.x, c3.x, c4.x),
        y: Math.max(c1.y, c2.y, c3.y, c4.y),
      };
      let minPoint = {
        x: Math.min(c1.x, c2.x, c3.x, c4.x),
        y: Math.min(c1.y, c2.y, c3.y, c4.y),
      };
      let imageRect = {
        x: minPoint.x + buffer + xShift,
        y: minPoint.y + buffer + yShift,
        width: maxPoint.x - minPoint.x - buffer * 2,
        height: maxPoint.y - minPoint.y - buffer * 2,
      };

      let viewportRect = {
        x: 0,
        y: 0,
        width: viewportSize.width,
        height: viewportSize.height,
      };
      if (!intersects(imageRect, viewportRect)) {
        return state;
      }

      let shift = transformPoint(
        { x: xShift, y: yShift },
        invertTransform({
          ...viewportTransform,
          tx: 0,
          ty: 0,
        })
      );

      viewportTransform = translateTransform(viewportTransform, shift.x, shift.y);
      imageToViewportTransform = getImageToViewportTransform(viewportTransform, imageTransform);

      ts[viewportTransformId] = viewportTransform;
      ts[imageTransformId] = imageTransform;

      return state;
    });
  }

  @Action(RotateBy)
  @ImmutableContext()
  public rotateBy(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { imageDataId, imageTransformId, viewportTransformId, viewportSize, rotationAngle, anchorPoint }: RotateBy
  ) {
    let state = getState();

    setState((state: DataFilesStateModel) => {
      let imageData = state.imageDataEntities[imageDataId];
      let ts = state.transformEntities;
      let viewportTransform = ts[viewportTransformId];
      let imageTransform = ts[imageTransformId];
      let imageToViewportTransform = getImageToViewportTransform(viewportTransform, imageTransform);

      if (anchorPoint == null) {
        anchorPoint = {
          x: viewportSize.width / 2.0,
          y: viewportSize.height / 2.0,
        };
      }

      anchorPoint = transformPoint(anchorPoint, invertTransform(viewportTransform));

      rotationAngle *= viewportTransform.a / Math.abs(viewportTransform.a)
      rotationAngle *= viewportTransform.d / Math.abs(viewportTransform.d)

      viewportTransform = rotateTransform(viewportTransform, rotationAngle, anchorPoint);
      imageToViewportTransform = getImageToViewportTransform(viewportTransform, imageTransform);

      ts[viewportTransformId] = viewportTransform;
      ts[imageTransformId] = imageTransform;

      return state;
    });
  }

  @Action(Flip)
  @ImmutableContext()
  public flip(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { imageDataId, imageTransformId, viewportTransformId, axis, viewportSize, anchorPoint }: Flip
  ) {
    let state = getState();

    setState((state: DataFilesStateModel) => {
      let imageData = state.imageDataEntities[imageDataId];
      let ts = state.transformEntities;
      let viewportTransform = ts[viewportTransformId];
      let imageTransform = ts[imageTransformId];
      let imageToViewportTransform = getImageToViewportTransform(viewportTransform, imageTransform);

      if (anchorPoint == null) {
        anchorPoint = {
          x: viewportSize.width / 2.0,
          y: viewportSize.height / 2.0,
        };
      }
      let rotationAngle = Math.atan2(viewportTransform.c, viewportTransform.a);
      anchorPoint = transformPoint(anchorPoint, invertTransform(viewportTransform));

      let xScale = axis == 'horizontal' ? 1 : -1;
      if (Math.abs(Math.round(rotationAngle / (Math.PI / 2.0))) % 2) {
        xScale *= -1;
      }
      viewportTransform = scaleTransform(viewportTransform, xScale, xScale * -1, anchorPoint);
      imageToViewportTransform = getImageToViewportTransform(viewportTransform, imageTransform);

      ts[viewportTransformId] = viewportTransform;
      ts[imageTransformId] = imageTransform;

      return state;
    });
  }

  @Action(ResetImageTransform)
  @ImmutableContext()
  public resetImageTransform(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { imageDataId, imageTransformId, viewportTransformId }: ResetImageTransform
  ) {
    let state = getState();

    setState((state: DataFilesStateModel) => {
      let imageData = state.imageDataEntities[imageDataId];
      let ts = state.transformEntities;
      let viewportTransform = ts[viewportTransformId];
      let imageTransform = ts[imageTransformId];
      let imageToViewportTransform = getImageToViewportTransform(viewportTransform, imageTransform);

      imageTransform = {
        ...imageTransform,
        a: 1,
        b: 0,
        c: 0,
        d: -1,
        tx: 0,
        ty: imageData.height,
      };
      imageToViewportTransform = getImageToViewportTransform(viewportTransform, imageTransform);

      ts[viewportTransformId] = viewportTransform;
      ts[imageTransformId] = imageTransform;

      return state;
    });
  }

  @Action(ResetViewportTransform)
  @ImmutableContext()
  public resetViewportTransform(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { imageDataId, imageTransformId, viewportTransformId }: ResetViewportTransform
  ) {
    let state = getState();

    setState((state: DataFilesStateModel) => {
      let imageData = state.imageDataEntities[imageDataId];
      let ts = state.transformEntities;
      let viewportTransform = ts[viewportTransformId];
      let imageTransform = ts[imageTransformId];
      let imageToViewportTransform = getImageToViewportTransform(viewportTransform, imageTransform);

      viewportTransform = {
        ...viewportTransform,
        a: 1,
        b: 0,
        c: 0,
        d: 1,
        tx: 0,
        ty: 0,
      };
      imageToViewportTransform = getImageToViewportTransform(viewportTransform, imageTransform);

      ts[viewportTransformId] = viewportTransform;
      ts[imageTransformId] = imageTransform;

      return state;
    });
  }

  @Action(UpdateTransform)
  @ImmutableContext()
  public updateTransform(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { transformId, changes }: UpdateTransform
  ) {
    let state = getState();

    setState((state: DataFilesStateModel) => {
      state.transformEntities[transformId] = {
        ...state.transformEntities[transformId],
        ...changes,
        id: transformId,
      };
      return state;
    });
  }
}
