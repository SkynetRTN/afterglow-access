import { Actions, ofActionDispatched } from '@ngxs/store';
import { filter, take, takeUntil, map, flatMap } from 'rxjs/operators';
import { merge, Observable } from "rxjs";
import { CreateJobSuccess, JobCompleted, UpdateJobSuccess, CreateJobFail } from '../jobs.actions';

export class JobActionHandler {

    public static getJobStreams(correlationId: string, actions$: Actions) {
        let createJobSuccess$: Observable<CreateJobSuccess>;
        let jobCompleted$: Observable<JobCompleted>;
        let jobUpdated$: Observable<UpdateJobSuccess>;
        let createJobFail$: Observable<CreateJobFail>;

        createJobSuccess$ = actions$.pipe(
            ofActionDispatched(CreateJobSuccess),
            filter<CreateJobSuccess>(action => action.correlationId == correlationId),
            flatMap(createJobSuccess => {
                jobCompleted$ = actions$.pipe(
                    ofActionDispatched(JobCompleted),
                    filter<JobCompleted>(jobCompleted => jobCompleted.job.id == createJobSuccess.job.id)
                )

                jobUpdated$ = actions$.pipe(
                    ofActionDispatched(UpdateJobSuccess),
                    filter<UpdateJobSuccess>(updateJobSuccess => updateJobSuccess.job.id == createJobSuccess.job.id),
                    takeUntil(jobCompleted$)
                )

                return merge(jobUpdated$, jobCompleted$)
            })
        )

        createJobFail$ = actions$.pipe(
            ofActionDispatched(CreateJobFail),
            filter<CreateJobFail>(action => action.correlationId == correlationId)
        )

        let jobCreated$ = merge(createJobSuccess$, createJobFail$).pipe(
            take(1)
        );


        return {
            jobCreated$: jobCreated$,
            jobCompleted$: jobCompleted$,
            jobUpdated$: jobUpdated$
        }
    }
}