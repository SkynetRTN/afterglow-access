import { State, Action, Selector, StateContext, Store, Actions, ofActionSuccessful } from '@ngxs/store';
import { ImmutableContext } from '@ngxs-labs/immer-adapter';
import { PhotData } from './models/source-phot-data';
import { RemoveAllPhotDatas, RemovePhotDatas, UpdatePhotData, AddPhotDatas } from './phot-data.actions';
import { CorrelationIdGenerator } from '../utils/correlated-action';
import { DataFilesStateModel, DataFilesState } from '../data-files/data-files.state';
import { ResetState } from '../auth/auth.actions';

export interface PhotDataStateModel {
  version: number;
  ids: string[];
  entities: { [id: string]: PhotData };
}

const photDataDefaultState: PhotDataStateModel = {
  version: 1,
  ids: [],
  entities: {},
}

@State<PhotDataStateModel>({
  name: 'sourcesPhotData',
  defaults: photDataDefaultState
})

export class PhotDataState {

  constructor(private store: Store, private correlationIdGenerator: CorrelationIdGenerator, private actions$: Actions) { }

  @Selector()
  public static getState(state: PhotDataStateModel) {
    return state;
  }

  @Selector()
  public static getEntities(state: PhotDataStateModel) {
    return state.entities;
  }

  @Selector()
  public static getSourcesPhotData(state: PhotDataStateModel) {
    return Object.values(state.entities);
  }

  @Action(ResetState)
  @ImmutableContext()
  public resetState({ getState, setState, dispatch }: StateContext<PhotDataStateModel>, { }: ResetState) {
    setState((state: PhotDataStateModel) => {
      return photDataDefaultState
    });
  }

  @Action(UpdatePhotData)
  @ImmutableContext()
  public updatePhotData({ getState, setState, dispatch }: StateContext<PhotDataStateModel>, { photDataId, changes }: UpdatePhotData) {
    setState((state: PhotDataStateModel) => {
      state.entities[photDataId] = {
        ...state.entities[photDataId],
        ...changes
      }
      return state;
    });
  }

  @Action(AddPhotDatas)
  @ImmutableContext()
  public addPhotDatas({ getState, setState, dispatch }: StateContext<PhotDataStateModel>, { photDatas }: AddPhotDatas) {
    setState((state: PhotDataStateModel) => {
      photDatas.forEach(d => {
        let id = `${d.sourceId}-${d.fileId}`;
        if(!state.ids.includes(id)) state.ids.push(id);
        state.entities[id] = {
          ...d,
          id: id
        }
      });
      
      return state;
    });
  }

  @Action(RemovePhotDatas)
  @ImmutableContext()
  public removePhotDatas({ getState, setState, dispatch }: StateContext<PhotDataStateModel>, {ids}: RemovePhotDatas) {
    setState((state: PhotDataStateModel) => {
      state.ids = state.ids.filter(id => !ids.includes(id));
      ids.forEach(id => delete state.entities[id]);
      return state;
    });
  }

  @Action(RemoveAllPhotDatas)
  @ImmutableContext()
  public removeAllPhotDatas({ getState, setState, dispatch }: StateContext<PhotDataStateModel>, { }: RemoveAllPhotDatas) {
    setState((state: PhotDataStateModel) => {
      state.ids = [];
      state.entities = {};
      return state;
    });
  }




}
