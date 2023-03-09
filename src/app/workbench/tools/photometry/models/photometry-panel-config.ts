export interface BatchPhotometryFormData {
    selectedLayerIds: string[];
}


export interface PhotometryPanelConfig {
    showSourceApertures: boolean;
    batchPhotFormData: BatchPhotometryFormData;
    batchCalibrationEnabled: boolean;
    batchPhotJobId: string;
    batchCalJobId: string;
    creatingBatchJobs: boolean;
    autoPhot: boolean;
}
