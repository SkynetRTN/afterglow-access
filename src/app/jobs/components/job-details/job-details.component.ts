import { Component, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DataFilesState } from 'src/app/data-files/data-files.state';
import { JobsState } from '../../jobs.state';
import { FieldCalibrationJob, isFieldCalibrationJob, isFieldCalibrationJobResult } from '../../models/field-calibration';
import { Job } from '../../models/job';
import { JobResult } from '../../models/job-result';
import { JobType } from '../../models/job-types';
import { isPhotometryJob, isPhotometryJobResult, PhotometryJobSettings } from '../../models/photometry';

@Component({
  selector: 'app-job-details',
  templateUrl: './job-details.component.html',
  styleUrls: ['./job-details.component.scss']
})
export class JobDetailsComponent implements OnInit {
  isPhotometryJob = isPhotometryJob;
  isPhotometryJobResult = isPhotometryJobResult;
  isFieldCalibrationJob = isFieldCalibrationJob;
  isFieldCalibrationJobResult = isFieldCalibrationJobResult;

  @Input() job: Job;
  @Input() result: JobResult;

  showJson = false;

  exportPhotometryDataForm = new FormGroup({
    fieldCalibrationJobId: new FormControl('', { validators: [] }),
  })
  fieldCalibrationJobOptions$: Observable<FieldCalibrationJob[]>;

  constructor(private store: Store, private route: ActivatedRoute) {
    this.fieldCalibrationJobOptions$ = this.store.select(JobsState.getJobs).pipe(
      map(jobs => jobs.filter(isFieldCalibrationJob))
    )

    this.route.fragment.subscribe(fragment => {
      console.log()
    })
  }

  ngOnInit(): void {
  }

  getJobFileLabels(ids: string[]) {
    let hdus = this.store.selectSnapshot(DataFilesState.getHduEntities)
    return ids.map(id => this.getJobFileLabel(id))
  }

  getJobFileLabel(id: string) {
    let hdus = this.store.selectSnapshot(DataFilesState.getHduEntities)
    return `${hdus[id]?.name || id}`
  }


}
