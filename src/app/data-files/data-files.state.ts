import { State, Action, Selector, StateContext, Actions, ofActionDispatched, ofActionSuccessful } from '@ngxs/store';
import { DataFile, Header, ImageFile, getYTileDim, getXTileDim, getWidth, getHeight } from './models/data-file';
import { ImmutableSelector, ImmutableContext } from '@ngxs-labs/immer-adapter';
import { of, merge, interval, Observable } from "rxjs";
import {
  tap,
  skip,
  takeUntil,
  flatMap,
  map,
  filter,
  catchError
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
  LoadDataFileHdrFail,
  LoadImageHist,
  LoadImageHistSuccess,
  LoadImageHistFail,
  LoadImageTilePixels,
  LoadImageTilePixelsSuccess
} from './data-files.actions';
import { AfterglowDataFileService } from '../core/services/afterglow-data-files';
import { mergeDelayError } from '../utils/rxjs-extensions';
import { DataFileType } from './models/data-file-type';
import { ImageTile } from './models/image-tile';
import { Wcs } from '../image-tools/wcs';

export interface DataFilesStateModel {
  ids: string[];
  entities: { [id: string]: DataFile };
  loading: boolean,
  removingAll: boolean
}

@State<DataFilesStateModel>({
  name: 'dataFiles',
  defaults: {
    ids: [],
    entities: {},
    loading: false,
    removingAll: false
  }
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
  static getLoading(state: DataFilesStateModel) {
    return state.loading;
  }


  @Action(LoadLibrary)
  @ImmutableContext()
  public loadLibrary({ setState, dispatch }: StateContext<DataFilesStateModel>, { correlationId }: LoadLibrary) {
    setState((state: DataFilesStateModel) => {
      state.loading = true
      return state;
    });

    const nextReq$ = this.actions$.pipe(
      ofActionDispatched(LoadLibrary),
      skip(1)
    );

    return this.dataFileService.getFiles().pipe(
      takeUntil(nextReq$),
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
          dataFile.wcs = new Wcs(header);

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
        
      }),
      catchError(err => {
        setState((state: DataFilesStateModel) => {
          state.entities[fileId].headerLoading = false;
          return state;
        });
        return dispatch(new LoadDataFileHdrFail(fileId, err));
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
        return dispatch(new LoadImageHistFail(fileId, err));
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
        return dispatch(new LoadImageHistFail(fileId, err));
      })
    );
  }

}

