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
import { AligningFormData } from './models/aligning-form-data';
import { isAlignmentJob, AlignmentJob } from 'src/app/jobs/models/alignment';
import { CreateAligningJob, SetCurrentJobId, UpdateFormData } from './aligning.actions';
import { AfterglowDataFileService } from '../../services/afterglow-data-files';



export interface AligningStateModel {
    version: string;
    currentJobId: string;
    formData: AligningFormData
}

const aligningDefaultState: AligningStateModel = {
    version: 'f24d45d4-5194-4406-be15-511911c5aaf5',
    currentJobId: null,
    formData: {
        selectedLayerIds: [],
        mosaicMode: false,
        mosaicSearchRadius: 1,
        refLayerId: '',
    }
};

@State<AligningStateModel>({
    name: 'aligning',
    defaults: aligningDefaultState,
})
@Injectable()
export class AligningState {
    constructor(private actions$: Actions, private store: Store, private jobService: JobService, private dataFileService: AfterglowDataFileService) { }

    @Selector()
    public static getState(state: AligningStateModel) {
        return state;
    }

    @Selector()
    public static getFormData(state: AligningStateModel) {
        return state.formData;
    }


    @Selector()
    public static getCurrentJobId(state: AligningStateModel) {
        return state.currentJobId;
    }

    @Selector([AligningState.getCurrentJobId, JobsState.getJobEntities])
    public static getCurrentJob(jobId: string, jobEntities: { [id: string]: Job }) {
        let job = jobEntities[jobId];
        if (!job || !isAlignmentJob(job)) return null;
        return job;
    }

    @Action(SetCurrentJobId)
    public setCurrentJobId({ getState, setState, dispatch }: StateContext<AligningStateModel>, { jobId }: SetCurrentJobId) {
        setState((state: AligningStateModel) => {
            return {
                ...state,
                jobId: jobId
            };
        });
    }

    @Action(UpdateFormData)
    public updateFormData({ getState, setState, dispatch }: StateContext<AligningStateModel>, { changes }: UpdateFormData) {
        setState((state: AligningStateModel) => {
            return {
                ...state,
                formData: {
                    ...state.formData,
                    ...changes
                }
            };
        });
    }

    @Action(CreateAligningJob)
    @ImmutableContext()
    public createAlignmentJob(
        { getState, setState, dispatch }: StateContext<AligningStateModel>,
        { layerIds, crop, settings }: CreateAligningJob
    ) {
        let state = getState();
        let layers = this.store.selectSnapshot(DataFilesState.getLayers);
        let dataFiles = this.store.selectSnapshot(DataFilesState.getFileEntities);
        let imageLayers = layerIds.map((id) => layers.find((f) => f.id == id)).filter(isNotEmpty);
        let job: AlignmentJob = {
            type: JobType.Alignment,
            id: null,
            fileIds: imageLayers
                .sort((a, b) =>
                    dataFiles[a.fileId].name < dataFiles[b.fileId].name
                        ? -1
                        : dataFiles[a.fileId].name > dataFiles[b.fileId].name
                            ? 1
                            : 0
                )
                .map((f) => f.id),
            inplace: true,
            crop: crop,
            settings: settings,
            state: null,
            result: null,
        };

        let job$ = this.jobService.createJob(job);

        job$.pipe(
            takeUntil(this.actions$.pipe(ofActionDispatched(CreateAligningJob))),
            take(1)
        ).subscribe(job => {
            if (job.id) {
                setState((state: AligningStateModel) => {
                    state.currentJobId = job.id;
                    return state;
                });
            }
        })

        job$.subscribe(job => {
            if (job.state.status == 'completed' && job.result) {
                let actions: any[] = [];
                if (!isAlignmentJob(job)) return;
                let result = job.result;
                if (result.errors.length != 0) {
                    console.error('Errors encountered during aligning: ', result.errors);
                }
                if (result.warnings.length != 0) {
                    console.error('Warnings encountered during aligning: ', result.warnings);
                }

                let layerIds = result.fileIds.map((id) => id.toString());
                if (settings.refImage) {
                    layerIds.push(settings.refImage.toString())
                }


                if (job.inplace) {
                    layerIds.forEach((layerId) => actions.push(new InvalidateRawImageTiles(layerId)));
                    layerIds.forEach((layerId) => actions.push(new InvalidateHeader(layerId)));
                }

                actions.push(new LoadLibrary());
                dispatch(actions);
            }
        })


        return job$
    }


    @Action(CloseLayerSuccess)
    @ImmutableContext()
    public closeLayerSuccess(
        { getState, setState, dispatch }: StateContext<AligningStateModel>,
        { layerId: layerId }: CloseLayerSuccess
    ) {
        setState((state: AligningStateModel) => {
            state.formData.selectedLayerIds = state.formData.selectedLayerIds.filter(
                (id) => id != layerId
            );

            if (!state.formData.selectedLayerIds.includes(state.formData.refLayerId)) {
                state.formData.refLayerId = ''
            }

            return state;
        });
    }




}


