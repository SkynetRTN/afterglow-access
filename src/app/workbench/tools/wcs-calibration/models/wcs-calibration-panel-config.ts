export interface WcsCalibrationPanelConfig {
    selectedLayerIds: string[];
    activeJobId: string;
    mode: 'platesolve' | 'copy';
    refLayerId: string,
    ra?: number | string;
    dec?: number | string;
    radius?: number;
    minScale?: number;
    maxScale?: number;
    maxSources?: number;
    showOverlay: boolean;
}