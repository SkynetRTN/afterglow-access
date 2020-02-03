import { CustomMarker } from './models/custom-marker';

/* Custom Markers */
export class UpdateCustomMarker {
  public static readonly type = '[Markers] Update Custom Marker'

  constructor(public markerId: string, public changes: Partial<CustomMarker>) { }
}

export class AddCustomMarkers {
  public static readonly type = '[Markers] Add Custom Marker'

  constructor(public markers: CustomMarker[]) { }
}

export class RemoveCustomMarkers {
  public static readonly type = '[Markers] Remove Custom Marker'

  constructor(public markers: CustomMarker[]) { }
}

export class SelectCustomMarkers {
  public static readonly type = '[Markers] Select Custom Markers'

  constructor(public markers: CustomMarker[]) { }
}

export class DeselectCustomMarkers {
  public static readonly type = '[Markers] Deselect Custom Markers'

  constructor(public markers: CustomMarker[]) { }
}

export class SetCustomMarkerSelection {
  public static readonly type = '[Markers] Set Custom Marker Selection'

  constructor(public markers: CustomMarker[]) { }
}

