import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Actions, ofActionCompleted, ofActionSuccessful, Store } from '@ngxs/store';
import { merge, Subject } from 'rxjs';
import { filter, take, takeUntil, tap } from 'rxjs/operators';
import { DataFilesState } from 'src/app/data-files/data-files.state';
import { getHeight, getWidth, ImageHdu } from 'src/app/data-files/models/data-file';
import { getImageToViewportTransform, getViewportRegion } from 'src/app/data-files/models/transformation';
import { CreateJob, UpdateJob } from 'src/app/jobs/jobs.actions';
import { JobsState } from 'src/app/jobs/jobs.state';
import { JobType } from 'src/app/jobs/models/job-types';
import { SourceExtractionJob, SourceExtractionJobResult, SourceExtractionJobSettings } from 'src/app/jobs/models/source-extraction';
import { CorrelationIdGenerator } from 'src/app/utils/correlated-action';
import { toSourceExtractionJobSettings } from '../../models/global-settings';
import { SonifierRegionMode } from '../../models/sonifier-file-state';
import { PosType, Source } from '../../models/source';
import { SourceExtractionRegion } from '../../models/source-extraction-region';
import { WorkbenchImageHduState, WorkbenchStateType } from '../../models/workbench-file-state';
import { AddSources } from '../../sources.actions';
import { ExtractSources } from '../../workbench.actions';
import { WorkbenchState } from '../../workbench.state';
// import { SourceExtractionRegion, SourceExtractionSettings } from '../../models/source-extraction-settings';

@Component({
  selector: 'app-source-extraction-dialog',
  templateUrl: './source-extraction-dialog.component.html',
  styleUrls: ['./source-extraction-dialog.component.scss'],
})
export class SourceExtractionRegionDialogComponent implements OnInit, OnDestroy {
  SourceExtractionRegion = SourceExtractionRegion;

  viewerId: string;
  destroy$ = new Subject<boolean>();
  loading = false;
  job: SourceExtractionJob;
  jobResult: SourceExtractionJobResult;

  regionOptions = [
    { label: 'Entire Image', value: SourceExtractionRegion.ENTIRE_IMAGE },
    { label: 'Current View', value: SourceExtractionRegion.VIEWPORT },
    { label: 'Sonification Region', value: SourceExtractionRegion.SONIFIER_REGION },
  ];

  sourceExtractionRegionForm = new FormGroup({
    region: new FormControl(SourceExtractionRegion.ENTIRE_IMAGE, { validators: [Validators.required] }),
  })

  constructor(
    public dialogRef: MatDialogRef<SourceExtractionRegionDialogComponent>,
    private correlationIdGenerator: CorrelationIdGenerator,
    private store: Store,
    private actions$: Actions,
    @Inject(MAT_DIALOG_DATA) public data: { viewerId: string; region?: SourceExtractionRegion }
  ) {
    this.viewerId = data.viewerId;

    this.sourceExtractionRegionForm.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.onSourceExtractionRegionFormChange();
      });

    this.sourceExtractionRegionForm.patchValue(data)

  }

  onSourceExtractionRegionFormChange() {

  }

  extractSources() {
    let viewer = this.store.selectSnapshot(WorkbenchState.getViewerById(this.viewerId))
    if (!viewer) return;
    let hduId = viewer.hduId;
    if (!hduId) return;
    let hdu = this.store.selectSnapshot(DataFilesState.getHduById(hduId)) as ImageHdu;
    let settings = this.store.selectSnapshot(WorkbenchState.getSettings);
    let region: SourceExtractionRegion = this.sourceExtractionRegionForm.controls.region.value;
    let sonificationState = this.store.selectSnapshot(WorkbenchState.getSonificationPanelStateByHduId(hduId));
    let transformEntities = this.store.selectSnapshot(DataFilesState.getTransformEntities);
    let viewportTransform = this.store.selectSnapshot(DataFilesState.getTransformById(hdu.viewportTransformId))
    let imageTransform = this.store.selectSnapshot(DataFilesState.getTransformById(hdu.imageTransformId))
    let imageToViewportTransform = getImageToViewportTransform(viewportTransform, imageTransform);
    let rawImageData = this.store.selectSnapshot(DataFilesState.getImageDataById(hdu.rawImageDataId))
    let header = this.store.selectSnapshot(DataFilesState.getHeaderById(hdu.headerId))

    let jobSettings: SourceExtractionJobSettings = toSourceExtractionJobSettings(settings);

    if (
      region == SourceExtractionRegion.VIEWPORT ||
      (region == SourceExtractionRegion.SONIFIER_REGION &&
        sonificationState.regionMode == SonifierRegionMode.VIEWPORT)
    ) {
      let region = getViewportRegion(
        imageToViewportTransform,
        rawImageData.width,
        rawImageData.height,
        viewer.viewportSize.width,
        viewer.viewportSize.height
      );

      jobSettings = {
        ...jobSettings,
        x: Math.min(getWidth(header), Math.max(0, region.x + 1)),
        y: Math.min(getHeight(header), Math.max(0, region.y + 1)),
        width: Math.min(getWidth(header), Math.max(0, region.width + 1)),
        height: Math.min(getHeight(header), Math.max(0, region.height + 1)),
      };
    } else if (
      region == SourceExtractionRegion.SONIFIER_REGION &&
      sonificationState.regionMode == SonifierRegionMode.CUSTOM &&
      sonificationState.regionHistoryIndex !== null
    ) {
      let region = sonificationState.regionHistory[sonificationState.regionHistoryIndex];
      jobSettings = {
        ...jobSettings,
        x: Math.min(getWidth(header), Math.max(0, region.x + 1)),
        y: Math.min(getHeight(header), Math.max(0, region.y + 1)),
        width: Math.min(getWidth(header), Math.max(0, region.width + 1)),
        height: Math.min(getHeight(header), Math.max(0, region.height + 1)),
      };
    }
    let job: SourceExtractionJob = {
      id: null,
      type: JobType.SourceExtraction,
      fileIds: [hduId],
      sourceExtractionSettings: jobSettings,
      mergeSources: false,
      state: null,
      result: null,
    };

    let correlationId = this.correlationIdGenerator.next();
    this.store.dispatch(new CreateJob(job, 1000, correlationId));
    this.loading = true;
    this.job = undefined;

    let jobFinished$ = this.actions$.pipe(
      ofActionCompleted(CreateJob),
      filter((v) => v.action.correlationId == correlationId),
      take(1)
    )

    let jobUpdated$ = this.actions$.pipe(
      ofActionSuccessful(UpdateJob),
      filter<CreateJob>((a) => a.correlationId == correlationId),
      takeUntil(jobFinished$),
      tap((a) => {
        let job = this.store.selectSnapshot(JobsState.getJobById(a.job.id)) as SourceExtractionJob;
        this.job = job;
      })
    );

    jobFinished$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(v => {
      if (v.result.successful) {
        let a = v.action as CreateJob;
        let result = this.store.selectSnapshot(JobsState.getJobResultById(a.job.id)) as SourceExtractionJobResult;
        this.jobResult = result;

        let sources = result.data.map((d) => {
          let posType = PosType.PIXEL;
          let primaryCoord = d.x;
          let secondaryCoord = d.y;

          if (
            header.wcs &&
            header.wcs.isValid() &&
            'raHours' in d &&
            d.raHours !== null &&
            'decDegs' in d &&
            d.decDegs !== null
          ) {
            posType = PosType.SKY;
            primaryCoord = d.raHours;
            secondaryCoord = d.decDegs;
          }

          let pmEpoch = null;
          if (d.time && Date.parse(d.time + ' GMT')) {
            pmEpoch = new Date(Date.parse(d.time + ' GMT')).toISOString();
          }
          return {
            id: null,
            objectId: '',
            hduId: d.fileId.toString(),
            posType: posType,
            primaryCoord: primaryCoord,
            secondaryCoord: secondaryCoord,
            pm: 0,
            pmPosAngle: 0,
            pmEpoch: pmEpoch,
          } as Source;
        });

        this.store.dispatch(new AddSources(sources));


        if (result.errors.length == 0 && result.warnings.length == 0) {
          this.dialogRef.close();
        }
        this.loading = false;

      } else {
        this.loading = false;

      }
    })

  }


  ngOnInit() { }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

}
