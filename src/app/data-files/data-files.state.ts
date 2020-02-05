import { State, Action, Selector, StateContext, Actions, ofActionDispatched, ofActionSuccessful, ofActionCompleted } from '@ngxs/store';
import { DataFile, Header, ImageFile, getYTileDim, getXTileDim, getWidth, getHeight } from './models/data-file';
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
import { AfterglowDataFileService } from '../core/services/afterglow-data-files';
import { mergeDelayError } from '../utils/rxjs-extensions';
import { DataFileType } from './models/data-file-type';
import { ImageTile } from './models/image-tile';
import { Wcs } from '../image-tools/wcs';
import { ResetState } from '../auth/auth.actions';

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

  constructor(private dataFileService: AfterglowDataFileService, private actions$: Actions) {
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
  static getImageFiles(state: DataFilesStateModel) {
    return Object.values(state.entities).filter(f => f.type == DataFileType.IMAGE) as ImageFile[];
  }

  @Selector()
  public static getDataFileById(state: DataFilesStateModel) {
    return (id: string) => {
      return state.entities[id];
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

    if (!dataFile.headerLoaded && !dataFile.headerLoading ) {
      actions.push(
        new LoadDataFileHdr(dataFile.id)
      );
    }
    if(dataFile.type == DataFileType.IMAGE) {
      let imageFile = dataFile as ImageFile;
      if (!imageFile.histLoaded && !imageFile.histLoading) {
        actions.push(
          new LoadImageHist(dataFile.id)
        );
      }
    }
    


    return merge(
      dispatch(actions),
    )

  }


  @Action(LoadDataFileHdr)
  @ImmutableContext()
  public loadDataFileHdr({ setState, getState, dispatch }: StateContext<DataFilesStateModel>, { fileId }: LoadDataFileHdr) {
    const cancel$ = merge(
      this.actions$.pipe(
        ofActionSuccessful(RemoveDataFile),
        filter<RemoveDataFile>(
          cancelAction =>
            cancelAction.fileId == fileId
        )
      ),
      this.actions$.pipe(
        ofActionDispatched(LoadDataFileHdr),
        filter<LoadDataFileHdr>(
          cancelAction =>
            cancelAction.fileId != fileId
        )
      )
    );

    setState((state: DataFilesStateModel) => {
      let dataFile = state.entities[fileId];
      dataFile.headerLoading = true;
      dataFile.headerLoaded = false;
      return state;
    });

    return this.dataFileService.getHeader(fileId).pipe(
      takeUntil(cancel$),
      tap(header => {
        setState((state: DataFilesStateModel) => {
          let dataFile = state.entities[fileId];
          dataFile.header = header;
          dataFile.headerLoading = false;
          dataFile.headerLoaded = true;

          let wcsHeader: { [key: string]: any } = {};
          header.forEach(entry => {
            wcsHeader[entry.key] = entry.value;
          });
          dataFile.wcs = new Wcs(wcsHeader);

          /* Initialize Image Tiles*/
          if (dataFile.type == DataFileType.IMAGE) {
            let imageFile = dataFile as ImageFile;
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
                let index = j * getXTileDim(imageFile) + i;
                let x = i * imageFile.tileWidth;
                let y = j * imageFile.tileHeight;
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

            imageFile.tiles = tiles;
            imageFile.tilesInitialized = true;
          }

          return state;
        });
        dispatch(new LoadDataFileHdrSuccess(fileId, header));

      })
    );
  }


  @Action(LoadImageHist)
  @ImmutableContext()
  public loadImageHist({ setState, dispatch }: StateContext<DataFilesStateModel>, { fileId }: LoadImageHist) {
    const cancel$ = merge(
      this.actions$.pipe(
        ofActionSuccessful(RemoveDataFile),
        filter<RemoveDataFile>(
          cancelAction =>
            cancelAction.fileId == fileId
        )
      ),
      this.actions$.pipe(
        ofActionDispatched(LoadImageHist),
        filter<LoadImageHist>(
          cancelAction =>
            cancelAction.fileId != fileId
        )
      )
    );

    setState((state: DataFilesStateModel) => {
      let dataFile = state.entities[fileId] as ImageFile;
      dataFile.histLoading = true;
      dataFile.histLoaded = false;
      return state;
    });

    return this.dataFileService.getHist(fileId).pipe(
      takeUntil(cancel$),
      tap(hist => {
        setState((state: DataFilesStateModel) => {
          let dataFile = state.entities[fileId] as ImageFile;
          dataFile.hist = hist;
          dataFile.histLoading = false;
          dataFile.histLoaded = true;
          return state;
        });
      }),
      flatMap(hist => {
        return dispatch(new LoadImageHistSuccess(fileId, hist));
      }),
      catchError(err => {
        setState((state: DataFilesStateModel) => {
          (state.entities[fileId] as ImageFile).histLoading = false;
          return state;
        });
        throw err;
      })
    );
  }

  @Action(LoadImageTilePixels)
  @ImmutableContext()
  public loadImageTilePixels({ setState, dispatch, getState }: StateContext<DataFilesStateModel>, { fileId, tileIndex }: LoadImageTilePixels) {
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
      let dataFile = state.entities[fileId] as ImageFile;
      let tile = dataFile.tiles[tileIndex];

      tile.pixelsLoading = true;
      tile.pixelsLoaded = false;
      return state;
    });

    return this.dataFileService.getPixels(fileId, (getState().entities[fileId] as ImageFile).tiles[tileIndex]).pipe(
      takeUntil(cancel$),
      tap(pixels => {
        setState((state: DataFilesStateModel) => {
          let dataFile = state.entities[fileId] as ImageFile;
          let tile = dataFile.tiles[tileIndex];

          tile.pixelsLoading = false;
          tile.pixelsLoaded = true;
          tile.pixels = pixels;
          return state;
        });
      }),
      flatMap(pixels => {
        return dispatch(new LoadImageTilePixelsSuccess(fileId, tileIndex, pixels));
      }),
      catchError(err => {
        setState((state: DataFilesStateModel) => {
          let dataFile = state.entities[fileId] as ImageFile;
          let tile = dataFile.tiles[tileIndex];
          tile.pixelsLoading = false;
          tile.pixelLoadingFailed = true;
          return state;
        });
        throw err;
      })
    );
  }

}

