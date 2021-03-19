import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngxs/store';
import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, filter, flatMap, map, switchMap, takeUntil } from 'rxjs/operators';
import { DataFilesState } from '../../../data-files/data-files.state';
import {
  getDecDegs,
  getDegsPerPixel,
  getHeight,
  getRaHours,
  getWidth,
  Header,
  IHdu,
} from '../../../data-files/models/data-file';
import { JobsState } from '../../../jobs/jobs.state';
import { WcsCalibrationJob, WcsCalibrationJobResult } from '../../../jobs/models/wcs_calibration';
import { formatDms, parseDms } from '../../../utils/skynet-astro';
import { isNumberOrSexagesimalValidator, greaterThan, isNumber } from '../../../utils/validators';
import { SourceExtractionSettings } from '../../models/source-extraction-settings';
import { WorkbenchImageHduState } from '../../models/workbench-file-state';
import { WcsCalibrationPanelState, WcsCalibrationSettings } from '../../models/workbench-state';
import { ImageViewerEventService } from '../../services/image-viewer-event.service';
import {
  CreateWcsCalibrationJob,
  UpdateSourceExtractionSettings,
  UpdateWcsCalibrationPanelState,
  UpdateWcsCalibrationSettings,
} from '../../workbench.actions';
import { WorkbenchState } from '../../workbench.state';
import { SourceExtractionDialogComponent } from '../source-extraction-dialog/source-extraction-dialog.component';

@Component({
  selector: 'app-wcs-calibration-panel',
  templateUrl: './wcs-calibration-panel.component.html',
  styleUrls: ['./wcs-calibration-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WcsCalibrationPanelComponent implements OnInit, OnDestroy {
  @Input('viewerId')
  set viewerId(viewer: string) {
    this.viewerId$.next(viewer);
  }
  get viewerId() {
    return this.viewerId$.getValue();
  }
  protected viewerId$ = new BehaviorSubject<string>(null);

  @Input('hduIds')
  set hduIds(hduIds: string[]) {
    this.hduIds$.next(hduIds);
  }
  get hduIds() {
    return this.hduIds$.getValue();
  }
  private hduIds$ = new BehaviorSubject<string[]>(null);

  destroy$: Subject<boolean> = new Subject<boolean>();
  header$: Observable<Header>;
  state$: Observable<WcsCalibrationPanelState>;
  selectedHduIds$: Observable<string[]>;
  activeJob$: Observable<WcsCalibrationJob>;
  activeJobResult$: Observable<WcsCalibrationJobResult>;
  wcsCalibrationSettings$: Observable<WcsCalibrationSettings>;
  sourceExtractionSettings$: Observable<SourceExtractionSettings>;

  isNumber = [Validators.required, isNumber];
  greaterThanZero = [Validators.required, isNumber, greaterThan(0)];
  minZero = [Validators.required, isNumber, Validators.min(0)];
  wcsCalibrationForm = new FormGroup({
    selectedHduIds: new FormControl([], Validators.required),
    ra: new FormControl('', { updateOn: 'blur', validators: [isNumberOrSexagesimalValidator] }),
    dec: new FormControl('', { updateOn: 'blur', validators: [isNumberOrSexagesimalValidator] }),
    radius: new FormControl('', this.minZero),
    minScale: new FormControl('', this.minZero),
    maxScale: new FormControl('', this.minZero),
    maxSources: new FormControl('', this.minZero),
  });

  constructor(private store: Store, private dialog: MatDialog) {
    this.header$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getHduHeaderByViewerId(viewerId)))
    );

    this.state$ = this.store.select(WorkbenchState.getWcsCalibrationPanelState);
    this.selectedHduIds$ = this.state$.pipe(map((state) => state.selectedHduIds));

    this.wcsCalibrationSettings$ = this.store.select(WorkbenchState.getWcsCalibrationSettings);
    this.sourceExtractionSettings$ = this.store.select(WorkbenchState.getSourceExtractionSettings);

    this.activeJob$ = combineLatest([
      this.store.select(JobsState.getJobEntities),
      this.state$.pipe(
        map((state) => (state ? state.activeJobId : null)),
        distinctUntilChanged()
      ),
    ]).pipe(
      map(([jobEntities, activeJobId]) => {
        if (!activeJobId) return null;
        return jobEntities[activeJobId] as WcsCalibrationJob;
      })
    );

    this.activeJobResult$ = this.activeJob$.pipe(map((job) => job.result));

    combineLatest([this.selectedHduIds$, this.wcsCalibrationSettings$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([selectedHduIds, settings]) => {
        if (selectedHduIds) {
          this.wcsCalibrationForm.patchValue(
            {
              selectedHduIds: selectedHduIds,
            },
            { emitEvent: false }
          );
        }

        if (settings) {
          this.wcsCalibrationForm.patchValue(
            {
              ra: settings.ra || settings.ra == 0 ? formatDms(settings.ra, 3, 4, null, null, null, null) : settings.ra,
              dec:
                settings.dec || settings.dec == 0
                  ? formatDms(settings.dec, 3, 4, null, null, null, null)
                  : settings.dec,
              radius: settings.radius,
              minScale: settings.minScale,
              maxScale: settings.maxScale,
              maxSources: settings.maxSources,
            },
            { emitEvent: false }
          );
        }
      });

    this.wcsCalibrationForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      if (this.wcsCalibrationForm.valid) {
        this.store.dispatch(new UpdateWcsCalibrationPanelState({ selectedHduIds: value.selectedHduIds }));

        let raString: string = value.ra;
        let ra: number = null;
        if (raString && raString.trim() != '') {
          ra = Number(raString);
          if (isNaN(ra)) ra = parseDms(raString);
        }

        let decString: string = value.dec;
        let dec: number = null;
        if (decString && decString.trim() != '') {
          dec = Number(decString);
          if (isNaN(dec)) dec = parseDms(decString);
        }
        this.store.dispatch(
          new UpdateWcsCalibrationSettings({
            ra: ra,
            dec: dec,
            radius: value.radius,
            maxScale: value.maxScale,
            minScale: value.minScale,
            maxSources: value.maxSources,
          })
        );
      }
    });
  }

  ngOnInit(): void {}

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  getHduOptionLabel(hduId: string) {
    return this.store.select(DataFilesState.getHduById(hduId)).pipe(
      map((hdu) => hdu?.name),
      distinctUntilChanged()
    );
  }

  setSelectedHduIds(hduIds: string[]) {
    this.wcsCalibrationForm.controls.selectedHduIds.setValue(hduIds);
  }

  onSelectAllBtnClick() {
    this.setSelectedHduIds(this.hduIds);
  }

  onClearSelectionBtnClick() {
    this.setSelectedHduIds([]);
  }

  onSubmitClick() {
    this.store.dispatch(new CreateWcsCalibrationJob(this.wcsCalibrationForm.controls.selectedHduIds.value));
  }

  onOpenSourceExtractionSettingsClick() {
    let sourceExtractionSettings = this.store.selectSnapshot(WorkbenchState.getSourceExtractionSettings);
    let dialogRef = this.dialog.open(SourceExtractionDialogComponent, {
      width: '500px',
      data: { ...sourceExtractionSettings },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.store.dispatch(new UpdateSourceExtractionSettings(result));
      }
    });
  }

  onAutofillFromFocusedViewerClick(header: Header) {
    if (!header) return;

    let ra: number = null;
    let dec: number = null;
    let width = getWidth(header);
    let height = getHeight(header);
    let wcs = header.wcs;
    if (width && height && wcs && wcs.isValid) {
      let raDec: [number, number] = wcs.pixToWorld([width / 2, height / 2]) as [number, number];
      ra = raDec[0];
      dec = raDec[1];
    } else {
      ra = getRaHours(header);
      dec = getDecDegs(header);
    }

    let degsPerPixel = getDegsPerPixel(header);

    let changes: Partial<WcsCalibrationSettings> = {
      ra: null,
      dec: null,
      minScale: null,
      maxScale: null,
    };

    if (ra || ra == 0) {
      changes.ra = ra;
    }
    if (dec || dec == 0) {
      changes.dec = dec;
    }

    if (degsPerPixel) {
      changes.minScale = Math.round(degsPerPixel * 0.9 * 3600 * 100000) / 100000;
      changes.maxScale = Math.round(degsPerPixel * 1.1 * 3600 * 100000) / 100000;
    }

    let wcsCalibrationSettings = this.store.selectSnapshot(WorkbenchState.getWcsCalibrationSettings);
    this.store.dispatch(
      new UpdateWcsCalibrationSettings({
        ...wcsCalibrationSettings,
        ...changes,
      })
    );
  }
}
