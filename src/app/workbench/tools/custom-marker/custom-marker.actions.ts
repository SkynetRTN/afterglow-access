import { Region } from "src/app/data-files/models/region";
import { Marker } from "../../models/marker";
import { CustomMarkerPanelConfig } from "./models/custom-marker-panel-config";

export class UpdateConfig {
  public static readonly type = '[Custom Marker] Update Config';

  constructor(public changes: Partial<CustomMarkerPanelConfig>) { }
}

export class UpdateCustomMarkerSelectionRegion {
  public static readonly type = '[Custom Markers] Update Custom Marker Selection Region';

  constructor(public id: string, public region: Region) { }
}

export class EndCustomMarkerSelectionRegion {
  public static readonly type = '[Custom Markers] End Custom Marker Selection Region';

  constructor(public id: string, public mode: 'append' | 'remove') { }
}

export class UpdateCustomMarker {
  public static readonly type = '[Custom Markers] Update Custom Marker';

  /* TODO:  Figure out why error TS2322 is thrown by compiler when changes type is set to Partial<Marker> */
  constructor(public id: string, public markerId: string, public changes: any) { }
}

export class AddCustomMarkers {
  public static readonly type = '[Custom Markers] Add Custom Marker';

  constructor(public id: string, public markers: Marker[]) { }
}

export class RemoveCustomMarkers {
  public static readonly type = '[Custom Markers] Remove Custom Marker';

  constructor(public id: string, public markers: Marker[]) { }
}

export class SelectCustomMarkers {
  public static readonly type = '[Custom Markers] Select Custom Markers';

  constructor(public id: string, public markers: Marker[]) { }
}

export class DeselectCustomMarkers {
  public static readonly type = '[Custom Markers] Deselect Custom Markers';

  constructor(public id: string, public markers: Marker[]) { }
}

export class SetCustomMarkerSelection {
  public static readonly type = '[Custom Markers] Set Custom Marker Selection';

  constructor(public id: string, public markers: Marker[]) { }
}

