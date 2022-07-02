import { Catalog } from "src/app/jobs/models/catalog-query";
import { FieldCalibration } from "src/app/jobs/models/field-calibration";
import { PhotometryJobSettings } from "src/app/jobs/models/photometry";
import { SourceExtractionJobSettings } from "src/app/jobs/models/source-extraction";
import { CalibrationSettings, defaults as defaultCalibrationSettings } from "./calibration-settings";
import { CentroidSettings, defaults as defaultCentroidSettings } from "./centroid-settings";
import { PhotometrySettings, defaults as defaultPhotometrySettings } from "./photometry-settings";
import { SourceExtractionSettings, defaults as defaultSourceExtractionSettings } from "./source-extraction-settings";

export interface GlobalSettings {
    photometry: PhotometrySettings;
    calibration: CalibrationSettings;
    sourceExtraction: SourceExtractionSettings;
    centroid: CentroidSettings;
}

export let defaults: GlobalSettings = {
    photometry: { ...defaultPhotometrySettings },
    calibration: { ...defaultCalibrationSettings },
    sourceExtraction: { ...defaultSourceExtractionSettings },
    centroid: { ...defaultCentroidSettings }
}


export function toPhotometryJobSettings(settings: GlobalSettings): PhotometryJobSettings {
    let p = settings.photometry;
    let result: PhotometryJobSettings;
    if (p.mode == 'adaptive') {
        result = {
            mode: 'auto',
            a: p.autoAper ? 0 : p.aKrFactor,
            aIn: p.aInKrFactor,
            aOut: p.aOutKrFactor,
            b: null,
            bOut: null,
            centroidRadius: null,
            gain: null,
            theta: null,
            thetaOut: null,
            zeroPoint: null,
            apcorrTol: p.adaptiveAperCorr ? p.aperCorrTol : 0,
            fixAper: p.fixAper,
            fixEll: p.fixEll,
            fixRot: p.fixRot
        };
    } else {
        result = {
            mode: 'aperture',
            a: p.a,
            b: p.b,
            aIn: p.aIn,
            aOut: p.aOut,
            bOut: p.bOut,
            theta: p.theta,
            thetaOut: p.thetaOut,
            centroidRadius: null,
            gain: null,
            zeroPoint: null,
            apcorrTol: p.constantAperCorr ? p.aperCorrTol : 0,
            fixAper: p.fixAper,
            fixEll: p.fixEll,
            fixRot: p.fixRot
        };
    }

    result.gain = p.gain;
    result.centroidRadius = p.centroidRadius;
    result.zeroPoint = settings.calibration.zeroPoint;

    return result;
}


export function toFieldCalibration(settings: GlobalSettings, catalogs: Catalog[]): FieldCalibration {
    let customFilterLookup = {};
    for (let catalog of catalogs) {
        customFilterLookup[catalog.name] = catalog.filterLookup;
    }
    let p = settings.photometry;
    let c = settings.calibration;
    let result: FieldCalibration = {
        catalogs: [c.catalog],
        customFilterLookup: customFilterLookup,
        sourceInclusionPercentage: c.sourceInclusionPercentageEnabled ? c.sourceInclusionPercentage : null,
        sourceMatchTol: c.sourceMatchTol,
        maxStarRms: c.maxStarRmsEnabled ? c.maxStarRms : 0,
        maxStars: c.maxStarsEnabled ? c.maxStars : 0,
        variableCheckTol: c.variableCheckEnabled ? c.variableCheckTol : 0,
    }

    if (c.minSnrEnabled) {
        result.minSnr = c.minSnr;
    }

    if (c.maxSnrEnabled) {
        result.maxSnr = c.maxSnr;
    }

    return result;
}

export function toSourceExtractionJobSettings(settings: GlobalSettings): SourceExtractionJobSettings {
    let s = settings.sourceExtraction;
    return {
        threshold: s.threshold,
        bkSize: s.bkSize,
        bkFilterSize: s.bkFilterSize,
        fwhm: s.fwhm,
        minPixels: s.minPixels,
        minFwhm: s.minFwhm,
        maxFwhm: s.maxFwhm,
        maxEllipticity: s.maxEllipticity,
        deblend: s.deblend,
        deblendLevels: s.deblendLevels,
        deblendContrast: s.deblendContrast,
        centroid: s.centroid,
        clean: s.clean,
        satLevel: s.satLevel,
        discardSaturated: s.discardSaturated
    }
}