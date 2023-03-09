import { Region } from "src/app/data-files/models/region";
import { WcsCalibrationPanelConfig } from "./models/wcs-calibration-panel-config";

export class UpdateConfig {
  public static readonly type = '[Wcs Calibration] Update Form Data';

  constructor(public changes: Partial<WcsCalibrationPanelConfig>) { }
}


export class UpdateSourceSelectionRegion {
  public static readonly type = '[Wcs Calibration] Update Source Selection Region';

  constructor(public layerId: string, public region: Region) { }
}

export class EndSourceSelectionRegion {
  public static readonly type = '[Wcs Calibration] End Source Selection Region';

  constructor(public layerId: string, public mode: 'append' | 'remove') { }
}

export class UpdateWcsCalibrationExtractionOverlay {
  public static readonly type = '[Wcs Calibration] Update WCS Calibration Extraction Overlay';

  constructor(
    public viewerId: string
  ) { }
}

export class InvalidateWcsCalibrationExtractionOverlayByLayerId {
  public static readonly type = '[Wcs Calibration] Invalidate Wcs Calibration Extraction Overlay By Layer Id';

  constructor(public layerId: string = null) { }
}

export class CreateWcsCalibrationJob {
  public static readonly type = '[Wcs Calibration] Create Wcs Calibration Job';
  constructor(public layerIds: string[]) { }
}


