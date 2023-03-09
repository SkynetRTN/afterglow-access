import { PhotometryData } from "src/app/jobs/models/photometry";
import { PhotometryPanelConfig } from "./models/photometry-panel-config";
import { PhotometryViewerStateModel } from "./photometry.state";

export class UpdateConfig {
  public static readonly type = '[Photometry] Update Config';

  constructor(public changes: Partial<PhotometryPanelConfig>) { }
}

export class UpdatePhotometryViewerState {
  public static readonly type = '[Photometry] Update Viewer State';

  constructor(public layerId: string, public changes: Partial<PhotometryViewerStateModel>) { }
}


export class AddPhotDatas {
  public static readonly type = '[Photometry] Add Source Phot Datas';

  constructor(public photDatas: PhotometryData[]) { }
}

export class RemovePhotDatasByLayerId {
  public static readonly type = '[Photometry] Remove Phot Datas By Layer Id';

  constructor(public layerId: string = null) { }
}

export class RemovePhotDatasBySourceId {
  public static readonly type = '[Photometry] Remove Phot Datas By Source Id';

  constructor(public sourceId: string) { }
}

export class BatchPhotometerSources {
  public static readonly type = '[Photometry] Batch Photometer Sources';

  constructor() { }
}

export class UpdateAutoPhotometry {
  public static readonly type = '[Photometry] Update Auto Photometry';

  constructor(
    public viewerId: string
  ) { }
}

export class UpdateAutoFieldCalibration {
  public static readonly type = '[Photometry] Update Auto Field Calibration';

  constructor(
    public viewerId: string
  ) { }
}

export class InvalidateAutoCalByLayerId {
  public static readonly type = '[Photometry] Invalidate Auto Cal By Layer ID';

  constructor(public layerId: string = null) { }
}

export class InvalidateAutoPhotByLayerId {
  public static readonly type = '[Photometry] Invalidate Auto Phot By Layer ID';

  constructor(public layerId: string = null) { }
}



