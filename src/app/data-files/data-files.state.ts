import { State, Action, Selector, StateContext, Actions, Store, ofActionSuccessful } from '@ngxs/store';
import { DataFile, ImageHdu, IHdu, PixelType, getYTileDim, getXTileDim, getWidth, getHeight, PixelPrecision } from './models/data-file';
import { ImmutableContext } from '@ngxs-labs/immer-adapter';
import { merge, combineLatest } from "rxjs";
import { catchError, tap, flatMap, filter, takeUntil } from "rxjs/operators";
import { AfterglowDataFileService } from '../workbench/services/afterglow-data-files';
import { mergeDelayError } from '../utils/rxjs-extensions';
import { ResetState } from '../auth/auth.actions';
import { WasmService } from '../wasm.service';
import {
  CloseAllDataFiles, CloseAllDataFilesFail, CloseDataFile,
  LoadDataFile, LoadLibrary, LoadLibrarySuccess, LoadLibraryFail, LoadHduHeader,
  LoadHduHeaderSuccess, LoadImageHduHistogram, LoadImageHduHistogramSuccess, LoadImageTilePixels,
  LoadImageTilePixelsSuccess, CloseHduSuccess, CloseHduFail, LoadHdu, CloseDataFileSuccess, CloseDataFileFail,
} from './data-files.actions';
import { HduType } from './models/data-file-type';
import { appConfig } from '../../environments/environment';
import { Wcs } from '../image-tools/wcs';
import { ImageTile } from './models/image-tile';

export interface DataFilesStateModel {
  version: string;
  dataFileIds: string[];
  dataFileEntities: { [id: string]: DataFile };
  hduIds: string[];
  hduEntities: { [id: string]: IHdu };
  removingAll: boolean
  loading: boolean;
}

const dataFilesDefaultState: DataFilesStateModel = {
  version: '678725c2-f213-4ed3-9daa-ab0426742488',
  dataFileIds: [],
  dataFileEntities: {},
  hduIds: [],
  hduEntities: {},
  loading: false,
  removingAll: false
}

@State<DataFilesStateModel>({
  name: 'dataFiles',
  defaults: dataFilesDefaultState
})
export class DataFilesState {

  constructor(private dataFileService: AfterglowDataFileService, private actions$: Actions, private wasmService: WasmService, private store: Store) {
  }

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
      return (id in state.dataFileEntities) ? state.dataFileEntities[id] : null;
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
      return Object.values(state.hduEntities).filter(hdu => hdu.fileId == fileId);
    };
  }

  @Selector()
  public static getHduById(state: DataFilesStateModel) {
    return (id: string) => {
      return (id in state.hduEntities) ? state.hduEntities[id] : null;
    };
  }

  @Selector()
  public static getHeader(state: DataFilesStateModel) {
    return (id: string) => {
      return (id in state.hduEntities) ? state.hduEntities[id].header : null;
    };
  }

  @Selector()
  public static getHeaderLoaded(state: DataFilesStateModel) {
    return (id: string) => {
      return (id in state.hduEntities) ? state.hduEntities[id].headerLoaded : null;
    };
  }

  @Selector()
  public static getHistLoaded(state: DataFilesStateModel) {
    return (id: string) => {
      if (!(id in state.hduEntities)) return false;
      let hdu = state.hduEntities[id];
      return (hdu.hduType == HduType.IMAGE) ? (hdu as ImageHdu).histLoaded : false;
    };
  }

  @Selector()
  public static getHist(state: DataFilesStateModel) {
    return (id: string) => {
      if (!(id in state.hduEntities)) return null;
      let hdu = state.hduEntities[id];
      return (hdu.hduType == HduType.IMAGE) ? (hdu as ImageHdu).hist : null;
    };
  }

  @Selector()
  static getLoading(state: DataFilesStateModel) {
    return state.loading;
  }

  @Action(ResetState)
  @ImmutableContext()
  public resetState({ getState, setState, dispatch }: StateContext<DataFilesStateModel>, { }: ResetState) {
    setState((state: DataFilesStateModel) => {
      return dataFilesDefaultState
    });
  }

  @Action(CloseAllDataFiles)
  @ImmutableContext()
  public closeAllDataFiles({ setState, getState, dispatch }: StateContext<DataFilesStateModel>) {
    setState((state: DataFilesStateModel) => {
      state.removingAll = true;
      return state;
    });

    return mergeDelayError(
      ...getState().dataFileIds.map(id => dispatch(new CloseDataFile(id)))
    ).pipe(
      catchError(errors => {
        setState((state: DataFilesStateModel) => {
          state.removingAll = false;
          return state;
        });

        return dispatch(new CloseAllDataFilesFail(errors))
      })
    )
  }

  @Action(CloseDataFile)
  @ImmutableContext()
  public closeDataFile({ setState, getState, dispatch }: StateContext<DataFilesStateModel>, { fileId }: CloseDataFile) {
    let file = getState().dataFileEntities[fileId];

    return combineLatest(
      ...file.hduIds.map(hduId => {
        return this.dataFileService
          .removeFile(hduId)
          .pipe(
            tap(result => {
              setState((state: DataFilesStateModel) => {
                if (state.hduIds.includes(hduId)) {
                  state.hduIds = state.hduIds.filter(id => id != hduId);
                  delete state.hduEntities[hduId];
                }
                return state;
              });
              dispatch(new CloseHduSuccess(hduId))
            }),
            catchError(err => dispatch(new CloseHduFail(hduId, err)))
          );
      })).pipe(
        flatMap(v => dispatch(new CloseDataFileSuccess(fileId))),
        catchError(err => dispatch(new CloseDataFileFail(fileId, err)))
      )
  }

  @Action(LoadDataFile)
  @ImmutableContext()
  public loadDataFile({ setState, getState, dispatch }: StateContext<DataFilesStateModel>, { fileId }: LoadDataFile) {
    let state = getState();
    let dataFile = state.dataFileEntities[fileId] as DataFile;
    let actions = [];

    let hdus = this.store.selectSnapshot(DataFilesState.getHdusByFileId)(fileId);
    hdus.forEach(hdu => {
      if ((!hdu.headerLoaded && !hdu.headerLoading) || (hdu.hduType == HduType.IMAGE && (!(hdu as ImageHdu).histLoaded && !(hdu as ImageHdu).histLoading))) {
        actions.push(
          new LoadHdu(hdu.id)
        );
      }

    })
    return dispatch(actions)
  }

  @Action(LoadLibrary)
  @ImmutableContext()
  public loadLibrary({ setState, dispatch }: StateContext<DataFilesStateModel>, { correlationId }: LoadLibrary) {
    setState((state: DataFilesStateModel) => {
      state.loading = true
      return state;
    });

    return this.dataFileService.getFiles().pipe(
      tap(coreFiles => {
        let actions = [];
        let hdus: IHdu[] = [];
        let dataFiles: DataFile[] = [];

        //TODO: use server values for fileID and order
        coreFiles.forEach(coreFile => {
          let hdu: IHdu = {
            type: 'hdu',
            id: coreFile.id.toString(),
            //fileId: coreFile.group_id,
            fileId: `FILE_${coreFile.id.toString()}`,
            hduType: coreFile.type,
            order: coreFile.order,
            modified: coreFile.modified,
            header: null,
            headerLoaded: false,
            headerLoading: false,
            wcs: null
          }

          if (hdu.hduType == HduType.IMAGE) {
            hdu = {
              ...hdu,
              tilesInitialized: false,
              tiles: null,
              hist: null,
              histLoaded: false,
              histLoading: false,
              tileWidth: appConfig.tileSize,
              tileHeight: appConfig.tileSize,
            } as ImageHdu
          }

          hdus.push(hdu);

          let dataFile = dataFiles.find(dataFile => dataFile.id == hdu.fileId);
          if (!dataFile) {
            dataFile = {
              type: 'file',
              id: hdu.fileId,
              assetPath: coreFile.asset_path,
              dataProviderId: coreFile.data_provider,
              name: coreFile.name,
              hduIds: [hdu.id]
            }
            dataFiles.push(dataFile)
          }
          else {
            dataFile.hduIds.push(hdu.id);
          }
        })




        setState((state: DataFilesStateModel) => {

          //remove hdus which are no longer present
          let hduIds = hdus.map(hdu => hdu.id);
          let deletedHduIds = state.hduIds.filter(id => !hduIds.includes(id));
          state.hduIds = state.hduIds.filter(id => !deletedHduIds.includes(id));
          deletedHduIds.forEach(id => delete state.hduEntities[id]);


          // remove data files which are no longer found in the HDUs
          let fileIds = dataFiles.map(file => file.id);
          let deletedFileIds = state.dataFileIds.filter(id => !fileIds.includes(id));
          state.dataFileIds = state.dataFileIds.filter(id => !deletedFileIds.includes(id));
          deletedFileIds.forEach(id => delete state.dataFileEntities[id]);

          hdus.forEach(hdu => {
            if (hdu.id in state.hduEntities) {
              state.hduEntities[hdu.id] = {
                ...state.hduEntities[hdu.id],
                fileId: hdu.fileId,
                order: hdu.order,
                modified: hdu.modified,
              }
            }
            else {
              state.hduIds.push(hdu.id);
              state.hduEntities[hdu.id] = hdu;
            }
          })

          dataFiles.forEach(file => {
            if (file.id in state.dataFileEntities) {
              state.dataFileEntities[file.id] = {
                ...state.dataFileEntities[file.id],
                assetPath: file.assetPath,
                dataProviderId: file.dataProviderId,
                name: file.name,
                hduIds: file.hduIds
              }
            }
            else {
              state.dataFileIds.push(file.id);
              state.dataFileEntities[file.id] = file;
            }
          })

          state.loading = false;
          return state;
        });

        actions.push(new LoadLibrarySuccess(hdus, correlationId))
        return dispatch(actions);

      }),
      catchError(err => {
        return dispatch(new LoadLibraryFail(err, correlationId));
      })
    );
  }

  @Action(LoadHdu)
  @ImmutableContext()
  public loadHdu({ setState, getState, dispatch }: StateContext<DataFilesStateModel>, { hduId }: LoadHdu) {
    let actions = [];
    let state = getState();
    if (!(hduId in state.hduEntities)) return;
    let hdu = state.hduEntities[hduId];

    if (!hdu.headerLoaded && !hdu.headerLoading) {
      actions.push(
        new LoadHduHeader(hdu.id)
      );
    }

    if (hdu.hduType == HduType.IMAGE) {
      let imageHdu = hdu as ImageHdu;
      if (!imageHdu.histLoaded && !imageHdu.histLoading) {
        actions.push(
          new LoadImageHduHistogram(imageHdu.id)
        );
      }
    }

    return dispatch(actions);

  }

  @Action(LoadHduHeader)
  @ImmutableContext()
  public loadHduHeader({ setState, getState, dispatch }: StateContext<DataFilesStateModel>, { hduId }: LoadHduHeader) {
    let fileId = getState().hduEntities[hduId].fileId;
    const cancel$ = merge(
      this.actions$.pipe(
        ofActionSuccessful(CloseDataFile),
        filter<CloseDataFile>(
          cancelAction =>
            cancelAction.fileId == fileId
        )
      ),
    );

    setState((state: DataFilesStateModel) => {
      let hdu = state.hduEntities[hduId];
      hdu.headerLoading = true;
      hdu.headerLoaded = false;
      return state;
    });

    return this.dataFileService.getHeader(hduId).pipe(
      takeUntil(cancel$),
      tap(header => {
        setState((state: DataFilesStateModel) => {
          let hdu = state.hduEntities[hduId];
          hdu.header = header;
          hdu.headerLoading = false;
          hdu.headerLoaded = true;

          let wcsHeader: { [key: string]: any } = {};
          header.forEach(entry => {
            wcsHeader[entry.key] = entry.value;
          });
          hdu.wcs = new Wcs(wcsHeader);

          if (hdu.hduType == HduType.IMAGE) {
            let imageHdu = hdu as ImageHdu;

            //extract width and height from the header using FITS standards
            imageHdu.width = getWidth(imageHdu);
            imageHdu.height = getHeight(imageHdu);
            imageHdu.precision = PixelPrecision.float32;

            /* Initialize Image Tiles*/
            
            let tiles: ImageTile<PixelType>[] = [];

            for (let j = 0; j < getYTileDim(imageHdu); j += 1) {
              let tw = imageHdu.tileWidth;
              let th = imageHdu.tileHeight;
              

              if (j === getYTileDim(imageHdu) - 1) {
                th -= (j + 1) * imageHdu.tileHeight - getHeight(imageHdu);
              }
              for (let i = 0; i < getXTileDim(imageHdu); i += 1) {
                if (i === getXTileDim(imageHdu) - 1) {
                  tw -= (i + 1) * imageHdu.tileWidth - getWidth(imageHdu);
                }
                let index = j * getXTileDim(imageHdu) + i;
                let x = i * imageHdu.tileWidth;
                let y = j * imageHdu.tileHeight;
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
            

            imageHdu.tiles = tiles;
            imageHdu.tilesInitialized = true;
          }

          return state;
        });
        dispatch(new LoadHduHeaderSuccess(hduId, header));

      })
    );
  }


  @Action(LoadImageHduHistogram)
  @ImmutableContext()
  public loadImageHduHistogram({ setState, getState, dispatch }: StateContext<DataFilesStateModel>, { hduId }: LoadImageHduHistogram) {
    if (getState().hduEntities[hduId].hduType != HduType.IMAGE) return;

    let fileId = getState().hduEntities[hduId].fileId;
    const cancel$ = merge(
      this.actions$.pipe(
        ofActionSuccessful(CloseDataFile),
        filter<CloseDataFile>(
          cancelAction =>
            cancelAction.fileId == fileId
        )
      ),
    );

    setState((state: DataFilesStateModel) => {
      let hdu = state.hduEntities[hduId] as ImageHdu;
      hdu.histLoading = true;
      hdu.histLoaded = false;
      return state;
    });

    return this.dataFileService.getHist(hduId).pipe(
      takeUntil(cancel$),
      tap(hist => {
        setState((state: DataFilesStateModel) => {
          let hdu = state.hduEntities[hduId] as ImageHdu;
          hdu.hist = hist;
          hdu.histLoading = false;
          hdu.histLoaded = true;
          return state;
        });
      }),
      flatMap(hist => {
        return dispatch(new LoadImageHduHistogramSuccess(hduId, hist));
      }),
      catchError(err => {
        setState((state: DataFilesStateModel) => {
          let hdu = state.hduEntities[hduId] as ImageHdu;
          hdu.histLoading = false;
          return state;
        });
        throw err;
      })
    );
  }

  @Action(LoadImageTilePixels)
  @ImmutableContext()
  public loadImageTilePixels({ setState, dispatch, getState }: StateContext<DataFilesStateModel>, { hduId, tileIndex }: LoadImageTilePixels) {
    if (getState().hduEntities[hduId].hduType != HduType.IMAGE) return;

    let fileId = getState().hduEntities[hduId].fileId;
    const cancel$ = merge(
      this.actions$.pipe(
        ofActionSuccessful(CloseDataFile),
        filter<CloseDataFile>(
          cancelAction =>
            cancelAction.fileId == fileId
        )
      ),
    );

    setState((state: DataFilesStateModel) => {
      let hdu = state.hduEntities[hduId] as ImageHdu;
      let tile = hdu.tiles[tileIndex];

      tile.pixelsLoading = true;
      tile.pixelsLoaded = false;
      return state;
    });

    let hdu = getState().hduEntities[hduId] as ImageHdu;
    let tile = hdu.tiles[tileIndex];

    return this.dataFileService.getPixels(hduId, hdu.precision, tile).pipe(
      takeUntil(cancel$),
      tap(pixels => {
        setState((state: DataFilesStateModel) => {
          let hdu = state.hduEntities[hduId] as ImageHdu;
          let tile = hdu.tiles[tileIndex];

          tile.pixelsLoading = false;
          tile.pixelsLoaded = true;
          tile.pixels = pixels;
          return state;
        });
      }),
      flatMap(pixels => {
        return dispatch(new LoadImageTilePixelsSuccess(hduId, tileIndex, pixels));
      }),
      catchError(err => {
        setState((state: DataFilesStateModel) => {
          let hdu = state.hduEntities[hduId] as ImageHdu;
          let tile = hdu.tiles[tileIndex];
          tile.pixelsLoading = false;
          tile.pixelLoadingFailed = true;
          return state;
        });
        throw err;
      })
    );
  }




}

