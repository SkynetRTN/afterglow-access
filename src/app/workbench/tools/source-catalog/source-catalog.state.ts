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
import { CloseLayerSuccess, InvalidateHeader, InvalidateRawImageTiles, LoadLibrary } from 'src/app/data-files/data-files.actions';
import { getLongestCommonStartingSubstring, isNotEmpty } from 'src/app/utils/utils';
import { AfterglowDataFileService } from '../../services/afterglow-data-files';
import { SourcePanelConfig } from './models/source-panel-config';
import { EndSourceSelectionRegion, UpdateConfig, UpdateSourceSelectionRegion } from './source-catalog.actions';
import { RemoveSources } from '../../sources.actions';
import { Region } from 'src/app/data-files/models/region';
import { SourcesState } from '../../sources.state';
import { getSourceCoordinates } from 'src/app/data-files/models/data-file';
import { WorkbenchState } from '../../workbench.state';
import { Viewer } from '../../models/viewer';
import { InitializeWorkbenchLayerState } from '../../workbench.actions';

export interface SourceCatalogViewerStateModel {
    markerSelectionRegion: Region | null;
}

export interface SourceCatalogStateModel {
    version: string;
    config: SourcePanelConfig,
    layerIdToState: { [id: string]: SourceCatalogViewerStateModel },
    fileIdToState: { [id: string]: SourceCatalogViewerStateModel }
}

const defaultState: SourceCatalogStateModel = {
    version: 'f24d45d4-5194-4406-be15-511911c5aaf5',
    config: {
        showSourceLabels: false,
        showSourceMarkers: true,
        centroidClicks: true,
        planetCentroiding: false,
        showSourcesFromAllFiles: false,
        selectedSourceIds: [],
        coordMode: 'sky',
    },
    layerIdToState: {},
    fileIdToState: {}
};

@State<SourceCatalogStateModel>({
    name: 'sourceCatalog',
    defaults: defaultState,
})
@Injectable()
export class SourceCatalogState {
    constructor(private actions$: Actions, private store: Store, private jobService: JobService, private dataFileService: AfterglowDataFileService) { }

    @Selector()
    public static getState(state: SourceCatalogStateModel) {
        return state;
    }

    @Selector()
    public static getLayerIdToState(state: SourceCatalogStateModel) {
        return state.layerIdToState;
    }

    public static getLayerStateById(id: string) {
        return createSelector([SourceCatalogState.getLayerIdToState], (layerIdToState: { [id: string]: SourceCatalogViewerStateModel }) => {
            return layerIdToState[id] || null;
        });
    }

    @Selector()
    public static getFileIdToState(state: SourceCatalogStateModel) {
        return state.fileIdToState;
    }

    public static getFileStateById(id: string) {
        return createSelector([SourceCatalogState.getFileIdToState], (fileIdToState: { [id: string]: SourceCatalogViewerStateModel }) => {
            return fileIdToState[id] || null;
        });
    }

    static getSourceCatalogViewerStateByViewerId(viewerId: string) {
        return createSelector(
            [
                WorkbenchState.getViewerEntities,
                SourceCatalogState.getLayerIdToState,
                SourceCatalogState.getFileIdToState,
            ],
            (
                viewerEntities: { [id: string]: Viewer },
                layerIdToState: { [id: string]: SourceCatalogViewerStateModel },
                fileIdToState: { [id: string]: SourceCatalogViewerStateModel },
            ) => {
                let viewer = viewerEntities[viewerId];
                if (!viewer) return null;
                return viewer.layerId ? layerIdToState[viewer.layerId] : fileIdToState[viewer.fileId];
            }
        );
    }

    @Selector()
    public static getConfig(state: SourceCatalogStateModel) {
        return state.config;
    }

    @Selector()
    public static getShowSourceLabels(state: SourceCatalogStateModel) {
        return state.config.showSourceLabels;
    }

    @Selector()
    public static getSourceCoordMode(state: SourceCatalogStateModel) {
        return state.config.coordMode;
    }

    @Selector()
    public static getShowSourcesFromAllFiles(state: SourceCatalogStateModel) {
        return state.config.showSourcesFromAllFiles;
    }

    @Action(UpdateConfig)
    public updateConfig({ getState, setState, dispatch }: StateContext<SourceCatalogStateModel>, { changes }: UpdateConfig) {
        setState((state: SourceCatalogStateModel) => {
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
        { getState, setState, dispatch }: StateContext<SourceCatalogStateModel>,
        { layerId: layerId }: CloseLayerSuccess
    ) {
        setState((state: SourceCatalogStateModel) => {

            return state;
        });
    }

    @Action(RemoveSources)
    @ImmutableContext()
    public removeSources(
        { getState, setState, dispatch }: StateContext<SourceCatalogStateModel>,
        { sourceIds }: RemoveSources
    ) {
        let state = getState();

        setState((state: SourceCatalogStateModel) => {
            state.config.selectedSourceIds = state.config.selectedSourceIds.filter(
                (id) => !sourceIds.includes(id)
            );
            return state;
        });
    }


    @Action(UpdateSourceSelectionRegion)
    @ImmutableContext()
    public updateSourceRegionSelection(
        { getState, setState, dispatch }: StateContext<SourceCatalogStateModel>,
        { layerId: layerId, region }: UpdateSourceSelectionRegion
    ) {
        setState((state: SourceCatalogStateModel) => {
            let sourceState = state.layerIdToState[layerId];
            sourceState.markerSelectionRegion = {
                ...region,
            };
            return state;
        });
    }

    @Action(EndSourceSelectionRegion)
    @ImmutableContext()
    public endSourceRegionSelection(
        { getState, setState, dispatch }: StateContext<SourceCatalogStateModel>,
        { layerId: layerId, mode }: EndSourceSelectionRegion
    ) {
        setState((state: SourceCatalogStateModel) => {
            let sourcesState = state.layerIdToState[layerId];

            let region = sourcesState.markerSelectionRegion;
            let header = this.store.selectSnapshot(DataFilesState.getHeaderByLayerId(layerId));
            if (!header || !region) return state;

            let sourceIds = this.store
                .selectSnapshot(SourcesState.getSources)
                .filter((source) => {
                    let coord = getSourceCoordinates(header!, source);
                    let x1 = Math.min(region!.x, region!.x + region!.width);
                    let y1 = Math.min(region!.y, region!.y + region!.height);
                    let x2 = x1 + Math.abs(region!.width);
                    let y2 = y1 + Math.abs(region!.height);

                    return coord && coord.x >= x1 && coord.x < x2 && coord.y >= y1 && coord.y < y2;
                })
                .map((source) => source.id);

            if (mode == 'remove') {
                state.config.selectedSourceIds = state.config.selectedSourceIds.filter(
                    (id) => !sourceIds.includes(id)
                );
            } else {
                let filteredSourceIds = sourceIds.filter((id) => !state.config.selectedSourceIds.includes(id));
                state.config.selectedSourceIds = state.config.selectedSourceIds.concat(
                    filteredSourceIds
                );
            }
            sourcesState.markerSelectionRegion = null;

            return state;
        });
    }

    @Action(InitializeWorkbenchLayerState)
    @ImmutableContext()
    public initializeWorkbenchLayerState(
        { getState, setState, dispatch }: StateContext<SourceCatalogStateModel>,
        { layerId: layerId }: InitializeWorkbenchLayerState
    ) {
        setState((state: SourceCatalogStateModel) => {
            state.layerIdToState[layerId] = {
                markerSelectionRegion: null
            }
            return state;
        })
    }

}


