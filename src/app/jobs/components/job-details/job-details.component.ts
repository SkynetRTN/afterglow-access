import { Component, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { ActivatedRoute, Router } from '@angular/router';
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

  tabs = ['job', 'result']

  @Input() job: Job;

  showJson = true;

  exportPhotometryDataForm = new FormGroup({
    fieldCalibrationJobId: new FormControl('', { validators: [] }),
  })
  fieldCalibrationJobOptions$: Observable<FieldCalibrationJob[]>;

  selectedTabIndex = 0;


  constructor(private store: Store, private route: ActivatedRoute, private router: Router) {
    this.fieldCalibrationJobOptions$ = this.store.select(JobsState.getJobs).pipe(
      map(jobs => jobs.filter(isFieldCalibrationJob))
    )

    this.route.fragment.subscribe(fragment => {
      let index = this.tabs.indexOf(fragment);
      if (index >= 0) this.selectedTabIndex = index;
    })


  }

  ngOnInit(): void {
  }

  getJobFileLabels(ids: string[]) {
    let layers = this.store.selectSnapshot(DataFilesState.getLayerEntities)
    return ids.map(id => this.getJobFileLabel(id))
  }

  getJobFileLabel(id: string) {
    let layers = this.store.selectSnapshot(DataFilesState.getLayerEntities)
    return `${layers[id]?.name || id}`
  }

  onSelectedIndexChange(index: number) {
    this.router.navigate([], { fragment: this.tabs[index] })
  }


}
