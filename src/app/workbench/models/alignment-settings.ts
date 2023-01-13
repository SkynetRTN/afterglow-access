import { AlignmentMode, FeatureAlignmentAlgorithm } from "src/app/jobs/models/alignment"

export interface AlignmentSettings {
    enableRot: boolean;
    enableScale: boolean;
    enableSkew: boolean;
    crop: boolean;
    mode: AlignmentMode;
    wcsModeSettings: {
        wcsGridPoints: number;
    };
    sourceModeSettings: {
        scaleInvariant: boolean;
        matchTol: number;
        minEdge: number;
        ratioLimit: number;
        confidence: number;
        manualModeSettings: {
            maxSources: number,
            sourceIds: string[],
        };
        autoModeSettings: {
        };
    };
    featureModeSettings: {
        algorithm: FeatureAlignmentAlgorithm;
        ratioThreshold: number;
        detectEdges: boolean;
        percentileMin: number;
        percentileMax: number;
        akazeAlgorithmSettings: {
            descriptorType: string;
            descriptorSize: number;
            descriptorChannels: number;
            threshold: number;
            octaves: number;
            octaveLayers: number;
            diffusivity: string;
        };
        briskAlgorithmSettings: {
            threshold: number;
            octaves: number;
            patternScale: number;
        },
        kazeAlgorithmSettings: {
            extended: boolean;
            upright: boolean;
            threshold: number;
            octaves: number;
            octaveLayers: number;
            diffusivity: string;
        },
        orbAlgorithmSettings: {
            nfeatures: number;
            scaleFactor: number;
            nlevels: number;
            edgeThreshold: number;
            firstLevel: number;
            wtaK: number;
            scoreType: string;
            patchSize: number;
            fastThreshold: number;
        };
        siftAlgorithmSettings: {
            nfeatures: number;
            octaveLayers: number;
            contrastThreshold: number;
            edgeThreshold: number;
            sigma: number;
            descriptorType: string;
        },
        surfAlgorithmSettings: {
            hessianThreshold: number;
            octaves: number;
            octaveLayers: number;
            extended: boolean;
            upright: boolean;
        }
    },
    pixelModeSettings: {
        detectEdges: boolean;
    }
}


export const defaults: AlignmentSettings = {
    enableRot: true,
    enableScale: true,
    enableSkew: true,
    crop: true,
    mode: AlignmentMode.wcs,
    wcsModeSettings: {
        wcsGridPoints: 100
    },
    sourceModeSettings: {
        scaleInvariant: false,
        matchTol: .002,
        minEdge: .003,
        ratioLimit: 10,
        confidence: .15,
        manualModeSettings: {
            maxSources: 100,
            sourceIds: [],
        },
        autoModeSettings: {
        }
    },
    featureModeSettings: {
        algorithm: FeatureAlignmentAlgorithm.AKAZE,
        ratioThreshold: 0.5,
        detectEdges: false,
        percentileMax: 99,
        percentileMin: 10,
        akazeAlgorithmSettings: {
            descriptorType: 'MLDB',
            descriptorSize: 0,
            descriptorChannels: 3,
            threshold: 0.001,
            octaves: 4,
            octaveLayers: 4,
            diffusivity: 'PM_G2'
        },
        briskAlgorithmSettings: {
            threshold: 30,
            octaves: 3,
            patternScale: 1,
        },
        kazeAlgorithmSettings: {
            extended: false,
            upright: false,
            threshold: 0.001,
            octaves: 4,
            octaveLayers: 4,
            diffusivity: 'PM_G2'
        },
        orbAlgorithmSettings: {
            nfeatures: 500,
            scaleFactor: 1.2,
            nlevels: 8,
            edgeThreshold: 31,
            firstLevel: 0,
            wtaK: 2,
            scoreType: 'Harris',
            patchSize: 31,
            fastThreshold: 20
        },
        siftAlgorithmSettings: {
            nfeatures: 0,
            octaveLayers: 3,
            contrastThreshold: 0.04,
            edgeThreshold: 10,
            sigma: 1.6,
            descriptorType: '32F'
        },
        surfAlgorithmSettings: {
            hessianThreshold: 100,
            octaves: 4,
            octaveLayers: 3,
            extended: false,
            upright: false,
        }
    },
    pixelModeSettings: {
        detectEdges: false,
    }
};