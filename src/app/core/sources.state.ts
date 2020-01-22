import { State, Action, Selector, StateContext } from '@ngxs/store';
import { UpdateSource, AddSources, RemoveSources } from './sources.actions';
import { ImmutableContext } from '@ngxs-labs/immer-adapter';
import { Source } from './models/source';

export interface SourcesStateModel {
  ids: string[];
  entities: { [id: string]: Source };
}

@State<SourcesStateModel>({
  name: 'sources',
  defaults: {
    ids: [],
    entities: {},
  }
})

export class SourcesState {
  protected seed = 0;
  protected prefix = 'SRC';
  /** Return the next correlation id */
  protected nextId() {
    this.seed += 1;
    return this.prefix + this.seed;
  }

  @Selector()
  public static getState(state: SourcesStateModel) {
    return state;
  }

  @Selector()
  public static getEntities(state: SourcesStateModel) {
    return state.entities;
  }

  @Selector()
  public static getIds(state: SourcesStateModel) {
    return state.ids;
  }

  @Selector()
  public static getSources(state: SourcesStateModel) {
    return Object.values(state.entities);
  }

  @Action(UpdateSource)
  @ImmutableContext()
  public updateSource({ getState, setState, dispatch }: StateContext<SourcesStateModel>, { sourceId, changes }: UpdateSource) {
    setState((state: SourcesStateModel) => {
      state.entities[sourceId] = {
        ...state.entities[sourceId],
        ...changes
      }
      return state;
    });
  }

  @Action(AddSources)
  @ImmutableContext()
  public addSources({ getState, setState, dispatch }: StateContext<SourcesStateModel>, { sources }: AddSources) {
    setState((state: SourcesStateModel) => {
      sources.forEach(source => {
        let id = this.nextId();
        state.ids.push(id);
        state.entities[id] = {
          ...source,
          id: id
        }
        if(state.entities[id].label == null) {
          state.entities[id].label = 'M' + this.seed;
        }
      });
      
      return state;
    });
  }

  @Action(RemoveSources)
  @ImmutableContext()
  public removeSources({ getState, setState, dispatch }: StateContext<SourcesStateModel>, { sourceIds }: RemoveSources) {
    let state = getState();
    
    setState((state: SourcesStateModel) => {
      state.ids = state.ids.filter(id => !sourceIds.includes(id));
      sourceIds.forEach(id => {
        if(id in state.entities) delete state.entities[id];
      })
      
      return state;
    });
  }




}
