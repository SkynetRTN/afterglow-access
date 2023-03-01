import { Region } from "src/app/data-files/models/region";
import { SonificationViewerStateModel } from "./sonification.state";

export class SonificationViewportSync {
  public static readonly type = '[Sonifier] Sonification Viewport Sync';

  constructor(public layerId: string) { }
}

export class SonificationRegionChanged {
  public static readonly type = '[Sonifier] Region Changed';

  constructor(public layerId: string) { }
}

export class AddRegionToHistory {
  public static readonly type = '[Sonifier] Add Region to History';

  constructor(public layerId: string, public region: Region) { }
}

export class ClearRegionHistory {
  public static readonly type = '[Sonifier] Clear Region History';

  constructor(public layerId: string) { }
}

export class UndoRegionSelection {
  public static readonly type = '[Sonifier] Undo Region Selection';

  constructor(public layerId: string) { }
}

export class RedoRegionSelection {
  public static readonly type = '[Sonifier] Redo Region Selection';

  constructor(public layerId: string) { }
}

export class UpdateSonifierFileState {
  public static readonly type = '[Sonifier] Update File State';

  constructor(public layerId: string, public changes: Partial<SonificationViewerStateModel>) { }
}

export class SetProgressLine {
  public static readonly type = '[Sonifier] Set Progress Line';

  constructor(public layerId: string, public line: { x1: number; y1: number; x2: number; y2: number }) { }
}

export class Sonify {
  public static readonly type = '[Sonifier] Sonify';

  constructor(public layerId: string, public region: Region) { }
}

export class ClearSonification {
  public static readonly type = '[Sonifier] Clear Sonification';

  constructor(public layerId: string) { }
}

export class SonificationCompleted {
  public static readonly type = '[Sonifier] Sonification Completed';

  constructor(public layerId: string, public url: string, public error: string) { }
}


export class CreateSonificationJob {
  public static readonly type = '[Sonification] Create Sonification Job';
  constructor(public layerIds: string[]) { }
}


