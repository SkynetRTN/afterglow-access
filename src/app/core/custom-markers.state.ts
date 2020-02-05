import { State, Action, Selector, StateContext } from '@ngxs/store';
import { UpdateCustomMarker, AddCustomMarkers, RemoveCustomMarkers, SelectCustomMarkers, DeselectCustomMarkers, SetCustomMarkerSelection } from './custom-markers.actions';
import { CustomMarker } from './models/custom-marker';
import { ImmutableContext } from '@ngxs-labs/immer-adapter';
import { ResetState } from '../auth/auth.actions';

export interface CustomMarkersStateModel {
  version: number;
  nextIdSeed: number;
  ids: string[];
  entities: { [id: string]: CustomMarker };
  selectedMarkerIds: string[];
}

const customMarkersDefaultState: CustomMarkersStateModel = {
  version: 1,
  nextIdSeed: 0,
  ids: [],
  entities: {},
  selectedMarkerIds: []
}

@State<CustomMarkersStateModel>({
  name: 'customMarkers',
  defaults: customMarkersDefaultState
})



export class CustomMarkersState {
  protected prefix = 'MARKER';

  @Selector()
  public static getState(state: CustomMarkersStateModel) {
    return state;
  }

  @Selector()
  public static getEntities(state: CustomMarkersStateModel) {
    return state.entities;
  }

  @Selector()
  public static getCustomMarkers(state: CustomMarkersStateModel) {
    return Object.values(state.entities);
  }

  @Selector()
  public static getSelectedCustomMarkers(state: CustomMarkersStateModel) {
    return Object.values(state.selectedMarkerIds.map(id => state.entities[id]));
  }

  @Action(ResetState)
  @ImmutableContext()
  public resetState({ getState, setState, dispatch }: StateContext<CustomMarkersStateModel>, { }: ResetState) {
    setState((state: CustomMarkersStateModel) => {
      return customMarkersDefaultState
    });
  }

  @Action(UpdateCustomMarker)
  @ImmutableContext()
  public updateCustomMarker({ getState, setState, dispatch }: StateContext<CustomMarkersStateModel>, { markerId, changes }: UpdateCustomMarker) {
    let state = getState();
   
    setState((state: CustomMarkersStateModel) => {
      if(state.ids.includes(markerId)) {
        state.entities[markerId] = {
          ...state.entities[markerId],
          ...changes
        }
      }
      return state;
    });
  }

  @Action(AddCustomMarkers)
  @ImmutableContext()
  public addCustomMarkers({ getState, setState, dispatch }: StateContext<CustomMarkersStateModel>, { markers }: AddCustomMarkers) {
    let state = getState();
    
    setState((state: CustomMarkersStateModel) => {
      markers.forEach(marker => {
        let nextSeed = state.nextIdSeed++;
        if(marker.marker.label == null || marker.marker.label == undefined) {
          // marker.marker.label = `M${nextSeed}`;
          marker.marker.label = '';
        }
        let id = this.prefix + nextSeed;
        state.ids.push(id);
        state.entities[id] = {
          ...marker,
          id: id
        }
      });
      
      return state;
    });
  }

  @Action(RemoveCustomMarkers)
  @ImmutableContext()
  public removeCustomMarkers({ getState, setState, dispatch }: StateContext<CustomMarkersStateModel>, { markers }: RemoveCustomMarkers) {
    let state = getState();
    
    setState((state: CustomMarkersStateModel) => {
      let idsToRemove = markers.map(m => m.id);
      state.ids = state.ids.filter(id => !idsToRemove.includes(id));
      state.selectedMarkerIds = state.selectedMarkerIds.filter(id => !idsToRemove.includes(id));
      markers.forEach(marker => {
        if(marker.id in state.entities) delete state.entities[marker.id];
      })
      
      return state;
    });
  }

  @Action(SelectCustomMarkers)
  @ImmutableContext()
  public selectCustomMarkers({ getState, setState, dispatch }: StateContext<CustomMarkersStateModel>, { markers }: SelectCustomMarkers) {
    let state = getState();
    
    setState((state: CustomMarkersStateModel) => {
      state.selectedMarkerIds = [...state.selectedMarkerIds, ...markers.map(m => m.id)];
      return state;
    });
  }

  @Action(DeselectCustomMarkers)
  @ImmutableContext()
  public deselectCustomMarkers({ getState, setState, dispatch }: StateContext<CustomMarkersStateModel>, { markers }: DeselectCustomMarkers) {
    let state = getState();
    
    setState((state: CustomMarkersStateModel) => {
      let deselectedMarkerIds = markers.map(marker => marker.id);
      state.selectedMarkerIds = state.selectedMarkerIds
        .filter(markerId => {
          return !deselectedMarkerIds.includes(markerId);
        });
      
      return state;
    });
  }

  @Action(SetCustomMarkerSelection)
  @ImmutableContext()
  public setCustomMarkerSelection({ getState, setState, dispatch }: StateContext<CustomMarkersStateModel>, { markers }: SetCustomMarkerSelection) {
    let state = getState();
    
    setState((state: CustomMarkersStateModel) => {
      state.selectedMarkerIds = markers.map(marker => marker.id);
      return state;
    });
  }

  
}
