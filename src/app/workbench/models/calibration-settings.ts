export interface CalibrationSettings {
    calibrationEnabled: boolean;
    zeroPoint: number;
    catalog: string;
    sourceInclusionPercentageEnabled: boolean;
    sourceInclusionPercentage: number;
    minSnrEnabled: boolean;
    minSnr: number;
    maxSnrEnabled: boolean;
    maxSnr: number;
    sourceMatchTol: number;
}

export const defaults: CalibrationSettings = {
    calibrationEnabled: false,
    zeroPoint: 20,
    catalog: 'APASS',
    sourceInclusionPercentageEnabled: true,
    sourceInclusionPercentage: 100,
    minSnrEnabled: true,
    minSnr: 10,
    maxSnrEnabled: false,
    maxSnr: 800,
    sourceMatchTol: 5,
};