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
import { tap, catchError, finalize, filter, take, takeUntil, map, flatMap, skip, delay } from 'rxjs/operators';
import { of, merge, interval, Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { JobsState } from 'src/app/jobs/jobs.state';
import { Job } from 'src/app/jobs/models/job';
import { DataFilesState } from 'src/app/data-files/data-files.state';
import { JobType } from 'src/app/jobs/models/job-types';
import { JobService } from 'src/app/jobs/services/job.service';
import { CloseLayerSuccess, InvalidateHeader, InvalidateRawImageTiles, LoadLayerHeader, LoadLibrary, LoadLibrarySuccess } from 'src/app/data-files/data-files.actions';
import { getLongestCommonStartingSubstring, isNotEmpty } from 'src/app/utils/utils';
import { AfterglowDataFileService } from '../../services/afterglow-data-files';
import { RemoveSources } from '../../sources.actions';
import { Region } from 'src/app/data-files/models/region';
import { SourcesState } from '../../sources.state';
import { getSourceCoordinates } from 'src/app/data-files/models/data-file';
import { WorkbenchState } from '../../workbench.state';
import { Viewer } from '../../models/viewer';
import { WcsCalibrationPanelConfig } from './models/wcs-calibration-panel-config';
import { CreateWcsCalibrationJob, InvalidateWcsCalibrationExtractionOverlayByLayerId, UpdateConfig, UpdateWcsCalibrationExtractionOverlay } from './wcs-calibration.actions';
import { toSourceExtractionJobSettings } from '../../models/global-settings';
import { SourceExtractionJob, SourceExtractionJobSettings } from 'src/app/jobs/models/source-extraction';
import { parseDms } from 'src/app/utils/skynet-astro';
import { isWcsCalibrationJob, WcsCalibrationJob, WcsCalibrationJobSettings } from 'src/app/jobs/models/wcs_calibration';
import { AlertDialogComponent, AlertDialogConfig } from 'src/app/utils/alert-dialog/alert-dialog.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

export interface WcsCalibrationViewerStateModel {
    sourceExtractionJobId: string;
    sourceExtractionOverlayIsValid: boolean;
}

export interface WcsCalibrationStateModel {
    version: string;
    config: WcsCalibrationPanelConfig,
    layerIdToViewerState: { [id: string]: WcsCalibrationViewerStateModel }
}

const defaultState: WcsCalibrationStateModel = {
    version: 'f24d45d4-5194-4406-be15-511911c5aaf5',
    config: {
        selectedLayerIds: [],
        activeJobId: '',
        mode: 'platesolve',
        refLayerId: null,
        minScale: 0.1,
        maxScale: 10,
        radius: 1,
        maxSources: 100,
        showOverlay: false,
    },
    layerIdToViewerState: {}
};

@State<WcsCalibrationStateModel>({
    name: 'wcsCalibration',
    defaults: defaultState,
})
@Injectable()
export class WcsCalibrationState {
    constructor(private actions$: Actions, private dialog: MatDialog, private store: Store, private jobService: JobService, private dataFileService: AfterglowDataFileService) { }

    @Selector()
    public static getState(state: WcsCalibrationStateModel) {
        return state;
    }

    @Selector()
    public static getLayerIdToState(state: WcsCalibrationStateModel) {
        return state.layerIdToViewerState;
    }

    public static getLayerStateById(id: string) {
        return createSelector([WcsCalibrationState.getLayerIdToState], (layerIdToState: { [id: string]: WcsCalibrationViewerStateModel }) => {
            return layerIdToState[id] || null;
        });
    }

    static getWcsCalibrationViewerStateByViewerId(viewerId: string) {
        return createSelector(
            [
                WorkbenchState.getViewerEntities,
                WcsCalibrationState.getLayerIdToState
            ],
            (
                viewerEntities: { [id: string]: Viewer },
                layerIdToState: { [id: string]: WcsCalibrationViewerStateModel }
            ) => {
                let viewer = viewerEntities[viewerId];
                if (!viewer) return null;
                return viewer.layerId ? layerIdToState[viewer.layerId] : null;
            }
        );
    }

    @Selector()
    public static getConfig(state: WcsCalibrationStateModel) {
        return state.config;
    }

    @Action(UpdateConfig)
    public updateConfig({ getState, setState, dispatch }: StateContext<WcsCalibrationStateModel>, { changes }: UpdateConfig) {
        setState((state: WcsCalibrationStateModel) => {
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
        { getState, setState, dispatch }: StateContext<WcsCalibrationStateModel>,
        { layerId: layerId }: CloseLayerSuccess
    ) {
        setState((state: WcsCalibrationStateModel) => {
            if (layerId in state.layerIdToViewerState) {
                delete state.layerIdToViewerState[layerId]
            }
            state.config.selectedLayerIds = state.config.selectedLayerIds.filter(
                (id) => id != layerId
            );
            return state;
        });
    }

    @Action(LoadLibrarySuccess)
    @ImmutableContext()
    public loadLibrarySuccess(
        { getState, setState, dispatch }: StateContext<WcsCalibrationStateModel>,
        { layers, correlationId }: LoadLibrarySuccess
    ) {
        let state = getState();
        let layerIds = Object.keys(state.layerIdToViewerState);
        layers.filter((layer) => !(layer.id in layerIds)).forEach(layer => {
            setState((state: WcsCalibrationStateModel) => {
                state.layerIdToViewerState[layer.id] = {
                    sourceExtractionJobId: null,
                    sourceExtractionOverlayIsValid: false
                }
                return state;
            })
        })

    }

    @Action(UpdateWcsCalibrationExtractionOverlay)
    @ImmutableContext()
    public updateWcsCalibrationExtractionOverlay(
        { getState, setState, dispatch }: StateContext<WcsCalibrationStateModel>,
        { viewerId }: UpdateWcsCalibrationExtractionOverlay
    ) {
        let state = getState();


        let imageLayer = this.store.selectSnapshot(WorkbenchState.getImageLayerByViewerId(viewerId))
        if (!imageLayer) return;
        let layerId = imageLayer.id;

        let layerState = this.store.selectSnapshot(WcsCalibrationState.getLayerStateById(layerId))
        let settings = this.store.selectSnapshot(WorkbenchState.getSettings);
        let sourceExtractionSettings = toSourceExtractionJobSettings(settings);

        let job: SourceExtractionJob = {
            type: JobType.SourceExtraction,
            sourceExtractionSettings: sourceExtractionSettings,
            id: null,
            fileIds: [layerId],
            mergeSources: true,
            state: null,
        };

        setState((state: WcsCalibrationStateModel) => {
            let photState = state.layerIdToViewerState[layerId];
            photState.sourceExtractionOverlayIsValid = true;
            photState.sourceExtractionJobId = null;
            return state;
        });

        let job$ = this.jobService.createJob(job);
        return job$.pipe(
            tap(job => {
                if (job.id) {
                    setState((state: WcsCalibrationStateModel) => {
                        state.layerIdToViewerState[layerId].sourceExtractionJobId = job.id;
                        return state;
                    });
                }
                if (job.state.status == 'completed') {


                }
            })
        )
    }

    @Action(InvalidateWcsCalibrationExtractionOverlayByLayerId)
    @ImmutableContext()
    public invalidateWcsCalibrationExtractionOverlayByLayerId(
        { getState, setState, dispatch }: StateContext<WcsCalibrationStateModel>,
        { layerId }: InvalidateWcsCalibrationExtractionOverlayByLayerId
    ) {

        setState((state: WcsCalibrationStateModel) => {
            if (layerId) {
                state.layerIdToViewerState[layerId].sourceExtractionOverlayIsValid = false;
            }
            else {
                Object.keys(state.layerIdToViewerState).forEach(layerId => {
                    state.layerIdToViewerState[layerId].sourceExtractionOverlayIsValid = false
                })
            }
            return state;
        });
    }



    @Action(CreateWcsCalibrationJob)
    @ImmutableContext()
    public createWcsCalibrationJob(
        { getState, setState, dispatch }: StateContext<WcsCalibrationStateModel>,
        { layerIds: layerIds }: CreateWcsCalibrationJob
    ) {
        setState((state: WcsCalibrationStateModel) => {
            state.config.activeJobId = '';
            return state;
        });

        let state = getState();
        let wcsSettings = state.config;
        let raHours = typeof (wcsSettings.ra) == 'string' ? parseDms(wcsSettings.ra) : wcsSettings.ra;
        let decDegs = typeof (wcsSettings.dec) == 'string' ? parseDms(wcsSettings.dec) : wcsSettings.dec;
        let wcsCalibrationJobSettings: WcsCalibrationJobSettings = {
            raHours: raHours,
            decDegs: decDegs,
            radius: wcsSettings.radius,
            minScale: wcsSettings.minScale,
            maxScale: wcsSettings.maxScale,
            maxSources: wcsSettings.maxSources,
        };

        let settings = this.store.selectSnapshot(WorkbenchState.getSettings);

        let sourceExtractionSettings = settings.sourceExtraction;
        let sourceExtractionJobSettings: SourceExtractionJobSettings = {
            threshold: sourceExtractionSettings.threshold,
            fwhm: sourceExtractionSettings.fwhm,
            deblend: sourceExtractionSettings.deblend,
            limit: sourceExtractionSettings.limit,
        };

        let job: WcsCalibrationJob = {
            id: null,
            type: JobType.WcsCalibration,
            fileIds: layerIds,
            inplace: true,
            settings: wcsCalibrationJobSettings,
            sourceExtractionSettings: sourceExtractionJobSettings,
            state: null,
        };

        let job$ = this.jobService.createJob(job);
        return job$.pipe(
            tap(job => {
                if (job.id) {
                    setState((state: WcsCalibrationStateModel) => {
                        state.config.activeJobId = job.id;
                        return state;
                    });
                }
                if (job.state.status == 'completed' && job.result) {
                    let actions: any[] = [];
                    if (!isWcsCalibrationJob(job)) return;
                    job.result.fileIds.forEach((layerId) => {
                        actions.push(new InvalidateHeader(layerId.toString()));
                    });
                    let viewerIds = this.store.selectSnapshot(WorkbenchState.getVisibleViewerIds);
                    let layerIds = job.result.fileIds.map(id => id.toString())
                    viewerIds.forEach(viewerId => {
                        let viewer = this.store.selectSnapshot(WorkbenchState.getViewerById(viewerId));

                        if (viewer.layerId && layerIds.includes(viewer.layerId)) {
                            actions.push(new LoadLayerHeader(viewer.layerId));
                        }
                    })
                    let message: string;
                    let numFailed = layerIds.length - job.result.fileIds.length;
                    if (numFailed != 0) {
                        message = `Failed to find solution for ${numFailed} image(s).`;
                    } else {
                        message = `Successfully found solutions for all ${layerIds.length} files.`;
                    }

                    let dialogConfig: Partial<AlertDialogConfig> = {
                        title: 'WCS Calibration Completed',
                        message: message,
                        buttons: [
                            {
                                color: '',
                                value: false,
                                label: 'Close',
                            },
                        ],
                    };
                    this.dialog.open(AlertDialogComponent, {
                        width: '600px',
                        data: dialogConfig,
                    });

                    dispatch(actions)

                }
            })
        )
    }



}


