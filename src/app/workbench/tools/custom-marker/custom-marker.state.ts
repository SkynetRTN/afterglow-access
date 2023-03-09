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


import * as deepEqual from 'fast-deep-equal';
import { CustomMarkerPanelComponent } from './custom-marker-panel/custom-marker-panel.component';
import { CustomMarkerPanelConfig } from './models/custom-marker-panel-config';
import { AddCustomMarkers, DeselectCustomMarkers, EndCustomMarkerSelectionRegion, RemoveCustomMarkers, SelectCustomMarkers, SetCustomMarkerSelection, UpdateConfig, UpdateCustomMarker, UpdateCustomMarkerSelectionRegion } from './custom-marker.actions';
import { CircleMarker, Marker, MarkerType } from '../../models/marker';

export interface CustomMarkerViewerStateModel {
    id: string;
    markerIds: string[];
    markerEntities: { [id: string]: Marker };
    markerSelectionRegion: Region | null;
}

export interface CustomMarkerStateModel {
    version: string;
    config: CustomMarkerPanelConfig;
    nextViewerStateId: number;
    nextMarkerId: number;
    idToViewerState: { [id: string]: CustomMarkerViewerStateModel }
    layerIdToViewerStateId: { [id: string]: string },
    fileIdToViewerStateId: { [id: string]: string }
}

const defaultState: CustomMarkerStateModel = {
    version: 'f24d45d4-5194-4406-be15-511911c5aaf5',
    config: {
        centroidClicks: false,
        usePlanetCentroiding: false,
    },
    nextViewerStateId: 0,
    nextMarkerId: 0,
    idToViewerState: {},
    layerIdToViewerStateId: {},
    fileIdToViewerStateId: {}
};

@State<CustomMarkerStateModel>({
    name: 'customMarker',
    defaults: defaultState,
})
@Injectable()
export class CustomMarkerState {
    constructor(private actions$: Actions, private dialog: MatDialog, private store: Store, private jobService: JobService, private dataFileService: AfterglowDataFileService,
        private config: AfterglowConfigService) { }

    @Selector()
    public static getState(state: CustomMarkerStateModel) {
        return state;
    }

    @Selector()
    public static getConfig(state: CustomMarkerStateModel) {
        return state.config;
    }

    @Selector()
    public static getIdToViewerStateLookup(state: CustomMarkerStateModel) {
        return state.idToViewerState;
    }

    public static getViewerStateById(id: string) {
        return createSelector([CustomMarkerState.getIdToViewerStateLookup], (idToViewerState: { [id: string]: CustomMarkerViewerStateModel }) => {
            return idToViewerState[id] || null;
        });
    }

    @Selector()
    public static getLayerIdToViewerStateIdLookup(state: CustomMarkerStateModel) {
        return state.layerIdToViewerStateId;
    }

    @Selector()
    public static getFileIdToViewerStateIdLookup(state: CustomMarkerStateModel) {
        return state.fileIdToViewerStateId;
    }

    static getViewerStateIdByViewerId(viewerId: string) {
        return createSelector(
            [
                WorkbenchState.getViewerEntities,
                CustomMarkerState.getLayerIdToViewerStateIdLookup,
                CustomMarkerState.getFileIdToViewerStateIdLookup,
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
                CustomMarkerState.getViewerStateIdByViewerId(viewerId),
                CustomMarkerState.getIdToViewerStateLookup,
            ],
            (
                viewerStateId: string,
                idToViewerState: { [id: string]: CustomMarkerViewerStateModel },
            ) => {
                return idToViewerState[viewerStateId] || null;
            }
        );
    }



    @Action(UpdateConfig)
    public updateConfig({ getState, setState, dispatch }: StateContext<CustomMarkerStateModel>, { changes }: UpdateConfig) {
        setState((state: CustomMarkerStateModel) => {
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
        { getState, setState, dispatch }: StateContext<CustomMarkerStateModel>,
        { layerId }: CloseLayerSuccess
    ) {
        setState((state: CustomMarkerStateModel) => {
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
        { getState, setState, dispatch }: StateContext<CustomMarkerStateModel>,
        { fileId }: CloseDataFileSuccess
    ) {
        setState((state: CustomMarkerStateModel) => {
            if (fileId in state.fileIdToViewerStateId) {
                delete state.idToViewerState[state.fileIdToViewerStateId[fileId]]
                delete state.fileIdToViewerStateId[fileId]
            }
            return state;
        });
    }

    @Action(LoadLibrarySuccess)
    @ImmutableContext()
    public loadLibrarySuccess(
        { getState, setState, dispatch }: StateContext<CustomMarkerStateModel>,
        { layers, correlationId }: LoadLibrarySuccess
    ) {
        let state = getState();
        let layerIds = Object.keys(state.layerIdToViewerStateId);
        layers.filter((layer) => !(layer.id in layerIds)).forEach(layer => {
            setState((state: CustomMarkerStateModel) => {
                let id = (state.nextViewerStateId++).toString();
                state.layerIdToViewerStateId[layer.id] = id;
                state.idToViewerState[id] = {
                    id: id,
                    markerEntities: {},
                    markerIds: [],
                    markerSelectionRegion: null,
                }
                return state;
            })
        })
        let fileIds = Object.keys(state.fileIdToViewerStateId);
        layers.filter((layer) => !(layer.fileId in fileIds)).forEach(layer => {
            setState((state: CustomMarkerStateModel) => {
                let id = (state.nextViewerStateId++).toString();
                state.fileIdToViewerStateId[layer.fileId] = id;
                state.idToViewerState[id] = {
                    id: id,
                    markerEntities: {},
                    markerIds: [],
                    markerSelectionRegion: null,
                }
                return state;
            })
        })
    }

    @Action(UpdateCustomMarkerSelectionRegion)
    @ImmutableContext()
    public updateCustomMarkerSelectionRegion(
        { getState, setState, dispatch }: StateContext<CustomMarkerStateModel>,
        { id, region }: UpdateCustomMarkerSelectionRegion
    ) {
        setState((state: CustomMarkerStateModel) => {

            let viewerState = state.idToViewerState[id]
            if (!viewerState) return state;

            viewerState.markerSelectionRegion = {
                ...region,
            };
            return state;
        });
    }

    @Action(EndCustomMarkerSelectionRegion)
    @ImmutableContext()
    public endCustomMarkerSelectionRegion(
        { getState, setState, dispatch }: StateContext<CustomMarkerStateModel>,
        { id, mode }: EndCustomMarkerSelectionRegion
    ) {
        setState((state: CustomMarkerStateModel) => {
            let viewerState = state.idToViewerState[id]
            if (!viewerState) return state;

            let region = viewerState.markerSelectionRegion;
            if (!region) return state;

            viewerState.markerIds.forEach((id) => {
                let marker = viewerState.markerEntities[id];
                if (marker.type != MarkerType.CIRCLE) return;
                let circleMarker = marker as CircleMarker;
                let x1 = Math.min(region!.x, region!.x + region!.width);
                let y1 = Math.min(region!.y, region!.y + region!.height);
                let x2 = x1 + Math.abs(region!.width);
                let y2 = y1 + Math.abs(region!.height);

                if (circleMarker.x >= x1 && circleMarker.x < x2 && circleMarker.y >= y1 && circleMarker.y < y2) {
                    marker.selected = mode != 'remove';
                }
            });
            viewerState.markerSelectionRegion = null;

            return state;
        });
    }

    @Action(UpdateCustomMarker)
    @ImmutableContext()
    public updateCustomMarker(
        { getState, setState, dispatch }: StateContext<CustomMarkerStateModel>,
        { id, markerId, changes }: UpdateCustomMarker
    ) {
        setState((state: CustomMarkerStateModel) => {
            let viewerState = state.idToViewerState[id]
            if (viewerState.markerIds.includes(markerId)) {
                viewerState.markerEntities[markerId] = {
                    ...viewerState.markerEntities[markerId],
                    ...changes,
                };
            }
            return state;
        });
    }

    @Action(AddCustomMarkers)
    @ImmutableContext()
    public addCustomMarkers(
        { getState, setState, dispatch }: StateContext<CustomMarkerStateModel>,
        { id, markers }: AddCustomMarkers
    ) {
        setState((state: CustomMarkerStateModel) => {
            let viewerState = state.idToViewerState[id]

            markers.forEach((marker) => {
                let nextSeed = state.nextMarkerId++;
                if (marker.label == null || marker.label == undefined) {
                    // marker.marker.label = `M${nextSeed}`;
                    marker.label = '';
                }
                let markerId = `CUSTOM_MARKER_${id}_${nextSeed.toString()}`;
                viewerState.markerIds.push(markerId);
                viewerState.markerEntities[markerId] = {
                    ...marker,
                    id: markerId,
                };
            });

            return state;
        });
    }

    @Action(RemoveCustomMarkers)
    @ImmutableContext()
    public removeCustomMarkers(
        { getState, setState, dispatch }: StateContext<CustomMarkerStateModel>,
        { id, markers }: RemoveCustomMarkers
    ) {
        setState((state: CustomMarkerStateModel) => {
            let viewerState = state.idToViewerState[id]

            let idsToRemove = markers.map((m) => m.id);
            viewerState.markerIds = viewerState.markerIds.filter((id) => !idsToRemove.includes(id));
            markers.forEach((marker) => {
                if (marker.id && marker.id in viewerState.markerEntities) delete viewerState.markerEntities[marker.id];
            });

            return state;
        });
    }

    @Action(SelectCustomMarkers)
    @ImmutableContext()
    public selectCustomMarkers(
        { getState, setState, dispatch }: StateContext<CustomMarkerStateModel>,
        { id, markers }: SelectCustomMarkers
    ) {
        setState((state: CustomMarkerStateModel) => {
            let viewerState = state.idToViewerState[id]

            markers.forEach((marker) => {
                if (marker.id && viewerState.markerIds.includes(marker.id)) {
                    viewerState.markerEntities[marker.id].selected = true;
                }
            });
            return state;
        });
    }

    @Action(DeselectCustomMarkers)
    @ImmutableContext()
    public deselectCustomMarkers(
        { getState, setState, dispatch }: StateContext<CustomMarkerStateModel>,
        { id, markers }: DeselectCustomMarkers
    ) {
        setState((state: CustomMarkerStateModel) => {
            let viewerState = state.idToViewerState[id]

            markers.forEach((marker) => {
                if (marker.id && viewerState.markerIds.includes(marker.id)) {
                    viewerState.markerEntities[marker.id].selected = false;
                }
            });
            return state;
        });
    }

    @Action(SetCustomMarkerSelection)
    @ImmutableContext()
    public setCustomMarkerSelection(
        { getState, setState, dispatch }: StateContext<CustomMarkerStateModel>,
        { id, markers }: SetCustomMarkerSelection
    ) {
        setState((state: CustomMarkerStateModel) => {
            let viewerState = state.idToViewerState[id]

            let selectedMarkerIds = markers.map((m) => m.id);
            viewerState.markerIds.forEach((markerId) => {
                viewerState.markerEntities[markerId].selected = selectedMarkerIds.includes(markerId);
            });
            return state;
        });
    }


}


