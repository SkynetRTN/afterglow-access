import {
    State,
    Action,
    Actions,
    Selector,
    StateContext,
    ofActionDispatched,
    ofActionCompleted,
    ofActionSuccessful,
    ofActionErrored,
    createSelector,
    Store,
} from '@ngxs/store';
import { ImmutableSelector, ImmutableContext } from '@ngxs-labs/immer-adapter';
import { tap, catchError, finalize, filter, take, takeUntil, map, flatMap, skip, delay, combineLatest } from 'rxjs/operators';
import { of, merge, interval, Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { JobsState } from 'src/app/jobs/jobs.state';
import { Job } from 'src/app/jobs/models/job';
import { DataFilesState } from 'src/app/data-files/data-files.state';
import { JobType } from 'src/app/jobs/models/job-types';
import { JobService } from 'src/app/jobs/services/job.service';
import { CloseLayerSuccess, InvalidateHeader, InvalidateRawImageTiles, LoadLibrary } from 'src/app/data-files/data-files.actions';
import { getLongestCommonStartingSubstring, isNotEmpty } from 'src/app/utils/utils';
import { AfterglowDataFileService } from '../../services/afterglow-data-files';
import { RemoveSources } from '../../sources.actions';
import { Region } from 'src/app/data-files/models/region';
import { SourcesState } from '../../sources.state';
import { getSourceCoordinates } from 'src/app/data-files/models/data-file';
import { WorkbenchState } from '../../workbench.state';
import { Viewer } from '../../models/viewer';
import { InitializeWorkbenchLayerState } from '../../workbench.actions';
import { PhotometryPanelConfig } from './models/photometry-panel-config';
import { AddPhotDatas, BatchPhotometerSources, InvalidateAutoCalByLayerId, InvalidateAutoPhotByLayerId, RemovePhotDatasByLayerId, RemovePhotDatasBySourceId, UpdateAutoFieldCalibration, UpdateAutoPhotometry, UpdateConfig, UpdatePhotometryViewerState } from './photometry.actions';
import { SourceCatalogState } from '../source-catalog/source-catalog.state';
import { WorkbenchStateType } from '../../models/workbench-file-state';
import { toFieldCalibration, toPhotometryJobSettings, toSourceExtractionJobSettings } from '../../models/global-settings';
import { PhotometryData, PhotometryJob } from 'src/app/jobs/models/photometry';
import { PosType, sourceToAstrometryData } from '../../models/source';
import { FieldCalibrationJob } from 'src/app/jobs/models/field-calibration';
import { Astrometry } from 'src/app/jobs/models/astrometry';
import { SourceId } from 'src/app/jobs/models/source-id';

export interface PhotometryViewerStateModel {
    sourceExtractionJobId: string;
    sourcePhotometryData: { [sourceId: string]: PhotometryData };
    autoPhotIsValid: boolean;
    autoPhotJobId: string;
    autoCalIsValid: boolean;
    autoCalJobId: string;
}

export interface PhotometryStateModel {
    version: string;
    config: PhotometryPanelConfig,
    layerIdToState: { [id: string]: PhotometryViewerStateModel },
    fileIdToState: { [id: string]: PhotometryViewerStateModel }
}

const defaultState: PhotometryStateModel = {
    version: 'f24d45d4-5194-4406-be15-511911c5aaf5',
    config: {
        showSourceApertures: true,
        batchPhotFormData: {
            selectedLayerIds: [],
        },
        batchCalibrationEnabled: false,
        batchPhotJobId: '',
        batchCalJobId: '',
        creatingBatchJobs: false,
        autoPhot: true
    },
    layerIdToState: {},
    fileIdToState: {}
};

@State<PhotometryStateModel>({
    name: 'photometry',
    defaults: defaultState,
})
@Injectable()
export class PhotometryState {
    constructor(private actions$: Actions, private store: Store, private jobService: JobService, private dataFileService: AfterglowDataFileService) { }

    @Selector()
    public static getState(state: PhotometryStateModel) {
        return state;
    }

    @Selector()
    public static getLayerIdToState(state: PhotometryStateModel) {
        return state.layerIdToState;
    }

    public static getLayerStateById(id: string) {
        return createSelector([PhotometryState.getLayerIdToState], (layerIdToState: { [id: string]: PhotometryViewerStateModel }) => {
            return layerIdToState[id] || null;
        });
    }

    @Selector()
    public static getFileIdToState(state: PhotometryStateModel) {
        return state.fileIdToState;
    }

    public static getFileStateById(id: string) {
        return createSelector([PhotometryState.getFileIdToState], (fileIdToState: { [id: string]: PhotometryViewerStateModel }) => {
            return fileIdToState[id] || null;
        });
    }

    static getPhotometryViewerStateByViewerId(viewerId: string) {
        return createSelector(
            [
                WorkbenchState.getViewerEntities,
                PhotometryState.getLayerIdToState,
                PhotometryState.getFileIdToState,
            ],
            (
                viewerEntities: { [id: string]: Viewer },
                layerIdToState: { [id: string]: PhotometryViewerStateModel },
                fileIdToState: { [id: string]: PhotometryViewerStateModel },
            ) => {
                let viewer = viewerEntities[viewerId];
                if (!viewer) return null;
                return viewer.layerId ? layerIdToState[viewer.layerId] : fileIdToState[viewer.fileId];
            }
        );
    }

    @Selector()
    public static getConfig(state: PhotometryStateModel) {
        return state.config;
    }


    @Action(UpdateConfig)
    public updateConfig({ getState, setState, dispatch }: StateContext<PhotometryStateModel>, { changes }: UpdateConfig) {
        setState((state: PhotometryStateModel) => {
            return {
                ...state,
                config: {
                    ...state.config,
                    ...changes
                }
            };
        });
    }

    @Action(CloseLayerSuccess)
    @ImmutableContext()
    public closeLayerSuccess(
        { getState, setState, dispatch }: StateContext<PhotometryStateModel>,
        { layerId: layerId }: CloseLayerSuccess
    ) {
        setState((state: PhotometryStateModel) => {
            state.config.batchPhotFormData.selectedLayerIds = state.config.batchPhotFormData.selectedLayerIds.filter(
                (id) => id != layerId
            );
            return state;
        });
    }

    @Action(InitializeWorkbenchLayerState)
    @ImmutableContext()
    public initializeWorkbenchLayerState(
        { getState, setState, dispatch }: StateContext<PhotometryStateModel>,
        { layerId: layerId }: InitializeWorkbenchLayerState
    ) {
        setState((state: PhotometryStateModel) => {
            state.layerIdToState[layerId] = {
                sourceExtractionJobId: '',
                sourcePhotometryData: {},
                autoPhotIsValid: false,
                autoPhotJobId: '',
                autoCalIsValid: false,
                autoCalJobId: '',
            }
            return state;
        })
    }



    @Action(UpdatePhotometryViewerState)
    @ImmutableContext()
    public updatePhotometryFileState(
        { getState, setState, dispatch }: StateContext<PhotometryStateModel>,
        { layerId: layerId, changes }: UpdatePhotometryViewerState
    ) {
        setState((state: PhotometryStateModel) => {
            state.layerIdToState[layerId] = {
                ...state.layerIdToState[layerId],
                ...changes,
            };
            return state;
        });
    }


    @Action(UpdateAutoPhotometry)
    @ImmutableContext()
    public updateAutoPhotometry(
        { getState, setState, dispatch }: StateContext<PhotometryStateModel>,
        { viewerId }: UpdateAutoPhotometry
    ) {
        let state = getState();

        let imageLayer = this.store.selectSnapshot(WorkbenchState.getImageLayerByViewerId(viewerId))
        if (!imageLayer) return;
        let layerId = imageLayer.id;

        let sourceCatalogConfig = this.store.selectSnapshot(SourceCatalogState.getConfig)
        let coordMode = sourceCatalogConfig.coordMode;
        let showSourcesFromAllFiles = sourceCatalogConfig.showSourcesFromAllFiles;
        let sources = this.store.selectSnapshot(SourcesState.getSources);


        let header = this.store.selectSnapshot(DataFilesState.getHeaderByLayerId(layerId))
        let layer = this.store.selectSnapshot(DataFilesState.getLayerById(layerId))

        if (!layer || !header) return;
        if (!header.wcs || !header.wcs.isValid()) coordMode = 'pixel';
        sources = sources.filter((source) => {
            if (coordMode != source.posType) return false;
            if (source.layerId == layerId) return true;
            if (!showSourcesFromAllFiles) return false;
            let coord = getSourceCoordinates(header, source);
            if (coord == null) return false;
            return true;
        });

        let settings = this.store.selectSnapshot(WorkbenchState.getSettings)
        let photometryJobSettings = toPhotometryJobSettings(settings);

        let job: PhotometryJob = {
            type: JobType.Photometry,
            settings: photometryJobSettings,
            id: null,
            fileIds: [layerId],
            sources: sources.map((source, index) => sourceToAstrometryData(source)),
            state: null,
        };

        setState((state: PhotometryStateModel) => {
            let photState = state.layerIdToState[layerId];
            photState.autoPhotIsValid = true;
            photState.autoPhotJobId = null;
            return state;
        });

        let job$ = this.jobService.createJob(job);
        return job$.pipe(
            tap(job => {
                if (job.id) {
                    setState((state: PhotometryStateModel) => {
                        state.layerIdToState[layerId].autoPhotJobId = job.id;
                        return state;
                    });
                }
                if (job.state.status == 'completed') {


                }
            })
        )
    }

    @Action(UpdateAutoFieldCalibration)
    @ImmutableContext()
    public updateAutoFieldCalibration(
        { getState, setState, dispatch }: StateContext<PhotometryStateModel>,
        { viewerId }: UpdateAutoFieldCalibration
    ) {
        let state = getState();

        let imageLayer = this.store.selectSnapshot(WorkbenchState.getImageLayerByViewerId(viewerId))
        if (!imageLayer) return;
        let layerId = imageLayer.id;

        let coordMode = this.store.selectSnapshot(SourceCatalogState.getSourceCoordMode);
        let header = this.store.selectSnapshot(DataFilesState.getHeaderByLayerId(layerId))
        let layer = this.store.selectSnapshot(DataFilesState.getLayerById(layerId))

        if (!layer || !header) return;
        if (!header.wcs || !header.wcs.isValid()) coordMode = 'pixel';

        let settings = this.store.selectSnapshot(WorkbenchState.getSettings);
        let photometryJobSettings = toPhotometryJobSettings(settings);
        let sourceExtractionJobSettings = toSourceExtractionJobSettings(settings);
        let catalogs = this.store.selectSnapshot(WorkbenchState.getCatalogs)
        let fieldCalibration = toFieldCalibration(settings, catalogs);

        let job: FieldCalibrationJob = {
            type: JobType.FieldCalibration,
            id: null,
            photometrySettings: photometryJobSettings,
            sourceExtractionSettings: sourceExtractionJobSettings,
            fieldCal: fieldCalibration,
            fileIds: [layerId],
            state: null,
        };

        setState((state: PhotometryStateModel) => {
            let photState = state.layerIdToState[layerId];
            photState.autoCalIsValid = true;
            photState.autoCalJobId = null;
            return state;
        });

        let job$ = this.jobService.createJob(job);
        return job$.pipe(
            tap(job => {
                if (job.id) {
                    setState((state: PhotometryStateModel) => {
                        state.layerIdToState[layerId].autoCalJobId = job.id;
                        return state;
                    });
                }
                if (job.state.status == 'completed') {
                }
            })
        )
    }

    @Action(BatchPhotometerSources)
    @ImmutableContext()
    public batchPhotometerSources(
        { getState, setState, dispatch }: StateContext<PhotometryStateModel>,
        { }: BatchPhotometerSources
    ) {
        let state = getState();

        let settings = this.store.selectSnapshot(WorkbenchState.getSettings);
        setState((state: PhotometryStateModel) => {
            state.config.batchCalibrationEnabled = settings.calibration.calibrationEnabled;
            state.config.batchCalJobId = null;
            state.config.batchPhotJobId = null;
            state.config.creatingBatchJobs = true;
            return state;
        });

        let sources = this.store.selectSnapshot(SourcesState.getSources);
        let photometryJobSettings = toPhotometryJobSettings(settings);
        let layerIds = state.config.batchPhotFormData.selectedLayerIds;

        let photJob: PhotometryJob = {
            type: JobType.Photometry,
            settings: photometryJobSettings,
            id: null,
            fileIds: layerIds,
            sources: sources.map((source, index) => {
                let x = null;
                let y = null;
                let pmPixel = null;
                let pmPosAnglePixel = null;
                let raHours = null;
                let decDegs = null;
                let pmSky = null;
                let pmPosAngleSky = null;

                if (source.posType == PosType.PIXEL) {
                    x = source.primaryCoord;
                    y = source.secondaryCoord;
                    pmPixel = source.pm;
                    pmPosAnglePixel = source.pmPosAngle;
                } else {
                    raHours = source.primaryCoord;
                    decDegs = source.secondaryCoord;
                    pmSky = source.pm;
                    if (pmSky) pmSky /= 3600.0;
                    pmPosAngleSky = source.pmPosAngle;
                }

                let s: Astrometry & SourceId = {
                    id: source.id,
                    pmEpoch: source.pmEpoch ? new Date(source.pmEpoch).toISOString() : null,
                    x: x,
                    y: y,
                    pmPixel: pmPixel,
                    pmPosAnglePixel: pmPosAnglePixel,
                    raHours: raHours,
                    decDegs: decDegs,
                    pmSky: pmSky,
                    pmPosAngleSky: pmPosAngleSky,
                    fwhmX: null,
                    fwhmY: null,
                    theta: null,
                };
                return s;
            }),
            state: null,
        };


        let photJob$ = this.jobService.createJob(photJob).pipe(
            tap(job => {
                if (job.id) {
                    setState((state: PhotometryStateModel) => {
                        state.config.batchPhotJobId = job.id;
                        state.config.creatingBatchJobs = false;
                        return state;
                    });
                }
                if (job.state.status == 'completed') {
                }
            })
        )

        let calJob$: Observable<Job> = of(null);

        if (settings.calibration.calibrationEnabled) {

            let sourceExtractionJobSettings = toSourceExtractionJobSettings(settings);
            let catalogs = this.store.selectSnapshot(WorkbenchState.getCatalogs)
            let fieldCalibration = toFieldCalibration(settings, catalogs);

            let calJob: FieldCalibrationJob = {
                type: JobType.FieldCalibration,
                id: null,
                photometrySettings: photometryJobSettings,
                sourceExtractionSettings: sourceExtractionJobSettings,
                fieldCal: fieldCalibration,
                fileIds: layerIds,
                state: null,
            };

            calJob$ = this.jobService.createJob(calJob).pipe(
                tap(job => {
                    if (job.id) {
                        setState((state: PhotometryStateModel) => {
                            state.config.batchCalJobId = job.id;
                            state.config.creatingBatchJobs = false;
                            return state;
                        });
                    }
                    if (job.state.status == 'completed') {
                    }
                })
            )
        }

        return combineLatest([photJob$, calJob$])
    }

    @Action(AddPhotDatas)
    @ImmutableContext()
    public addPhotDatas(
        { getState, setState, dispatch }: StateContext<PhotometryStateModel>,
        { photDatas }: AddPhotDatas
    ) {
        setState((state: PhotometryStateModel) => {
            //Photometry data from the Core refers to layer ids as file ids.
            photDatas.forEach((d) => {
                let photometryPanelState = state.layerIdToState[d.fileId];
                photometryPanelState.sourcePhotometryData[d.id] = d;
            });

            return state;
        });
    }

    @Action(RemovePhotDatasByLayerId)
    @ImmutableContext()
    public removePhotDatasByLayerId(
        { getState, setState, dispatch }: StateContext<PhotometryStateModel>,
        { layerId }: RemovePhotDatasByLayerId
    ) {
        setState((state: PhotometryStateModel) => {
            if (layerId) {
                state.layerIdToState[layerId].sourcePhotometryData = {}
            }
            else {
                Object.keys(state.layerIdToState).forEach(layerId => {
                    state.layerIdToState[layerId].sourcePhotometryData = {}
                })
            }
            return state;
        })

    }

    @Action(RemovePhotDatasBySourceId)
    @ImmutableContext()
    public removePhotDatasBySourceId(
        { getState, setState, dispatch }: StateContext<PhotometryStateModel>,
        { sourceId }: RemovePhotDatasBySourceId
    ) {
        setState((state: PhotometryStateModel) => {
            Object.keys(state.layerIdToState).forEach(layerId => {
                let sourcePhotometryData = state.layerIdToState[layerId].sourcePhotometryData;
                if (sourceId in sourcePhotometryData) {
                    delete sourcePhotometryData[sourceId];
                }
            })

            return state;
        });
    }

    @Action(InvalidateAutoCalByLayerId)
    @ImmutableContext()
    public resetAutoCalJobsByLayerId(
        { getState, setState, dispatch }: StateContext<PhotometryStateModel>,
        { layerId }: RemovePhotDatasByLayerId
    ) {
        setState((state: PhotometryStateModel) => {
            if (layerId) {
                state.layerIdToState[layerId].autoCalIsValid = false;
            }
            else {
                Object.keys(state.layerIdToState).forEach(layerId => {
                    state.layerIdToState[layerId].autoCalIsValid = false
                })
            }
            return state;
        });
    }

    @Action(InvalidateAutoPhotByLayerId)
    @ImmutableContext()
    public resetAutoPhotJobsByLayerId(
        { getState, setState, dispatch }: StateContext<PhotometryStateModel>,
        { layerId: layerId }: InvalidateAutoPhotByLayerId
    ) {
        setState((state: PhotometryStateModel) => {
            if (layerId) {
                state.layerIdToState[layerId].autoPhotIsValid = false;
            }
            else {
                Object.keys(state.layerIdToState).forEach(layerId => {
                    state.layerIdToState[layerId].autoPhotIsValid = false
                })
            }
            return state;
        });
    }


}


