import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Actions, ofActionCompleted, Store } from '@ngxs/store';
import { LogMessage as NgxLogMessage } from 'ngx-log-monitor';
import { BehaviorSubject, combineLatest, forkJoin, merge, of, Subject, timer } from 'rxjs';
import { filter, map, take, tap } from 'rxjs/operators';
import { DataFilesState } from 'src/app/data-files/data-files.state';
import { FieldCalibrationJob } from 'src/app/jobs/models/field-calibration';
import { JobType } from 'src/app/jobs/models/job-types';
import { isFieldCalibrationJob } from 'src/app/jobs/models/field-calibration';
import { JobService } from 'src/app/jobs/services/job.service';
import { toFieldCalibration, toPhotometryJobSettings, toSourceExtractionJobSettings } from '../../models/global-settings';
import { WorkbenchState } from '../../workbench.state';
import { LoadHduHeader } from 'src/app/data-files/data-files.actions';
import { getFilter, IHdu } from 'src/app/data-files/models/data-file';

@Component({
  selector: 'app-photometric-color-balance-dialog',
  templateUrl: './photometric-color-balance-dialog.component.html',
  styleUrls: ['./photometric-color-balance-dialog.component.scss']
})
export class PhotometricColorBalanceDialogComponent implements OnInit, AfterViewInit {
  redId: string;
  greenId: string;
  blueId: string;
  layers: IHdu[];
  filters: string[];
  whiteReferences = [
    {
      name: 'F0IIIa Star',
      U: 3.89,
      B: 3.72,
      V: 3.41,
      R: 3.09,
      I: 3.2639,
      J: 2.91,
      H: 2.81,
      K: 2.628
    }
  ]
  whiteReference = this.whiteReferences[0];
  ready = false;
  running = false;
  logStream$ = new BehaviorSubject<{ message: string, type?: 'SUCCESS' | 'WARN' | 'ERR' | 'INFO' }>(null);
  photometryConstants = {
    "U": [0.36, 1823],
    "B": [0.43, 4130],
    "V": [0.55, 3781],
    "R": [0.70, 2941],
    "I": [0.90, 2635],
    "J": [1.25, 1603],
    "H": [1.60, 1075],
    "K": [2.22, 667],
    "L": [3.54, 288],
    "M": [4.80, 170],
    "N": [10.6, 36],
    "O": [21.0, 9.4]
  }

  constructor(public dialogRef: MatDialogRef<PhotometricColorBalanceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public layerIds: string[],
    private store: Store,
    private jobService: JobService,
    private actions$: Actions) {
  }



  ngOnInit(): void {

    this.layers = this.layerIds.map(id => this.store.selectSnapshot(DataFilesState.getHduById(id)));

    if (this.layers.length < 3) this.logStream$.next({ message: `Photometric color calibration only works with files having at least three layers.`, type: 'ERR' })

    let headers$ = this.layers.map(layer => {
      let header = this.store.selectSnapshot(DataFilesState.getHeaderByHduId(layer.id));
      if (header.loaded) return of(header);

      return this.actions$.pipe(
        ofActionCompleted(LoadHduHeader),
        filter(a => a.action.hduId == layer.id),
        take(1),
        map(a => {
          if (!a.result.successful) {
            this.logStream$.next({ message: `Failed to load ${layer.name} header`, type: 'ERR' })
            return null;
          }

          this.logStream$.next({ message: `${layer.name} header successfully loaded`, type: 'INFO' })
          return this.store.selectSnapshot(DataFilesState.getHeaderByHduId(layer.id));
        })
      )

    })

    forkJoin(headers$).subscribe(headers => {
      if (headers.includes(null)) return;

      for (let header of headers) {
        if (header == null) return;

        let f = getFilter(header);
        if (!this.photometryConstants[f]) {
          this.logStream$.next({ message: `Unknown filter ${f}.  Photometric color calibration currently only supports the UBVRI filter set`, type: 'ERR' })
          return null;
        }
      }

      this.filters = headers.map(header => getFilter(header));
      let order = headers.map((header, index) => { return { layer: this.layers[index], header: header, order: Object.keys(this.photometryConstants).indexOf(getFilter(header)) } })
      order.sort((a, b) => a.order - b.order)
      this.blueId = order[0].layer.id;
      this.greenId = order[1].layer.id;
      this.redId = order[2].layer.id;
      this.ready = true;
    })


  }

  ngAfterViewInit() {

  }

  start() {
    this.running = true;
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
      fileIds: this.layerIds,
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
              if (job.result.errors.length != 0) {
                this.logStream$.next({ message: `The field calibration completed with errors.`, type: 'ERR' })
                return;
              }
              if (job.result.data.length != this.layerIds.length) {
                this.logStream$.next({ message: `The field calibration completed but did not return zero points for all layers`, type: 'ERR' })
                return;
              }

              let bIndex = this.layerIds.indexOf(this.blueId);
              let gIndex = this.layerIds.indexOf(this.greenId);
              let rIndex = this.layerIds.indexOf(this.redId);

              let b = job.result.data[bIndex].zeroPointCorr;
              let g = job.result.data[gIndex].zeroPointCorr;
              let r = job.result.data[rIndex].zeroPointCorr;

              let B = this.whiteReference[this.filters[bIndex]];
              let G = this.whiteReference[this.filters[gIndex]];
              let R = this.whiteReference[this.filters[rIndex]];

              let BG = (B - G) - (b - g);
              let RG = (R - G) - (r - g);

              let bScale = this.photometryConstants[this.filters[gIndex]][1] / this.photometryConstants[this.filters[bIndex]][1] * Math.pow(10.0, -0.4 * -BG)
              let rScale = this.photometryConstants[this.filters[rIndex]][1] * Math.pow(10.0, -0.4 * RG) / this.photometryConstants[this.filters[gIndex]][1]

              this.dialogRef.close([
                { layerId: this.blueId, scale: bScale },
                { layerId: this.greenId, scale: 1.0 },
                { layerId: this.redId, scale: rScale }
              ])

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

}
