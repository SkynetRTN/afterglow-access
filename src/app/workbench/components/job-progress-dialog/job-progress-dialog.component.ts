import { Component, OnInit, Inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { takeUntil, map } from 'rxjs/operators';
import { Job } from '../../../jobs/models/job';
import { ProgressBarMode } from '@angular/material/progress-bar';

export interface JobProgressDialogConfig {
  title: string;
  message: string;
  progressMode: ProgressBarMode;
  job$: Observable<Job>;
}

@Component({
  selector: 'app-progress-dialog',
  templateUrl: './job-progress-dialog.component.html',
  styleUrls: ['./job-progress-dialog.component.scss'],
})
export class JobProgressDialogComponent implements OnInit {
  destroy$ = new Subject<boolean>();
  progress$: Observable<number>;

  constructor(
    public dialogRef: MatDialogRef<JobProgressDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public config: JobProgressDialogConfig
  ) {
    this.progress$ = this.config.job$.pipe(
      takeUntil(this.destroy$),
      map((job) => job.state.progress)
    );

    this.config.job$.pipe(takeUntil(this.destroy$)).subscribe((job) => {
      if (job.state.status == 'completed') {
        this.dialogRef.close(true);
      } else if (job.state.status == 'canceled') {
        this.dialogRef.close(false);
      }
    });
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
