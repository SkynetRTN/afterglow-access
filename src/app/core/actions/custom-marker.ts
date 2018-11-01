import { Action } from '@ngrx/store';
import { CustomMarker } from '../models/custom-marker';

export const UPDATE_CUSTOM_MARKER = '[Markers] Update Custom Marker';
export const ADD_CUSTOM_MARKERS = '[Markers] Add Custom Marker';
export const REMOVE_CUSTOM_MARKERS = '[Markers] Remove Custom Marker';

export const SELECT_CUSTOM_MARKERS = '[Markers] Select Custom Markers';
export const DESELECT_CUSTOM_MARKERS = '[Markers] Deselect Custom Markers';
export const SET_CUSTOM_MARKER_SELECTION = '[Markers] Set Custom Marker Selection';


export class UpdateCustomMarker implements Action {
  readonly type = UPDATE_CUSTOM_MARKER

  constructor(public payload: { markerId: string, changes: Partial<CustomMarker> }) { }
}

export class AddCustomMarkers implements Action {
  readonly type = ADD_CUSTOM_MARKERS

  constructor(public payload: { markers: CustomMarker[] }) { }
}

export class RemoveCustomMarkers implements Action {
  readonly type = REMOVE_CUSTOM_MARKERS

  constructor(public payload: { markers: CustomMarker[] }) { }
}

export class SelectCustomMarkers implements Action {
  readonly type = SELECT_CUSTOM_MARKERS

  constructor(public payload: { customMarkers: CustomMarker[] }) { }
}

export class DeselectCustomMarkers implements Action {
  readonly type = DESELECT_CUSTOM_MARKERS

  constructor(public payload: { customMarkers: CustomMarker[] }) { }
}

export class SetCustomMarkerSelection implements Action {
  readonly type = SET_CUSTOM_MARKER_SELECTION

  constructor(public payload: { customMarkers: CustomMarker[] }) { }
}

export type Actions =
  | UpdateCustomMarker
  | AddCustomMarkers
  | RemoveCustomMarkers
  | SelectCustomMarkers
  | DeselectCustomMarkers
  | SetCustomMarkerSelection