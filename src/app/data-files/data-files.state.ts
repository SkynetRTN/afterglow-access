import { State, Action, Selector, StateContext, Actions, ofActionDispatched, ofActionSuccessful, ofActionCompleted } from '@ngxs/store';
import { DataFile, getYTileDim, getXTileDim, getWidth, getHeight, ImageHdu, PixelType } from './models/data-file';
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
  LoadLibrary, LoadLibrarySuccess,
  LoadLibraryFail,
  RemoveAllDataFiles,
  RemoveDataFile,
  RemoveAllDataFilesFail,
  RemoveDataFileFail,
  RemoveDataFileSuccess,
  LoadDataFileHdr,
  LoadDataFileHdrSuccess,
  LoadImageHist,
  LoadImageHistSuccess,
  LoadImageTilePixels,
  LoadImageTilePixelsSuccess,
  LoadDataFile
} from './data-files.actions';
import { AfterglowDataFileService } from '../workbench/services/afterglow-data-files';
import { mergeDelayError } from '../utils/rxjs-extensions';
import { ImageTile } from './models/image-tile';
import { Wcs } from '../image-tools/wcs';
import { ResetState } from '../auth/auth.actions';
import { WasmService } from '../wasm.service';
import { HduType } from './models/data-file-type';

export interface DataFilesStateModel {
  version: number;
  ids: string[];
  entities: { [id: string]: DataFile };
  loading: boolean,
  removingAll: boolean
}

const dataFilesDefaultState: DataFilesStateModel = {
  version: 1,
  ids: [],
  entities: {},
  loading: false,
  removingAll: false
}

@State<DataFilesStateModel>({
  name: 'dataFiles',
  defaults: dataFilesDefaultState
})
export class DataFilesState {

  constructor(private dataFileService: AfterglowDataFileService, private actions$: Actions, private wasmService: WasmService) {
  }

  @Selector()
  public static getState(state: DataFilesStateModel) {
    return state;
  }

  @Selector()
  public static getEntities(state: DataFilesStateModel) {
    return state.entities;
  }

  @Selector()
  static getDataFiles(state: DataFilesStateModel) {
    return Object.values(state.entities);
  }

  @Selector()
  public static getDataFileById(state: DataFilesStateModel) {
    return (fileId: string, hduIndex: number) => {
      return (fileId in state.entities) ? state.entities[fileId].hdus[hduIndex] : null;
    };
  }

  @Selector()
  public static getHeader(state: DataFilesStateModel) {
    return (fileId: string, hduIndex: number) => {
      return (fileId in state.entities) ? state.entities[fileId].hdus[hduIndex].header : null;
    };
  }

  @Selector()
  public static getHeaderLoaded(state: DataFilesStateModel) {
    return (fileId: string, hduIndex: number) => {
      return (fileId in state.entities) ? state.entities[fileId].hdus[hduIndex].headerLoaded : null;
    };
  }

  @Selector()
  public static getHistLoaded(state: DataFilesStateModel) {
    return (fileId: string, hduIndex: number) => {
      if (!(fileId in state.entities)) return false;
      let layer = state.entities[fileId].hdus[hduIndex];
      return (layer.hduType == HduType.IMAGE) ? (layer as ImageHdu).histLoaded : false;
    };
  }

  @Selector()
  public static getHist(state: DataFilesStateModel) {
    return (fileId: string, hduIndex: number) => {
      if (!(fileId in state.entities)) return null;
      let layer = state.entities[fileId].hdus[hduIndex];
      return (layer.hduType == HduType.IMAGE) ? (layer as ImageHdu).hist : null;
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

  @Action(LoadLibrary)
  @ImmutableContext()
  public loadLibrary({ setState, dispatch }: StateContext<DataFilesStateModel>, { correlationId }: LoadLibrary) {
    setState((state: DataFilesStateModel) => {
      state.loading = true
      return state;
    });

    return this.dataFileService.getFiles().pipe(
      tap(files => {
        setState((state: DataFilesStateModel) => {
          let fileIds = files.map(file => file.id);

          let deletedFileIds = state.ids.filter(id => !fileIds.includes(id));

          state.ids = state.ids.filter(id => !deletedFileIds.includes(id));
          deletedFileIds.forEach(id => delete state.entities[id]);


          files.forEach(file => {
            if (file.id in state.entities) {
              //TODO: update the data file
            }
            else {
              state.ids.push(file.id);
              state.entities[file.id] = file;
            }
          })

          state.loading = false;
          return state;
        });

        dispatch(new LoadLibrarySuccess(files, correlationId));


      }),
      catchError(err => {
        return dispatch(new LoadLibraryFail(err, correlationId));
      })
    );
  }

  @Action(RemoveAllDataFiles)
  @ImmutableContext()
  public removeAllDataFiles({ setState, getState, dispatch }: StateContext<DataFilesStateModel>) {
    setState((state: DataFilesStateModel) => {
      state.removingAll = true;
      return state;
    });

    return mergeDelayError(...getState().ids.map(id => {
      return dispatch(new RemoveDataFile(id));
    })).pipe(
      catchError(errors => {
        setState((state: DataFilesStateModel) => {
          state.removingAll = false;
          return state;
        });

        return dispatch(new RemoveAllDataFilesFail(errors))
      })
    )
  }

  @Action(RemoveDataFile)
  @ImmutableContext()
  public removeDataFile({ setState, dispatch }: StateContext<DataFilesStateModel>, { fileId }: RemoveDataFile) {
    return this.dataFileService
      .removeFile(fileId)
      .pipe(
        tap(result => {
          setState((state: DataFilesStateModel) => {
            if (state.ids.includes(fileId)) {
              state.ids = state.ids.filter(id => id != fileId);
              delete state.entities[fileId];
            }
            if (state.removingAll && state.ids.length == 0) state.removingAll = false;
            return state;
          });
        }),
        flatMap(result => {
          return merge(
            dispatch(new RemoveDataFileSuccess(fileId)),
            dispatch(new LoadLibrary())
          );
        }),
        catchError(err => dispatch(new RemoveDataFileFail(fileId, err)))
      );
  }

  @Action(LoadDataFile)
  @ImmutableContext()
  public loadDataFile({ setState, getState, dispatch }: StateContext<DataFilesStateModel>, { fileId }: LoadDataFile) {
    let state = getState();
    let dataFile = state.entities[fileId] as DataFile;

    // let hdrNext$ = this.actions$.pipe(
    //   ofActionCompleted(LoadDataFileHdr),
    //   filter(r => r.action.fileId == fileId),
    //   take(1),
    //   filter(r => r.result.successful)
    // )

    // let histNext$ = this.actions$.pipe(
    //   ofActionCompleted(LoadImageHist),
    //   filter(r => r.action.fileId == fileId),
    //   take(1),
    //   filter(r => r.result.successful)
    // )
    let actions = [];
    dataFile.hdus.forEach((layer, index) => {
      if (!layer.headerLoaded && !layer.headerLoading) {
        actions.push(
          new LoadDataFileHdr(dataFile.id, index)
        );
      }
      if (layer.hduType == HduType.IMAGE) {
        let imageLayer = layer as ImageHdu;
        if (!imageLayer.histLoaded && !imageLayer.histLoading) {
          actions.push(
            new LoadImageHist(dataFile.id, index)
          );
        }
      }

    })

    return merge(
      dispatch(actions),
    )

  }


  @Action(LoadDataFileHdr)
  @ImmutableContext()
  public loadDataFileHdr({ setState, getState, dispatch }: StateContext<DataFilesStateModel>, { fileId, hduIndex }: LoadDataFileHdr) {
    const cancel$ = merge(
      this.actions$.pipe(
        ofActionSuccessful(RemoveDataFile),
        filter<RemoveDataFile>(
          cancelAction =>
            cancelAction.fileId == fileId
        )
      ),
      // this.actions$.pipe(
      //   ofActionDispatched(LoadDataFileHdr),
      //   filter<LoadDataFileHdr>(
      //     cancelAction =>
      //       cancelAction.fileId != fileId
      //   )
      // )
    );

    setState((state: DataFilesStateModel) => {
      let dataFile = state.entities[fileId];
      dataFile.hdus[hduIndex].headerLoading = true;
      dataFile.hdus[hduIndex].headerLoaded = false;
      return state;
    });

    return this.dataFileService.getHeader(fileId, hduIndex).pipe(
      takeUntil(cancel$),
      tap(header => {
        setState((state: DataFilesStateModel) => {
          let dataFile = state.entities[fileId];
          let hdu = dataFile.hdus[hduIndex];
          hdu.header = header;
          hdu.headerLoading = false;
          hdu.headerLoaded = true;

          let wcsHeader: { [key: string]: any } = {};
          header.forEach(entry => {
            wcsHeader[entry.key] = entry.value;
          });
          hdu.wcs = new Wcs(wcsHeader);

          /* Initialize Image Tiles*/
          if (hdu.hduType == HduType.IMAGE) {
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
        dispatch(new LoadDataFileHdrSuccess(fileId, hduIndex, header));

      })
    );
  }


  @Action(LoadImageHist)
  @ImmutableContext()
  public loadImageHist({ setState, dispatch }: StateContext<DataFilesStateModel>, { fileId, hduIndex }: LoadImageHist) {
    const cancel$ = merge(
      this.actions$.pipe(
        ofActionSuccessful(RemoveDataFile),
        filter<RemoveDataFile>(
          cancelAction =>
            cancelAction.fileId == fileId
        )
      ),
      // this.actions$.pipe(
      //   ofActionDispatched(LoadImageHist),
      //   filter<LoadImageHist>(
      //     cancelAction =>
      //       cancelAction.fileId != fileId
      //   )
      // )
    );

    setState((state: DataFilesStateModel) => {
      let dataFile = state.entities[fileId];
      let layer = dataFile.hdus[hduIndex] as ImageHdu;
      layer.histLoading = true;
      layer.histLoaded = false;
      return state;
    });

    return this.dataFileService.getHist(fileId).pipe(
      takeUntil(cancel$),
      tap(hist => {
        setState((state: DataFilesStateModel) => {
          let dataFile = state.entities[fileId];
          let layer = dataFile.hdus[hduIndex] as ImageHdu;
          layer.hist = hist;
          layer.histLoading = false;
          layer.histLoaded = true;
          return state;
        });
      }),
      flatMap(hist => {
        return dispatch(new LoadImageHistSuccess(fileId, hduIndex, hist));
      }),
      catchError(err => {
        setState((state: DataFilesStateModel) => {
          let dataFile = state.entities[fileId];
          let layer = dataFile.hdus[hduIndex] as ImageHdu;
          layer.histLoading = false;
          return state;
        });
        throw err;
      })
    );
  }

  @Action(LoadImageTilePixels)
  @ImmutableContext()
  public loadImageTilePixels({ setState, dispatch, getState }: StateContext<DataFilesStateModel>, { fileId, hduIndex, tileIndex }: LoadImageTilePixels) {
    const cancel$ = merge(
      this.actions$.pipe(
        ofActionSuccessful(RemoveDataFile),
        filter<RemoveDataFile>(
          cancelAction =>
            cancelAction.fileId == fileId
        )
      )
    );

    setState((state: DataFilesStateModel) => {
      let dataFile = state.entities[fileId];
      let layer = dataFile.hdus[hduIndex] as ImageHdu;
      let tile = layer.tiles[tileIndex];

      tile.pixelsLoading = true;
      tile.pixelsLoaded = false;
      return state;
    });

    let state = getState();
    let dataFile = state.entities[fileId];
    let layer = dataFile.hdus[hduIndex] as ImageHdu;
    let tile = layer.tiles[tileIndex];
    
    return this.dataFileService.getPixels(fileId, hduIndex, layer.precision, tile).pipe(
      takeUntil(cancel$),
      tap(pixels => {
        setState((state: DataFilesStateModel) => {
          let dataFile = state.entities[fileId];
          let layer = dataFile.hdus[hduIndex] as ImageHdu;
          let tile = layer.tiles[tileIndex];

          tile.pixelsLoading = false;
          tile.pixelsLoaded = true;
          tile.pixels = pixels;
          return state;
        });
      }),
      flatMap(pixels => {
        return dispatch(new LoadImageTilePixelsSuccess(fileId, hduIndex, tileIndex, pixels));
      }),
      catchError(err => {
        setState((state: DataFilesStateModel) => {
          let dataFile = state.entities[fileId];
          let layer = dataFile.hdus[hduIndex] as ImageHdu;
          let tile = layer.tiles[tileIndex];
          tile.pixelsLoading = false;
          tile.pixelLoadingFailed = true;
          return state;
        });
        throw err;
      })
    );
  }

}

