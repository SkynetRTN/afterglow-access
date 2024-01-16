import { A, E } from '@angular/cdk/keycodes';
import { DecimalPipe } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Actions, ofActionCompleted, ofActionDispatched, Store } from '@ngxs/store';
import { Observable, Subject } from 'rxjs';
import { filter, switchMap, take, takeUntil } from 'rxjs/operators';
import { InvalidateHeader, InvalidateRawImageTiles } from 'src/app/data-files/data-files.actions';
import { DataFilesState } from 'src/app/data-files/data-files.state';
import { DataFile, ILayer } from 'src/app/data-files/models/data-file';
import { LayerType } from 'src/app/data-files/models/data-file-type';
import { JobsState } from 'src/app/jobs/jobs.state';
import { JobType } from 'src/app/jobs/models/job-types';
import { PixelOpsJob, PixelOpsJobResult } from 'src/app/jobs/models/pixel-ops';
import { isSourceExtractionJob, SourceExtractionJob, SourceExtractionJobResult, SourceExtractionJobSettings } from 'src/app/jobs/models/source-extraction';
import { CorrelationIdGenerator } from 'src/app/utils/correlated-action';
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
  layers: ILayer[];
  fwhmByLayerId: { [layerId: string]: { fwhmX: number, fwhmY: number, fwhm: number } } = {};
  extractionState: { [layerId: string]: { status: 'pending' | 'success' | 'error'; message: string, loading: boolean, sourceExtractionJobId?: string } } = {}
  blurState: { [layerId: string]: { status: 'pending' | 'success' | 'error'; message: string, loading: boolean, pixelOpsJobId?: string } } = {}

  constructor(
    public dialogRef: MatDialogRef<PsfMatchingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public fileId: string,
    private store: Store,
    private correlationIdGenerator: CorrelationIdGenerator,
    private actions$: Actions,
    private decimalPipe: DecimalPipe,
  ) {

    // this.file = this.store.selectSnapshot(DataFilesState.getFileById(fileId))
    // this.layers = this.store.selectSnapshot(DataFilesState.getLayersByFileId(fileId))

    // this.layers.forEach(layer => {
    //   if (layer.type == LayerType.TABLE) {
    //     this.extractionState[layer.id] = { status: 'success', message: 'N/A', loading: false }
    //   }
    //   else {
    //     this.extractionState[layer.id] = { status: 'pending', message: 'Analyzing...', loading: false }
    //   }
    // })


    // this.layers.filter(layer => layer.type == LayerType.IMAGE).forEach(layer => {
    //   let jobFinished$ = this.extractSources(layer);

    //   jobFinished$.pipe(
    //     takeUntil(this.destroy$)
    //   ).subscribe(v => {
    //     if (v.result.successful) {
    //       let a = v.action as CreateJob;
    //       let job = this.store.selectSnapshot(JobsState.getJobById(a.job.id));
    //       if (!isSourceExtractionJob(job)) return;

    //       if (job.result.data.length != 0) {
    //         this.extractionState[layer.id].message = 'waiting for analysis of other layers...'
    //         this.extractionState[layer.id].status = 'success'
    //         this.fwhmByLayerId[layer.id] = this.fwhmFromExtractionResult(job.result)
    //       }
    //       else {
    //         this.extractionState[layer.id].message = `error analyzing PSF`
    //         this.extractionState[layer.id].status = 'error'
    //       }


    //     } else {
    //       this.extractionState[layer.id].message = `error analyzing PSF`
    //       this.extractionState[layer.id].status = 'error'
    //     }

    //     this.extractionState[layer.id].loading = false;
    //   })
    // })

  }

  // private fwhmFromExtractionResult(result: SourceExtractionJobResult) {
  //   let median = arr => {
  //     const mid = Math.floor(arr.length / 2),
  //       nums = [...arr].sort((a, b) => a - b);
  //     return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
  //   };

  //   let fwhmX = median(result.data.map(s => s.fwhmX))
  //   let fwhmY = median(result.data.map(s => s.fwhmY))
  //   return { fwhmX: fwhmX, fwhmY: fwhmY, fwhm: Math.min(fwhmX, fwhmY) }

  // }

  // private extractSources(layer: ILayer) {
  //   let settings = this.store.selectSnapshot(WorkbenchState.getSettings)
  //   let jobSettings: SourceExtractionJobSettings = toSourceExtractionJobSettings(settings);


  //   let job: SourceExtractionJob = {
  //     id: null,
  //     type: JobType.SourceExtraction,
  //     fileIds: [layer.id],
  //     sourceExtractionSettings: jobSettings,
  //     mergeSources: false,
  //     state: null,
  //   };

  //   let correlationId = this.correlationIdGenerator.next();
  //   this.store.dispatch(new CreateJob(job, 1000, correlationId));
  //   this.extractionState[layer.id].loading = true;

  //   let jobFinished$ = this.actions$.pipe(
  //     ofActionCompleted(CreateJob),
  //     filter((v) => v.action.correlationId == correlationId),
  //     take(1)
  //   )

  //   this.actions$.pipe(
  //     ofActionDispatched(CreateJobSuccess),
  //     filter<CreateJobSuccess>((a) => a.correlationId == correlationId),
  //     takeUntil(jobFinished$),
  //   ).subscribe(a => {
  //     this.extractionState[layer.id].sourceExtractionJobId = a.job.id;
  //   })

  //   return jobFinished$
  // }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  // extractionIsComplete() {
  //   return !this.layers.map(layer => this.extractionState[layer.id].status != 'pending').includes(false)
  // }

  // getMaxFwhm() {
  //   return Math.max(...Object.values(this.fwhmByLayerId).filter(value => value.fwhm).map(value => value.fwhm))
  // }

  // canBlur(layer: ILayer) {
  //   if (layer.type != LayerType.IMAGE) return false;

  //   let fwhm = this.fwhmByLayerId[layer.id]?.fwhm || null;
  //   let maxFwhm = this.getMaxFwhm();
  //   return maxFwhm && fwhm && fwhm < maxFwhm
  // }

  // blurLayer(layer: ILayer) {
  //   if (!this.canBlur(layer)) return;

  //   let maxFwhm = this.getMaxFwhm();
  //   let fwhm = this.fwhmByLayerId[layer.id]?.fwhm;

  //   if (!maxFwhm || !fwhm) return;

  //   let sigma = Math.sqrt(maxFwhm * maxFwhm - fwhm * fwhm)

  //   let job: PixelOpsJob = {
  //     id: null,
  //     type: JobType.PixelOps,
  //     fileIds: [layer.id],
  //     auxFileIds: [],
  //     inplace: true,
  //     op: `gaussian_filter(img, ${sigma})`,
  //     state: null,
  //   };

  //   let correlationId = this.correlationIdGenerator.next();
  //   this.store.dispatch(new CreateJob(job, 1000, correlationId));
  //   this.blurState[layer.id] = { message: 'blurring...', loading: true, status: 'pending' };

  //   let jobFinished$ = this.actions$.pipe(
  //     ofActionCompleted(CreateJob),
  //     filter((v) => v.action.correlationId == correlationId),
  //     take(1)
  //   )

  //   this.actions$.pipe(
  //     ofActionDispatched(CreateJobSuccess),
  //     filter<CreateJobSuccess>((a) => a.correlationId == correlationId),
  //     takeUntil(jobFinished$),
  //   ).subscribe(a => {
  //     this.blurState[layer.id].pixelOpsJobId = a.job.id;
  //   })

  //   jobFinished$.pipe(
  //     takeUntil(this.destroy$)
  //   ).subscribe(v => {
  //     if (v.result.successful) {
  //       let a = v.action as CreateJob;

  //       this.store.dispatch([new InvalidateRawImageTiles(layer.id), new InvalidateHeader(layer.id)])

  //       this.blurState[layer.id].message = ''
  //       this.blurState[layer.id].status = 'success'

  //       let extractionJobFinished$ = this.extractSources(layer);

  //       extractionJobFinished$.pipe(
  //         takeUntil(this.destroy$)
  //       ).subscribe(v => {
  //         if (v.result.successful) {
  //           let a = v.action as CreateJob;
  //           let job = this.store.selectSnapshot(JobsState.getJobById(a.job.id));
  //           if (!isSourceExtractionJob(job)) return;

  //           if (job.result.data.length != 0) {
  //             this.fwhmByLayerId[layer.id] = this.fwhmFromExtractionResult(job.result)
  //           }
  //         }

  //         this.extractionState[layer.id].loading = false;
  //       })

  //     } else {
  //       this.blurState[layer.id].message = `error blurring layer`
  //       this.blurState[layer.id].status = 'error'
  //     }

  //     this.blurState[layer.id].loading = false;
  //   })
  // }

}
