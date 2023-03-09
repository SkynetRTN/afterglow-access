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
import { KernelFilter, PixelOpsFormData, SIGMA_KERNELS, SIZE_KERNELS } from './models/pixel-ops-form-data';
import { isPixelOpsJob, PixelOpsJob } from 'src/app/jobs/models/pixel-ops';
import { CreateAdvPixelOpsJob, CreatePixelOpsJob, HideCurrentPixelOpsJobState, SetCurrentJobId, UpdateFormData } from './pixel-ops.actions';
import { DataFilesState } from 'src/app/data-files/data-files.state';
import { JobType } from 'src/app/jobs/models/job-types';
import { JobService } from 'src/app/jobs/services/job.service';
import { CloseLayerSuccess, InvalidateHeader, InvalidateRawImageTiles, LoadLibrary } from 'src/app/data-files/data-files.actions';
import { isNotEmpty } from 'src/app/utils/utils';



export interface PixelOpsStateModel {
    version: string;
    showCurrentPixelOpsJobState: boolean;
    formData: PixelOpsFormData;
    currentJobId: string
}

const pixelOpsDefaultState: PixelOpsStateModel = {
    version: 'f24d45d4-5194-4406-be15-511911c5aaf5',
    showCurrentPixelOpsJobState: true,
    formData: {
        operand: '+',
        mode: 'image',
        selectedLayerIds: [],
        auxLayerId: '',
        auxLayerIds: [],
        primaryLayerIds: [],
        scalarValue: 1,
        inPlace: false,
        opString: '',
        kernelFilter: KernelFilter.MEDIAN_FILTER,
        kernelSize: 3,
        kernelSigma: 3
    },
    currentJobId: null
};

@State<PixelOpsStateModel>({
    name: 'pixelOps',
    defaults: pixelOpsDefaultState,
})
@Injectable()
export class PixelOpsState {
    constructor(private actions$: Actions, private store: Store, private jobService: JobService) { }

    @Selector()
    public static getState(state: PixelOpsStateModel) {
        return state;
    }

    @Selector()
    public static getFormData(state: PixelOpsStateModel) {
        return state.formData;
    }

    @Selector()
    public static getCurrentJobId(state: PixelOpsStateModel) {
        return state.currentJobId;
    }

    @Selector([PixelOpsState.getCurrentJobId, JobsState.getJobEntities])
    public static getCurrentJob(jobId: string, jobEntities: { [id: string]: Job }) {
        let job = jobEntities[jobId];
        if (!job || !isPixelOpsJob(job)) return null;
        return job;
    }


    @Action(UpdateFormData)
    public updateFormData({ getState, setState, dispatch }: StateContext<PixelOpsStateModel>, { changes }: UpdateFormData) {
        setState((state: PixelOpsStateModel) => {
            return {
                ...state,
                formData: {
                    ...state.formData,
                    ...changes
                }
            };
        });
    }



    @Action(SetCurrentJobId)
    public setCurrentJobId({ getState, setState, dispatch }: StateContext<PixelOpsStateModel>, { jobId }: SetCurrentJobId) {
        setState((state: PixelOpsStateModel) => {
            return {
                ...state,
                jobId: jobId
            };
        });
    }

    @Action(HideCurrentPixelOpsJobState)
    public hideCurrentPixelOpsJobState({ getState, setState, dispatch }: StateContext<PixelOpsStateModel>, { }: HideCurrentPixelOpsJobState) {
        setState((state: PixelOpsStateModel) => {
            return {
                ...state,
                showCurrentPixelOpsJobState: false
            };
        });
    }

    @Action(CreatePixelOpsJob)
    @ImmutableContext()
    public createPixelOpsJob({ getState, setState, dispatch }: StateContext<PixelOpsStateModel>, { }: CreatePixelOpsJob) {
        let state = getState();
        let layers = this.store.selectSnapshot(DataFilesState.getLayers);
        let dataFiles = this.store.selectSnapshot(DataFilesState.getFileEntities);
        let data = state.formData;
        let imageLayers = [...data.selectedLayerIds, ...data.primaryLayerIds].map((id) => layers.find((f) => f.id == id)).filter(isNotEmpty);
        let auxFileIds: string[] = [];
        let op;
        if (data.mode == 'scalar') {
            op = `img ${data.operand} ${data.scalarValue}`;
        } else if (data.mode == 'image') {
            op = `img ${data.operand} aux_img`;
            auxFileIds.push(data.auxLayerId);
        } else if (data.mode == 'kernel') {
            op = `${data.kernelFilter}(img`;
            if (SIZE_KERNELS.includes(data.kernelFilter)) {
                op += `, ${data.kernelSize}`
            }
            if (SIGMA_KERNELS.includes(data.kernelFilter)) {
                op += `, ${data.kernelSigma}`
            }
            op += ')'
        } else {
            return;
        }

        let job: PixelOpsJob = {
            type: JobType.PixelOps,
            id: null,
            fileIds: imageLayers
                .sort((a, b) => {
                    return dataFiles[a.fileId].name < dataFiles[b.fileId].name
                        ? -1
                        : dataFiles[a.fileId].name > dataFiles[b.fileId].name
                            ? 1
                            : 0;
                })
                .map((f) => f.id),
            auxFileIds: auxFileIds,
            op: op,
            inplace: data.inPlace,
            state: null,
        };


        let job$ = this.jobService.createJob(job);
        return job$.pipe(
            tap(job => {
                if (job.id) {
                    setState((state: PixelOpsStateModel) => {
                        state.currentJobId = job.id;
                        return state;
                    });
                }
                if (job.state.status == 'completed' && job.result) {
                    let actions: any[] = [];
                    if (!isPixelOpsJob(job)) return;
                    let result = job.result;
                    if (result.errors.length != 0) {
                        console.error('Errors encountered during pixel ops job: ', result.errors);
                    }
                    if (result.warnings.length != 0) {
                        console.error('Warnings encountered during pixel ops job: ', result.warnings);
                    }


                    if (job.inplace) {
                        let layerIds = result.fileIds.map((id) => id.toString());
                        layerIds.forEach((layerId) => actions.push(new InvalidateRawImageTiles(layerId)));
                        layerIds.forEach((layerId) => actions.push(new InvalidateHeader(layerId)));
                    }

                    actions.push(new LoadLibrary());
                    dispatch(actions);
                }
            })
        )
    }

    @Action(CreateAdvPixelOpsJob)
    @ImmutableContext()
    public createAdvPixelOpsJob(
        { getState, setState, dispatch }: StateContext<PixelOpsStateModel>,
        { }: CreateAdvPixelOpsJob
    ) {
        let state = getState();
        let layers = this.store.selectSnapshot(DataFilesState.getLayers);
        let dataFiles = this.store.selectSnapshot(DataFilesState.getFileEntities);
        let data = state.formData;
        let imageLayers = [...data.selectedLayerIds, ...data.primaryLayerIds].map((id) => layers.find((f) => f.id == id)).filter(isNotEmpty);
        let auxImageFiles = data.auxLayerIds.map((id) => layers.find((f) => f.id == id)).filter(isNotEmpty);
        let job: PixelOpsJob = {
            type: JobType.PixelOps,
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
            auxFileIds: auxImageFiles
                .sort((a, b) =>
                    dataFiles[a.fileId].name < dataFiles[b.fileId].name
                        ? -1
                        : dataFiles[a.fileId].name > dataFiles[b.fileId].name
                            ? 1
                            : 0
                )
                .map((f) => f.id),
            op: data.opString,
            inplace: data.inPlace,
            state: null,
        };

        let job$ = this.jobService.createJob(job);
        return job$.pipe(
            tap(job => {
                if (job.id) {
                    setState((state: PixelOpsStateModel) => {
                        state.currentJobId = job.id;
                        return state;
                    });
                }
                if (job.state.status == 'completed' && job.result) {
                    let actions: any[] = [];
                    if (!isPixelOpsJob(job)) return;
                    let result = job.result;
                    if (result.errors.length != 0) {
                        console.error('Errors encountered during pixel ops: ', result.errors);
                    }
                    if (result.warnings.length != 0) {
                        console.error('Warnings encountered during pixel ops: ', result.warnings);
                    }


                    if ((job as PixelOpsJob).inplace) {
                        let layerIds = result.fileIds.map((id) => id.toString());
                        layerIds.forEach((layerId) => actions.push(new InvalidateRawImageTiles(layerId)));
                        layerIds.forEach((layerId) => actions.push(new InvalidateHeader(layerId)));
                    }

                    actions.push(new LoadLibrary());
                    dispatch(actions);
                }
            })
        )
    }

    @Action(CloseLayerSuccess)
    @ImmutableContext()
    public removeDataFileSuccess(
        { getState, setState, dispatch }: StateContext<PixelOpsStateModel>,
        { layerId: layerId }: CloseLayerSuccess
    ) {
        setState((state: PixelOpsStateModel) => {
            state.formData.primaryLayerIds = state.formData.primaryLayerIds.filter(
                (id) => id != layerId
            );
            state.formData.auxLayerIds = state.formData.auxLayerIds.filter(
                (id) => id != layerId
            );
            state.formData.auxLayerId =
                state.formData.auxLayerId == layerId
                    ? ''
                    : state.formData.auxLayerId;
            return state;
        });
    }

    @Action(CloseLayerSuccess)
    @ImmutableContext()
    public closeLayerSuccess(
        { getState, setState, dispatch }: StateContext<PixelOpsStateModel>,
        { layerId: layerId }: CloseLayerSuccess
    ) {
        setState((state: PixelOpsStateModel) => {

            state.formData.selectedLayerIds = state.formData.selectedLayerIds.filter(
                (id) => id != layerId
            );

            state.formData.auxLayerIds = state.formData.auxLayerIds.filter(
                (id) => id != layerId
            );

            state.formData.primaryLayerIds = state.formData.primaryLayerIds.filter(
                (id) => id != layerId
            );

            if (state.formData.auxLayerId == layerId) state.formData.auxLayerId = null;

            return state;
        });
    }

}


