import { State, Action, Selector, StateContext, Actions, Store } from '@ngxs/store';
import { DataFile, ImageHdu } from './models/data-file';
import { ImmutableContext } from '@ngxs-labs/immer-adapter';
import { merge} from "rxjs";
import { catchError } from "rxjs/operators";
import {
  LoadLibrarySuccess,
  LoadHduHeader,
  LoadImageHduHistogram,
  CloseHdu,
  LoadHdu,
} from './hdus.actions';
import { AfterglowDataFileService } from '../workbench/services/afterglow-data-files';
import { mergeDelayError } from '../utils/rxjs-extensions';
import { ResetState } from '../auth/auth.actions';
import { WasmService } from '../wasm.service';
import { CloseAllDataFiles, CloseAllDataFilesFail, CloseDataFile, LoadDataFile, CreateDataFile, UpdateDataFile, DeleteDataFile } from './data-files.actions';
import { HdusState } from './hdus.state';
import { HduType } from './models/data-file-type';

export interface DataFilesStateModel {
  version: string;
  ids: string[];
  entities: { [id: string]: DataFile };
  loading: boolean,
  removingAll: boolean
}

const dataFilesDefaultState: DataFilesStateModel = {
  version: '678725c2-f213-4ed3-9daa-ab0426742488',
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

  constructor(private dataFileService: AfterglowDataFileService, private actions$: Actions, private wasmService: WasmService, private store: Store) {
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
    return (id: string) => {
      return (id in state.entities) ? state.entities[id] : null;
    };
  }

  @Action(ResetState)
  @ImmutableContext()
  public resetState({ getState, setState, dispatch }: StateContext<DataFilesStateModel>, { }: ResetState) {
    setState((state: DataFilesStateModel) => {
      return dataFilesDefaultState
    });
  }

  @Action(CreateDataFile)
  @ImmutableContext()
  public createDataFile({ setState, dispatch }: StateContext<DataFilesStateModel>, { dataFile }: CreateDataFile) {
    setState((state: DataFilesStateModel) => {
      state.entities[dataFile.id] = dataFile;
      if(!state.ids.includes(dataFile.id)) state.ids.push(dataFile.id)
      return state;
    });
  }

  @Action(UpdateDataFile)
  @ImmutableContext()
  public updateDataFile({ setState, dispatch }: StateContext<DataFilesStateModel>, { fileId, changes }: UpdateDataFile) {
    setState((state: DataFilesStateModel) => {
      if(!state.ids.includes(fileId)) return;
      state.entities[fileId] = {
        ...state.entities[fileId],
        ...changes
      }
      return state;
    });
  }

  @Action(DeleteDataFile)
  @ImmutableContext()
  public deleteDataFile({ setState, dispatch }: StateContext<DataFilesStateModel>, { fileId }: DeleteDataFile) {
    setState((state: DataFilesStateModel) => {
      if(!state.ids.includes(fileId)) return;
      state.ids = state.ids.filter(id => id != fileId);
      delete state.entities[fileId];
      return state;
    });
  }

  @Action(CloseAllDataFiles)
  @ImmutableContext()
  public closeAllDataFiles({ setState, getState, dispatch }: StateContext<DataFilesStateModel>) {
    setState((state: DataFilesStateModel) => {
      state.removingAll = true;
      return state;
    });

    return mergeDelayError(...getState().ids.map(id => {
      let hdus = this.store.selectSnapshot(HdusState.getHdusByFileId)(id);
      return merge(...hdus.map(hdu => dispatch(new CloseHdu(hdu.id))));
    })).pipe(
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
  public closeDataFile({ setState, dispatch }: StateContext<DataFilesStateModel>, { fileId }: CloseDataFile) {
    let hdus = this.store.selectSnapshot(HdusState.getHdusByFileId)(fileId);
    return dispatch(hdus.map(hdu => new CloseHdu(hdu.id)));
  }

  @Action(LoadDataFile)
  @ImmutableContext()
  public loadDataFile({ setState, getState, dispatch }: StateContext<DataFilesStateModel>, { fileId }: LoadDataFile) {
    let state = getState();
    let dataFile = state.entities[fileId] as DataFile;
    let actions = [];

    let hdus = this.store.selectSnapshot(HdusState.getHdusByFileId)(fileId);
    hdus.forEach(hdu => {
      if ( (!hdu.headerLoaded && !hdu.headerLoading) || (hdu.hduType == HduType.IMAGE && (!(hdu as ImageHdu).histLoaded && !(hdu as ImageHdu).histLoading))) {
        actions.push(
          new LoadHdu(hdu.id)
        );
      }

    })
    return dispatch(actions)
  }


  

}

