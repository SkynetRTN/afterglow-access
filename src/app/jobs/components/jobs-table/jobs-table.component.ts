import { Component, OnInit } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { LoadJobs } from '../../jobs.actions';
import { JobsState } from '../../jobs.state';
import { Job } from '../../models/job';
import { JobType } from '../../models/job-types';

@Component({
  selector: 'app-jobs-table',
  templateUrl: './jobs-table.component.html',
  styleUrls: ['./jobs-table.component.scss']
})
export class JobsTableComponent implements OnInit {
  JobType = JobType;

  @Select(JobsState.getLoading) loading$: Observable<boolean>;
  @Select(JobsState.getJobs) jobs$: Observable<Job[]>;

  displayedColumns = ['id', 'type', 'state']
  hoveredRow: Job;
  selectedJobId: string = null;

  constructor(private store: Store) {
    this.store.dispatch(new LoadJobs())
  }

  ngOnInit(): void {
  }

  onRowClick($event: MouseEvent, row: Job) {
    this.selectedJobId = row.id;
  }

}
