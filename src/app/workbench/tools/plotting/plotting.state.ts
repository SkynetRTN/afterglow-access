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
import { CenterRegionInViewport, CloseDataFileSuccess, CloseLayerSuccess, InvalidateHeader, InvalidateRawImageTiles, LoadLayerHeader, LoadLayerHeaderSuccess, LoadLibrary, LoadLibrarySuccess } from 'src/app/data-files/data-files.actions';
import { getLongestCommonStartingSubstring, isNotEmpty } from 'src/app/utils/utils';
import { AfterglowDataFileService } from '../../services/afterglow-data-files';
import { RemoveSources } from '../../sources.actions';
import { Region } from 'src/app/data-files/models/region';
import { SourcesState } from '../../sources.state';
import { getHeight, getSourceCoordinates, getWidth, isImageLayer } from 'src/app/data-files/models/data-file';
import { WorkbenchState } from '../../workbench.state';
import { Viewer } from '../../models/viewer';
import { toSourceExtractionJobSettings } from '../../models/global-settings';
import { SourceExtractionJob, SourceExtractionJobSettings } from 'src/app/jobs/models/source-extraction';
import { parseDms } from 'src/app/utils/skynet-astro';
import { AlertDialogComponent, AlertDialogConfig } from 'src/app/utils/alert-dialog/alert-dialog.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { getCoreApiUrl } from 'src/app/afterglow-config';
import { AfterglowConfigService } from 'src/app/afterglow-config.service';
import { CircleMarker, Marker, MarkerType } from '../../models/marker';
import { PlottingPanelConfig } from './models/plotting-panel-config';
import { PosType } from '../../models/source';
import { StartLine, SyncPlottingPanelStates, UpdateConfig, UpdateLine, UpdateViewerState } from './plotting.actions';

export interface PlottingViewerStateModel {
    id: string;
    measuring: boolean;
    lineMeasureStart: { primaryCoord: number; secondaryCoord: number; posType: PosType } | null;
    lineMeasureEnd: { primaryCoord: number; secondaryCoord: number; posType: PosType } | null;
}

export interface PlottingStateModel {
    version: string;
    config: PlottingPanelConfig;
    nextViewerStateId: number;
    nextMarkerId: number;
    idToViewerState: { [id: string]: PlottingViewerStateModel }
    layerIdToViewerStateId: { [id: string]: string },
    fileIdToViewerStateId: { [id: string]: string }
}

const defaultState: PlottingStateModel = {
    version: 'f24d45d4-5194-4406-be15-511911c5aaf5',
    config: {
        interpolatePixels: false,
        centroidClicks: false,
        planetCentroiding: false,
        plotterSyncEnabled: false,
        plotMode: '1D',
    },
    nextViewerStateId: 0,
    nextMarkerId: 0,
    idToViewerState: {},
    layerIdToViewerStateId: {},
    fileIdToViewerStateId: {}
};

@State<PlottingStateModel>({
    name: 'plotting',
    defaults: defaultState,
})
@Injectable()
export class PlottingState {
    constructor(private actions$: Actions, private dialog: MatDialog, private store: Store, private jobService: JobService, private dataFileService: AfterglowDataFileService,
        private config: AfterglowConfigService) { }

    @Selector()
    public static getState(state: PlottingStateModel) {
        return state;
    }

    @Selector()
    public static getConfig(state: PlottingStateModel) {
        return state.config;
    }

    @Selector()
    public static getIdToViewerStateLookup(state: PlottingStateModel) {
        return state.idToViewerState;
    }

    public static getViewerStateById(id: string) {
        return createSelector([PlottingState.getIdToViewerStateLookup], (idToViewerState: { [id: string]: PlottingViewerStateModel }) => {
            return idToViewerState[id] || null;
        });
    }

    @Selector()
    public static getLayerIdToViewerStateIdLookup(state: PlottingStateModel) {
        return state.layerIdToViewerStateId;
    }

    @Selector()
    public static getFileIdToViewerStateIdLookup(state: PlottingStateModel) {
        return state.fileIdToViewerStateId;
    }

    static getViewerStateIdByViewerId(viewerId: string) {
        return createSelector(
            [
                WorkbenchState.getViewerEntities,
                PlottingState.getLayerIdToViewerStateIdLookup,
                PlottingState.getFileIdToViewerStateIdLookup,
            ],
            (
                viewerEntities: { [id: string]: Viewer },
                layerIdToStateId: { [id: string]: string },
                fileIdToStateId: { [id: string]: string },
            ) => {
                let viewer = viewerEntities[viewerId];
                if (!viewer) return null;
                return viewer.layerId ? layerIdToStateId[viewer.layerId] : fileIdToStateId[viewer.fileId];
            }
        );
    }

    static getViewerStateByViewerId(viewerId: string) {
        return createSelector(
            [
                PlottingState.getViewerStateIdByViewerId(viewerId),
                PlottingState.getIdToViewerStateLookup,
            ],
            (
                viewerStateId: string,
                idToViewerState: { [id: string]: PlottingViewerStateModel },
            ) => {
                return idToViewerState[viewerStateId] || null;
            }
        );
    }



    @Action(UpdateConfig)
    public updateConfig({ getState, setState, dispatch }: StateContext<PlottingStateModel>, { changes }: UpdateConfig) {
        setState((state: PlottingStateModel) => {
            return {
                ...state,
                config: {
                    ...state.config,
                    ...changes
                }
            };
        });
    }

    @Action(UpdateViewerState)
    @ImmutableContext()
    public updateViewerState({ getState, setState, dispatch }: StateContext<PlottingStateModel>, { id, changes }: UpdateViewerState) {
        setState((state: PlottingStateModel) => {
            state.idToViewerState[id] = {
                ...state.idToViewerState[id],
                ...changes,
                id: id
            }
            return state;
        });
    }






    @Action(LoadLibrarySuccess)
    @ImmutableContext()
    public loadLibrarySuccess(
        { getState, setState, dispatch }: StateContext<PlottingStateModel>,
        { layers, correlationId }: LoadLibrarySuccess
    ) {
        let state = getState();
        let layerIds = Object.keys(state.layerIdToViewerStateId);
        layers.filter((layer) => !(layer.id in layerIds)).forEach(layer => {
            setState((state: PlottingStateModel) => {
                let id = (state.nextViewerStateId++).toString();
                state.layerIdToViewerStateId[layer.id] = id;
                state.idToViewerState[id] = {
                    id: id,
                    measuring: false,
                    lineMeasureStart: null,
                    lineMeasureEnd: null,
                }
                return state;
            })
        })
        let fileIds = Object.keys(state.fileIdToViewerStateId);
        layers.filter((layer) => !(layer.fileId in fileIds)).forEach(layer => {
            setState((state: PlottingStateModel) => {
                let id = (state.nextViewerStateId++).toString();
                state.fileIdToViewerStateId[layer.fileId] = id;
                state.idToViewerState[id] = {
                    id: id,
                    measuring: false,
                    lineMeasureStart: null,
                    lineMeasureEnd: null,
                }
                return state;
            })
        })
    }

    @Action(CloseLayerSuccess)
    @ImmutableContext()
    public closeLayerSuccess(
        { getState, setState, dispatch }: StateContext<PlottingStateModel>,
        { layerId }: CloseLayerSuccess
    ) {
        setState((state: PlottingStateModel) => {
            if (layerId in state.layerIdToViewerStateId) {
                delete state.idToViewerState[state.layerIdToViewerStateId[layerId]]
                delete state.layerIdToViewerStateId[layerId]
            }
            return state;
        });
    }

    @Action(CloseDataFileSuccess)
    @ImmutableContext()
    public closeFileSuccess(
        { getState, setState, dispatch }: StateContext<PlottingStateModel>,
        { fileId }: CloseDataFileSuccess
    ) {
        setState((state: PlottingStateModel) => {
            if (fileId in state.fileIdToViewerStateId) {
                delete state.idToViewerState[state.fileIdToViewerStateId[fileId]]
                delete state.fileIdToViewerStateId[fileId]
            }
            return state;
        });
    }

    @Action(StartLine)
    @ImmutableContext()
    public startLine(
        { getState, setState, dispatch }: StateContext<PlottingStateModel>,
        { id, point }: StartLine
    ) {
        let state = getState();
        if (!(id in state.idToViewerState)) {
            return;
        }

        setState((state: PlottingStateModel) => {
            let plottingPanelState = state.idToViewerState[id];

            if (!plottingPanelState.measuring) {
                plottingPanelState.lineMeasureStart = { ...point };
                plottingPanelState.lineMeasureEnd = { ...point };
            } else {
                plottingPanelState.lineMeasureEnd = { ...point };
            }
            plottingPanelState.measuring = !plottingPanelState.measuring;

            return state;
        });
    }

    @Action(UpdateLine)
    @ImmutableContext()
    public updateLine(
        { getState, setState, dispatch }: StateContext<PlottingStateModel>,
        { id, point }: UpdateLine
    ) {
        let state = getState();
        if (!(id in state.idToViewerState)) {
            return;
        }

        setState((state: PlottingStateModel) => {
            let plottingPanelState = state.idToViewerState[id];
            if (!plottingPanelState.measuring) return state;

            plottingPanelState.lineMeasureEnd = point;

            return state;
        });
    }


    @Action(SyncPlottingPanelStates)
    @ImmutableContext()
    public syncFilePlotters(
        { getState, setState, dispatch }: StateContext<PlottingStateModel>,
        { referenceId, ids }: SyncPlottingPanelStates
    ) {
        let state = getState();

        let referenceState = state.idToViewerState[referenceId];
        if (!referenceState) return;

        ids.forEach((id) => {
            if (referenceId == id) return;
            let targetState = state.idToViewerState[id];
            if (JSON.stringify(targetState.measuring) == JSON.stringify(referenceState.measuring) && JSON.stringify(targetState.lineMeasureEnd) == JSON.stringify(referenceState.lineMeasureEnd) && JSON.stringify(targetState.lineMeasureStart) == JSON.stringify(referenceState.lineMeasureStart)) return;

            dispatch(
                new UpdateViewerState(id, {
                    ...referenceState,
                })
            );
        });
    }

}


