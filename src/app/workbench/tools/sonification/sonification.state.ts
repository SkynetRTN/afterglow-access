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
import { CenterRegionInViewport, CloseLayerSuccess, InvalidateHeader, InvalidateRawImageTiles, LoadLayerHeader, LoadLayerHeaderSuccess, LoadLibrary, LoadLibrarySuccess } from 'src/app/data-files/data-files.actions';
import { getLongestCommonStartingSubstring, isNotEmpty } from 'src/app/utils/utils';
import { AfterglowDataFileService } from '../../services/afterglow-data-files';
import { RemoveSources } from '../../sources.actions';
import { Region } from 'src/app/data-files/models/region';
import { SourcesState } from '../../sources.state';
import { getHeight, getSourceCoordinates, getWidth, isImageLayer } from 'src/app/data-files/models/data-file';
import { WorkbenchState } from '../../workbench.state';
import { Viewer } from '../../models/viewer';
import { SourceExtractionJob, SourceExtractionJobSettings } from 'src/app/jobs/models/source-extraction';
import { parseDms } from 'src/app/utils/skynet-astro';
import { AlertDialogComponent, AlertDialogConfig } from 'src/app/utils/alert-dialog/alert-dialog.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AddRegionToHistory, ClearRegionHistory, ClearSonification, RedoRegionSelection, SetProgressLine, SonificationCompleted, SonificationRegionChanged, Sonify, UndoRegionSelection, UpdateSonifierFileState } from './sonification.actions';
import { getCoreApiUrl } from 'src/app/afterglow-config';
import { SonifierRegionMode } from './models/sonifier-file-state';
import { AfterglowConfigService } from 'src/app/afterglow-config.service';
import { isSonificationJob, SonificationJob, SonificationJobSettings } from 'src/app/jobs/models/sonification';


import * as deepEqual from 'fast-deep-equal';

export interface SonificationViewerStateModel {
    regionHistoryInitialized: boolean;
    regionHistory: Array<Region>;
    regionHistoryIndex: number | null;
    regionMode: SonifierRegionMode;
    viewportSync: boolean;
    duration: number;
    toneCount: number;
    progressLine: { x1: number; y1: number; x2: number; y2: number } | null;
    sonificationLoading: boolean;
    sonificationJobId: string;
}

export interface SonificationStateModel {
    version: string;
    layerIdToViewerState: { [id: string]: SonificationViewerStateModel },
}

const defaultState: SonificationStateModel = {
    version: 'f24d45d4-5194-4406-be15-511911c5aaf5',
    layerIdToViewerState: {},
};

@State<SonificationStateModel>({
    name: 'sonification',
    defaults: defaultState,
})
@Injectable()
export class SonificationState {
    constructor(private actions$: Actions, private dialog: MatDialog, private store: Store, private jobService: JobService, private dataFileService: AfterglowDataFileService,
        private config: AfterglowConfigService) { }

    @Selector()
    public static getState(state: SonificationStateModel) {
        return state;
    }

    @Selector()
    public static getLayerIdToState(state: SonificationStateModel) {
        return state.layerIdToViewerState;
    }

    public static getLayerStateById(id: string) {
        return createSelector([SonificationState.getLayerIdToState], (layerIdToState: { [id: string]: SonificationViewerStateModel }) => {
            return layerIdToState[id] || null;
        });
    }


    static getSonificationViewerStateByViewerId(viewerId: string) {
        return createSelector(
            [
                WorkbenchState.getViewerEntities,
                SonificationState.getLayerIdToState
            ],
            (
                viewerEntities: { [id: string]: Viewer },
                layerIdToState: { [id: string]: SonificationViewerStateModel }
            ) => {
                let viewer = viewerEntities[viewerId];
                if (!viewer) return null;
                return viewer.layerId ? layerIdToState[viewer.layerId] : null;
            }
        );
    }

    @Action(LoadLibrarySuccess)
    @ImmutableContext()
    public loadLibrarySuccess(
        { getState, setState, dispatch }: StateContext<SonificationStateModel>,
        { layers, correlationId }: LoadLibrarySuccess
    ) {
        let state = getState();
        let layerIds = Object.keys(state.layerIdToViewerState);
        layers.filter((layer) => !(layer.id in layerIds)).forEach(layer => {
            setState((state: SonificationStateModel) => {
                state.layerIdToViewerState[layer.id] = {
                    regionHistory: [],
                    regionHistoryIndex: null,
                    regionHistoryInitialized: false,
                    regionMode: SonifierRegionMode.CUSTOM,
                    viewportSync: true,
                    duration: 10,
                    toneCount: 22,
                    progressLine: null,
                    sonificationLoading: null,
                    sonificationJobId: '',
                }
                return state;
            })
        })

    }

    @Action(CloseLayerSuccess)
    @ImmutableContext()
    public closeLayerSuccess(
        { getState, setState, dispatch }: StateContext<SonificationStateModel>,
        { layerId }: CloseLayerSuccess
    ) {
        setState((state: SonificationStateModel) => {
            if (layerId in state.layerIdToViewerState) {
                delete state.layerIdToViewerState[layerId]
            }
            return state;
        });
    }


    @Action(LoadLayerHeaderSuccess)
    @ImmutableContext()
    public loadDataFileHdrSuccess(
        { getState, setState, dispatch }: StateContext<SonificationStateModel>,
        { layerId }: LoadLayerHeaderSuccess
    ) {
        let state = getState();
        let layer = this.store.selectSnapshot(DataFilesState.getLayerEntities)[layerId];
        if (!isImageLayer(layer)) return;
        let header = this.store.selectSnapshot(DataFilesState.getHeaderEntities)[layer.headerId];
        let sonifierState = state.layerIdToViewerState[layerId];

        if (!sonifierState.regionHistoryInitialized) {
            dispatch(
                new AddRegionToHistory(layerId, {
                    x: 0,
                    y: 0,
                    width: getWidth(header),
                    height: getHeight(header),
                })
            );
        }
    }


    @Action(SonificationRegionChanged)
    @ImmutableContext()
    public sonificationRegionChanged(
        { getState, setState, dispatch }: StateContext<SonificationStateModel>,
        { layerId }: SonificationRegionChanged
    ) {
        let state = getState();
        let layer = this.store.selectSnapshot(DataFilesState.getLayerEntities)[layerId];
        if (!isImageLayer(layer)) return;
        let sonifierState = state.layerIdToViewerState[layerId]

        if (sonifierState.regionMode == SonifierRegionMode.CUSTOM && sonifierState.viewportSync) {
            //find viewer which contains file
            let viewer = this.store.selectSnapshot(WorkbenchState.getViewers).find((viewer) => viewer.layerId == layerId);
            if (viewer && viewer.viewportSize && viewer.viewportSize.width != 0 && viewer.viewportSize.height != 0 && sonifierState.regionHistoryIndex !== null) {
                let region = sonifierState.regionHistory[sonifierState.regionHistoryIndex];
                dispatch(
                    new CenterRegionInViewport(
                        layer.rawImageDataId,
                        layer.imageTransformId,
                        layer.viewportTransformId,
                        viewer.viewportSize,
                        region
                    )
                );
            }
        }
    }

    @Action([AddRegionToHistory, UndoRegionSelection, RedoRegionSelection])
    @ImmutableContext()
    public regionHistoryChanged(
        { getState, setState, dispatch }: StateContext<SonificationStateModel>,
        { layerId }: AddRegionToHistory | UndoRegionSelection | RedoRegionSelection
    ) {
        let state = getState();
        let sonificationPanelState = state.layerIdToViewerState[layerId];

        if (sonificationPanelState.regionMode == SonifierRegionMode.CUSTOM) {
            dispatch(new SonificationRegionChanged(layerId));
        }
    }

    @Action(UpdateSonifierFileState)
    @ImmutableContext()
    public updateSonifierFileState(
        { getState, setState, dispatch }: StateContext<SonificationStateModel>,
        { layerId, changes }: UpdateSonifierFileState
    ) {
        setState((state: SonificationStateModel) => {
            let sonificationPanelState = state.layerIdToViewerState[layerId]
            state.layerIdToViewerState[layerId] = {
                ...sonificationPanelState,
                ...changes,
            };

            dispatch(new SonificationRegionChanged(layerId));

            return state;
        });
    }

    @Action(AddRegionToHistory)
    @ImmutableContext()
    public addRegionToHistory(
        { getState, setState, dispatch }: StateContext<SonificationStateModel>,
        { layerId, region }: AddRegionToHistory
    ) {
        setState((state: SonificationStateModel) => {
            let sonificationPanelState = state.layerIdToViewerState[layerId];
            if (!sonificationPanelState.regionHistoryInitialized) {
                sonificationPanelState.regionHistoryIndex = 0;
                sonificationPanelState.regionHistory = [region];
                sonificationPanelState.regionHistoryInitialized = true;
            } else if (sonificationPanelState.regionHistoryIndex != null) {
                sonificationPanelState.regionHistory = [
                    ...sonificationPanelState.regionHistory.slice(0, sonificationPanelState.regionHistoryIndex + 1),
                    region,
                ];
                sonificationPanelState.regionHistoryIndex++;
            }
            return state;
        });
    }

    @Action(UndoRegionSelection)
    @ImmutableContext()
    public undoRegionSelection(
        { getState, setState, dispatch }: StateContext<SonificationStateModel>,
        { layerId }: UndoRegionSelection
    ) {
        setState((state: SonificationStateModel) => {
            let sonificationPanelState = state.layerIdToViewerState[layerId];
            if (
                !sonificationPanelState.regionHistoryInitialized ||
                sonificationPanelState.regionHistoryIndex == null ||
                sonificationPanelState.regionHistoryIndex == 0
            )
                return state;
            sonificationPanelState.regionHistoryIndex--;
            return state;
        });
    }

    @Action(RedoRegionSelection)
    @ImmutableContext()
    public redoRegionSelection(
        { getState, setState, dispatch }: StateContext<SonificationStateModel>,
        { layerId }: RedoRegionSelection
    ) {
        setState((state: SonificationStateModel) => {
            let sonificationPanelState = state.layerIdToViewerState[layerId];
            if (
                !sonificationPanelState.regionHistoryInitialized ||
                sonificationPanelState.regionHistoryIndex == null ||
                sonificationPanelState.regionHistoryIndex == sonificationPanelState.regionHistory.length - 1
            ) {
                return state;
            }
            sonificationPanelState.regionHistoryIndex++;
            return state;
        });
    }

    @Action(ClearRegionHistory)
    @ImmutableContext()
    public clearRegionHistory(
        { getState, setState, dispatch }: StateContext<SonificationStateModel>,
        { layerId }: ClearRegionHistory
    ) {
        setState((state: SonificationStateModel) => {
            let sonificationPanelState = state.layerIdToViewerState[layerId];
            if (
                !sonificationPanelState.regionHistoryInitialized ||
                sonificationPanelState.regionHistoryIndex == sonificationPanelState.regionHistory.length - 1
            )
                return state;
            sonificationPanelState.regionHistoryIndex = null;
            sonificationPanelState.regionHistory = [];
            sonificationPanelState.regionHistoryInitialized = false;
            return state;
        });
    }

    @Action(SetProgressLine)
    @ImmutableContext()
    public setProgressLine(
        { getState, setState, dispatch }: StateContext<SonificationStateModel>,
        { layerId, line }: SetProgressLine
    ) {
        setState((state: SonificationStateModel) => {
            let sonificationPanelState = state.layerIdToViewerState[layerId];
            sonificationPanelState.progressLine = line;
            return state;
        });
    }

    @Action(Sonify)
    @ImmutableContext()
    public sonify({ getState, setState, dispatch }: StateContext<SonificationStateModel>, { layerId, region }: Sonify) {

        let getSonificationUrl = (jobId) => `${getCoreApiUrl(this.config)}/jobs/${jobId}/result/files/sonification`;

        let state = getState();
        let sonificationPanelState = state.layerIdToViewerState[layerId];
        let settings = {
            x: Math.floor(region.x) + 1,
            y: Math.floor(region.y) + 1,
            width: Math.floor(region.width),
            height: Math.floor(region.height),
            numTones: Math.floor(sonificationPanelState.toneCount),
            tempo: Math.ceil(region.height / sonificationPanelState.duration),
            indexSounds: true,
        };


        //check whether new job should be created or if previous job result can be used
        if (sonificationPanelState.sonificationJobId) {
            let job = this.store.selectSnapshot(JobsState.getJobById(sonificationPanelState.sonificationJobId))

            if (job && isSonificationJob(job) && job.result && job.result.errors.length == 0 && job.fileId === layerId) {
                let jobSettings: SonificationJobSettings = {
                    x: job.settings.x,
                    y: job.settings.y,
                    width: job.settings.width,
                    height: job.settings.height,
                    numTones: job.settings.numTones,
                    tempo: job.settings.tempo,
                    indexSounds: job.settings.indexSounds,
                };
                if (deepEqual(jobSettings, settings)) {
                    return dispatch(new SonificationCompleted(layerId, getSonificationUrl(job.id), ''));
                }
            }
        }

        let job: SonificationJob = {
            id: null,
            fileId: layerId,
            type: JobType.Sonification,
            settings: settings,
            state: null
        };

        setState((state: SonificationStateModel) => {
            let sonificationPanelState = state.layerIdToViewerState[layerId];
            sonificationPanelState.sonificationLoading = true;
            return state;
        });

        let job$ = this.jobService.createJob(job);
        return job$.pipe(
            tap(job => {
                if (job.id) {
                    setState((state: SonificationStateModel) => {
                        state.layerIdToViewerState[layerId].sonificationJobId = job.id;
                        return state;
                    });
                }
                if (job.state.status == 'completed' && job.result) {
                    let sonificationUrl = '';
                    let error = '';
                    if (isSonificationJob(job)) {
                        if (job.result.errors.length == 0) {
                            sonificationUrl = getSonificationUrl(job.id);
                            error = '';
                        } else {
                            error = job.result.errors.map((e) => e.detail).join(', ');
                        }
                        setState((state: SonificationStateModel) => {
                            let sonificationPanelState = state.layerIdToViewerState[layerId];
                            sonificationPanelState.sonificationLoading = false;
                            sonificationPanelState.sonificationJobId = job.id;

                            state.layerIdToViewerState[layerId] = {
                                ...sonificationPanelState,
                            };
                            return state;
                        });
                        dispatch(new SonificationCompleted(layerId, sonificationUrl, error));
                    }
                }
            })
        )
    }

    @Action(ClearSonification)
    @ImmutableContext()
    public clearSonification(
        { getState, setState, dispatch }: StateContext<SonificationStateModel>,
        { layerId }: ClearSonification
    ) {
        setState((state: SonificationStateModel) => {
            let sonificationPanelState = state.layerIdToViewerState[layerId];
            sonificationPanelState.sonificationLoading = null;
            sonificationPanelState.sonificationJobId = '';
            return state;
        });
    }



}


