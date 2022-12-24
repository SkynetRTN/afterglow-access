export interface CalibrationSettings {
    calibrationEnabled: boolean;
    zeroPoint: number;
    selectedCatalogs: string[],
    catalogOrder: string[],
    sourceInclusionPercentageEnabled: boolean;
    sourceInclusionPercentage: number;
    minSnrEnabled: boolean;
    minSnr: number;
    maxSnrEnabled: boolean;
    maxSnr: number;
    sourceMatchTol: number;
    variableCheckEnabled: boolean;
    variableCheckTol: number;
    maxStarRmsEnabled: boolean;
    maxStarRms: number;
    maxStarsEnabled: boolean;
    maxStars: number;
}

export const defaults: CalibrationSettings = {
    calibrationEnabled: false,
    zeroPoint: 20,
    selectedCatalogs: [],
    catalogOrder: [],
    sourceInclusionPercentageEnabled: true,
    sourceInclusionPercentage: 100,
    minSnrEnabled: true,
    minSnr: 10,
    maxSnrEnabled: false,
    maxSnr: 800,
    sourceMatchTol: 5,
    variableCheckEnabled: true,
    variableCheckTol: 5,
    maxStarRmsEnabled: false,
    maxStarRms: 0.01,
    maxStarsEnabled: false,
    maxStars: 30
};