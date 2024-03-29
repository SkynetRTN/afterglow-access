import { State, Action, Selector, StateContext, createSelector } from '@ngxs/store';
import { UpdateSource, AddSources, RemoveSources } from './sources.actions';
import { ImmutableContext } from '@ngxs-labs/immer-adapter';
import { Source } from './models/source';
import { ResetState } from '../auth/auth.actions';
import { Injectable } from '@angular/core';

export interface SourcesStateModel {
  version: string;
  nextIdSeed: number;
  ids: string[];
  entities: { [id: string]: Source };
}

const sourcesDefaultState: SourcesStateModel = {
  version: '7edaa969-843e-445a-bbaf-83bf0c5ae260',
  nextIdSeed: 0,
  ids: [],
  entities: {},
};

@State<SourcesStateModel>({
  name: 'sources',
  defaults: sourcesDefaultState,
})
@Injectable()
export class SourcesState {
  protected prefix = 'SRC';

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

  public static getSourceById(id: string) {
    return createSelector([SourcesState.getEntities], (sourceEntities: { [id: string]: Source }) => {
      return sourceEntities[id] || null;
    });
  }


  @Action(ResetState)
  @ImmutableContext()
  public resetState({ getState, setState, dispatch }: StateContext<SourcesStateModel>, { }: ResetState) {
    setState((state: SourcesStateModel) => {
      return sourcesDefaultState;
    });
  }

  @Action(UpdateSource)
  @ImmutableContext()
  public updateSource(
    { getState, setState, dispatch }: StateContext<SourcesStateModel>,
    { sourceId, changes }: UpdateSource
  ) {
    setState((state: SourcesStateModel) => {
      state.entities[sourceId] = {
        ...state.entities[sourceId],
        ...changes,
      };
      return state;
    });
  }

  @Action(AddSources)
  @ImmutableContext()
  public addSources({ getState, setState, dispatch }: StateContext<SourcesStateModel>, { sources }: AddSources) {
    setState((state: SourcesStateModel) => {
      sources.forEach((source) => {
        let nextSeed = state.nextIdSeed++;
        let id = this.prefix + nextSeed;
        state.ids = [...state.ids, id]
        state.entities[id] = {
          ...source,
          id: id,
        };
        if (!state.entities[id].label) {
          state.entities[id].label = '' + nextSeed;
        }
      });

      return state;
    });
  }

  @Action(RemoveSources)
  @ImmutableContext()
  public removeSources(
    { getState, setState, dispatch }: StateContext<SourcesStateModel>,
    { sourceIds }: RemoveSources
  ) {
    let state = getState();

    //add sources from other files with same label
    let additionalSourceIds = []
    sourceIds.forEach(id => {
      let label = state.entities[id].label
      additionalSourceIds = additionalSourceIds.concat(Object.values(state.entities).filter(source => source.label == label && !sourceIds.includes(source.id)).map(source => source.id))
    })

    setState((state: SourcesStateModel) => {
      state.ids = state.ids.filter((id) => !sourceIds.includes(id));
      sourceIds.forEach((id) => {
        if (id in state.entities) delete state.entities[id];
      });

      return state;
    });

    if (additionalSourceIds.length != 0) {
      dispatch(new RemoveSources(additionalSourceIds))
    }
  }
}
