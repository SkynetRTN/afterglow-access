import { PosType } from "../../models/source";
import { PlottingPanelConfig } from "./models/plotting-panel-config";
import { PlottingViewerStateModel } from "./plotting.state";

export class UpdateConfig {
  public static readonly type = '[Plotting] Update Config';

  constructor(public changes: Partial<PlottingPanelConfig>) { }
}

export class UpdateViewerState {
  public static readonly type = '[Plotting] Update Viewer State';

  constructor(public id: string, public changes: Partial<PlottingViewerStateModel>) { }
}


export class StartLine {
  public static readonly type = '[Plotter] Start Line';

  constructor(
    public id: string,
    public point: { primaryCoord: number; secondaryCoord: number; posType: PosType }
  ) { }
}

export class UpdateLine {
  public static readonly type = '[Plotter] Update Line';

  constructor(
    public id: string,
    public point: { primaryCoord: number; secondaryCoord: number; posType: PosType }
  ) { }
}

export class SyncPlottingPanelStates {
  public static readonly type = '[Plotter] Sync Plotting Panel States';

  constructor(public referenceId: string, public ids: string[]) { }
}

