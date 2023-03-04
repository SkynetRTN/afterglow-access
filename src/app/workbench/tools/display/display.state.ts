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
import { Region } from 'src/app/data-files/models/region';
import { WorkbenchState } from '../../workbench.state';
import { Viewer } from '../../models/viewer';
import { MatDialog } from '@angular/material/dialog';
import { getCoreApiUrl } from 'src/app/afterglow-config';
import { AfterglowConfigService } from 'src/app/afterglow-config.service';
import { ILayer, isImageLayer } from 'src/app/data-files/models/data-file';
import { SetCompositeNormalizationLayerId } from './display.actions';

export interface DisplayStateModel {
    version: string;
    fileIdToCompositeNormalizationLayerId: { [id: string]: string }
}

const defaultState: DisplayStateModel = {
    version: 'f24d45d4-5194-4406-be15-511911c5aaf5',
    fileIdToCompositeNormalizationLayerId: {}
};

@State<DisplayStateModel>({
    name: 'display',
    defaults: defaultState,
})
@Injectable()
export class DisplayState {
    constructor(private actions$: Actions, private dialog: MatDialog, private store: Store, private jobService: JobService, private dataFileService: AfterglowDataFileService,
        private config: AfterglowConfigService) { }

    @Selector()
    public static getState(state: DisplayStateModel) {
        return state;
    }

    @Selector()
    public static getFileIdToCompositeNormalizationLayerId(state: DisplayStateModel) {
        return state.fileIdToCompositeNormalizationLayerId;
    }

    public static getCompositeNormalizationLayerIdByFileId(fileId: string) {
        return createSelector([DisplayState.getFileIdToCompositeNormalizationLayerId], (fileIdToSelectedLayerId: { [id: string]: string }) => {
            return fileIdToSelectedLayerId[fileId] || null;
        });
    }

    public static getCompositeNormalizationLayerByFileId(fileId: string) {
        return createSelector([DisplayState.getCompositeNormalizationLayerIdByFileId(fileId), DataFilesState.getLayerEntities], (selectedLayerId: string, layerEntities: { [id: string]: ILayer }) => {
            let layer = layerEntities[selectedLayerId];
            let imageLayer = layer && isImageLayer(layer) ? layer : null;
            return imageLayer;
        });
    }

    @Action(SetCompositeNormalizationLayerId)
    @ImmutableContext()
    public setCompositeNormalizationLayerId(
        { getState, setState, dispatch }: StateContext<DisplayStateModel>,
        { layerId }: SetCompositeNormalizationLayerId
    ) {

        let layer = this.store.selectSnapshot(DataFilesState.getLayerById(layerId))
        if (!layer) return;

        setState((state: DisplayStateModel) => {
            state.fileIdToCompositeNormalizationLayerId[layer.fileId] = layerId;
            return state;
        });
    }


    @Action(CloseLayerSuccess)
    @ImmutableContext()
    public closeLayerSuccess(
        { getState, setState, dispatch }: StateContext<DisplayStateModel>,
        { layerId }: CloseLayerSuccess
    ) {
        setState((state: DisplayStateModel) => {

            return state;
        });
    }

    @Action(CloseDataFileSuccess)
    @ImmutableContext()
    public closeFileSuccess(
        { getState, setState, dispatch }: StateContext<DisplayStateModel>,
        { fileId }: CloseDataFileSuccess
    ) {
        setState((state: DisplayStateModel) => {

            return state;
        });
    }

    @Action(LoadLibrarySuccess)
    @ImmutableContext()
    public loadLibrarySuccess(
        { getState, setState, dispatch }: StateContext<DisplayStateModel>,
        { layers, correlationId }: LoadLibrarySuccess
    ) {
        let state = getState();
        let fileIds = Object.keys(state.fileIdToCompositeNormalizationLayerId);
        layers.filter((layer) => !(fileIds.includes(layer.fileId))).forEach(layer => {
            setState((state: DisplayStateModel) => {
                state.fileIdToCompositeNormalizationLayerId[layer.fileId] = layer.id
                return state;
            })
        })
    }



}


