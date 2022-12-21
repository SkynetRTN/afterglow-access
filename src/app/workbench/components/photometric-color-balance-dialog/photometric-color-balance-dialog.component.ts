import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Actions, ofActionCompleted, Store } from '@ngxs/store';
import { LogMessage as NgxLogMessage } from 'ngx-log-monitor';
import { BehaviorSubject, combineLatest, forkJoin, merge, Observable, of, Subject, timer } from 'rxjs';
import { filter, map, take, tap } from 'rxjs/operators';
import { DataFilesState } from 'src/app/data-files/data-files.state';
import { FieldCalibrationJob } from 'src/app/jobs/models/field-calibration';
import { JobType } from 'src/app/jobs/models/job-types';
import { isFieldCalibrationJob } from 'src/app/jobs/models/field-calibration';
import { JobService } from 'src/app/jobs/services/job.service';
import { toFieldCalibration, toPhotometryJobSettings, toSourceExtractionJobSettings } from '../../models/global-settings';
import { WorkbenchState } from '../../workbench.state';
import { LoadLayerHeader } from 'src/app/data-files/data-files.actions';
import { getExpLength, getFilter, getZeroPoint, Header, ILayer, ImageLayer, isImageLayer } from 'src/app/data-files/models/data-file';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { greaterThan, isNumber } from 'src/app/utils/validators';
import { neutralizeHistograms } from 'src/app/utils/histogram-fitting';
import { PixelNormalizer } from 'src/app/data-files/models/pixel-normalizer';
import { ImageHist } from 'src/app/data-files/models/image-hist';
import { DecimalPipe } from '@angular/common';
import { FILTER_REFERENCES, PhotometricColorBalanceDialogService, STELLAR_TYPE_REFERENCES, WHITE_REFERENCE_GROUPS } from './photometric-color-balance-dialog.service';

interface Filter {
  name: string;
  aliases: string[];
  center: number;
  FNu: number;
}

interface Layer {
  id: string,
  name: string,
  filter: Filter,
  expLength: number;
  layer: ImageLayer;
  header: Header
}

@Component({
  selector: 'app-photometric-color-balance-dialog',
  templateUrl: './photometric-color-balance-dialog.component.html',
  styleUrls: ['./photometric-color-balance-dialog.component.scss']
})
export class PhotometricColorBalanceDialogComponent implements OnInit, AfterViewInit {
  layers: Layer[] = [];

  FILTERS: Filter[] = [
    { name: "Blue", aliases: [], center: 0.462, FNu: 4.063 * .983 },
    { name: "Green", aliases: [], center: 0.540, FNu: 3.636 * 1.048 },
    { name: "Red", aliases: [], center: 0.646, FNu: 3.064 * .359 },
    { name: "U", aliases: [], center: 0.366, FNu: 1.79 },
    { name: "B", aliases: [], center: 0.438, FNu: 4.063 },
    { name: "V", aliases: [], center: 0.545, FNu: 3.636 },
    { name: "R", aliases: [], center: 0.641, FNu: 3.064 },
    { name: "I", aliases: [], center: 0.798, FNu: 2.416 },
    { name: "u'", aliases: ["uprime"], center: 0.35, FNu: 3.68 },
    { name: "g'", aliases: ["gprime"], center: 0.475, FNu: 3.643 },
    { name: "r'", aliases: ["rprime"], center: 0.6222, FNu: 3.648 },
    { name: "i'", aliases: ["iprime"], center: 0.7362, FNu: 3.644 },
    { name: "z'", aliases: ["zprime"], center: 0.9049, FNu: 3.631 },
    { name: "J", aliases: [], center: 1.235, FNu: 1.594 },
    { name: "H", aliases: [], center: 1.662, FNu: 1.024 },
    { name: "Ks", aliases: [], center: 2.159, FNu: 0.6667 }
  ]

  FILTER_REFERENCES = FILTER_REFERENCES;
  STELLAR_TYPE_REFERENCES = STELLAR_TYPE_REFERENCES;
  WHITE_REFERENCE_GROUPS = WHITE_REFERENCE_GROUPS;

  ready = false;
  running = false;
  statusMessage$ = new Subject<string>();
  errors: string[] = [];
  warnings: string[] = [];


  form = new FormGroup({
    redLayerId: new FormControl('', { validators: [Validators.required] }),
    redZeroPoint: new FormControl('', { validators: [Validators.required, isNumber] }),
    blueLayerId: new FormControl('', { validators: [Validators.required] }),
    blueZeroPoint: new FormControl('', { validators: [Validators.required, isNumber] }),
    greenLayerId: new FormControl('', { validators: [Validators.required] }),
    greenZeroPoint: new FormControl('', { validators: [Validators.required, isNumber] }),
    referenceLayerId: new FormControl('', { validators: [Validators.required] }),
    whiteReference: new FormControl('', { validators: [Validators.required] }),
    extinction: new FormControl('0', { validators: [Validators.required, isNumber], updateOn: 'blur' }),
    neutralizeBackground: new FormControl(true, { validators: [Validators.required] }),
  });




  constructor(public dialogRef: MatDialogRef<PhotometricColorBalanceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public fileId: string,
    private store: Store,
    private jobService: JobService,
    private actions$: Actions,
    private decimalPipe: DecimalPipe,
    private service: PhotometricColorBalanceDialogService) {
  }



  ngOnInit(): void {

    // this.layers = this.layerIds.map(id => this.store.selectSnapshot(DataFilesState.getLayerById(id)));
    let layerIds = this.store.selectSnapshot(DataFilesState.getLayersByFileId(this.fileId)).filter(isImageLayer).map(layer => layer.id)

    if (layerIds.length < 3) {
      this.errors = [`Photometric color calibration only works with files having at least three layers.`];
      return;
    }

    let headers$ = layerIds.map(layerId => {
      let header = this.store.selectSnapshot(DataFilesState.getHeaderByLayerId(layerId));
      if (header.loaded) return of(header);

      return this.actions$.pipe(
        ofActionCompleted(LoadLayerHeader),
        filter(a => a.action.layerId == layerId),
        take(1),
        map(a => {
          if (!a.result.successful) {
            this.statusMessage$.next(`Failed to load layer header`);
            return null;
          }

          this.statusMessage$.next(`Header successfully loaded`);
          return this.store.selectSnapshot(DataFilesState.getHeaderByLayerId(layerId));
        })
      )

    })

    forkJoin(headers$).subscribe(headers => {
      if (headers.includes(null)) return;

      for (let index = 0; index < headers.length; index++) {
        let header = headers[index];
        if (header == null) continue;

        let filterName = getFilter(header);
        let filter = this.FILTERS.find(f => f.name == filterName || f.aliases.includes(filterName))
        if (!filter) {
          this.warnings.push(`Unknown filter '${filterName}'.`);
          continue;
        }

        let expLength = getExpLength(header);
        if (!expLength) {
          this.warnings.push(`Could not determine exposure length for fiter ${filterName}`);
          continue;
        }

        let id = layerIds[index];
        let name = this.store.selectSnapshot(DataFilesState.getLayerById(id)).name;
        let layer = this.store.selectSnapshot(DataFilesState.getLayerById(id));
        this.layers.push({ id: id, name: name, filter: filter, expLength: expLength, layer: (isImageLayer(layer) ? layer : null), header: header })
      }

      if (this.layers.length < 3) {
        this.errors.push(`Only ${this.layers.length} compatible layers found.  A minimum of three is required.`);
        return;
      }

      this.layers.sort((a, b) => a.filter.center - b.filter.center)
      this.form.patchValue({
        blueLayerId: this.layers[0].id,
        greenLayerId: this.layers[1].id,
        redLayerId: this.layers[2].id,
        referenceLayerId: this.layers[0].id
      });

      if (!this.form.controls.whiteReference.value) this.form.controls.whiteReference.setValue(this.FILTER_REFERENCES.find(ref => ref.peak == this.layers[0].filter.center));

      let blueZeroPoint = getZeroPoint(this.layers[0].header);
      if (blueZeroPoint !== undefined) {
        this.form.patchValue({
          blueZeroPoint: blueZeroPoint
        })
      }
      let greenZeroPoint = getZeroPoint(this.layers[1].header);
      if (greenZeroPoint !== undefined) {
        this.form.patchValue({
          greenZeroPoint: greenZeroPoint
        })
      }
      let redZeroPoint = getZeroPoint(this.layers[2].header);
      if (redZeroPoint !== undefined) {
        this.form.patchValue({
          redZeroPoint: redZeroPoint
        })
      }

      let defaults = this.service.getDefault(this.fileId)
      if (defaults) {
        this.form.patchValue(defaults)
      }

      this.ready = true;
    })


  }

  ngAfterViewInit() {

  }

  /**
 * Calculate mags of extinction at specified wavelength.
 * @param A_v The mags of extinction in V band
 * @param lambda the wavelength of the filter in micrometers
 */
  calculateExtinction(A_v: number, lambda: number) {
    // lambda *= 10e-6;
    let R_v = 3.1;
    let x = (lambda / 1) ** -1;
    let y = x - 1.82;
    let a = 0;
    let b = 0;
    if (x > 0.3 && x < 1.1) {
      a = 0.574 * x ** 1.61;
    } else if (x > 1.1 && x < 3.3) {
      a =
        1 +
        0.17699 * y -
        0.50447 * y ** 2 -
        0.02427 * y ** 3 +
        0.72085 * y ** 4 +
        0.01979 * y ** 5 -
        0.7753 * y ** 6 +
        0.32999 * y ** 7;
    }

    if (x > 0.3 && x < 1.1) {
      b = -0.527 * x ** 1.61;
    } else if (x > 1.1 && x < 3.3) {
      b =
        1.41338 * y +
        2.28305 * y ** 2 +
        1.07233 * y ** 3 -
        5.38434 * y ** 4 -
        0.62251 * y ** 5 +
        5.3026 * y ** 6 -
        2.09002 * y ** 7;
    }

    return A_v * (a + b / R_v);

  }

  referenceLayerOptions() {
    return this.layers.filter(layer => layer.id == this.form.controls.redLayerId.value || layer.id == this.form.controls.greenLayerId.value || layer.id == this.form.controls.blueLayerId.value)
  }

  calculateZeroPoints() {
    this.warnings = [];
    let redLayer = this.layers.find(layer => layer.id == this.form.controls.redLayerId.value)
    let greenLayer = this.layers.find(layer => layer.id == this.form.controls.greenLayerId.value)
    let blueLayer = this.layers.find(layer => layer.id == this.form.controls.blueLayerId.value)

    this.running = true;
    let settings = this.store.selectSnapshot(WorkbenchState.getSettings);
    let photometryJobSettings = toPhotometryJobSettings(settings);
    let sourceExtractionJobSettings = toSourceExtractionJobSettings(settings);
    let catalogs = this.store.selectSnapshot(WorkbenchState.getCatalogs)
    let fieldCalibration = toFieldCalibration(settings, catalogs);

    let job: FieldCalibrationJob = {
      type: JobType.FieldCalibration,
      id: null,
      photometrySettings: photometryJobSettings,
      sourceExtractionSettings: sourceExtractionJobSettings,
      fieldCal: fieldCalibration,
      fileIds: this.layers.map(layer => layer.id),
      state: null,
    };

    let job$ = this.jobService.createJob(job);

    job$.subscribe(
      (job) => {

        if (isFieldCalibrationJob(job)) {
          if (['in_progress', 'pending'].includes(job.state.status)) {
            if (job.state.progress) {
              this.statusMessage$.next(`${job.state.progress}% complete`);
            }
            else {
              this.statusMessage$.next(`Field calibration in progress.`);
            }
            return;
          }

          if (job.state.status == 'completed') {
            if (job.result) {
              if (job.result.errors.length != 0) {
                this.errors = [`The field calibration completed with errors.`];
                return;
              }
              if (job.result.data.length != this.layers.length) {
                this.errors = [`The field calibration completed but did not return zero points for all layers`];
                return;
              }

              let blueZeroPoint = job.result.data.find(d => d.fileId == blueLayer.id).zeroPointCorr + job.photometrySettings.zeroPoint;
              let greenZeroPoint = job.result.data.find(d => d.fileId == greenLayer.id).zeroPointCorr + job.photometrySettings.zeroPoint;
              let redZeroPoint = job.result.data.find(d => d.fileId == redLayer.id).zeroPointCorr + job.photometrySettings.zeroPoint;

              this.form.patchValue({
                redZeroPoint: this.decimalPipe.transform(redZeroPoint, '1.0-5'),
                blueZeroPoint: this.decimalPipe.transform(blueZeroPoint, '1.0-5'),
                greenZeroPoint: this.decimalPipe.transform(greenZeroPoint, '1.0-5')
              })
              this.statusMessage$.next(`Zero point measurement successful`);
            }
            else {
              this.statusMessage$.next(`Field calibration completed. Downloading result...`);
            }
          }

        }




      },
      (error) => {

      },
      () => {
        this.running = false;
      })
  }

  start() {
    this.warnings = [];

    let redLayer = this.layers.find(layer => layer.id == this.form.controls.redLayerId.value)
    let greenLayer = this.layers.find(layer => layer.id == this.form.controls.greenLayerId.value)
    let blueLayer = this.layers.find(layer => layer.id == this.form.controls.blueLayerId.value)
    let referenceLayer = this.layers.find(layer => layer.id == this.form.controls.referenceLayerId.value)

    this.running = true;
    let blueFilter = blueLayer.filter;
    let greenFilter = greenLayer.filter;
    let redFilter = redLayer.filter;

    let blueExpLength = blueLayer.expLength;
    let greenExpLength = greenLayer.expLength;
    let redExpLength = redLayer.expLength;
    let referenceExpLength = referenceLayer.expLength;

    let aV = this.form.controls.extinction.value * 3.1;
    let blueExtinction = this.calculateExtinction(aV, blueLayer.filter.center);
    let blueZeroPoint = this.form.value.blueZeroPoint - blueExtinction;
    let greenExtinction = this.calculateExtinction(aV, greenLayer.filter.center);
    let greenZeroPoint = this.form.value.greenZeroPoint - greenExtinction;
    let redExtinction = this.calculateExtinction(aV, redLayer.filter.center);
    let redZeroPoint = this.form.value.redZeroPoint - redExtinction;
    let referenceZeroPoint = (referenceLayer.id == blueLayer.id ? blueZeroPoint : (referenceLayer.id == greenLayer.id ? greenZeroPoint : redZeroPoint))

    let HCK = 14387.7688;
    let POWER = 3;
    let whiteRefPeak = this.form.controls.whiteReference.value.peak;
    let whiteRefTemp = 2898.0 / whiteRefPeak;

    let blueWBCorr = Math.pow((blueFilter.center / whiteRefPeak), POWER) * (Math.exp(HCK / whiteRefTemp / blueFilter.center) - 1) / (Math.exp(HCK / whiteRefTemp / whiteRefPeak) - 1);
    let greenWBCorr = Math.pow((greenFilter.center / whiteRefPeak), POWER) * (Math.exp(HCK / whiteRefTemp / greenFilter.center) - 1) / (Math.exp(HCK / whiteRefTemp / whiteRefPeak) - 1);
    let redWBCorr = Math.pow((redFilter.center / whiteRefPeak), POWER) * (Math.exp(HCK / whiteRefTemp / redFilter.center) - 1) / (Math.exp(HCK / whiteRefTemp / whiteRefPeak) - 1);
    let referenceWBCorr = (referenceLayer.id == blueLayer.id ? blueWBCorr : (referenceLayer.id == greenLayer.id ? greenWBCorr : redWBCorr))

    let blueZeroPointCorr = Math.pow(10, (referenceZeroPoint - blueZeroPoint) / 2.5) * (referenceExpLength / blueExpLength);
    let greenZeroPointCorr = Math.pow(10, (referenceZeroPoint - greenZeroPoint) / 2.5) * (referenceExpLength / greenExpLength);
    let redZeroPointCorr = Math.pow(10, (referenceZeroPoint - redZeroPoint) / 2.5) * (referenceExpLength / redExpLength);
    let referenceZPCorr = (referenceLayer.id == blueLayer.id ? blueZeroPointCorr : (referenceLayer.id == greenLayer.id ? greenZeroPointCorr : redZeroPointCorr))

    let results = [
      { layerId: blueLayer.id, scale: referenceLayer.layer.normalizer.layerScale * (blueWBCorr * blueZeroPointCorr) / (referenceWBCorr * referenceZPCorr), offset: blueLayer.layer.normalizer.layerOffset },
      { layerId: greenLayer.id, scale: referenceLayer.layer.normalizer.layerScale * (greenWBCorr * greenZeroPointCorr) / (referenceWBCorr * referenceZPCorr), offset: greenLayer.layer.normalizer.layerOffset },
      { layerId: redLayer.id, scale: referenceLayer.layer.normalizer.layerScale * (redWBCorr * redZeroPointCorr) / (referenceWBCorr * referenceZPCorr), offset: redLayer.layer.normalizer.layerOffset }
    ]

    if (this.form.controls.neutralizeBackground.value) {
      this.statusMessage$.next(`Neutralizing backgrounds...`);

      let d = results.map(result => {
        let layer = this.store.selectSnapshot(DataFilesState.getLayerById(result.layerId));
        if (!isImageLayer(layer)) return null;

        return {
          id: layer.id,
          name: layer.name,
          hist: layer.hist,
          normalizer: {
            ...layer.normalizer,
            layerScale: result.scale
          }
        }
      })

      results = neutralizeHistograms(d, referenceLayer.id, false);

    }

    this.service.saveDefault(this.fileId, { ...this.form.value })
    this.dialogRef.close(results)

  }

}
