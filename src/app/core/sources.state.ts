import { State, Action, Selector, StateContext } from '@ngxs/store';
import { UpdateSource, AddSources, SelectSources, RemoveSources, DeselectSources, SetSourceSelection } from './sources.actions';
import { ImmutableContext } from '@ngxs-labs/immer-adapter';
import { Source } from './models/source';

export interface SourcesStateModel {
  ids: string[];
  entities: { [id: string]: Source };
  selectedSourceIds: string[];
}

@State<SourcesStateModel>({
  name: 'sources',
  defaults: {
    ids: [],
    entities: {},
    selectedSourceIds: []
  }
})

export class SourcesState {
  protected seed = 0;
  protected prefix = 'SOURCE';
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
  public static getSources(state: SourcesStateModel) {
    return Object.values(state.entities);
  }

  @Selector()
  public static getSelectedSources(state: SourcesStateModel) {
    return Object.values(state.selectedSourceIds.map(id => state.entities[id]));
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
      });
      
      return state;
    });
  }

  @Action(RemoveSources)
  @ImmutableContext()
  public removeSources({ getState, setState, dispatch }: StateContext<SourcesStateModel>, { sources }: RemoveSources) {
    let state = getState();
    
    setState((state: SourcesStateModel) => {
      let idsToRemove = sources.map(m => m.id);
      state.ids = state.ids.filter(id => !idsToRemove.includes(id));
      sources.forEach(marker => {
        if(marker.id in state.entities) delete state.entities[marker.id];
      })
      
      return state;
    });
  }

  @Action(SelectSources)
  @ImmutableContext()
  public selectSources({ getState, setState, dispatch }: StateContext<SourcesStateModel>, { sources }: SelectSources) {
    let state = getState();
    
    setState((state: SourcesStateModel) => {
      state.selectedSourceIds = [...state.selectedSourceIds, ...sources.map(m => m.id)];
      return state;
    });
  }

  @Action(DeselectSources)
  @ImmutableContext()
  public deselectSources({ getState, setState, dispatch }: StateContext<SourcesStateModel>, { sources }: DeselectSources) {
    let state = getState();
    
    setState((state: SourcesStateModel) => {
      let deselectedSourceIds = sources.map(marker => marker.id);
      state.selectedSourceIds = state.selectedSourceIds
        .filter(markerId => {
          return !deselectedSourceIds.includes(markerId);
        });
      
      return state;
    });
  }

  @Action(SetSourceSelection)
  @ImmutableContext()
  public setSourceSelection({ getState, setState, dispatch }: StateContext<SourcesStateModel>, { sources }: SetSourceSelection) {
    let state = getState();
    
    setState((state: SourcesStateModel) => {
      state.selectedSourceIds = sources.map(marker => marker.id);
      return state;
    });
  }




}
