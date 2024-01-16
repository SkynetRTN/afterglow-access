import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Actions, ofActionCompleted, ofActionSuccessful, Store } from '@ngxs/store';
import { merge, Subject } from 'rxjs';
import { filter, take, takeUntil, tap } from 'rxjs/operators';
import { DataFilesState } from 'src/app/data-files/data-files.state';
import { getHeight, getWidth, ImageLayer } from 'src/app/data-files/models/data-file';
import { getImageToViewportTransform, getViewportRegion } from 'src/app/data-files/models/transformation';
import { JobsState } from 'src/app/jobs/jobs.state';
import { JobType } from 'src/app/jobs/models/job-types';
import { JobService } from 'src/app/jobs/services/job.service';
import { CorrelationIdGenerator } from 'src/app/utils/correlated-action';
import { SonifierRegionMode } from '../../sonification/models/sonifier-file-state';
import { PosType, Source } from '../../../models/source';
import { AddSources, RemoveSources, UpdateSource } from '../../../sources.actions';
import { SourcesState } from '../../../sources.state';
import { WorkbenchState } from '../../../workbench.state';

import * as jStat from 'jstat';
import { SourceCatalogState } from '../source-catalog.state';
import { RemovePhotDatasBySourceId } from '../../photometry/photometry.actions';

export enum MergeType {
  PROPER_MOTION,
  POSITION_ERROR
}

@Component({
  selector: 'app-merge-sources-dialog',
  templateUrl: './merge-sources-dialog.component.html',
  styleUrls: ['./merge-sources-dialog.component.scss'],
})
export class MergeSourcesDialogComponent implements OnInit, OnDestroy {
  viewerId: string;
  destroy$ = new Subject<boolean>();
  loading = false;

  mergeOptions = [
    { label: 'Source had constant proper motion (asteroid, comet, satellite)', value: MergeType.PROPER_MOTION },
    { label: 'Images are not aligned/registered', value: MergeType.POSITION_ERROR },
  ];

  mergeForm = new FormGroup({
    mergeType: new FormControl(MergeType.POSITION_ERROR, { validators: [Validators.required] }),
    label: new FormControl('', { validators: [Validators.required] }),
  })

  mergeError: string = '';

  constructor(
    public dialogRef: MatDialogRef<MergeSourcesDialogComponent>,
    private correlationIdGenerator: CorrelationIdGenerator,
    private store: Store,
    private actions$: Actions,
    private jobService: JobService,
    @Inject(MAT_DIALOG_DATA) public data: { viewerId: string, sourceIds: string[] }
  ) {
    this.viewerId = data.viewerId;

    this.mergeForm.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.onMergeSourcesFormChange();
      });

    let sourceById = this.store.selectSnapshot(SourcesState.getEntities)
    let sources = this.data.sourceIds.map(id => sourceById[id])
    let label = sources[0].label;
    this.mergeForm.patchValue({ label: label })

  }

  onMergeSourcesFormChange() {

  }

  mergeSources() {
    let mergeType: MergeType = this.mergeForm.controls.mergeType.value;
    let label: string = this.mergeForm.controls.label.value;
    let viewer = this.store.selectSnapshot(WorkbenchState.getViewerById(this.viewerId))
    if (!viewer) return;
    let layerId = viewer.layerId;
    if (!layerId) return;
    let layer = this.store.selectSnapshot(DataFilesState.getLayerById(layerId)) as ImageLayer;
    let sourceById = this.store.selectSnapshot(SourcesState.getEntities)
    let sources = this.data.sourceIds.map(id => sourceById[id])

    this.mergeError = null;
    if (!sources.every((source) => source.posType == sources[0].posType)) {
      this.mergeError = 'You cannot merge sources with different position types';
      return;
    }

    // this.dialogRef.close(sources);
    if (mergeType == MergeType.PROPER_MOTION) {
      let selectedSourceIds = this.store
        .selectSnapshot(SourceCatalogState.getConfig).selectedSourceIds;



      if (sources.some((source) => source.pmEpoch == null)) {
        this.mergeError = 'You can only merge sources which have epochs defined';
        return;
      }
      //verify unique epochs
      let sortedEpochs = sources.map((source) => new Date(source.pmEpoch)).sort();
      for (let i = 0; i < sortedEpochs.length - 1; i++) {
        if (sortedEpochs[i + 1] == sortedEpochs[i]) {
          this.mergeError = 'All source epochs must be unique when merging';
          return;
        }
      }
      let t0 = new Date(sources[0].pmEpoch).getTime();
      let primaryCoord0 = sources[0].primaryCoord;
      let secondaryCoord0 = sources[0].secondaryCoord;
      let data = sources.map((source) => {
        let centerSecondaryCoord = (source.secondaryCoord + secondaryCoord0) / 2.0;
        return [
          (new Date(source.pmEpoch).getTime() - t0) / 1000.0,
          (source.primaryCoord - primaryCoord0) *
          (source.posType == PosType.PIXEL ? 1 : 15 * 3600 * Math.cos((centerSecondaryCoord * Math.PI) / 180.0)),
          (source.secondaryCoord - secondaryCoord0) * (source.posType == PosType.PIXEL ? 1 : 3600),
        ];
      });
      let x = data.map((d) => [1, d[0]]);
      let primaryY = data.map((d) => d[1]);
      let secondaryY = data.map((d) => d[2]);
      let primaryModel = jStat.models.ols(primaryY, x);
      let secondaryModel = jStat.models.ols(secondaryY, x);
      let primaryRate = primaryModel.coef[1];
      let secondaryRate = secondaryModel.coef[1];
      let positionAngle = (Math.atan2(primaryRate, secondaryRate) * 180.0) / Math.PI;
      positionAngle = positionAngle % 360;
      if (positionAngle < 0) positionAngle += 360;
      let rate = Math.sqrt(Math.pow(primaryRate, 2) + Math.pow(secondaryRate, 2));
      this.store.dispatch([
        new UpdateSource(sources[0].id, {
          pm: rate,
          pmPosAngle: positionAngle,
          label: label
        }),
        new RemoveSources(sources.slice(1).map((s) => s.id)),
        new RemovePhotDatasBySourceId(sources[0].id),
      ]);

      this.dialogRef.close()
    }
    else if (mergeType == MergeType.POSITION_ERROR) {

      let actions = sources.map(source => new UpdateSource(source.id, {
        label: label
      }))


      this.store.dispatch(actions)
      this.dialogRef.close()
    }
  }


  ngOnInit() { }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

}
