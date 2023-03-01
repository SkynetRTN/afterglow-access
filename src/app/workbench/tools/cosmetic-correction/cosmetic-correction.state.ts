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
} from '@ngxs/store';
import { ImmutableSelector, ImmutableContext } from '@ngxs-labs/immer-adapter';
import { tap, catchError, finalize, filter, take, takeUntil, map, flatMap, skip, delay } from 'rxjs/operators';
import { of, merge, interval, Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { CosmeticCorrectionSettings, defaults } from './models/cosmetic-correction-settings';
import { SetCurrentJobId, SetSelectedLayerIds, UpdateSettings } from './cosmetic-correction.actions';
import { JobsState } from 'src/app/jobs/jobs.state';
import { Job } from 'src/app/jobs/models/job';
import { isCosmeticCorrectionJob } from 'src/app/jobs/models/cosmetic-correction';

export interface CosmeticCorrectionStateModel {
    version: string;
    settings: CosmeticCorrectionSettings,
    selectedLayerIds: string[],
    currentJobId: string
}

const cosmeticCorrectionDefaultState: CosmeticCorrectionStateModel = {
    version: 'f24d45d4-5194-4406-be15-511911c5aaf5',
    settings: defaults,
    selectedLayerIds: [],
    currentJobId: null
};

@State<CosmeticCorrectionStateModel>({
    name: 'cosmeticCorrection',
    defaults: cosmeticCorrectionDefaultState,
})
@Injectable()
export class CosmeticCorrectionState {
    constructor(private actions$: Actions) { }

    @Selector()
    public static getState(state: CosmeticCorrectionStateModel) {
        return state;
    }

    @Selector()
    public static getSettings(state: CosmeticCorrectionStateModel) {
        return state.settings;
    }

    @Selector()
    public static getCurrentJobId(state: CosmeticCorrectionStateModel) {
        return state.currentJobId;
    }

    @Selector([CosmeticCorrectionState.getCurrentJobId, JobsState.getJobEntities])
    public static getCurrentJob(jobId: string, jobEntities: { [id: string]: Job }) {
        let job = jobEntities[jobId];
        if (!job || !isCosmeticCorrectionJob(job)) return null;
        return job;
    }

    @Selector()
    public static getSelectedLayerIds(state: CosmeticCorrectionStateModel) {
        return state.selectedLayerIds;
    }


    @Action(UpdateSettings)
    public updateCosmeticCorrectionSettings({ getState, setState, dispatch }: StateContext<CosmeticCorrectionStateModel>, { changes }: UpdateSettings) {
        setState((state: CosmeticCorrectionStateModel) => {
            return {
                ...state,
                settings: {
                    ...state.settings,
                    ...changes
                }
            };
        });
    }

    @Action(SetSelectedLayerIds)
    public setSelectedLayerIds({ getState, setState, dispatch }: StateContext<CosmeticCorrectionStateModel>, { layerIds }: SetSelectedLayerIds) {
        setState((state: CosmeticCorrectionStateModel) => {
            return {
                ...state,
                selectedLayerIds: [...layerIds]
            };
        });
    }

    @Action(SetCurrentJobId)
    public setCurrentJobId({ getState, setState, dispatch }: StateContext<CosmeticCorrectionStateModel>, { jobId }: SetCurrentJobId) {
        setState((state: CosmeticCorrectionStateModel) => {
            return {
                ...state,
                jobId: jobId
            };
        });
    }
}
