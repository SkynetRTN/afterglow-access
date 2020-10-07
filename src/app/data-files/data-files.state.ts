import {
  State,
  Action,
  Selector,
  StateContext,
  Actions,
  Store,
  ofActionSuccessful,
} from "@ngxs/store";
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
} from "./models/data-file";
import { ImmutableContext } from "@ngxs-labs/immer-adapter";
import { merge, combineLatest } from "rxjs";
import { catchError, tap, flatMap, filter, takeUntil } from "rxjs/operators";
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
  ClearNormalizedImageTiles,
  UpdateNormalizedImageTile,
  UpdateNormalizer,
  CenterRegionInViewport,
  ZoomTo,
  ZoomBy,
  MoveBy,
  Flip,
  RotateBy,
  UpdateNormalizedImageTileSuccess,
  SyncFileNormalizations,
  SyncFileTransformations,
  ResetImageTransform,
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

export interface DataFilesStateModel {
  version: string;
  nextIdSeed: number;
  dataFileIds: string[];
  dataFileEntities: { [id: string]: DataFile };
  hduIds: string[];
  hduEntities: { [id: string]: IHdu };
  imageDataEntities: { [id: string]: IImageData<PixelType> };
  imageDataIds: string[];
  transformEntities: { [id: string]: Transform };
  transformIds: string[];
  removingAll: boolean;
  loading: boolean;
}

const dataFilesDefaultState: DataFilesStateModel = {
  version: "678725c2-f213-4ed3-9daa-ab0426742488",
  nextIdSeed: 0,
  dataFileIds: [],
  dataFileEntities: {},
  hduIds: [],
  hduEntities: {},
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
  public static getDataFileEntities(state: DataFilesStateModel) {
    return state.dataFileEntities;
  }

  @Selector()
  static getDataFiles(state: DataFilesStateModel) {
    return Object.values(state.dataFileEntities);
  }

  @Selector()
  public static getDataFileById(state: DataFilesStateModel) {
    return (id: string) => {
      return id in state.dataFileEntities ? state.dataFileEntities[id] : null;
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
      return Object.values(state.hduEntities).filter(
        (hdu) => hdu.fileId == fileId
      );
    };
  }

  @Selector()
  public static getHduById(state: DataFilesStateModel) {
    return (hduId: string) => {
      return hduId in state.hduEntities ? state.hduEntities[hduId] : null;
    };
  }

  @Selector()
  public static getHeader(state: DataFilesStateModel) {
    return (hduId: string) => {
      return hduId in state.hduEntities
        ? state.hduEntities[hduId].header
        : null;
    };
  }

  @Selector()
  public static getHeaderLoaded(state: DataFilesStateModel) {
    return (hduId: string) => {
      return hduId in state.hduEntities
        ? state.hduEntities[hduId].headerLoaded
        : null;
    };
  }

  @Selector()
  public static getHistLoaded(state: DataFilesStateModel) {
    return (hduId: string) => {
      if (!(hduId in state.hduEntities)) return false;
      let hdu = state.hduEntities[hduId];
      return hdu.hduType == HduType.IMAGE
        ? (hdu as ImageHdu).histLoaded
        : false;
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
  public initialize(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    {}: Initialize
  ) {}

  @Action(ResetState)
  @ImmutableContext()
  public resetState(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    {}: ResetState
  ) {
    setState((state: DataFilesStateModel) => {
      return dataFilesDefaultState;
    });
  }

  @Action(CloseAllDataFiles)
  @ImmutableContext()
  public closeAllDataFiles({
    setState,
    getState,
    dispatch,
  }: StateContext<DataFilesStateModel>) {
    setState((state: DataFilesStateModel) => {
      state.removingAll = true;
      return state;
    });

    return mergeDelayError(
      ...getState().dataFileIds.map((id) => dispatch(new CloseDataFile(id)))
    ).pipe(
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
  public closeDataFile(
    { setState, getState, dispatch }: StateContext<DataFilesStateModel>,
    { fileId }: CloseDataFile
  ) {
    let file = getState().dataFileEntities[fileId];

    return combineLatest(
      ...file.hduIds.map((hduId) => {
        return this.dataFileService.removeFile(hduId).pipe(
          tap((result) => {
            setState((state: DataFilesStateModel) => {
              if (state.hduIds.includes(hduId)) {
                let hdu = state.hduEntities[hduId];
                let file = state.dataFileEntities[hdu.fileId];
                file.hduIds = file.hduIds.filter((id) => id != hduId);

                if (file.hduIds.length == 0) {
                  //delete file
                  state.dataFileIds = state.dataFileIds.filter(
                    (id) => id != file.id
                  );
                  delete state.dataFileEntities[file.id];
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

  @Action(LoadDataFile)
  @ImmutableContext()
  public loadDataFile(
    { setState, getState, dispatch }: StateContext<DataFilesStateModel>,
    { fileId }: LoadDataFile
  ) {
    let state = getState();
    let dataFile = state.dataFileEntities[fileId] as DataFile;
    let actions = [];

    let hdus = this.store.selectSnapshot(DataFilesState.getHdusByFileId)(
      fileId
    );
    hdus.forEach((hdu) => {
      if (
        (!hdu.headerLoaded && !hdu.headerLoading) ||
        (hdu.hduType == HduType.IMAGE &&
          !(hdu as ImageHdu).histLoaded &&
          !(hdu as ImageHdu).histLoading)
      ) {
        actions.push(new LoadHdu(hdu.id));
      }
    });
    return dispatch(actions);
  }

  @Action(LoadLibrary)
  @ImmutableContext()
  public loadLibrary(
    { setState, dispatch }: StateContext<DataFilesStateModel>,
    { correlationId }: LoadLibrary
  ) {
    setState((state: DataFilesStateModel) => {
      state.loading = true;
      return state;
    });

    return this.dataFileService.getFiles().pipe(
      tap((coreFiles) => {
        let actions = [];
        let hdus: IHdu[] = [];
        let dataFiles: DataFile[] = [];

        //TODO: use server values for fileID and order
        coreFiles.forEach((coreFile, index) => {
          let hdu: IHdu = {
            type: "hdu",
            id: coreFile.id.toString(),
            //fileId: coreFile.group_id,
            //fileId: `FILE_${coreFile.id.toString()}`,
            fileId: `1`,
            hduType: coreFile.type,
            // order: coreFile.group_order,
            order: index,
            modified: coreFile.modified,
            header: null,
            headerLoaded: false,
            headerLoading: false,
            wcs: null,
          };

          hdus.push(hdu);

          let dataFile = dataFiles.find(
            (dataFile) => dataFile.id == hdu.fileId
          );
          if (!dataFile) {
            dataFile = {
              type: "file",
              id: hdu.fileId,
              assetPath: coreFile.asset_path,
              dataProviderId: coreFile.data_provider,
              name: coreFile.name,
              hduIds: [hdu.id],
              transformation: {
                viewportTransformId: null,
                imageTransformId: null,
                imageToViewportTransformId: null,
              },
              compositeImageDataId: null,
            };
            dataFiles.push(dataFile);
          } else {
            dataFile.hduIds.push(hdu.id);
          }
        });

        setState((state: DataFilesStateModel) => {
          //remove hdus which are no longer present
          let hduIds = hdus.map((hdu) => hdu.id);
          let deletedHduIds = state.hduIds.filter((id) => !hduIds.includes(id));
          state.hduIds = state.hduIds.filter(
            (id) => !deletedHduIds.includes(id)
          );
          deletedHduIds.forEach((id) => delete state.hduEntities[id]);

          // remove data files which are no longer found in the HDUs
          let fileIds = dataFiles.map((file) => file.id);
          let deletedFileIds = state.dataFileIds.filter(
            (id) => !fileIds.includes(id)
          );
          state.dataFileIds = state.dataFileIds.filter(
            (id) => !deletedFileIds.includes(id)
          );
          deletedFileIds.forEach((id) => delete state.dataFileEntities[id]);

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
              if (hdu.hduType == HduType.IMAGE) {
                let imageHdu: ImageHdu = {
                  ...hdu,
                  hduType: HduType.IMAGE,
                  precision: PixelPrecision.float32,
                  hist: null,
                  histLoaded: false,
                  histLoading: false,
                  rawImageDataId: null,
                  transformation: {
                    viewportTransformId: null,
                    imageTransformId: null,
                    imageToViewportTransformId: null,
                  },
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
            if (file.id in state.dataFileEntities) {
              state.dataFileEntities[file.id] = {
                ...state.dataFileEntities[file.id],
                assetPath: file.assetPath,
                dataProviderId: file.dataProviderId,
                name: file.name,
                hduIds: file.hduIds,
              };
            } else {
              state.dataFileIds.push(file.id);
              state.dataFileEntities[file.id] = file;
            }
          });

          state.loading = false;
          return state;
        });

        actions.push(new LoadLibrarySuccess(hdus, correlationId));
        return dispatch(actions);
      }),
      catchError((err) => {
        return dispatch(new LoadLibraryFail(err, correlationId));
      })
    );
  }

  @Action(LoadHdu)
  @ImmutableContext()
  public loadHdu(
    { setState, getState, dispatch }: StateContext<DataFilesStateModel>,
    { hduId }: LoadHdu
  ) {
    let actions = [];
    let state = getState();
    if (!(hduId in state.hduEntities)) return;
    let hdu = state.hduEntities[hduId];

    if (!hdu.headerLoaded && !hdu.headerLoading) {
      actions.push(new LoadHduHeader(hdu.id));
    }

    if (hdu.hduType == HduType.IMAGE) {
      let imageHdu = hdu as ImageHdu;
      if (!imageHdu.histLoaded && !imageHdu.histLoading) {
        actions.push(new LoadImageHduHistogram(imageHdu.id));
      }
    }

    return dispatch(actions);
  }

  @Action(LoadHduHeader)
  @ImmutableContext()
  public loadHduHeader(
    { setState, getState, dispatch }: StateContext<DataFilesStateModel>,
    { hduId }: LoadHduHeader
  ) {
    let fileId = getState().hduEntities[hduId].fileId;
    const cancel$ = merge(
      this.actions$.pipe(
        ofActionSuccessful(CloseDataFile),
        filter<CloseDataFile>((cancelAction) => cancelAction.fileId == fileId)
      )
    );

    setState((state: DataFilesStateModel) => {
      let hdu = state.hduEntities[hduId];
      hdu.headerLoading = true;
      hdu.headerLoaded = false;
      return state;
    });

    return this.dataFileService.getHeader(hduId).pipe(
      takeUntil(cancel$),
      tap((header) => {
        setState((state: DataFilesStateModel) => {
          let hdu = state.hduEntities[hduId];
          hdu.header = header;
          hdu.headerLoading = false;
          hdu.headerLoaded = true;

          let wcsHeader: { [key: string]: any } = {};
          header.forEach((entry) => {
            wcsHeader[entry.key] = entry.value;
          });
          hdu.wcs = new Wcs(wcsHeader);

          if (hdu.hduType == HduType.IMAGE) {
            let imageHdu = hdu as ImageHdu;
            //extract width and height from the header using FITS standards
            // TODO:  Handle failure when getting width and height
            let width = getWidth(imageHdu);
            let height = getHeight(imageHdu);

            let hduImageDataBase = {
              width: width,
              height: height,
              tileWidth: appConfig.tileSize,
              tileHeight: appConfig.tileSize,
              initialized: true,
            };

            let imageDataNeedsUpdate = (
              imageData: IImageData<PixelType>,
              refImageData: Partial<IImageData<PixelType>>
            ) => {
              return !Object.keys(refImageData).every(
                (key) => refImageData[key] == imageData[key]
              );
            };

            // initialize raw image data
            if (
              imageHdu.rawImageDataId &&
              imageHdu.rawImageDataId in state.imageDataEntities
            ) {
              // HDU already has initialized raw image data
              let rawImageData =
                state.imageDataEntities[imageHdu.rawImageDataId];
              if (imageDataNeedsUpdate(rawImageData, hduImageDataBase)) {
                rawImageData = {
                  ...rawImageData,
                  ...hduImageDataBase,
                  tiles: createTiles(
                    width,
                    height,
                    appConfig.tileSize,
                    appConfig.tileSize
                  ),
                };
              }
            } else {
              let rawImageDataId = `RAW_IMAGE_DATA_${state.nextIdSeed++}`;
              let rawImageData: IImageData<PixelType> = {
                id: rawImageDataId,
                ...hduImageDataBase,
                tiles: createTiles<PixelType>(
                  width,
                  height,
                  appConfig.tileSize,
                  appConfig.tileSize
                ),
              };

              state.imageDataEntities[rawImageDataId] = rawImageData;
              state.imageDataIds.push(rawImageDataId);
              imageHdu.rawImageDataId = rawImageDataId;
            }

            // initialize normalized image data
            if (
              imageHdu.normalizedImageDataId &&
              imageHdu.normalizedImageDataId in state.imageDataEntities
            ) {
              // HDU already has initialized raw image data
              let normalizedImageData =
                state.imageDataEntities[imageHdu.normalizedImageDataId];
              if (imageDataNeedsUpdate(normalizedImageData, hduImageDataBase)) {
                normalizedImageData = {
                  ...normalizedImageData,
                  ...hduImageDataBase,
                  tiles: createTiles(
                    width,
                    height,
                    appConfig.tileSize,
                    appConfig.tileSize
                  ),
                };
              }
            } else {
              let normalizedImageDataId = `NORMALIZED_IMAGE_DATA_${state.nextIdSeed++}`;
              let normalizedImageData: IImageData<Uint32Array> = {
                id: normalizedImageDataId,
                ...hduImageDataBase,
                tiles: createTiles<Uint32Array>(
                  width,
                  height,
                  appConfig.tileSize,
                  appConfig.tileSize
                ),
              };

              state.imageDataEntities[
                normalizedImageDataId
              ] = normalizedImageData;
              state.imageDataIds.push(normalizedImageDataId);
              imageHdu.normalizedImageDataId = normalizedImageDataId;
            }

            //initialize transforms
            let transformation = imageHdu.transformation;
            if (
              !transformation.imageTransformId ||
              !(transformation.imageTransformId in state.transformEntities)
            ) {
              let imageTransformId = `IMAGE_TRANSFORM_${state.nextIdSeed++}`;
              let imageTransform: Transform = {
                a: 1,
                b: 0,
                c: 0,
                d: -1,
                tx: 0,
                ty: height,
              };
              state.transformEntities[imageTransformId] = imageTransform;
              state.transformIds.push(imageTransformId);
              transformation.imageTransformId = imageTransformId;
            }
            if (
              !transformation.viewportTransformId ||
              !(transformation.viewportTransformId in state.transformEntities)
            ) {
              let viewportTransformId = `VIEWPORT_TRANSFORM_${state.nextIdSeed++}`;
              let viewportTransform: Transform = {
                a: 1,
                b: 0,
                c: 0,
                d: 1,
                tx: 0,
                ty: 0,
              };
              state.transformEntities[viewportTransformId] = viewportTransform;
              state.transformIds.push(viewportTransformId);
              transformation.viewportTransformId = viewportTransformId;
            }

            let imageToViewportTransformId =
              transformation.imageToViewportTransformId;
            if (
              !imageToViewportTransformId ||
              !(imageToViewportTransformId in state.transformEntities)
            ) {
              imageToViewportTransformId = `IMAGE_TO_VIEWPORT_TRANSFORM_${state.nextIdSeed++}`;
            }

            state.transformEntities[
              imageToViewportTransformId
            ] = getImageToViewportTransform(
              state.transformEntities[transformation.viewportTransformId],
              state.transformEntities[transformation.imageTransformId]
            );
            if (!state.transformIds.includes(imageToViewportTransformId)) {
              state.transformIds.push(imageToViewportTransformId);
            }
            transformation.imageToViewportTransformId = imageToViewportTransformId;

            //initialize file composite image data
            let file = state.dataFileEntities[imageHdu.fileId];
            let fileHdus = file.hduIds
              .map((id) => state.hduEntities[id])
              .filter(
                (hdu) => hdu.hduType == HduType.IMAGE && hdu.headerLoaded
              ) as ImageHdu[];
            let compositeWidth = Math.min(
              ...fileHdus.map((hdu) => getWidth(hdu))
            );
            let compositeHeight = Math.min(
              ...fileHdus.map((hdu) => getHeight(hdu))
            );
            let compositeImageDataBase = {
              width: compositeWidth,
              height: compositeHeight,
              tileWidth: appConfig.tileSize,
              tileHeight: appConfig.tileSize,
              initialized: true,
            };

            if (
              file.compositeImageDataId &&
              file.compositeImageDataId in state.imageDataEntities
            ) {
              // File already has initialized composite image data
              let compositeImageData =
                state.imageDataEntities[file.compositeImageDataId];
              if (
                imageDataNeedsUpdate(compositeImageData, compositeImageDataBase)
              ) {
                compositeImageData = {
                  ...compositeImageData,
                  ...compositeImageDataBase,
                  tiles: createTiles(
                    compositeWidth,
                    compositeHeight,
                    appConfig.tileSize,
                    appConfig.tileSize
                  ),
                };
              }
            } else {
              let compositeImageDataId = `COMPOSITE_IMAGE_DATA_${state.nextIdSeed++}`;
              let compositeImageData: IImageData<Uint32Array> = {
                id: compositeImageDataId,
                ...hduImageDataBase,
                tiles: createTiles<Uint32Array>(
                  compositeWidth,
                  compositeHeight,
                  appConfig.tileSize,
                  appConfig.tileSize
                ),
              };

              state.imageDataEntities[
                compositeImageDataId
              ] = compositeImageData;
              state.imageDataIds.push(compositeImageDataId);
              file.compositeImageDataId = compositeImageDataId;
            }

            // initialize file transformation
            let fileTransformation = file.transformation;
            if (
              !fileTransformation.imageTransformId ||
              !(fileTransformation.imageTransformId in state.transformEntities)
            ) {
              let imageTransformId = `IMAGE_TRANSFORM_${state.nextIdSeed++}`;
              let imageTransform: Transform = {
                a: 1,
                b: 0,
                c: 0,
                d: -1,
                tx: 0,
                ty: compositeHeight,
              };
              state.transformEntities[imageTransformId] = imageTransform;
              state.transformIds.push(imageTransformId);
              fileTransformation.imageTransformId = imageTransformId;
            }
            if (
              !fileTransformation.viewportTransformId ||
              !(
                fileTransformation.viewportTransformId in
                state.transformEntities
              )
            ) {
              let viewportTransformId = `VIEWPORT_TRANSFORM_${state.nextIdSeed++}`;
              let viewportTransform: Transform = {
                a: 1,
                b: 0,
                c: 0,
                d: 1,
                tx: 0,
                ty: 0,
              };
              state.transformEntities[viewportTransformId] = viewportTransform;
              state.transformIds.push(viewportTransformId);
              fileTransformation.viewportTransformId = viewportTransformId;
            }

            let fileImageToViewportTransformId =
              fileTransformation.imageToViewportTransformId;
            if (
              !fileImageToViewportTransformId ||
              !(fileImageToViewportTransformId in state.transformEntities)
            ) {
              fileImageToViewportTransformId = `IMAGE_TO_VIEWPORT_TRANSFORM_${state.nextIdSeed++}`;
            }

            state.transformEntities[
              fileImageToViewportTransformId
            ] = getImageToViewportTransform(
              state.transformEntities[fileTransformation.viewportTransformId],
              state.transformEntities[fileTransformation.imageTransformId]
            );
            if (!state.transformIds.includes(fileImageToViewportTransformId)) {
              state.transformIds.push(fileImageToViewportTransformId);
            }
            
            fileTransformation.imageToViewportTransformId = fileImageToViewportTransformId;
          }

          return state;
        });
        dispatch(new LoadHduHeaderSuccess(hduId, header));
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

          tile.pixelsLoading = false;
          tile.pixelsLoaded = true;
          tile.pixels = pixels;
          return state;
        });
      }),
      flatMap((pixels) => {
        return dispatch(new LoadRawImageTileSuccess(hduId, tileIndex, pixels));
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

  @Action(ClearNormalizedImageTiles)
  @ImmutableContext()
  public clearNormalizedImageTiles(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { hduId }: ClearNormalizedImageTiles
  ) {
    let state = getState();
    if (
      !(hduId in state.hduEntities) ||
      state.hduEntities[hduId].hduType != HduType.IMAGE ||
      !(state.hduEntities[hduId] as ImageHdu).normalizedImageDataId
    )
      return;

    setState((state: DataFilesStateModel) => {
      let normalizedImageData =
        state.imageDataEntities[
          (state.hduEntities[hduId] as ImageHdu).normalizedImageDataId
        ];
      normalizedImageData.tiles.forEach((tile) => {
        tile.pixelsLoaded = false;
        tile.pixelsLoading = false;
        tile.pixels = null;
      });
      return state;
    });
  }

  @Action([UpdateNormalizedImageTile, LoadRawImageTileSuccess])
  @ImmutableContext()
  public updateNormalizedImageTile(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { hduId, tileIndex }: UpdateNormalizedImageTile
  ) {
    let state = getState();
    if (
      !(hduId in state.hduEntities) ||
      state.hduEntities[hduId].hduType != HduType.IMAGE ||
      !(state.hduEntities[hduId] as ImageHdu).normalizedImageDataId
    )
      return;

    setState((state: DataFilesStateModel) => {
      let hdu = state.hduEntities[hduId] as ImageHdu;
      let rawTile = state.imageDataEntities[hdu.rawImageDataId].tiles[tileIndex];
      let tile = state.imageDataEntities[hdu.normalizedImageDataId].tiles[tileIndex];
      tile.pixelsLoaded = true;
      tile.pixelsLoading = false;
      tile.pixels = normalize(rawTile.pixels, hdu.hist, hdu.normalizer);

      dispatch(
        new UpdateNormalizedImageTileSuccess(hduId, tileIndex, tile.pixels)
      );

      return state;
    });
  }

  @Action(UpdateNormalizer)
  @ImmutableContext()
  public updateNormalizer(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { hduId, changes }: UpdateNormalizer
  ) {
    let state = getState();
    if (
      !(hduId in state.hduEntities) ||
      state.hduEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: DataFilesStateModel) => {
      let hdu = state.hduEntities[hduId] as ImageHdu;
      hdu.normalizer = {
        ...hdu.normalizer,
        ...changes,
      };
      return state;
    });

    return dispatch(new ClearNormalizedImageTiles(hduId));
  }

  @Action(SyncFileNormalizations)
  @ImmutableContext()
  public syncFileNormalizations(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { referenceHduId, hduIds }: SyncFileNormalizations
  ) {
    let state = getState();
    if (
      !(referenceHduId in state.hduEntities) ||
      state.hduEntities[referenceHduId].hduType != HduType.IMAGE
    )
      return;
    let referenceHdu = state.hduEntities[referenceHduId] as ImageHdu;
    let referenceNormalizer = referenceHdu.normalizer;

    let actions = [];
    hduIds.forEach((hduId) => {
      if (
        !(hduId in state.hduEntities) ||
        state.hduEntities[hduId].hduType != HduType.IMAGE
      )
        return;
      let hdu = state.hduEntities[hduId] as ImageHdu;
      actions.push(
        new UpdateNormalizer(hdu.id, {
          ...referenceNormalizer,
          peakPercentile: referenceNormalizer.peakPercentile,
          backgroundPercentile: referenceNormalizer.backgroundPercentile,
        })
      );
    });

    return dispatch(actions);
  }

  /**
   * Transformation
   */

  /* Transformation */
  @Action(CenterRegionInViewport)
  @ImmutableContext()
  public centerRegionInViewport(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    {
      transformation,
      imageDataId,
      viewportSize,
      region,
    }: CenterRegionInViewport
  ) {
    setState((state: DataFilesStateModel) => {
      let imageData = state.imageDataEntities[imageDataId];
      let viewportTransform =
        state.transformEntities[transformation.viewportTransformId];
      let imageTransform =
        state.transformEntities[transformation.imageTransformId];
      let imageToViewportTransform =
        state.transformEntities[transformation.imageToViewportTransformId];

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
        scale * (imageData.height - (region.y + region.height / 2));

      viewportTransform = {
        a: scale,
        b: 0,
        c: 0,
        d: scale,
        tx: xShift,
        ty: yShift,
      };

      imageTransform = {
        a: 1,
        b: 0,
        c: 0,
        d: 1,
        tx: 0,
        ty: -imageData.height,
      };

      imageToViewportTransform = getImageToViewportTransform(
        viewportTransform,
        imageTransform
      );

      return state;
    });
  }

  @Action(ZoomTo)
  @ImmutableContext()
  public zoomTo(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { transformation, imageDataId, viewportSize, scale, anchorPoint }: ZoomTo
  ) {
    let state = getState();
    let imageToViewportTransform =
      state.transformEntities[transformation.imageToViewportTransformId];

    let zoomByFactor = scale / getScale(imageToViewportTransform);

    return dispatch(
      new ZoomBy(
        transformation,
        imageDataId,
        viewportSize,
        zoomByFactor,
        anchorPoint
      )
    );
  }

  @Action(ZoomBy)
  @ImmutableContext()
  public zoomBy(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    {
      transformation,
      imageDataId,
      viewportSize,
      scaleFactor,
      anchorPoint,
    }: ZoomBy
  ) {
    let state = getState();

    setState((state: DataFilesStateModel) => {
      let imageData = state.imageDataEntities[imageDataId];
      let viewportTransform =
        state.transformEntities[transformation.viewportTransformId];
      let imageTransform =
        state.transformEntities[transformation.imageTransformId];
      let imageToViewportTransform =
        state.transformEntities[transformation.imageToViewportTransformId];

      // max zoom reached when 1 pixel fills viewport
      let viewportULP = transformPoint(
        { x: 0.5, y: 0.5 },
        imageToViewportTransform
      );
      let viewportLRP = transformPoint(
        { x: 1.5, y: 1.5 },
        imageToViewportTransform
      );

      let d = getDistance(viewportULP, viewportLRP);
      let reachedMaxZoom = d > viewportSize.width || d > viewportSize.height;

      // min zoom reached when image fits in viewer
      viewportLRP = transformPoint(
        { x: imageData.width - 0.5, y: imageData.height - 0.5 },
        imageToViewportTransform
      );
      d = getDistance(viewportULP, viewportLRP);
      let reachedMinZoom = d < viewportSize.width && d < viewportSize.height;

      if (
        scaleFactor === 1 ||
        (scaleFactor > 1 && reachedMaxZoom) ||
        (scaleFactor < 1 && reachedMinZoom)
      ) {
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
      anchorPoint = transformPoint(
        anchorPoint,
        invertTransform(viewportTransform)
      );
      viewportTransform = scaleTransform(
        viewportTransform,
        scaleFactor,
        scaleFactor,
        anchorPoint
      );
      imageToViewportTransform = getImageToViewportTransform(
        viewportTransform,
        imageTransform
      );

      return state;
    });
  }

  @Action(MoveBy)
  @ImmutableContext()
  public moveBy(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { transformation, imageDataId, viewportSize, xShift, yShift }: MoveBy
  ) {
    let state = getState();

    setState((state: DataFilesStateModel) => {
      let imageData = state.imageDataEntities[imageDataId];
      let viewportTransform =
        state.transformEntities[transformation.viewportTransformId];
      let imageTransform =
        state.transformEntities[transformation.imageTransformId];
      let imageToViewportTransform =
        state.transformEntities[transformation.imageToViewportTransformId];

      // test if image is almost entirely out of viewer
      let buffer = 50;
      let c1 = transformPoint(
        { x: imageData.width, y: imageData.height },
        imageToViewportTransform
      );
      let c2 = transformPoint({ x: 0, y: 0 }, imageToViewportTransform);
      let c3 = transformPoint(
        { x: 0, y: imageData.height },
        imageToViewportTransform
      );
      let c4 = transformPoint(
        { x: imageData.width, y: 0 },
        imageToViewportTransform
      );
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
      viewportTransform = translateTransform(
        viewportTransform,
        xShift / xScale,
        yShift / yScale
      );
      imageToViewportTransform = getImageToViewportTransform(
        viewportTransform,
        imageTransform
      );

      return state;
    });
  }

  @Action(RotateBy)
  @ImmutableContext()
  public rotateBy(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    {
      transformation,
      imageDataId,
      viewportSize,
      rotationAngle,
      anchorPoint,
    }: RotateBy
  ) {
    let state = getState();

    setState((state: DataFilesStateModel) => {
      let imageData = state.imageDataEntities[imageDataId];
      let viewportTransform =
        state.transformEntities[transformation.viewportTransformId];
      let imageTransform =
        state.transformEntities[transformation.imageTransformId];
      let imageToViewportTransform =
        state.transformEntities[transformation.imageToViewportTransformId];

      if (anchorPoint == null) {
        anchorPoint = {
          x: viewportSize.width / 2.0,
          y: viewportSize.height / 2.0,
        };
      }

      //TODO:  Verify that image to viewport transform should be used instead of viewport transform for the anchor point
      anchorPoint = transformPoint(
        anchorPoint,
        invertTransform(imageToViewportTransform)
      );

      imageTransform = rotateTransform(
        imageTransform,
        -rotationAngle,
        anchorPoint
      );
      imageToViewportTransform = getImageToViewportTransform(
        viewportTransform,
        imageTransform
      );

      return state;
    });
  }

  @Action(Flip)
  @ImmutableContext()
  public flip(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { transformation, imageDataId }: Flip
  ) {
    let state = getState();

    setState((state: DataFilesStateModel) => {
      let imageData = state.imageDataEntities[imageDataId];
      let viewportTransform =
        state.transformEntities[transformation.viewportTransformId];
      let imageTransform =
        state.transformEntities[transformation.imageTransformId];
      let imageToViewportTransform =
        state.transformEntities[transformation.imageToViewportTransformId];

      imageTransform = scaleTransform(imageTransform, -1, 1, {
        x: imageData.width / 2,
        y: imageData.height / 2,
      });
      imageToViewportTransform = getImageToViewportTransform(
        viewportTransform,
        imageTransform
      );

      return state;
    });
  }

  @Action(ResetImageTransform)
  @ImmutableContext()
  public resetImageTransform(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { transformation, imageDataId }: ResetImageTransform
  ) {
    let state = getState();

    setState((state: DataFilesStateModel) => {
      let imageData = state.imageDataEntities[imageDataId];
      let viewportTransform =
        state.transformEntities[transformation.viewportTransformId];
      let imageTransform =
        state.transformEntities[transformation.imageTransformId];
      let imageToViewportTransform =
        state.transformEntities[transformation.imageToViewportTransformId];

      imageTransform = {
        a: 1,
        b: 0,
        c: 0,
        d: -1,
        tx: 0,
        ty: -imageData.height,
      };
      imageToViewportTransform = getImageToViewportTransform(
        viewportTransform,
        imageTransform
      );

      return state;
    });
  }

  @Action(SyncFileTransformations)
  @ImmutableContext()
  public syncFileTransformations(
    { getState, setState, dispatch }: StateContext<DataFilesStateModel>,
    { referenceHduId, hduIds }: SyncFileTransformations
  ) {
    let state = getState();
    if (
      !(referenceHduId in state.hduEntities) ||
      state.hduEntities[referenceHduId].hduType != HduType.IMAGE
    )
      return;
    let referenceHdu = state.hduEntities[referenceHduId] as ImageHdu;
    let referenceImageTransform =
      state.transformEntities[referenceHdu.transformation.imageTransformId];
    let referenceViewportTransform =
      state.transformEntities[referenceHdu.transformation.viewportTransformId];
    let referenceHduHasWcs = referenceHdu.wcs && referenceHdu.wcs.isValid();

    setState((state: DataFilesStateModel) => {
      let actions = [];
      hduIds.forEach((hduId) => {
        if (
          !(hduId in state.hduEntities) ||
          state.hduEntities[hduId].hduType != HduType.IMAGE
        ) {
          return;
        }
        let hdu = state.hduEntities[hduId] as ImageHdu;
        let imageTransform =
          state.transformEntities[hdu.transformation.imageTransformId];
        let viewportTransform =
          state.transformEntities[hdu.transformation.viewportTransformId];
        let imageToViewportTransform =
          state.transformEntities[
            hdu.transformation.imageToViewportTransformId
          ];
        let hduHasWcs = hdu.wcs && hdu.wcs.isValid();

        if (referenceHduHasWcs && hduHasWcs) {
          let referenceWcs = referenceHdu.wcs;
          let referenceWcsTransform = new Matrix(
            referenceWcs.m11,
            referenceWcs.m21,
            referenceWcs.m12,
            referenceWcs.m22,
            0,
            0
          );
          let originWorld = referenceWcs.pixToWorld([0, 0]);
          let wcs = hdu.wcs;
          let originPixels = wcs.worldToPix(originWorld);
          let wcsTransform = new Matrix(
            wcs.m11,
            wcs.m21,
            wcs.m12,
            wcs.m22,
            0,
            0
          );

          if (hasOverlap(referenceHdu, hdu)) {
            let srcToTargetTransform = referenceWcsTransform
              .inverted()
              .appended(wcsTransform)
              .translate(-originPixels[0], -originPixels[1]);

            imageTransform = appendTransform(
              referenceImageTransform,
              srcToTargetTransform
            );
            viewportTransform = {
              ...referenceViewportTransform,
            };
            imageToViewportTransform = getImageToViewportTransform(
              viewportTransform,
              imageTransform
            );
          }
        } else {
          viewportTransform = {
            ...referenceViewportTransform,
          };
          imageTransform = {
            ...referenceImageTransform,
          };
        }
      });

      return state;
    });
  }
}
