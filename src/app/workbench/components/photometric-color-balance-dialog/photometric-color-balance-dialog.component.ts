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
import { LoadHduHeader } from 'src/app/data-files/data-files.actions';
import { getExpLength, getFilter, IHdu } from 'src/app/data-files/models/data-file';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { greaterThan, isNumber } from 'src/app/utils/validators';

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
  expLength: number
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

  FILTER_REFERENCES = [
    { name: 'Black Body Peaking in U Filter', peak: 0.366 },
    { name: 'Black Body Peaking in B Filter', peak: 0.438 },
    { name: 'Black Body Peaking in V Filter', peak: 0.545 },
    { name: 'Black Body Peaking in R Filter', peak: 0.641 },
    { name: 'Black Body Peaking in I Filter', peak: 0.798 },
    { name: "Black Body Peaking in u' Filter", peak: 0.35 },
    { name: "Black Body Peaking in g' Filter", peak: 0.475 },
    { name: "Black Body Peaking in r' Filter", peak: 0.6222 },
    { name: "Black Body Peaking in i' Filter", peak: 0.7362 },
    { name: "Black Body Peaking in z' Filter", peak: 0.9049 },
    { name: 'Black Body Peaking in J Filter', peak: 1.235 },
    { name: 'Black Body Peaking in H Filter', peak: 1.662 },
    { name: 'Black Body Peaking in Ks Filter', peak: 2.159 },
  ]

  STELLAR_TYPE_REFERENCES = [
    { name: 'O-Type Star - 41,000K', peak: 2898 / 41000 },
    { name: 'B-Type Star - 31,000K', peak: 2898 / 31000 },
    { name: 'A-Type Star - 9,500K', peak: 2898 / 9500 },
    { name: 'F-Type Star - 7,240K', peak: 2898 / 7240 },
    { name: 'G-Type Star - 5,920K', peak: 2898 / 5920 },
    { name: "K-Type Star - 5,300K", peak: 2898 / 5300 },
    { name: "M-Type Star - 3,850K", peak: 2898 / 3850 }
  ]

  WHITE_REFERENCE_GROUPS = [
    { name: 'Black Body with Filter-based Peak', options: this.FILTER_REFERENCES },
    { name: 'Stellar Spectral Types', options: this.STELLAR_TYPE_REFERENCES }
  ]


  ready = false;
  running = false;
  statusMessage$ = new Subject<string>();
  errorMessage: string;


  form = new FormGroup({
    redLayer: new FormControl('', { validators: [Validators.required] }),
    blueLayer: new FormControl('', { validators: [Validators.required] }),
    greenLayer: new FormControl('', { validators: [Validators.required] }),
    whiteReference: new FormControl('', { validators: [Validators.required] }),
    extinction: new FormControl('0', { validators: [Validators.required, isNumber], updateOn: 'blur' }),
  });




  constructor(public dialogRef: MatDialogRef<PhotometricColorBalanceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public layerIds: string[],
    private store: Store,
    private jobService: JobService,
    private actions$: Actions) {
  }



  ngOnInit(): void {

    // this.layers = this.layerIds.map(id => this.store.selectSnapshot(DataFilesState.getHduById(id)));

    if (this.layerIds.length < 3) {
      this.errorMessage = `Photometric color calibration only works with files having at least three layers.`;
      return;
    }

    let headers$ = this.layerIds.map(layerId => {
      let header = this.store.selectSnapshot(DataFilesState.getHeaderByHduId(layerId));
      if (header.loaded) return of(header);

      return this.actions$.pipe(
        ofActionCompleted(LoadHduHeader),
        filter(a => a.action.hduId == layerId),
        take(1),
        map(a => {
          if (!a.result.successful) {
            this.errorMessage = `Failed to load layer header`;
            return null;
          }

          this.statusMessage$.next(`Header successfully loaded`);
          return this.store.selectSnapshot(DataFilesState.getHeaderByHduId(layerId));
        })
      )

    })

    forkJoin(headers$).subscribe(headers => {
      if (headers.includes(null)) return;

      for (let index = 0; index < headers.length; index++) {
        let header = headers[index];
        if (header == null) return;

        let filterName = getFilter(header);
        let filter = this.FILTERS.find(f => f.name == filterName || f.aliases.includes(filterName))
        if (!filter) {
          this.errorMessage = `Unknown filter ${filterName}.  Photometric color calibration currently only supports the UBVRI filter set`;
          return null;
        }

        let expLength = getExpLength(header);
        if (!expLength) {
          this.errorMessage = `Could not determine exposure length`;
          return null;
        }

        let id = this.layerIds[index];
        let name = this.store.selectSnapshot(DataFilesState.getHduById(id)).name;
        this.layers.push({ id: id, name: name, filter: filter, expLength: expLength })
      }

      this.layers.sort((a, b) => a.filter.center - b.filter.center)
      this.form.patchValue({
        blueLayer: this.layers[0],
        greenLayer: this.layers[1],
        redLayer: this.layers[2],
      });

      if (!this.form.controls.whiteReference.value) this.form.controls.whiteReference.setValue(this.FILTER_REFERENCES.find(ref => ref.peak == this.layers[0].filter.center));

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

  start() {
    let redLayer = this.form.controls.redLayer.value as Layer;
    let greenLayer = this.form.controls.greenLayer.value as Layer;
    let blueLayer = this.form.controls.blueLayer.value as Layer;

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
      fileIds: this.layerIds,
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
                this.errorMessage = `The field calibration completed with errors.`;
                return;
              }
              if (job.result.data.length != this.layerIds.length) {
                this.errorMessage = `The field calibration completed but did not return zero points for all layers`;
                return;
              }


              let blueFilter = blueLayer.filter;
              let greenFilter = greenLayer.filter;
              let redFilter = redLayer.filter;

              let blueExpLength = blueLayer.expLength;
              let greenExpLength = greenLayer.expLength;
              let redExpLength = redLayer.expLength;

              let aV = this.form.controls.extinction.value * 3.1;
              let blueExtinction = this.calculateExtinction(aV, blueLayer.filter.center);
              let blueZeroPoint = job.result.data.find(d => d.fileId == blueLayer.id).zeroPointCorr + job.photometrySettings.zeroPoint - blueExtinction;
              let greenExtinction = this.calculateExtinction(aV, greenLayer.filter.center);
              let greenZeroPoint = job.result.data.find(d => d.fileId == greenLayer.id).zeroPointCorr + job.photometrySettings.zeroPoint - greenExtinction;
              let redExtinction = this.calculateExtinction(aV, redLayer.filter.center);
              let redZeroPoint = job.result.data.find(d => d.fileId == redLayer.id).zeroPointCorr + job.photometrySettings.zeroPoint - redExtinction;


              // blueZeroPoint = 20.323;
              // greenZeroPoint = 20.964;
              // redZeroPoint = 20.659;


              let HCK = 14387.7688;
              let POWER = 3;
              let whiteRefPeak = this.form.controls.whiteReference.value.peak;
              let whiteRefTemp = 2898.0 / whiteRefPeak;

              let blueWBCorr = Math.pow((blueFilter.center / whiteRefPeak), POWER) * (Math.exp(HCK / whiteRefTemp / blueFilter.center) - 1) / (Math.exp(HCK / whiteRefTemp / whiteRefPeak) - 1);
              let greenWBCorr = Math.pow((greenFilter.center / whiteRefPeak), POWER) * (Math.exp(HCK / whiteRefTemp / greenFilter.center) - 1) / (Math.exp(HCK / whiteRefTemp / whiteRefPeak) - 1);
              let redWBCorr = Math.pow((redFilter.center / whiteRefPeak), POWER) * (Math.exp(HCK / whiteRefTemp / redFilter.center) - 1) / (Math.exp(HCK / whiteRefTemp / whiteRefPeak) - 1);

              let greenZPCorr = Math.pow(10, (blueZeroPoint - greenZeroPoint) / 2.5) * (blueExpLength / greenExpLength);
              let redZPCorr = Math.pow(10, (blueZeroPoint - redZeroPoint) / 2.5) * (blueExpLength / redExpLength);;

              this.dialogRef.close([
                { layerId: blueLayer.id, scale: 1 },
                { layerId: greenLayer.id, scale: (greenWBCorr * greenZPCorr) / blueWBCorr },
                { layerId: redLayer.id, scale: (redWBCorr * redZPCorr) / blueWBCorr }
              ])

            }
            else {
              this.statusMessage$.next(`Field calibration completed. Downloading result.`);
            }
          }

        }




      },
      (error) => {

      },
      () => {

      })
  }

}
