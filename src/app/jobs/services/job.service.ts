import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { BehaviorSubject, interval, merge, Observable, of, ReplaySubject, Subject } from 'rxjs';
import { delay, filter, flatMap, switchMap, take, takeUntil } from 'rxjs/operators';
import { AddJob, UpdateJobResult, UpdateJobState } from '../jobs.actions';
import { Job } from '../models/job';
import { JobApiService } from './job-api.service';

@Injectable({
  providedIn: 'root'
})
export class JobService {


  private updateJobEvent$ = new Subject<string>();
  private stopUpdater$ = new Subject<string>();
  private jobCompletedEvent$ = new Subject<string>();

  constructor(private jobApi: JobApiService, private store: Store) {
  }

  createJob(job: Job, updateInterval: number = 2500) {
    return new Observable<Job>(observer => {
      this.jobApi.createJob(job).subscribe(
        resp => {
          job = { ...resp.data };
          observer.next(job);
          this.store.dispatch(new AddJob(job))

          if (updateInterval == 0) {
            observer.complete();
            return;
          }

          let stop$ = this.stopUpdater$.pipe(
            filter(id => id == job.id),
            take(1)
          )

          interval(updateInterval)
            .pipe(
              takeUntil(stop$),
              switchMap(() => this.jobApi.getJobState(job.id))
            ).subscribe(
              resp => {
                job = {
                  ...job,
                  state: resp.data
                }
                observer.next(job)
                this.store.dispatch(new UpdateJobState(job.id, job.state))

                if (job.state.status == 'canceled' || job.state.status == 'completed') {
                  this.stopUpdater$.next(job.id);

                  if (job.state.status == 'completed') {
                    this.jobApi.getJobResult(job.id).subscribe(
                      (resp) => {
                        job.result = resp
                        observer.next(job);
                        this.store.dispatch(new UpdateJobResult(job.id, job.result))

                        observer.complete();
                      },
                      (error) => {
                        observer.error(error)
                      }

                    )
                  }
                  else {
                    observer.complete();
                  }
                }
              },
              error => {
                this.stopUpdater$.next(job.id);
                observer.error(error)
              }
            )

        },
        error => {
          observer.error(error)
        });

    })
  }

  stopUpdater(id: string) {
    this.stopUpdater$.next(id);
  }
}
