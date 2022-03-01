import { A, E } from '@angular/cdk/keycodes';
import { DecimalPipe } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Actions, ofActionCompleted, ofActionDispatched, Store } from '@ngxs/store';
import { Observable, Subject } from 'rxjs';
import { filter, switchMap, take, takeUntil } from 'rxjs/operators';
import { InvalidateHeader, InvalidateRawImageTiles } from 'src/app/data-files/data-files.actions';
import { DataFilesState } from 'src/app/data-files/data-files.state';
import { DataFile, IHdu } from 'src/app/data-files/models/data-file';
import { HduType } from 'src/app/data-files/models/data-file-type';
import { CreateJob, CreateJobSuccess } from 'src/app/jobs/jobs.actions';
import { JobsState } from 'src/app/jobs/jobs.state';
import { JobType } from 'src/app/jobs/models/job-types';
import { PixelOpsJob, PixelOpsJobResult } from 'src/app/jobs/models/pixel-ops';
import { SourceExtractionJob, SourceExtractionJobResult, SourceExtractionJobSettings } from 'src/app/jobs/models/source-extraction';
import { CorrelationIdGenerator } from 'src/app/utils/correlated-action';
import { toSourceExtractionJobSettings } from '../../models/global-settings';
import { WorkbenchState } from '../../workbench.state';

@Component({
  selector: 'app-psf-matching-dialog',
  templateUrl: './psf-matching-dialog.component.html',
  styleUrls: ['./psf-matching-dialog.component.scss']
})
export class PsfMatchingDialogComponent implements OnInit, OnDestroy {

  destroy$ = new Subject<boolean>();
  displayedColumns: string[] = ['order', 'name', 'type', 'fwhmX', 'fwhmY', 'status'];
  file: DataFile;
  hdus: IHdu[];
  fwhmByHduId: { [hduId: string]: { fwhmX: number, fwhmY: number, fwhm: number } } = {};
  extractionState: { [hduId: string]: { status: 'pending' | 'success' | 'error'; message: string, loading: boolean, sourceExtractionJobId?: string } } = {}
  blurState: { [hduId: string]: { status: 'pending' | 'success' | 'error'; message: string, loading: boolean, pixelOpsJobId?: string } } = {}

  constructor(
    public dialogRef: MatDialogRef<PsfMatchingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public fileId: string,
    private store: Store,
    private correlationIdGenerator: CorrelationIdGenerator,
    private actions$: Actions,
    private decimalPipe: DecimalPipe,
  ) {

    this.file = this.store.selectSnapshot(DataFilesState.getFileById(fileId))
    this.hdus = this.store.selectSnapshot(DataFilesState.getHdusByFileId(fileId))

    this.hdus.forEach(hdu => {
      if (hdu.type == HduType.TABLE) {
        this.extractionState[hdu.id] = { status: 'success', message: 'N/A', loading: false }
      }
      else {
        this.extractionState[hdu.id] = { status: 'pending', message: 'Analyzing...', loading: false }
      }
    })


    this.hdus.filter(hdu => hdu.type == HduType.IMAGE).forEach(hdu => {
      let jobFinished$ = this.extractSources(hdu);

      jobFinished$.pipe(
        takeUntil(this.destroy$)
      ).subscribe(v => {
        if (v.result.successful) {
          let a = v.action as CreateJob;
          let jobEntity = this.store.selectSnapshot(JobsState.getJobEntities)[a.job.id];
          let result = jobEntity.result as SourceExtractionJobResult;

          if (result.data.length != 0) {
            this.extractionState[hdu.id].message = 'waiting for analysis of other layers...'
            this.extractionState[hdu.id].status = 'success'
            this.fwhmByHduId[hdu.id] = this.fwhmFromExtractionResult(result)
          }
          else {
            this.extractionState[hdu.id].message = `error analyzing PSF`
            this.extractionState[hdu.id].status = 'error'
          }


        } else {
          this.extractionState[hdu.id].message = `error analyzing PSF`
          this.extractionState[hdu.id].status = 'error'
        }

        this.extractionState[hdu.id].loading = false;
      })
    })

  }

  private fwhmFromExtractionResult(result: SourceExtractionJobResult) {
    let median = arr => {
      const mid = Math.floor(arr.length / 2),
        nums = [...arr].sort((a, b) => a - b);
      return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
    };

    let fwhmX = median(result.data.map(s => s.fwhmX))
    let fwhmY = median(result.data.map(s => s.fwhmY))
    return { fwhmX: fwhmX, fwhmY: fwhmY, fwhm: Math.min(fwhmX, fwhmY) }

  }

  private extractSources(hdu: IHdu) {
    let settings = this.store.selectSnapshot(WorkbenchState.getSettings)
    let jobSettings: SourceExtractionJobSettings = toSourceExtractionJobSettings(settings);


    let job: SourceExtractionJob = {
      id: null,
      type: JobType.SourceExtraction,
      fileIds: [hdu.id],
      sourceExtractionSettings: jobSettings,
      mergeSources: false,
      state: null,
      result: null,
    };

    let correlationId = this.correlationIdGenerator.next();
    this.store.dispatch(new CreateJob(job, 1000, correlationId));
    this.extractionState[hdu.id].loading = true;

    let jobFinished$ = this.actions$.pipe(
      ofActionCompleted(CreateJob),
      filter((v) => v.action.correlationId == correlationId),
      take(1)
    )

    this.actions$.pipe(
      ofActionDispatched(CreateJobSuccess),
      filter<CreateJobSuccess>((a) => a.correlationId == correlationId),
      takeUntil(jobFinished$),
    ).subscribe(a => {
      this.extractionState[hdu.id].sourceExtractionJobId = a.job.id;
    })

    return jobFinished$
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  extractionIsComplete() {
    return !this.hdus.map(hdu => this.extractionState[hdu.id].status != 'pending').includes(false)
  }

  getMaxFwhm() {
    return Math.max(...Object.values(this.fwhmByHduId).filter(value => value.fwhm).map(value => value.fwhm))
  }

  canBlur(hdu: IHdu) {
    if (hdu.type != HduType.IMAGE) return false;

    let fwhm = this.fwhmByHduId[hdu.id].fwhm || null;
    let maxFwhm = this.getMaxFwhm();
    return maxFwhm && fwhm && fwhm < maxFwhm
  }

  blurHdu(hdu: IHdu) {
    if (!this.canBlur(hdu)) return;

    let maxFwhm = this.getMaxFwhm();
    let fwhm = this.fwhmByHduId[hdu.id]?.fwhm;

    if (!maxFwhm || !fwhm) return;

    let sigma = Math.sqrt(maxFwhm * maxFwhm - fwhm * fwhm)

    let job: PixelOpsJob = {
      id: null,
      type: JobType.PixelOps,
      fileIds: [hdu.id],
      auxFileIds: [],
      inplace: true,
      op: `gaussian_filter(img, ${sigma})`,
      state: null,
      result: null,
    };

    let correlationId = this.correlationIdGenerator.next();
    this.store.dispatch(new CreateJob(job, 1000, correlationId));
    this.blurState[hdu.id] = { message: 'blurring...', loading: true, status: 'pending' };

    let jobFinished$ = this.actions$.pipe(
      ofActionCompleted(CreateJob),
      filter((v) => v.action.correlationId == correlationId),
      take(1)
    )

    this.actions$.pipe(
      ofActionDispatched(CreateJobSuccess),
      filter<CreateJobSuccess>((a) => a.correlationId == correlationId),
      takeUntil(jobFinished$),
    ).subscribe(a => {
      this.blurState[hdu.id].pixelOpsJobId = a.job.id;
    })

    jobFinished$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(v => {
      if (v.result.successful) {
        let a = v.action as CreateJob;
        let jobEntity = this.store.selectSnapshot(JobsState.getJobEntities)[a.job.id];
        let result = jobEntity.result as PixelOpsJobResult;

        this.store.dispatch([new InvalidateRawImageTiles(hdu.id), new InvalidateHeader(hdu.id)])

        this.blurState[hdu.id].message = ''
        this.blurState[hdu.id].status = 'success'

        let extractionJobFinished$ = this.extractSources(hdu);

        extractionJobFinished$.pipe(
          takeUntil(this.destroy$)
        ).subscribe(v => {
          if (v.result.successful) {
            let a = v.action as CreateJob;
            let jobEntity = this.store.selectSnapshot(JobsState.getJobEntities)[a.job.id];
            let result = jobEntity.result as SourceExtractionJobResult;

            if (result.data.length != 0) {
              this.fwhmByHduId[hdu.id] = this.fwhmFromExtractionResult(result)
            }
          }

          this.extractionState[hdu.id].loading = false;
        })

      } else {
        this.blurState[hdu.id].message = `error blurring layer`
        this.blurState[hdu.id].status = 'error'
      }

      this.blurState[hdu.id].loading = false;
    })
  }

}
