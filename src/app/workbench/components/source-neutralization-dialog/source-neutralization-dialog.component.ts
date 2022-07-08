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
import { fitHistogram } from 'src/app/utils/histogram-fitting';


import { linear } from 'everpolate';

@Component({
  selector: 'app-source-neutralization-dialog',
  templateUrl: './source-neutralization-dialog.component.html',
  styleUrls: ['./source-neutralization-dialog.component.scss']
})
export class SourceNeutralizationDialogComponent implements OnInit {

  ready = false;
  running = false;
  statusMessage$ = new Subject<string>();
  errors: string[] = [];
  warnings: string[] = [];

  form = new FormGroup({
    selectedLayerIds: new FormControl([], { validators: [Validators.required] }),
    referenceLayerId: new FormControl('', { validators: [Validators.required] }),
  });

  constructor(public dialogRef: MatDialogRef<SourceNeutralizationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public layerIds: string[],
    private store: Store,
    private jobService: JobService,
    private actions$: Actions) {

    if (layerIds.length < 2) {
      this.statusMessage$.next("Your file must contain at least two layers");
      return;
    }
    this.form.patchValue({
      referenceLayerId: layerIds[0],
      selectedLayerIds: layerIds.slice(1)
    })
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
      selectedLayerIds: []
    })
  }

  onClearSelectionBtnClick() {
    this.form.patchValue({
      selectedLayerIds: []
    })
  }

  start() {
    this.running = true;
    let result: { layerId: string, scale: number }[] = [];


    let selectedLayerIds: string[] = this.form.controls.selectedLayerIds.value;
    selectedLayerIds.push(this.form.controls.referenceLayerId.value);
    let layers = selectedLayerIds.map((hduId: string) => this.store.selectSnapshot(DataFilesState.getHduById(hduId))).filter(isImageHdu);
    let fits: {
      hdu: ImageHdu
      bkgMu: number,
      bkgSigma: number,
      bkgPeak: number,
      xSrc: Float32Array,
      ySrc: Float32Array,
      norm: number
    }[] = []

    // fit backgrounds
    layers.forEach(hdu => {
      fits.push(fitHistogram(hdu))
    })

    let ref = fits.find(fit => fit.hdu.id == this.form.controls.referenceLayerId.value) || fits[0];
    let refCorr = getCountsPerBin(ref.hdu.hist)

    let backgroundLevel: number;
    let peakLevel: number;
    if (ref.hdu.normalizer.mode == 'pixel' && ref.hdu.normalizer.backgroundLevel !== undefined && ref.hdu.normalizer.peakLevel !== undefined) {
      backgroundLevel = ref.hdu.normalizer.backgroundLevel;
      peakLevel = ref.hdu.normalizer.peakLevel;
    }
    else {
      let levels = calcLevels(ref.hdu.hist, ref.hdu.normalizer.backgroundPercentile, ref.hdu.normalizer.peakPercentile)
      backgroundLevel = levels.backgroundLevel;
      peakLevel = levels.peakLevel;
    }

    let refScale = ref.hdu.normalizer.layerScale;
    let refOffset = ref.hdu.normalizer.layerOffset;
    for (let i = 0; i < fits.length; i++) {
      let fit = fits[i];
      if (fit == ref) continue;

      let targetScale = fit.hdu.normalizer.layerScale;
      let targetOffset = fit.hdu.normalizer.layerOffset;

      let xRef = new Float32Array(ref.xSrc);
      xRef.forEach((x, index) => { xRef[index] = Math.log(x) })
      let refXArray = Array.from(xRef)

      let yRef = new Float32Array(ref.ySrc);
      yRef.forEach((y, index) => { yRef[index] = Math.sqrt(y) })

      let fitCorr = getCountsPerBin(fit.hdu.hist)
      let corr = (fitCorr / refCorr)

      let steps = 200;
      let m0 = 2.5;
      let results: { m: number, k2: number, N: number, f: number }[];
      let stepSize = 0.025
      while (stepSize > 0.0001) {
        results = [];
        for (let step = 0; step < steps; step++) {
          let s = stepSize * (step - steps / 2)
          if (m0 + s <= 0) continue;
          let m = m0 + s


          let xs = new Float32Array(fit.xSrc);
          xs.forEach((x, index) => xs[index] = Math.log(x * m))

          let ys = new Float32Array(fit.ySrc);
          ys.forEach((y, index) => ys[index] = Math.sqrt(ys[index] / corr / m))

          let ysInterpolated = new Float32Array(linear(refXArray, Array.from(xs), Array.from(ys)))

          let K2 = 0;
          let N = 0;
          let W = 0;
          let WSum = 0
          let WN = 0.5;
          // console.log(m, xs[0], xs[xs.length - 1])
          xRef.forEach((x, index) => {
            if (x < xs[0] || x > xs[xs.length - 1]) return;
            W += Math.pow(yRef[index], WN);
            WSum += W;
            K2 += W * Math.pow(yRef[index] - ysInterpolated[index], 2);
            N++
          })

          if (N == 0) continue;

          results.push({ m: m, k2: K2, N: N, f: K2 / WSum })
        }
        let bestFitIndex = 0;
        results.forEach((value, index) => {
          if (value.f < results[bestFitIndex].f) bestFitIndex = index;
        })

        m0 = results[bestFitIndex].m
        // console.log(results[bestFitIndex], m0)

        if (bestFitIndex == results.length - 1) {
          stepSize *= 2;
          m0 *= 2;
        }
        else {
          stepSize *= .5
        }

      }
      targetScale = m0;
      result.push({ layerId: fit.hdu.id, scale: targetScale * refScale })
    }

    this.dialogRef.close(result);
  }

}
