import { State, Action, Selector, StateContext, Actions, ofActionDispatched, ofActionSuccessful, ofActionCompleted, Store } from '@ngxs/store';
import { DataFile, getYTileDim, getXTileDim, getWidth, getHeight, ImageHdu, PixelType, IHdu } from './models/data-file';
import { ImmutableSelector, ImmutableContext } from '@ngxs-labs/immer-adapter';
import { of, merge, interval, Observable, combineLatest } from "rxjs";
import {
  tap,
  skip,
  takeUntil,
  flatMap,
  map,
  filter,
  catchError,
  take
} from "rxjs/operators";

import {
  LoadLibrary,
  LoadLibrarySuccess,
  LoadLibraryFail,
  LoadHduHeader,
  LoadHduHeaderSuccess,
  LoadImageHduHistogram,
  LoadImageHduHistogramSuccess,
  LoadImageTilePixels,
  LoadImageTilePixelsSuccess,
  CloseHdu,
  CloseHduSuccess,
  CloseHduFail,
  LoadHdu,
} from './hdus.actions';
import { AfterglowDataFileService } from '../workbench/services/afterglow-data-files';
import { mergeDelayError } from '../utils/rxjs-extensions';
import { ImageTile } from './models/image-tile';
import { Wcs } from '../image-tools/wcs';
import { ResetState } from '../auth/auth.actions';
import { WasmService } from '../wasm.service';
import { HduType } from './models/data-file-type';
import { appConfig } from '../../environments/environment';
import { DataFilesState } from './data-files.state';
import { DeleteDataFile, CreateDataFile, UpdateDataFile } from './data-files.actions';

export interface HdusStateModel {
  version: string;
  ids: string[];
  entities: { [id: string]: IHdu };
  loading: boolean;
}

const hdusDefaultState: HdusStateModel = {
  version: '8658c099-570f-4be1-a6c4-c922d98639d9',
  ids: [],
  entities: {},
  loading: false
}

@State<HdusStateModel>({
  name: 'hdus',
  defaults: hdusDefaultState
})
export class HdusState {

  constructor(private dataFileService: AfterglowDataFileService, private actions$: Actions, private wasmService: WasmService, private store: Store) {
  }

  @Selector()
  public static getState(state: HdusStateModel) {
    return state;
  }

  @Selector()
  public static getEntities(state: HdusStateModel) {
    return state.entities;
  }

  @Selector()
  static getHdus(state: HdusStateModel) {
    return Object.values(state.entities);
  }

  @Selector()
  static getHdusByFileId(state: HdusStateModel) {
    return (fileId: string) => {
      return Object.values(state.entities).filter(hdu => hdu.fileId == fileId);
    };
  }

  @Selector()
  public static getHduById(state: HdusStateModel) {
    return (id: string) => {
      return (id in state.entities) ? state.entities[id] : null;
    };
  }

  @Selector()
  public static getHeader(state: HdusStateModel) {
    return (id: string) => {
      return (id in state.entities) ? state.entities[id].header : null;
    };
  }

  @Selector()
  public static getHeaderLoaded(state: HdusStateModel) {
    return (id: string) => {
      return (id in state.entities) ? state.entities[id].headerLoaded : null;
    };
  }

  @Selector()
  public static getHistLoaded(state: HdusStateModel) {
    return (id: string) => {
      if (!(id in state.entities)) return false;
      let hdu = state.entities[id];
      return (hdu.hduType == HduType.IMAGE) ? (hdu as ImageHdu).histLoaded : false;
    };
  }

  @Selector()
  public static getHist(state: HdusStateModel) {
    return (id: string) => {
      if (!(id in state.entities)) return null;
      let hdu = state.entities[id];
      return (hdu.hduType == HduType.IMAGE) ? (hdu as ImageHdu).hist : null;
    };
  }

  @Selector()
  static getLoading(state: HdusStateModel) {
    return state.loading;
  }


  @Action(ResetState)
  @ImmutableContext()
  public resetState({ getState, setState, dispatch }: StateContext<HdusStateModel>, { }: ResetState) {
    setState((state: HdusStateModel) => {
      return hdusDefaultState
    });
  }

  @Action(LoadLibrary)
  @ImmutableContext()
  public loadLibrary({ setState, dispatch }: StateContext<HdusStateModel>, { correlationId }: LoadLibrary) {
    setState((state: HdusStateModel) => {
      state.loading = true
      return state;
    });

    return this.dataFileService.getFiles().pipe(
      flatMap(coreFiles => {
        let actions = [];
        let filesState = this.store.selectSnapshot(DataFilesState);
        let hdus = coreFiles.map(coreFile => {
          let hdu : IHdu = {
            id: coreFile.id.toString(),
            fileId: coreFile.group_id,
            hduType: coreFile.type,
            order: coreFile.order,
            modified: coreFile.modified,
            header: null,
            headerLoaded: false,
            headerLoading: false,
            wcs: null
          }

          if(hdu.hduType == HduType.IMAGE) {
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

          let dataFile: DataFile = {
            id: hdu.fileId,
            assetPath: coreFile.asset_path,
            dataProviderId: coreFile.data_provider,
            name: coreFile.name
          }

          if (hdu.fileId in filesState.entities) {
            actions.push(new UpdateDataFile(dataFile.id, dataFile))
          }
          else {
            actions.push(new CreateDataFile(dataFile))
          }

          return hdu;

        })

        // remove data files which are no longer found in the HDUs
        let fileIds = hdus.map(hdu => hdu.fileId);
        let deletedFileIds = filesState.ids.filter(id => !fileIds.includes(id));
        deletedFileIds.forEach(id => {
          actions.push(new DeleteDataFile(id));
        });

        
        setState((state: HdusStateModel) => {

          let hduIds = hdus.map(hdu => hdu.id);
          let deletedHduIds = state.ids.filter(id => !hduIds.includes(id));
          state.ids = state.ids.filter(id => !deletedHduIds.includes(id));
          deletedHduIds.forEach(id => delete state.entities[id]);

          hdus.forEach(hdu => {
            if (hdu.id in state.entities) {
              //TODO: update the HDU
            }
            else {
              state.ids.push(hdu.id);
              state.entities[hdu.id] = hdu;
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

  @Action(CloseHdu)
  @ImmutableContext()
  public closeHdu({ setState, dispatch }: StateContext<HdusStateModel>, { hduId }: CloseHdu) {
    return this.dataFileService
      .removeFile(hduId)
      .pipe(
        tap(result => {
          setState((state: HdusStateModel) => {
            if (state.ids.includes(hduId)) {
              state.ids = state.ids.filter(id => id != hduId);
              delete state.entities[hduId];
            }
            return state;
          });
        }),
        flatMap(result => {
          return dispatch(new CloseHduSuccess(hduId));
        }),
        catchError(err => dispatch(new CloseHduFail(hduId, err)))
      );
  }

  @Action(LoadHdu) 
  @ImmutableContext()
  public loadHdu({ setState, getState, dispatch }: StateContext<HdusStateModel>, { hduId }: LoadHdu) {
    let actions = [];
    let state = getState();
    if( !(hduId in state.entities) ) return;
    let hdu = state.entities[hduId];

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
  public loadHduHeader({ setState, getState, dispatch }: StateContext<HdusStateModel>, { hduId }: LoadHduHeader) {
    const cancel$ = merge(
      this.actions$.pipe(
        ofActionSuccessful(CloseHdu),
        filter<CloseHdu>(
          cancelAction =>
            cancelAction.hduId == hduId
        )
      ),
    );

    setState((state: HdusStateModel) => {
      let hdu = state.entities[hduId];
      hdu.headerLoading = true;
      hdu.headerLoaded = false;
      return state;
    });

    return this.dataFileService.getHeader(hduId).pipe(
      takeUntil(cancel$),
      tap(header => {
        setState((state: HdusStateModel) => {
          let hdu = state.entities[hduId];
          hdu.header = header;
          hdu.headerLoading = false;
          hdu.headerLoaded = true;

          let wcsHeader: { [key: string]: any } = {};
          header.forEach(entry => {
            wcsHeader[entry.key] = entry.value;
          });
          hdu.wcs = new Wcs(wcsHeader);

          if (hdu.hduType == HduType.IMAGE) {
             /* Initialize Image Tiles*/
            let imageHdu = hdu as ImageHdu;
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
  public loadImageHduHistogram({ setState, getState, dispatch }: StateContext<HdusStateModel>, { hduId }: LoadImageHduHistogram) {
    if(getState().entities[hduId].hduType != HduType.IMAGE) return;

    const cancel$ = merge(
      this.actions$.pipe(
        ofActionSuccessful(CloseHdu),
        filter<CloseHdu>(
          cancelAction =>
            cancelAction.hduId == hduId
        )
      ),
    );

    setState((state: HdusStateModel) => {
      let hdu = state.entities[hduId] as ImageHdu;
      hdu.histLoading = true;
      hdu.histLoaded = false;
      return state;
    });

    return this.dataFileService.getHist(hduId).pipe(
      takeUntil(cancel$),
      tap(hist => {
        setState((state: HdusStateModel) => {
          let hdu = state.entities[hduId] as ImageHdu;
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
        setState((state: HdusStateModel) => {
          let hdu = state.entities[hduId] as ImageHdu;
          hdu.histLoading = false;
          return state;
        });
        throw err;
      })
    );
  }

  @Action(LoadImageTilePixels)
  @ImmutableContext()
  public loadImageTilePixels({ setState, dispatch, getState }: StateContext<HdusStateModel>, { hduId, tileIndex }: LoadImageTilePixels) {
    if(getState().entities[hduId].hduType != HduType.IMAGE) return;

    const cancel$ = merge(
      this.actions$.pipe(
        ofActionSuccessful(CloseHdu),
        filter<CloseHdu>(
          cancelAction =>
            cancelAction.hduId == hduId
        )
      ),
    );

    setState((state: HdusStateModel) => {
      let hdu = state.entities[hduId] as ImageHdu;
      let tile = hdu.tiles[tileIndex];

      tile.pixelsLoading = true;
      tile.pixelsLoaded = false;
      return state;
    });

    let hdu = getState().entities[hduId] as ImageHdu;
    let tile = hdu.tiles[tileIndex];
    
    return this.dataFileService.getPixels(hduId, hdu.precision, tile).pipe(
      takeUntil(cancel$),
      tap(pixels => {
        setState((state: HdusStateModel) => {
          let hdu = state.entities[hduId] as ImageHdu;
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
        setState((state: HdusStateModel) => {
          let hdu = state.entities[hduId] as ImageHdu;
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

