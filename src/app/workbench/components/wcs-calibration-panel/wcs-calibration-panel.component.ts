import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngxs/store';
import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, filter, flatMap, map, takeUntil } from 'rxjs/operators';
import { DataFilesState } from '../../../data-files/data-files.state';
import { IHdu } from '../../../data-files/models/data-file';
import { WcsCalibrationJob, WcsCalibrationJobResult } from '../../../jobs/models/wcs_calibration';
import { parseDms } from '../../../utils/skynet-astro';
import { floatOrSexagesimalValidator } from '../../../utils/validators';
import { SourceExtractionSettings } from '../../models/source-extraction-settings';
import { WcsCalibrationSettings } from '../../models/workbench-state';
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

  @Output() onSelectedHduIdsChange = new EventEmitter<string[]>();
  @Output() onWcsCalibrationSettingsChange = new EventEmitter<WcsCalibrationSettings>();
  @Output() onSourceExtractionSettingsChange = new EventEmitter<SourceExtractionSettings>();

  destroy$: Subject<boolean> = new Subject<boolean>();

  wcsCalibrationJobRow$: Observable<{ job: WcsCalibrationJob; result: WcsCalibrationJobResult }>;
  wcsCalibrationForm = new FormGroup({
    selectedHduIds: new FormControl([], Validators.required),
    ra: new FormControl("", [Validators.required, floatOrSexagesimalValidator]),
    dec: new FormControl("", [Validators.required, floatOrSexagesimalValidator]),
    radius: new FormControl("", [Validators.required, Validators.min(0)]),
    minScale: new FormControl("", [Validators.required, Validators.min(0)]),
    maxScale: new FormControl("", [Validators.required, Validators.min(0)]),
    maxSources: new FormControl("", [Validators.required, Validators.min(0)]),
  });

  constructor(private store: Store, private dialog: MatDialog) {
    combineLatest([this.selectedHduIds$, this.wcsCalibrationSettings$]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([selectedHduIds, settings]) => {
      if(selectedHduIds) {
        this.wcsCalibrationForm.patchValue({
          selectedHduIds: selectedHduIds
        }, { emitEvent: false })
      }

      if(settings) {
        this.wcsCalibrationForm.patchValue({
          ra: settings.ra,
          dec: settings.dec,
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
      this.wcsCalibrationForm.updateValueAndValidity({emitEvent: false});
      if(this.wcsCalibrationForm.valid) {
        this.onSelectedHduIdsChange.emit(value.selectedHduIds);
        let ra = Number(value.ra);
        if(isNaN(ra)) ra = parseDms(value.ra);
        let dec = Number(value.dec);
        if(isNaN(ra)) ra = parseDms(value.ra);
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
        if(!hasMultipleHdus$) return filename;
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
}
