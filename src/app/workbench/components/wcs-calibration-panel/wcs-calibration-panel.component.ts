import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngxs/store';
import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, filter, flatMap, map, takeUntil } from 'rxjs/operators';
import { DataFilesState } from '../../../data-files/data-files.state';
import { getDecDegs, getDegsPerPixel, getHeight, getRaHours, getWidth, Header, IHdu } from '../../../data-files/models/data-file';
import { WcsCalibrationJob, WcsCalibrationJobResult } from '../../../jobs/models/wcs_calibration';
import { formatDms, parseDms } from '../../../utils/skynet-astro';
import { isNumberOrSexagesimalValidator, greaterThan, isNumber } from '../../../utils/validators';
import { SourceExtractionSettings } from '../../models/source-extraction-settings';
import { WcsCalibrationSettings } from '../../models/workbench-state';
import { CreateWcsCalibrationJob } from '../../workbench.actions';
import { SourceExtractionDialogComponent } from '../source-extraction-dialog/source-extraction-dialog.component';



@Component({
  selector: 'app-wcs-calibration-panel',
  templateUrl: './wcs-calibration-panel.component.html',
  styleUrls: ['./wcs-calibration-panel.component.scss']
})
export class WcsCalibrationPanelComponent implements OnInit, OnDestroy {
  @Input("hduIds")
  set hduIds(hduIds: string[]) {
    this.hduIds$.next(hduIds);
  }
  get hduIds() {
    return this.hduIds$.getValue();
  }
  private hduIds$ = new BehaviorSubject<string[]>(null);

  @Input("selectedHduIds")
  set selectedHduIds(selectedHduIds: string[]) {
    this.selectedHduIds$.next(selectedHduIds);
  }
  get selectedHduIds() {
    return this.selectedHduIds$.getValue();
  }
  private selectedHduIds$ = new BehaviorSubject<string[]>(null);

  @Input("activeJob")
  set activeJob(activeJob: WcsCalibrationJob) {
    this.activeJob$.next(activeJob);
  }
  get activeJob() {
    return this.activeJob$.getValue();
  }
  private activeJob$ = new BehaviorSubject<WcsCalibrationJob>(null);

  @Input("activeJobResult")
  set activeJobResult(activeJobResult: WcsCalibrationJobResult) {
    this.activeJobResult$.next(activeJobResult);
  }
  get activeJobResult() {
    return this.activeJobResult$.getValue();
  }
  private activeJobResult$ = new BehaviorSubject<WcsCalibrationJobResult>(null);

  @Input("wcsCalibrationSettings")
  set wcsCalibrationSettings(wcsCalibrationSettings: WcsCalibrationSettings) {
    this.wcsCalibrationSettings$.next(wcsCalibrationSettings);
  }
  get wcsCalibrationSettings() {
    return this.wcsCalibrationSettings$.getValue();
  }
  private wcsCalibrationSettings$ = new BehaviorSubject<WcsCalibrationSettings>(null);

  @Input("sourceExtractionSettings")
  set sourceExtractionSettings(sourceExtractionSettings: SourceExtractionSettings) {
    this.sourceExtractionSettings$.next(sourceExtractionSettings);
  }
  get sourceExtractionSettings() {
    return this.sourceExtractionSettings$.getValue();
  }
  private sourceExtractionSettings$ = new BehaviorSubject<SourceExtractionSettings>(null);

  @Input() autofillHeader: Header = null;

  @Output() onSelectedHduIdsChange = new EventEmitter<string[]>();
  @Output() onWcsCalibrationSettingsChange = new EventEmitter<WcsCalibrationSettings>();
  @Output() onSourceExtractionSettingsChange = new EventEmitter<SourceExtractionSettings>();

  destroy$: Subject<boolean> = new Subject<boolean>();

  isNumber = [Validators.required, isNumber]
  greaterThanZero = [Validators.required, isNumber, greaterThan(0)]
  minZero = [Validators.required, isNumber, Validators.min(0)]
  wcsCalibrationForm = new FormGroup({
    selectedHduIds: new FormControl([], Validators.required),
    ra: new FormControl("", { updateOn: 'blur', validators: [isNumberOrSexagesimalValidator] }),
    dec: new FormControl("", { updateOn: 'blur', validators: [isNumberOrSexagesimalValidator] }),
    radius: new FormControl("", this.minZero),
    minScale: new FormControl("", this.minZero),
    maxScale: new FormControl("", this.minZero),
    maxSources: new FormControl("", this.minZero),
  });

  constructor(private store: Store, private dialog: MatDialog) {
    combineLatest([this.selectedHduIds$, this.wcsCalibrationSettings$]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([selectedHduIds, settings]) => {
      if (selectedHduIds) {
        this.wcsCalibrationForm.patchValue({
          selectedHduIds: selectedHduIds
        }, { emitEvent: false })
      }

      if (settings) {
        this.wcsCalibrationForm.patchValue({
          ra: settings.ra || settings.ra == 0 ? formatDms(settings.ra, 3, 4, null, null, null, null) : settings.ra,
          dec: settings.dec || settings.dec == 0 ? formatDms(settings.dec, 3, 4, null, null, null, null) : settings.dec,
          radius: settings.radius,
          minScale: settings.minScale,
          maxScale: settings.maxScale,
          maxSources: settings.maxSources
        }, { emitEvent: false })
      }

    })

    this.wcsCalibrationForm.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(value => {
      if (this.wcsCalibrationForm.valid) {
        this.onSelectedHduIdsChange.emit(value.selectedHduIds);

        let raString: string = value.ra;
        let ra: number = null;
        if (raString && raString.trim() != "") {
          ra = Number(raString);
          if (isNaN(ra)) ra = parseDms(raString);
        }

        let decString: string = value.dec;
        let dec: number = null;
        if (decString && decString.trim() != "") {
          dec = Number(decString);
          if (isNaN(dec)) dec = parseDms(decString);
        }
        this.onWcsCalibrationSettingsChange.emit({
          ra: ra,
          dec: dec,
          radius: value.radius,
          maxScale: value.maxScale,
          minScale: value.minScale,
          maxSources: value.maxSources
        });
      }

    })
  }

  ngOnInit(): void {
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }


  getHduOptionLabel(hduId: string) {
    let file$ = this.store.select(DataFilesState.getFileByHduId).pipe(
      map(fn => fn(hduId))
    )

    let hasMultipleHdus$ = file$.pipe(
      map(file => file && file.hduIds.length > 1),
      distinctUntilChanged()
    )

    let filename$ = file$.pipe(
      map(file => file && file.name),
      distinctUntilChanged(),
    )

    let hduLabel$ = this.store.select(DataFilesState.getHduLabel).pipe(
      map(fn => fn(hduId)),
      distinctUntilChanged(),
    )

    return combineLatest([hasMultipleHdus$, filename$, hduLabel$]).pipe(
      map(([hasMultipleHdus, filename, hduLabel]) => {
        if (!hasMultipleHdus$) return filename;
        return `${filename} - ${hduLabel}`
      })
    )
  }

  trackHdu(index: number, element: IHdu) {
    return element ? element.id : null
  }


  setSelectedHduIds(hduIds: string[]) {
    this.wcsCalibrationForm.controls.selectedHduIds.setValue(hduIds)
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
    let dialogRef = this.dialog.open(SourceExtractionDialogComponent, {
      width: "500px",
      data: { ...this.sourceExtractionSettings },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.onSourceExtractionSettingsChange.emit(result);
      }
    });
  }

  onAutofillFromFocusedViewerClick() {
    if (!this.autofillHeader) return;

    let ra: number = null;
    let dec: number = null;
    let width = getWidth(this.autofillHeader);
    let height = getHeight(this.autofillHeader);
    let wcs = this.autofillHeader.wcs;
    if (width && height && wcs && wcs.isValid) {
      let raDec: [number, number] = wcs.pixToWorld([width / 2, height / 2]) as [number, number];
      ra = raDec[0];
      dec = raDec[1];
    }
    else {
      ra = getRaHours(this.autofillHeader);
      dec = getDecDegs(this.autofillHeader);
    }

    let degsPerPixel = getDegsPerPixel(this.autofillHeader);


    let changes: Partial<WcsCalibrationSettings> = {
      ra: null,
      dec: null,
      minScale: null,
      maxScale: null,
    }

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

    this.onWcsCalibrationSettingsChange.emit({
      ...this.wcsCalibrationSettings,
      ...changes
    });


  }
}
