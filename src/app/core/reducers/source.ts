import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { Source } from '../models/source';
import * as sourceActions from '../actions/source';

export interface State extends EntityState<Source> {
  nextSourceId: number;
  selectedSourceIds: Array<string>,
}

export const adapter: EntityAdapter<Source> = createEntityAdapter<Source>({
  selectId: (source: Source) => source.id,
  sortComparer: false,
});

export const initialState: State = adapter.getInitialState({
  nextSourceId: 0,
  selectedSourceIds: []
});

export function reducer(state = initialState, action: sourceActions.Actions): State {
  switch (action.type) {
    
    case sourceActions.UPDATE_SOURCE: {
      return {
        ...adapter.updateOne({
          id: action.payload.sourceId,
          changes: {
            ...action.payload.changes
          }
        }, state)
      }
    }

    case sourceActions.ADD_SOURCES: {
      let nextSourceId = state.nextSourceId;
      action.payload.sources.forEach(source => {
        source.id = (nextSourceId++).toString();
      })
      return {
        ...adapter.addMany(action.payload.sources, state),
        nextSourceId: nextSourceId
      }
    }

    case sourceActions.REMOVE_SOURCES: {
      let sourceIds = action.payload.sources.map(source => source.id);
      return {
        ...adapter.removeMany(sourceIds, state),
        selectedSourceIds: state.selectedSourceIds.filter(sourceId => !sourceIds.includes(sourceId))
      }
    }

    case sourceActions.SELECT_SOURCES: {
      let sourceIds = action.payload.sources
        .map(source => source.id)
        .filter(sourceId => {
          return (state.ids as Array<string>).includes(sourceId);
        });

      return {
        ...state,
        selectedSourceIds: [...state.selectedSourceIds, ...sourceIds]
      }
    }

    case sourceActions.DESELECT_SOURCES: {
      let deselectedSourceIds = action.payload.sources.map(source => source.id);
      let selectedSourceIds = state.selectedSourceIds
        .filter(sourceId => {
          return !deselectedSourceIds.includes(sourceId);
        });

      return {
        ...state,
        selectedSourceIds: selectedSourceIds
      }
    }

    case sourceActions.SET_SOURCE_SELECTION: {
      return {
        ...state,
        selectedSourceIds: action.payload.sources.map(source => source.id)
      }
    }

   
    default:
      return state;
  }
}

