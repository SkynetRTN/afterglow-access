import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Select, Store } from '@ngxs/store';
import { Observable, Subject } from 'rxjs';
import { distinctUntilChanged, filter, map, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { LoadJob, LoadJobResult, LoadJobs, SelectJob } from '../../jobs.actions';
import { JobsState } from '../../jobs.state';
import { Job } from '../../models/job';
import { JobResult } from '../../models/job-result';
import { JobType } from '../../models/job-types';
import { isPhotometryJob } from '../../models/photometry';

@Component({
  selector: 'app-jobs-page',
  templateUrl: './jobs-page.component.html',
  styleUrls: ['./jobs-page.component.scss']
})
export class JobsPageComponent implements OnInit, OnDestroy {

  private destroy$: Subject<any> = new Subject<any>();
  JobType = JobType;

  @Select(JobsState.getLoading) loading$: Observable<boolean>;
  // @Select(JobsState.getJobs) jobs$: Observable<Job[]>;
  @Select(JobsState.getSelectedJob) selectedJob$: Observable<Job>;

  jobs$: Observable<Job[]>;

  constructor(private store: Store, private route: ActivatedRoute, private router: Router) {
    this.store.dispatch(new LoadJobs())

    let selectedId$ = this.route.queryParams.pipe(
      map((params) => params['id']),
      filter((id) => !isNaN(+id)),
      distinctUntilChanged()
    )

    selectedId$.pipe(
      takeUntil(this.destroy$),
      withLatestFrom(this.selectedJob$)
    ).subscribe(([id, selectedJob]) => {
      if (id && (!selectedJob || selectedJob.id != id)) {
        let actions = [];
        let job = this.store.selectSnapshot(JobsState.getJobById(id))
        if (!job) actions.push(new LoadJob(id))
        if (!job || !job.result) actions.push(new LoadJobResult(id))
        actions.push(new SelectJob(id))
        this.store.dispatch(actions);
      }
    })


    this.route.queryParams.subscribe(params => {
      let id = +params['id'];
      if (!isNaN(id) && this.store.selectSnapshot(JobsState.getSelectedJobId) != id.toString()) {
        this.store.dispatch(new SelectJob(id.toString()))

      }
    })
    //hide all auto-photometry jobs
    this.jobs$ = this.store.select(JobsState.getJobs).pipe(
      // map(jobs => jobs.filter(job => !isPhotometryJob(job) || job.fileIds.length > 1))
      // map(jobs => jobs.sort((a, b) => {
      //   let aDate = new Date(Date.parse((a.state?.completedOn || a.state?.createdOn) + ' GMT'))
      //   let bDate = new Date(Date.parse((b.state?.completedOn || b.state?.createdOn) + ' GMT'))
      //   return bDate.getTime() - aDate.getTime()
      // })
      map(jobs => jobs.sort((a, b) => +b.id - +a.id))
    )

  }

  ngOnInit(): void {
  }

  onSelectedJobChange(job: Job) {
    this.router.navigate([], { queryParams: { id: job.id }, replaceUrl: true })
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this.destroy$.next();
    this.destroy$.complete();
  }


}
