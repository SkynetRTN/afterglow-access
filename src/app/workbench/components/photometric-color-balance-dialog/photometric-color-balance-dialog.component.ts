import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Store } from '@ngxs/store';
import { LogMessage as NgxLogMessage } from 'ngx-log-monitor';
import { BehaviorSubject, combineLatest, merge, Subject, timer } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { DataFilesState } from 'src/app/data-files/data-files.state';
import { FieldCalibrationJob } from 'src/app/jobs/models/field-calibration';
import { JobType } from 'src/app/jobs/models/job-types';
import { isFieldCalibrationJob } from 'src/app/jobs/models/field-calibration';
import { JobService } from 'src/app/jobs/services/job.service';
import { toFieldCalibration, toPhotometryJobSettings, toSourceExtractionJobSettings } from '../../models/global-settings';
import { WorkbenchState } from '../../workbench.state';

@Component({
  selector: 'app-photometric-color-balance-dialog',
  templateUrl: './photometric-color-balance-dialog.component.html',
  styleUrls: ['./photometric-color-balance-dialog.component.scss']
})
export class PhotometricColorBalanceDialogComponent implements OnInit, AfterViewInit {
  logStream$ = new BehaviorSubject<{ message: string, type?: 'SUCCESS' | 'WARN' | 'ERR' | 'INFO' }>({ message: 'Calculating photometric zero point for each layer...' });

  constructor(public dialogRef: MatDialogRef<PhotometricColorBalanceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public layerIds: string[],
    private store: Store,
    private jobService: JobService) {
    let settings = this.store.selectSnapshot(WorkbenchState.getSettings);
    let photometryJobSettings = toPhotometryJobSettings(settings);
    let sourceExtractionJobSettings = toSourceExtractionJobSettings(settings);
    let fieldCalibration = toFieldCalibration(settings);

    let job: FieldCalibrationJob = {
      type: JobType.FieldCalibration,
      id: null,
      photometrySettings: photometryJobSettings,
      sourceExtractionSettings: sourceExtractionJobSettings,
      fieldCal: fieldCalibration,
      fileIds: layerIds,
      state: null,
    };

    let job$ = this.jobService.createJob(job);

    job$.subscribe(
      (job) => {

        if (isFieldCalibrationJob(job)) {
          if (['in_progress', 'pending'].includes(job.state.status)) {
            if (job.state.progress) {
              this.logStream$.next({ message: `${job.state.progress}% complete` })
            }
            else {
              this.logStream$.next({ message: `Field calibration in progress.` })
            }
            return;
          }

          if (job.state.status == 'completed') {
            if (job.result) {

            }
            else {
              this.logStream$.next({ message: `Field calibration completed. Downloading result.` })
            }
          }

        }




      },
      (error) => {

      },
      () => {

      })
  }

  ngOnInit(): void {

  }

  ngAfterViewInit() {

  }

}
