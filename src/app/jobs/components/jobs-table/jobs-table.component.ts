import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { LoadJobs } from '../../jobs.actions';
import { JobsState } from '../../jobs.state';
import { Job } from '../../models/job';
import { JobType } from '../../models/job-types';
import { isPhotometryJob } from '../../models/photometry';

@Component({
  selector: 'app-jobs-table',
  templateUrl: './jobs-table.component.html',
  styleUrls: ['./jobs-table.component.scss']
})
export class JobsTableComponent implements OnInit {
  @Input() jobs: Job[];
  @Input() selectedJob: Job;

  @Output() selectionChange = new EventEmitter<Job>();

  displayedColumns = ['id', 'type', 'state', 'createdOn']

  constructor(private store: Store) {

  }

  ngOnInit(): void {
  }

}
