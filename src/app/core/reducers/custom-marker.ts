import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import * as markerActions from '../actions/custom-marker';
import { CustomMarker } from '../models/custom-marker';

export interface State extends EntityState<CustomMarker> {
  nextCustomMarkerId: number;
  selectedCustomMarkerIds: Array<string>,
}

export const adapter: EntityAdapter<CustomMarker> = createEntityAdapter<CustomMarker>({
  selectId: (marker: CustomMarker) => marker.id,
  sortComparer: false,
});

export const initialState: State = adapter.getInitialState({
  nextCustomMarkerId: 0,
  selectedCustomMarkerIds: []
});

export function reducer(state = initialState, action: markerActions.Actions): State {
  switch (action.type) {
    
    case markerActions.UPDATE_CUSTOM_MARKER: {
      return {
        ...adapter.updateOne({
          id: action.payload.markerId,
          changes: {
            ...action.payload.changes
          }
        }, state)
      }
    }

    case markerActions.ADD_CUSTOM_MARKERS: {
      let nextMarkerId = state.nextCustomMarkerId;
      action.payload.markers.forEach(customMarker => {
        customMarker.id = (nextMarkerId++).toString();
      })
      return {
        ...adapter.addMany(action.payload.markers, state),
        nextCustomMarkerId: nextMarkerId,
        selectedCustomMarkerIds: action.payload.markers.map(marker => marker.id)
      }
    }

    case markerActions.REMOVE_CUSTOM_MARKERS: {
      let markerIds = action.payload.markers.map(marker => marker.id);
      return {
        ...adapter.removeMany(markerIds, state),
        selectedCustomMarkerIds: state.selectedCustomMarkerIds.filter(markerId => !markerIds.includes(markerId))
      }
    }

    case markerActions.SELECT_CUSTOM_MARKERS: {
      let markerIds = action.payload.customMarkers
        .map(marker => marker.id)
        .filter(markerId => {
          return (state.ids as Array<string>).includes(markerId);
        });

      return {
        ...state,
        selectedCustomMarkerIds: [...state.selectedCustomMarkerIds, ...markerIds]
      }
    }

    case markerActions.DESELECT_CUSTOM_MARKERS: {
      let deselectedMarkerIds = action.payload.customMarkers.map(marker => marker.id);
      let selectedMarkerIds = state.selectedCustomMarkerIds
        .filter(markerId => {
          return !deselectedMarkerIds.includes(markerId);
        });

      return {
        ...state,
        selectedCustomMarkerIds: selectedMarkerIds
      }
    }

    case markerActions.SET_CUSTOM_MARKER_SELECTION: {
      return {
        ...state,
        selectedCustomMarkerIds: action.payload.customMarkers.map(marker => marker.id)
      }
    }

   
    default:
      return state;
  }
}

