import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Actions, Store } from '@ngxs/store';
import { forkJoin, Subject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { UpdateNormalizer } from 'src/app/data-files/data-files.actions';
import { DataFilesState } from 'src/app/data-files/data-files.state';
import { ImageHdu, isImageHdu } from 'src/app/data-files/models/data-file';
import { calcLevels, getCountsPerBin } from 'src/app/data-files/models/image-hist';
import { JobService } from 'src/app/jobs/services/job.service';
import { fitHistogram, neutralizeHistograms } from 'src/app/utils/histogram-fitting';
import { SourceNeutralizationDialogService } from './source-neutralization-dialog.service';



@Component({
  selector: 'app-source-neutralization-dialog',
  templateUrl: './source-neutralization-dialog.component.html',
  styleUrls: ['./source-neutralization-dialog.component.scss']
})
export class SourceNeutralizationDialogComponent implements OnInit {

  layerIds = [];
  ready = false;
  running = false;
  statusMessage$ = new Subject<string>();
  errors: string[] = [];
  warnings: string[] = [];

  form = new FormGroup({
    selectedLayerIds: new FormControl([], { validators: [Validators.required] }),
    referenceLayerId: new FormControl('', { validators: [Validators.required] }),
    neutralizeBackground: new FormControl(true, { validators: [Validators.required] }),
  });

  constructor(public dialogRef: MatDialogRef<SourceNeutralizationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public fileId: string,
    private store: Store,
    private jobService: JobService,
    private actions$: Actions,
    private service: SourceNeutralizationDialogService) {

    this.layerIds = this.store.selectSnapshot(DataFilesState.getHdusByFileId(this.fileId)).filter(isImageHdu).map(layer => layer.id)

    if (this.layerIds.length < 2) {
      this.statusMessage$.next("Your file must contain at least two layers");
      return;
    }
    this.form.patchValue({
      referenceLayerId: this.layerIds[0],
      selectedLayerIds: this.layerIds,
    })

    let defaults = this.service.getDefault(this.fileId);
    if (defaults) {
      this.form.patchValue(defaults)
    }

    this.ready = true;

  }

  ngOnInit(): void {
  }

  getHduOptionLabel(hduId: string) {
    return this.store.select(DataFilesState.getHduById(hduId)).pipe(
      map((hdu) => hdu?.name),
      distinctUntilChanged()
    );
  }

  onSelectAllBtnClick() {
    this.form.patchValue({
      selectedLayerIds: this.layerIds.filter(id => id != this.form.controls.referenceLayerId.value)
    })
  }

  onClearSelectionBtnClick() {
    this.form.patchValue({
      selectedLayerIds: []
    })
  }

  start() {
    this.running = true;
    this.statusMessage$.next('Fitting histograms...')
    let selectedLayerIds: string[] = this.form.controls.selectedLayerIds.value;
    selectedLayerIds.push(this.form.controls.referenceLayerId.value);
    let layers = selectedLayerIds.map((hduId: string) => this.store.selectSnapshot(DataFilesState.getHduById(hduId))).filter(isImageHdu);
    this.service.saveDefault(this.fileId, this.form.value);
    setTimeout(() => {
      let result = neutralizeHistograms(layers, this.form.controls.referenceLayerId.value, true, this.form.controls.neutralizeBackground.value);
      this.dialogRef.close(result);
    })

  }

}
