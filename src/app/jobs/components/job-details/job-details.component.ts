import { Component, Input, OnInit } from '@angular/core';
import { Job } from '../../models/job';
import { JobResult } from '../../models/job-result';
import { isPhotometryJob } from '../../models/photometry';

@Component({
  selector: 'app-job-details',
  templateUrl: './job-details.component.html',
  styleUrls: ['./job-details.component.scss']
})
export class JobDetailsComponent implements OnInit {
  isPhotometryJob = isPhotometryJob;

  @Input() job: Job;
  @Input() result: JobResult;

  constructor() { }

  ngOnInit(): void {
  }

}
