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
import { CenterRegionInViewport, CloseLayerSuccess, InvalidateHeader, InvalidateRawImageTiles, LoadLayerHeader, LoadLayerHeaderSuccess, LoadLibrary } from 'src/app/data-files/data-files.actions';
import { getLongestCommonStartingSubstring, isNotEmpty } from 'src/app/utils/utils';
import { AfterglowDataFileService } from '../../services/afterglow-data-files';
import { RemoveSources } from '../../sources.actions';
import { Region } from 'src/app/data-files/models/region';
import { SourcesState } from '../../sources.state';
import { getHeight, getSourceCoordinates, getWidth, isImageLayer } from 'src/app/data-files/models/data-file';
import { WorkbenchState } from '../../workbench.state';
import { Viewer } from '../../models/viewer';
import { InitializeWorkbenchFileState, InitializeWorkbenchLayerState } from '../../workbench.actions';
import { toSourceExtractionJobSettings } from '../../models/global-settings';
import { SourceExtractionJob, SourceExtractionJobSettings } from 'src/app/jobs/models/source-extraction';
import { parseDms } from 'src/app/utils/skynet-astro';
import { AlertDialogComponent, AlertDialogConfig } from 'src/app/utils/alert-dialog/alert-dialog.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { getCoreApiUrl } from 'src/app/afterglow-config';
import { AfterglowConfigService } from 'src/app/afterglow-config.service';
import { CircleMarker, Marker, MarkerType } from '../../models/marker';
import { FileInfoPanelConfig } from './models/file-info-panel-config';
import { UpdateConfig } from './file-info.actions';

export interface FileInfoStateModel {
    version: string;
    config: FileInfoPanelConfig;
}

const defaultState: FileInfoStateModel = {
    version: 'f24d45d4-5194-4406-be15-511911c5aaf5',
    config: {
        showRawHeader: false,
        useSystemTime: false,
    }
};

@State<FileInfoStateModel>({
    name: 'fileInfo',
    defaults: defaultState,
})
@Injectable()
export class FileInfoState {
    constructor(private actions$: Actions, private dialog: MatDialog, private store: Store, private jobService: JobService, private dataFileService: AfterglowDataFileService,
        private config: AfterglowConfigService) { }

    @Selector()
    public static getState(state: FileInfoStateModel) {
        return state;
    }

    @Selector()
    public static getConfig(state: FileInfoStateModel) {
        return state.config;
    }



    @Action(UpdateConfig)
    public updateConfig({ getState, setState, dispatch }: StateContext<FileInfoStateModel>, { changes }: UpdateConfig) {
        setState((state: FileInfoStateModel) => {
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
        { getState, setState, dispatch }: StateContext<FileInfoStateModel>,
        { layerId }: CloseLayerSuccess
    ) {
        setState((state: FileInfoStateModel) => {

            return state;
        });
    }

}


