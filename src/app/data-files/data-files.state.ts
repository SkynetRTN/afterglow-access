import { State, Action, Selector, StateContext, Actions, Store, ofActionSuccessful, ofActionCompleted } from "@ngxs/store";
import { Point, Matrix, Rectangle } from "paper";
import {
  DataFile,
  ImageHdu,
  IHdu,
  PixelType,
  getWidth,
  getHeight,
  PixelPrecision,
  TableHdu,
  hasOverlap,
  Header,
} from "./models/data-file";
import { ImmutableContext } from "@ngxs-labs/immer-adapter";
import { merge, combineLatest } from "rxjs";
import { catchError, tap, flatMap, filter, takeUntil, take, skip } from "rxjs/operators";
import { AfterglowDataFileService } from "../workbench/services/afterglow-data-files";
import { mergeDelayError } from "../utils/rxjs-extensions";
import { ResetState } from "../auth/auth.actions";
import { WasmService } from "../wasm.service";
import {
  CloseAllDataFiles,
  CloseAllDataFilesFail,
  CloseDataFile,
  LoadDataFile,
  LoadLibrary,
  LoadLibrarySuccess,
  LoadLibraryFail,
  LoadHduHeader,
  LoadHduHeaderSuccess,
  LoadImageHduHistogram,
  LoadImageHduHistogramSuccess,
  LoadRawImageTile,
  LoadRawImageTileSuccess,
  CloseHduSuccess,
  CloseHduFail,
  LoadHdu,
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
} from "./data-files.actions";
import { HduType } from "./models/data-file-type";
import { appConfig } from "../../environments/environment";
import { Wcs } from "../image-tools/wcs";
import { Initialize } from "../workbench/workbench.actions";
import { IImageData, createTiles } from "./models/image-data";
import { grayColorMap } from "./models/color-map";
import { PixelNormalizer, normalize } from "./models/pixel-normalizer";
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
} from "./models/transformation";
import { StretchMode } from "./models/stretch-mode";
import { BlendMode } from "./models/blend-mode";
import { on } from "process";
import { compose } from "./models/pixel-composer";

export interface DataFilesStateModel {
  version: string;
  nextIdSeed: number;
  fileIds: string[];
  fileEntities: { [id: string]: DataFile };
  hduIds: string[];
  hduEntities: { [id: string]: IHdu };
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
  version: "a17c9d3c-28ad-4fba-aa55-cae9b9d220f6",
  nextIdSeed: 0,
  fileIds: [],
  fileEntities: {},
  hduIds: [],
  hduEntities: {},
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
  name: "dataFiles",
  defaults: dataFilesDefaultState,
})
export class DataFilesState {
  constructor(
    private dataFileService: AfterglowDataFileService,
    private actions$: Actions,
    private wasmService: WasmService,
    private store: Store
  ) {}

  @Selector()
  public static getState(state: DataFilesStateModel) {
    return state;
  }

  @Selector()
  public static getFileEntities(state: DataFilesStateModel) {
    return state.fileEntities;
  }

  @Selector()
  static getFiles(state: DataFilesStateModel) {
    return Object.values(state.fileEntities);
  }

  @Selector()
  static getFileIds(state: DataFilesStateModel) {
    return state.fileIds;
  }

  @Selector()
  public static getFileById(state: DataFilesStateModel) {
    return (id: string) => {
      return id in state.fileEntities ? state.fileEntities[id] : null;
    };
  }

  @Selector()
  public static getHduEntities(state: DataFilesStateModel) {
    return state.hduEntities;
  }

  @Selector()
  static getHdus(state: DataFilesStateModel) {
    return Object.values(state.hduEntities);
  }

  @Selector()
  static getHdusByFileId(state: DataFilesStateModel) {
    return (fileId: string) => {
      return Object.values(state.hduEntities).filter((hdu) => hdu.fileId == fileId);
    };
  }

  @Selector()
  public static getFileByCompositeImageDataId(state: DataFilesStateModel) {
    return (imageDataId: string) => {
      return Object.values(state.fileEntities).find((file) => file.compositeImageDataId == imageDataId);
    };
  }

  @Selector()
  public static getHduById(state: DataFilesStateModel) {
    return (hduId: string) => {
      return hduId in state.hduEntities ? state.hduEntities[hduId] : null;
    };
  }

  @Selector()
  public static getHduByNormalizedImageDataId(state: DataFilesStateModel) {
    return (imageDataId: string) => {
      return Object.values(state.hduEntities).find(
        (hdu) => hdu.hduType == HduType.IMAGE && (hdu as ImageHdu).normalizedImageDataId == imageDataId
      );
    };
  }

  @Selector()
  public static getHeaderEntities(state: DataFilesStateModel) {
    return state.headerEntities;
  }

  @Selector()
  static getHeaders(state: DataFilesStateModel) {
    return Object.values(state.headerEntities);
  }

  @Selector()
  public static getHeaderById(state: DataFilesStateModel) {
    return (id: string) => {
      return id in state.headerEntities ? state.headerEntities[id] : null;
    };
  }

  @Selector()
  public static getHeaderByHduId(state: DataFilesStateModel) {
    return (hduId: string) => {
      if (!(hduId in state.hduEntities)) {
        return null;
      }
      let hdu = state.hduEntities[hduId];

      if (!hdu.headerId || !state.headerEntities[hdu.headerId]) {
        return null;
      }
      return state.headerEntities[hdu.headerId];
    };
  }

  @Selector()
  public static getHeaderLoaded(state: DataFilesStateModel) {
    return (hduId: string) => {
      if (!(hduId in state.hduEntities)) {
        return false;
      }
      let hdu = state.hduEntities[hduId];

      if (!hdu.headerId || !state.headerEntities[hdu.headerId]) {
        return false;
      }

      return state.headerEntities[hdu.headerId].loaded;
    };
  }

  @Selector()
  public static getHistLoaded(state: DataFilesStateModel) {
    return (hduId: string) => {
      if (!(hduId in state.hduEntities)) return false;
      let hdu = state.hduEntities[hduId];
      return hdu.hduType == HduType.IMAGE ? (hdu as ImageHdu).histLoaded : false;
    };
  }

  @Selector()
  public static getHist(state: DataFilesStateModel) {
    return (hduId: string) => {
      if (!(hduId in state.hduEntities)) return null;
      let hdu = state.hduEntities[hduId];
      return hdu.hduType == HduType.IMAGE ? (hdu as ImageHdu).hist : null;
    };
  }

  @Selector()
  public static getNormalizer(state: DataFilesStateModel) {
    return (hduId: string) => {
      if (!(hduId in state.hduEntities)) return null;
      let hdu = state.hduEntities[hduId];
      return hdu.hduType == HduType.IMAGE ? (hdu as ImageHdu).normalizer : null;
    };
  }

  @Selector()
  public static getImageDataEntities(state: DataFilesStateModel) {
    return state.imageDataEntities;
  }

  @Selector()
  static getImageDatas(state: DataFilesStateModel) {
    return Object.values(state.imageDataEntities);
  }

  @Selector()
  public static getImageDataById(state: DataFilesStateModel) {
    return (id: string) => {
      return id in state.imageDataEntities ? state.imageDataEntities[id] : null;
    };
  }

  @Selector()
  public static getTransformEntities(state: DataFilesStateModel) {
    return state.transformEntities;
  }

  @Selector()
  static getTransforms(state: DataFilesStateModel) {
    return Object.values(state.transformEntities);
  }

  @Selector()
  public static getTransformById(state: DataFilesStateModel) {
    return (id: string) => {
      return id in state.transformEntities ? state.transformEntities[id] : null;
    };
  }

  @Selector()
  static getLoading(state: DataFilesStateModel) {
    return state.loading;
  }

  @Action(Initialize)
  @ImmutableContext()
  public initialize({ getState, setState, dispatch }: StateContext<DataFilesStateModel>, {}: Initialize) {}

  @Action(ResetState)
  @ImmutableContext()
  public resetState({ getState, setState, dispatch }: StateContext<DataFilesStateModel>, {}: ResetState) {
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
      ...file.hduIds.map((hduId) => {
        return this.dataFileService.removeFile(hduId).pipe(
          tap((result) => {
            setState((state: DataFilesStateModel) => {
              if (state.hduIds.includes(hduId)) {
                let hdu = state.hduEntities[hduId];
                let file = state.fileEntities[hdu.fileId];
                file.hduIds = file.hduIds.filter((id) => id != hduId);

                if (file.hduIds.length == 0) {
                  //delete file
                  state.fileIds = state.fileIds.filter((id) => id != file.id);
                  delete state.fileEntities[file.id];
                }

                state.hduIds = state.hduIds.filter((id) => id != hduId);
                delete state.hduEntities[hduId];
              }
              return state;
            });
            dispatch(new CloseHduSuccess(hduId));
          }),
          catchError((err) => dispatch(new CloseHduFail(hduId, err)))
        );
      })
    ).pipe(
      flatMap((v) => dispatch(new CloseDataFileSuccess(fileId))),
      catchError((err) => dispatch(new CloseDataFileFail(fileId, err)))
    );
  }

  @Action(SaveDataFile)
  @ImmutableContext()
  public saveDataFile({ setState, getState, dispatch }: StateContext<DataFilesStateModel>, { fileId }: SaveDataFile) {
    let file = getState().fileEntities[fileId];
    dispatch(new SaveDataFileFail(fileId, ""));
  }

  @Action(LoadDataFile)
  @ImmutableContext()
  public loadDataFile({ setState, getState, dispatch }: StateContext<DataFilesStateModel>, { fileId }: LoadDataFile) {
    let state = getState();
    let dataFile = state.fileEntities[fileId] as DataFile;
    let actions = [];

    let hdus = this.store.selectSnapshot(DataFilesState.getHdusByFileId)(fileId);
    hdus.forEach((hdu) => {
      let header = state.headerEntities[hdu.headerId];
      if (
        !header ||
        (!header.loaded && !header.loading) ||
        (hdu.hduType == HduType.IMAGE && !(hdu as ImageHdu).histLoaded && !(hdu as ImageHdu).histLoading)
      ) {
        actions.push(new LoadHdu(hdu.id));
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
      tap((coreFiles) => {
        let actions = [];
        let hdus: IHdu[] = [];
        let dataFiles: DataFile[] = [];

        coreFiles.forEach((coreFile, index) => {
          let hdu: IHdu = {
            type: "hdu",
            id: coreFile.id.toString(),
            fileId: coreFile.group_id,
            hduType: coreFile.type,
            order: coreFile.group_order,
            modified: coreFile.modified,
            headerId: null,
          };

          hdus.push(hdu);

          let dataFile = dataFiles.find((dataFile) => dataFile.id == hdu.fileId);
          if (!dataFile) {
            dataFile = {
              type: "file",
              id: hdu.fileId,
              assetPath: '/' + coreFile.asset_path,
              dataProviderId: coreFile.data_provider,
              name: coreFile.name,
              hduIds: [hdu.id],
              imageHduIds: hdu.hduType == HduType.IMAGE ? [hdu.id] : [],
              tableHduIds: hdu.hduType == HduType.TABLE ? [hdu.id] : [],
              viewportTransformId: null,
              imageTransformId: null,
              compositeImageDataId: null,
            };
            dataFiles.push(dataFile);
          } else {
            dataFile.hduIds.push(hdu.id);
            if (hdu.hduType == HduType.IMAGE) {
              dataFile.imageHduIds.push(hdu.id);
            } else if (hdu.hduType == HduType.TABLE) {
              dataFile.tableHduIds.push(hdu.id);
            }
          }
        });

        setState((state: DataFilesStateModel) => {
          //remove hdus which are no longer present
          let hduIds = hdus.map((hdu) => hdu.id);
          let deletedHduIds = state.hduIds.filter((id) => !hduIds.includes(id));
          state.hduIds = state.hduIds.filter((id) => !deletedHduIds.includes(id));
          deletedHduIds.forEach((id) => delete state.hduEntities[id]);

          // remove data files which are no longer found in the HDUs
          let fileIds = dataFiles.map((file) => file.id);
          let deletedFileIds = state.fileIds.filter((id) => !fileIds.includes(id));
          state.fileIds = state.fileIds.filter((id) => !deletedFileIds.includes(id));
          deletedFileIds.forEach((id) => delete state.fileEntities[id]);

          hdus.forEach((hdu) => {
            if (hdu.id in state.hduEntities) {
              //update fields which may have been modified on the server
              state.hduEntities[hdu.id] = {
                ...state.hduEntities[hdu.id],
                fileId: hdu.fileId,
                order: hdu.order,
                modified: hdu.modified,
              };
            } else {
              //add the new HDU
              let header: Header = {
                id: `HEADER_${state.nextIdSeed++}`,
                entries: [],
                wcs: null,
                loaded: false,
                loading: false,
              };

              state.headerIds.push(header.id);
              state.headerEntities[header.id] = header;

              if (hdu.hduType == HduType.IMAGE) {
                let imageHdu: ImageHdu = {
                  ...hdu,
                  headerId: header.id,
                  hduType: HduType.IMAGE,
                  precision: PixelPrecision.float32,
                  blendMode: BlendMode.Screen,
                  alpha: 1.0,
                  hist: null,
                  histLoaded: false,
                  histLoading: false,
                  rawImageDataId: null,
                  viewportTransformId: null,
                  imageTransformId: null,
                  normalizedImageDataId: null,
                  normalizer: {
                    backgroundPercentile: 10,
                    peakPercentile: 99,
                    colorMapName: grayColorMap.name,
                    stretchMode: StretchMode.Linear,
                    inverted: false,
                  },
                };
                hdu = imageHdu;
              } else if (hdu.hduType == HduType.TABLE) {
                let tableHdu: TableHdu = {
                  ...hdu,
                  headerId: header.id,
                  hduType: HduType.TABLE,
                };
                hdu = tableHdu;
              } else {
                return;
              }
              state.hduIds.push(hdu.id);
              state.hduEntities[hdu.id] = hdu;
            }
          });

          dataFiles.forEach((file) => {
            if (file.id in state.fileEntities) {
              state.fileEntities[file.id] = {
                ...state.fileEntities[file.id],
                assetPath: file.assetPath,
                dataProviderId: file.dataProviderId,
                name: file.name,
                hduIds: file.hduIds,
                imageHduIds: file.imageHduIds,
                tableHduIds: file.tableHduIds,
              };
            } else {
              state.fileIds.push(file.id);
              state.fileEntities[file.id] = file;
            }
          });

          state.loading = false;
          return state;
        });

        actions.push(new LoadLibrarySuccess(hdus, correlationId));
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

  @Action(LoadHdu)
  @ImmutableContext()
  public loadHdu({ setState, getState, dispatch }: StateContext<DataFilesStateModel>, { hduId }: LoadHdu) {
    let actions = [];
    let pendingActions = [];
    let state = getState();
    if (!(hduId in state.hduEntities)) return;
    let hdu = state.hduEntities[hduId];
    let header = state.headerEntities[hdu.headerId];
    if (header && header.loading) {
      pendingActions.push(
        this.actions$.pipe(
          ofActionCompleted(LoadHduHeader),
          filter((v) => {
            let action: LoadHduHeader = v.action;
            return action.hduId == hduId;
          }),
          take(1)
        )
      );
    } else if (!header || !header.loaded) {
      actions.push(new LoadHduHeader(hdu.id));
    }

    if (hdu.hduType == HduType.IMAGE) {
      let imageHdu = hdu as ImageHdu;
      if (imageHdu.histLoading) {
        pendingActions.push(
          this.actions$.pipe(
            ofActionCompleted(LoadImageHduHistogram),
            filter((v) => {
              let action: LoadImageHduHistogram = v.action;
              return action.hduId == hduId;
            }),
            take(1)
          )
        );
      } else if (!imageHdu.histLoaded) {
        actions.push(new LoadImageHduHistogram(imageHdu.id));
      }
    }
    if (pendingActions.length == 0 && actions.length == 0) {
      return;
    }

    return merge(...pendingActions, dispatch(actions));
  }

  @Action(LoadHduHeader)
  @ImmutableContext()
  public loadHduHeader({ setState, getState, dispatch }: StateContext<DataFilesStateModel>, { hduId }: LoadHduHeader) {
    let fileId = getState().hduEntities[hduId].fileId;
    const cancel$ = merge(
      this.actions$.pipe(
        ofActionSuccessful(CloseDataFile),
        filter<CloseDataFile>((cancelAction) => cancelAction.fileId == fileId)
      )
    );

    setState((state: DataFilesStateModel) => {
      let hdu = state.hduEntities[hduId];
      let header = state.headerEntities[hdu.headerId];
      header.loading = true;
      header.loaded = false;
      return state;
    });

    return this.dataFileService.getHeader(hduId).pipe(
      takeUntil(cancel$),
      tap((entries) => {
        let actions = [];
        setState((state: DataFilesStateModel) => {
          let hdu = state.hduEntities[hduId];
          let header = state.headerEntities[hdu.headerId];
          header.entries = entries;
          header.loading = false;
          header.loaded = true;

          let wcsHeader: { [key: string]: any } = {};
          header.entries.forEach((entry) => {
            wcsHeader[entry.key] = entry.value;
          });
          header.wcs = new Wcs(wcsHeader);

          if (hdu.hduType == HduType.IMAGE) {
            let imageHdu = hdu as ImageHdu;
            //extract width and height from the header using FITS standards
            // TODO:  Handle failure when getting width and height
            let width = getWidth(header);
            let height = getHeight(header);

            let hduImageDataBase = {
              width: width,
              height: height,
              tileWidth: appConfig.tileSize,
              tileHeight: appConfig.tileSize,
              initialized: true,
            };

            let imageDataNeedsUpdate = (imageData: IImageData<PixelType>, refImageData: Partial<IImageData<PixelType>>) => {
              return !Object.keys(refImageData).every((key) => refImageData[key] == imageData[key]);
            };

            // initialize raw image data
            if (imageHdu.rawImageDataId && imageHdu.rawImageDataId in state.imageDataEntities) {
              // HDU already has initialized raw image data
              let rawImageData = state.imageDataEntities[imageHdu.rawImageDataId];
              if (imageDataNeedsUpdate(rawImageData, hduImageDataBase)) {
                state.imageDataEntities[imageHdu.rawImageDataId] = {
                  ...rawImageData,
                  ...hduImageDataBase,
                  tiles: createTiles(width, height, appConfig.tileSize, appConfig.tileSize),
                };
              } else {
              }
            } else {
              let rawImageDataId = `RAW_IMAGE_DATA_${state.nextIdSeed++}`;
              let rawImageData: IImageData<PixelType> = {
                id: rawImageDataId,
                ...hduImageDataBase,
                tiles: createTiles<PixelType>(width, height, appConfig.tileSize, appConfig.tileSize),
              };

              state.imageDataEntities[rawImageDataId] = rawImageData;
              state.imageDataIds.push(rawImageDataId);
              imageHdu.rawImageDataId = rawImageDataId;
            }

            // initialize normalized image data
            if (imageHdu.normalizedImageDataId && imageHdu.normalizedImageDataId in state.imageDataEntities) {
              // HDU already has initialized normalized image data
              let normalizedImageData = state.imageDataEntities[imageHdu.normalizedImageDataId];
              if (imageDataNeedsUpdate(normalizedImageData, hduImageDataBase)) {
                state.imageDataEntities[imageHdu.normalizedImageDataId] = {
                  ...normalizedImageData,
                  ...hduImageDataBase,
                  tiles: createTiles(width, height, appConfig.tileSize, appConfig.tileSize),
                };
                actions.push(new InvalidateNormalizedImageTiles(imageHdu.id));
              }
            } else {
              let normalizedImageDataId = `NORMALIZED_IMAGE_DATA_${state.nextIdSeed++}`;
              let normalizedImageData: IImageData<Uint32Array> = {
                id: normalizedImageDataId,
                ...hduImageDataBase,
                tiles: createTiles<Uint32Array>(width, height, appConfig.tileSize, appConfig.tileSize),
              };

              state.imageDataEntities[normalizedImageDataId] = normalizedImageData;
              state.imageDataIds.push(normalizedImageDataId);
              imageHdu.normalizedImageDataId = normalizedImageDataId;

              actions.push(new InvalidateNormalizedImageTiles(imageHdu.id));
            }

            //initialize transforms
            if (!state.transformEntities[imageHdu.imageTransformId]) {
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
              imageHdu.imageTransformId = imageTransformId;
            }

            if (!state.transformEntities[imageHdu.viewportTransformId]) {
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
              imageHdu.viewportTransformId = viewportTransformId;
            }

            //initialize file composite image data
            let file = state.fileEntities[imageHdu.fileId];
            let fileHdus = file.hduIds
              .map((id) => state.hduEntities[id])
              .filter(
                (hdu) => hdu.hduType == HduType.IMAGE && hdu.headerId && state.headerEntities[hdu.headerId].loaded
              ) as ImageHdu[];
            let compositeWidth = Math.min(...fileHdus.map((hdu) => getWidth(state.headerEntities[hdu.headerId])));
            let compositeHeight = Math.min(...fileHdus.map((hdu) => getHeight(state.headerEntities[hdu.headerId])));
            let compositeImageDataBase = {
              width: compositeWidth,
              height: compositeHeight,
              tileWidth: appConfig.tileSize,
              tileHeight: appConfig.tileSize,
              initialized: true,
            };

            if (file.compositeImageDataId && file.compositeImageDataId in state.imageDataEntities) {
              // File already has initialized composite image data
              let compositeImageData = state.imageDataEntities[file.compositeImageDataId];
              if (imageDataNeedsUpdate(compositeImageData, compositeImageDataBase)) {
                state.imageDataEntities[file.compositeImageDataId] = {
                  ...compositeImageData,
                  ...compositeImageDataBase,
                  tiles: createTiles(compositeWidth, compositeHeight, appConfig.tileSize, appConfig.tileSize),
                };
              }
            } else {
              let compositeImageDataId = `COMPOSITE_IMAGE_DATA_${state.nextIdSeed++}`;
              let compositeImageData: IImageData<Uint32Array> = {
                id: compositeImageDataId,
                ...hduImageDataBase,
                tiles: createTiles<Uint32Array>(compositeWidth, compositeHeight, appConfig.tileSize, appConfig.tileSize),
              };

              state.imageDataEntities[compositeImageDataId] = compositeImageData;
              state.imageDataIds.push(compositeImageDataId);
              file.compositeImageDataId = compositeImageDataId;
            }

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
        });
        actions.push(new LoadHduHeaderSuccess(hduId));
        dispatch(actions);
      })
    );
  }

  @Action(LoadImageHduHistogram)
  @ImmutableContext()
  public loadImageHduHistogram(
    { setState, getState, dispatch }: StateContext<DataFilesStateModel>,
    { hduId }: LoadImageHduHistogram
  ) {
    if (getState().hduEntities[hduId].hduType != HduType.IMAGE) return;

    let fileId = getState().hduEntities[hduId].fileId;
    const cancel$ = merge(
      this.actions$.pipe(
        ofActionSuccessful(CloseDataFile),
        filter<CloseDataFile>((cancelAction) => cancelAction.fileId == fileId)
      )
    );

    setState((state: DataFilesStateModel) => {
      let hdu = state.hduEntities[hduId] as ImageHdu;
      hdu.histLoading = true;
      hdu.histLoaded = false;
      return state;
    });

    return this.dataFileService.getHist(hduId).pipe(
      takeUntil(cancel$),
      tap((hist) => {
        setState((state: DataFilesStateModel) => {
          let hdu = state.hduEntities[hduId] as ImageHdu;
          hdu.hist = hist;
          hdu.histLoading = false;
          hdu.histLoaded = true;
          return state;
        });
      }),
      flatMap((hist) => {
        return dispatch(new LoadImageHduHistogramSuccess(hduId, hist));
      }),
      catchError((err) => {
        setState((state: DataFilesStateModel) => {
          let hdu = state.hduEntities[hduId] as ImageHdu;
          hdu.histLoading = false;
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
    { hduId, tileIndex }: LoadRawImageTile
  ) {
    let state = getState();
    if (state.hduEntities[hduId].hduType != HduType.IMAGE) return;

    let fileId = getState().hduEntities[hduId].fileId;
    const cancel$ = merge(
      this.actions$.pipe(
        ofActionSuccessful(CloseDataFile),
        filter<CloseDataFile>((cancelAction) => cancelAction.fileId == fileId)
      )
    );

    setState((state: DataFilesStateModel) => {
      let hdu = state.hduEntities[hduId] as ImageHdu;
      let imageData = state.imageDataEntities[hdu.rawImageDataId];
      let tile = imageData.tiles[tileIndex];

      tile.pixelsLoading = true;
      tile.pixelsLoaded = false;
      return state;
    });

    let hdu = state.hduEntities[hduId] as ImageHdu;
    let imageData = state.imageDataEntities[hdu.rawImageDataId];
    let tile = imageData.tiles[tileIndex];
    return this.dataFileService.getPixels(hduId, hdu.precision, tile).pipe(
      takeUntil(cancel$),
      tap((pixels) => {
        setState((state: DataFilesStateModel) => {
          let hdu = state.hduEntities[hduId] as ImageHdu;
          let imageData = state.imageDataEntities[hdu.rawImageDataId];
          let tile = imageData.tiles[tileIndex];
          tile.isValid = true;
          tile.pixelsLoading = false;
          tile.pixelsLoaded = true;
          tile.pixels = pixels;
          state.imageDataEntities[hdu.rawImageDataId] = {
            ...imageData,
          };
          return state;
        });
      }),
      flatMap((pixels) => {
        return dispatch([
          new LoadRawImageTileSuccess(hduId, tileIndex, pixels),
          // new InvalidateNormalizedImageTile(hduId, tileIndex)
        ]);
      }),
      catchError((err) => {
        setState((state: DataFilesStateModel) => {
          let hdu = state.hduEntities[hduId] as ImageHdu;
          let imageData = state.imageDataEntities[hdu.rawImageDataId];
          let tile = imageData.tiles[tileIndex];
          tile.pixelsLoading = false;
          tile.pixelLoadingFailed = true;
          return state;
        });
        throw err;
      })
    );
  }

  @Action(InvalidateHeader)
  @ImmutableContext()
  public invalidateHeader(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { hduId }: InvalidateRawImageTiles
  ) {
    let state = getState();
    if (
      !state.hduEntities[hduId] ||
      !state.hduEntities[hduId].headerId ||
      !state.headerEntities[state.hduEntities[hduId].headerId]
    ) {
      return;
    }

    setState((state: DataFilesStateModel) => {
      let header = state.headerEntities[state.hduEntities[hduId].headerId];
      header.loaded = false;

      state.headerEntities[header.id] = { ...header };

      return state;
    });
  }

  @Action(InvalidateRawImageTiles)
  @ImmutableContext()
  public invalidateRawImageTiles(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { hduId }: InvalidateRawImageTiles
  ) {
    let state = getState();
    if (
      !(hduId in state.hduEntities) ||
      state.hduEntities[hduId].hduType != HduType.IMAGE ||
      !(state.hduEntities[hduId] as ImageHdu).rawImageDataId
    )
      return;

    let rawImageData = state.imageDataEntities[(state.hduEntities[hduId] as ImageHdu).rawImageDataId];

    return dispatch(rawImageData.tiles.map((tile) => new InvalidateRawImageTile(hduId, tile.index)));
  }

  @Action(InvalidateRawImageTile)
  @ImmutableContext()
  public invalidateRawImageTile(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { hduId, tileIndex }: InvalidateRawImageTile
  ) {
    let state = getState();
    if (
      !(hduId in state.hduEntities) ||
      state.hduEntities[hduId].hduType != HduType.IMAGE ||
      !(state.hduEntities[hduId] as ImageHdu).rawImageDataId
    )
      return;

    setState((state: DataFilesStateModel) => {
      let rawImageData = state.imageDataEntities[(state.hduEntities[hduId] as ImageHdu).rawImageDataId];
      let tile = rawImageData.tiles[tileIndex];
      tile.isValid = false;

      state.imageDataEntities[rawImageData.id] = { ...rawImageData };

      return state;
    });

    return dispatch(new InvalidateNormalizedImageTile(hduId, tileIndex));
  }

  @Action(InvalidateNormalizedImageTiles)
  @ImmutableContext()
  public invalidateNormalizedImageTiles(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { hduId }: InvalidateNormalizedImageTiles
  ) {
    let state = getState();
    if (
      !(hduId in state.hduEntities) ||
      state.hduEntities[hduId].hduType != HduType.IMAGE ||
      !(state.hduEntities[hduId] as ImageHdu).normalizedImageDataId
    )
      return;

    let normalizedImageData = state.imageDataEntities[(state.hduEntities[hduId] as ImageHdu).normalizedImageDataId];

    return dispatch(normalizedImageData.tiles.map((tile) => new InvalidateNormalizedImageTile(hduId, tile.index)));
  }

  @Action(InvalidateNormalizedImageTile)
  @ImmutableContext()
  public invalidateNormalizedImageTile(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { hduId, tileIndex }: InvalidateNormalizedImageTile
  ) {
    let state = getState();
    if (
      !(hduId in state.hduEntities) ||
      state.hduEntities[hduId].hduType != HduType.IMAGE ||
      !(state.hduEntities[hduId] as ImageHdu).normalizedImageDataId
    )
      return;

    setState((state: DataFilesStateModel) => {
      let normalizedImageData = state.imageDataEntities[(state.hduEntities[hduId] as ImageHdu).normalizedImageDataId];
      let tile = normalizedImageData.tiles[tileIndex];
      tile.isValid = false;

      state.imageDataEntities[(state.hduEntities[hduId] as ImageHdu).normalizedImageDataId] = { ...normalizedImageData };

      return state;
    });

    let fileId = state.hduEntities[hduId].fileId;
    return dispatch(new InvalidateCompositeImageTile(fileId, tileIndex));
  }

  @Action(UpdateNormalizedImageTile)
  @ImmutableContext()
  public loadNormalizedImageTile(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { hduId, tileIndex }: UpdateNormalizedImageTile
  ) {
    let state = getState();
    if (
      !(hduId in state.hduEntities) ||
      state.hduEntities[hduId].hduType != HduType.IMAGE ||
      !(state.hduEntities[hduId] as ImageHdu).normalizedImageDataId
    ) {
      return;
    }

    let hdu = state.hduEntities[hduId] as ImageHdu;
    let imageData = state.imageDataEntities[hdu.rawImageDataId];
    if (!imageData.initialized) return;
    let rawTile = imageData.tiles[tileIndex];

    if (rawTile.pixelsLoading) {
      return;
    }

    let onRawPixelsLoaded = () => {
      let actions = [];
      setState((state: DataFilesStateModel) => {
        let hdu = state.hduEntities[hduId] as ImageHdu;
        let normalizedImageData = state.imageDataEntities[hdu.normalizedImageDataId];
        let tile = normalizedImageData.tiles[tileIndex];
        let imageData = state.imageDataEntities[hdu.rawImageDataId];
        let rawTile = imageData.tiles[tileIndex];

        tile.pixelsLoaded = true;
        tile.pixelLoadingFailed = false;
        tile.pixelsLoading = false;
        tile.isValid = true;
        tile.pixels = normalize(rawTile.pixels, hdu.hist, hdu.normalizer);

        state.imageDataEntities[hdu.normalizedImageDataId] = {
          ...normalizedImageData,
        };

        actions.push(new UpdateNormalizedImageTileSuccess(hduId, tileIndex, tile.pixels));
        actions.push(new InvalidateCompositeImageTile(hdu.fileId, tileIndex));

        return state;
      });

      return dispatch(actions);
    };

    if (rawTile.pixelsLoaded && rawTile.isValid) {
      return onRawPixelsLoaded();
    } else if (!rawTile.pixelsLoading) {
      setState((state: DataFilesStateModel) => {
        let normalizedImageData = state.imageDataEntities[hdu.normalizedImageDataId];
        let tile = normalizedImageData.tiles[tileIndex];
        tile.pixelsLoading = true;
        state.imageDataEntities[hdu.normalizedImageDataId] = {
          ...normalizedImageData,
        };
        return state;
      });

      //trigger load of raw tile
      let loadRawPixelsSuccess$ = this.actions$.pipe(
        ofActionCompleted(LoadRawImageTileSuccess),
        filter((v) => v.action.hduId == hduId && v.action.tileIndex == tileIndex),
        flatMap((v) => onRawPixelsLoaded())
      );

      let loadRawPixelsFail$ = this.actions$.pipe(
        ofActionCompleted(LoadRawImageTileFail),
        filter((v) => v.action.hduId == hduId && v.action.tileIndex == tileIndex),
        tap((v) => {
          setState((state: DataFilesStateModel) => {
            let normalizedImageData = state.imageDataEntities[hdu.normalizedImageDataId];
            let tile = normalizedImageData.tiles[tileIndex];
            tile.pixelsLoading = false;
            tile.pixelLoadingFailed = true;
            state.imageDataEntities[hdu.normalizedImageDataId] = {
              ...normalizedImageData,
            };
            return state;
          });

          dispatch(new UpdateNormalizedImageTileFail(hduId, tileIndex));
        })
      );

      return merge(
        merge(loadRawPixelsSuccess$, loadRawPixelsFail$).pipe(take(1)),
        dispatch(new LoadRawImageTile(hduId, tileIndex))
      );
    }
  }

  @Action(UpdateNormalizer)
  @ImmutableContext()
  public updateNormalizer(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { hduId, changes }: UpdateNormalizer
  ) {
    let state = getState();
    if (!(hduId in state.hduEntities) || state.hduEntities[hduId].hduType != HduType.IMAGE) return;

    setState((state: DataFilesStateModel) => {
      let hdu = state.hduEntities[hduId] as ImageHdu;
      hdu.normalizer = {
        ...hdu.normalizer,
        ...changes,
      };
      return state;
    });

    return dispatch(new InvalidateNormalizedImageTiles(hduId));
  }

  /**
   * Composite
   */

  @Action(InvalidateCompositeImageTiles)
  @ImmutableContext()
  public invalidateCompositeImageTiles(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { fileId }: InvalidateCompositeImageTiles
  ) {
    let state = getState();
    if (!(fileId in state.fileEntities) || !state.fileEntities[fileId].compositeImageDataId) return;

    let compositeImageData = state.imageDataEntities[state.fileEntities[fileId].compositeImageDataId];

    return dispatch(compositeImageData.tiles.map((tile) => new InvalidateCompositeImageTile(fileId, tile.index)));
  }

  @Action(InvalidateCompositeImageTile)
  @ImmutableContext()
  public invalidateCompositeImageTile(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { fileId, tileIndex }: InvalidateCompositeImageTile
  ) {
    let state = getState();
    if (!(fileId in state.fileEntities) || !state.fileEntities[fileId].compositeImageDataId) return;

    setState((state: DataFilesStateModel) => {
      let compositeImageData = state.imageDataEntities[state.fileEntities[fileId].compositeImageDataId];
      let tile = compositeImageData.tiles[tileIndex];
      tile.isValid = false;

      state.imageDataEntities[state.fileEntities[fileId].compositeImageDataId] = { ...compositeImageData };

      return state;
    });
  }

  @Action([UpdateCompositeImageTile])
  @ImmutableContext()
  public loadCompositeImageTile(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { fileId, tileIndex }: UpdateCompositeImageTile
  ) {
    let state = getState();
    if (!(fileId in state.fileEntities)) return;

    let getNormalizationActions = () => {
      let state = getState();
      let file = state.fileEntities[fileId];
      let imageData = state.imageDataEntities[file.compositeImageDataId];
      if (!imageData.initialized) return;
      let hdus = file.hduIds
        .map((hduId) => state.hduEntities[hduId])
        .filter((hdu) => hdu.hduType == HduType.IMAGE) as ImageHdu[];

      return hdus
        .filter((hdu) => {
          if (!hdu.normalizedImageDataId || !(hdu.normalizedImageDataId in state.imageDataEntities)) return false;
          let normalizedImageData = state.imageDataEntities[hdu.normalizedImageDataId];
          if (!normalizedImageData.initialized) return false;
          let normalizedTile = normalizedImageData.tiles[tileIndex];
          if (normalizedTile.isValid && (normalizedTile.pixelsLoaded || normalizedTile.pixelsLoading)) return false;
          return true;
        })
        .map((hdu) => new UpdateNormalizedImageTile(hdu.id, tileIndex));
    };

    let onAllTilesNormalized = () => {
      setState((state: DataFilesStateModel) => {
        let file = state.fileEntities[fileId];
        let compositeImageData = state.imageDataEntities[file.compositeImageDataId];
        let tile = compositeImageData.tiles[tileIndex];
        let hdus = file.hduIds
          .map((hduId) => state.hduEntities[hduId])
          .filter((hdu) => {
            if (hdu.hduType != HduType.IMAGE) {
              return false;
            }
            let imageHdu = hdu as ImageHdu;
            if (!imageHdu.normalizedImageDataId || !(imageHdu.normalizedImageDataId in state.imageDataEntities)) {
              return false;
            }
            let normalizedImageData = state.imageDataEntities[imageHdu.normalizedImageDataId];
            if (!normalizedImageData.initialized || !normalizedImageData.tiles[tileIndex].pixelsLoaded) {
              return false;
            }
            return true;
          }) as ImageHdu[];

        let layers = hdus.map((hdu) => {
          let normalizedImageData = state.imageDataEntities[hdu.normalizedImageDataId];
          return {
            pixels: normalizedImageData.tiles[tileIndex].pixels as Uint32Array,
            blendMode: hdu.blendMode,
            alpha: hdu.alpha,
          };
        });

        if (!tile.pixels || tile.pixels.length != tile.width * tile.height) {
          tile.pixels = new Uint32Array(tile.width * tile.height);
        }
        tile.pixels = compose(layers, tile.pixels as Uint32Array);
        tile.pixelsLoaded = true;
        tile.pixelsLoading = false;
        tile.isValid = true;

        state.imageDataEntities[file.compositeImageDataId] = {
          ...compositeImageData,
        };

        dispatch(new UpdateCompositeImageTileSuccess(fileId, tileIndex, tile.pixels));

        return state;
      });
    };

    let actions = getNormalizationActions();
    //trigger load of normalized tiles
    if (actions.length == 0) {
      return onAllTilesNormalized();
    } else {
      setState((state: DataFilesStateModel) => {
        let file = state.fileEntities[fileId];
        let compositeImageData = state.imageDataEntities[file.compositeImageDataId];
        let tile = compositeImageData.tiles[tileIndex];
        tile.pixelsLoading = true;
        state.imageDataEntities[file.compositeImageDataId] = {
          ...compositeImageData,
        };
        return state;
      });

      return dispatch(actions).pipe(
        take(1),
        tap((v) => onAllTilesNormalized())
      );

      //trigger update of normalized tile
      // let updateNormalizedTileSuccess$ = this.actions$.pipe(
      //   ofActionCompleted(UpdateNormalizedImageTileSuccess),
      //   filter((v) => actions.find((a) => a.hduId == v.action.hduId && a.tileIndex == v.action.tileIndex) != undefined)
      // );

      // let updateNormalizedTileFail$ = this.actions$.pipe(
      //   ofActionCompleted(UpdateNormalizedImageTileFail),
      //   filter((v) => actions.find((a) => a.hduId == v.action.hduId && a.tileIndex == v.action.tileIndex) != undefined)
      // );

      // return merge(
      //   merge(updateNormalizedTileSuccess$, updateNormalizedTileFail$).pipe(
      //     skip(actions.length - 1),
      //     take(1),
      //     tap((v) => {
      //       if (getNormalizationActions().length == 0) {
      //         onAllTilesNormalized();
      //       } else {
      //         setState((state: DataFilesStateModel) => {
      //           let file = state.fileEntities[fileId];
      //           let compositeImageData = state.imageDataEntities[file.compositeImageDataId];
      //           let tile = compositeImageData.tiles[tileIndex];
      //           tile.pixelsLoading = false;
      //           tile.pixelLoadingFailed = true;
      //           state.imageDataEntities[file.compositeImageDataId] = {
      //             ...compositeImageData,
      //           };
      //           return state;
      //         });

      //         dispatch(new UpdateCompositeImageTileFail(fileId, tileIndex));
      //       }
      //     })
      //   ),
      //   dispatch(actions)
      // );
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

    return dispatch(new ZoomBy(imageDataId, imageTransformId, viewportTransformId, viewportSize, zoomByFactor, anchorPoint));
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

      let xScale = Math.abs(viewportTransform.a);
      let yScale = Math.abs(viewportTransform.d);

      viewportTransform = translateTransform(viewportTransform, xShift / xScale, yShift / yScale);
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

      //TODO:  Verify that image to viewport transform should be used instead of viewport transform for the anchor point
      anchorPoint = transformPoint(anchorPoint, invertTransform(imageToViewportTransform));

      imageTransform = rotateTransform(imageTransform, -rotationAngle, anchorPoint);
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
    { imageDataId, imageTransformId, viewportTransformId }: Flip
  ) {
    let state = getState();

    setState((state: DataFilesStateModel) => {
      let imageData = state.imageDataEntities[imageDataId];
      let ts = state.transformEntities;
      let viewportTransform = ts[viewportTransformId];
      let imageTransform = ts[imageTransformId];
      let imageToViewportTransform = getImageToViewportTransform(viewportTransform, imageTransform);

      imageTransform = scaleTransform(imageTransform, -1, 1, {
        x: imageData.width / 2,
        y: imageData.height / 2,
      });
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
