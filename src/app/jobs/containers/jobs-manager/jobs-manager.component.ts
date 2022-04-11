import { Component, OnInit } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { LoadJobs, SelectJob } from '../../jobs.actions';
import { JobsState } from '../../jobs.state';
import { Job } from '../../models/job';
import { JobResult } from '../../models/job-result';
import { JobType } from '../../models/job-types';
import { isPhotometryJob } from '../../models/photometry';

@Component({
  selector: 'app-jobs-manager',
  templateUrl: './jobs-manager.component.html',
  styleUrls: ['./jobs-manager.component.scss']
})
export class JobsManagerComponent implements OnInit {
  JobType = JobType;

  @Select(JobsState.getLoading) loading$: Observable<boolean>;
  @Select(JobsState.getJobs) jobs$: Observable<Job[]>;
  @Select(JobsState.getSelectedJob) selectedJob$: Observable<Job>;
  @Select(JobsState.getSelectedJobResult) selectedJobResult$: Observable<JobResult>;

  jobsFiltered$: Observable<Job[]>;

  constructor(private store: Store) {
    this.store.dispatch(new LoadJobs())

    //hide all auto-photometry jobs
    this.jobsFiltered$ = this.jobs$.pipe(
      // map(jobs => jobs.filter(job => !isPhotometryJob(job) || job.fileIds.length > 1))
    )
  }

  ngOnInit(): void {
  }

  onSelectedJobChange(job: Job) {
    this.store.dispatch(new SelectJob(job.id))
  }

}
