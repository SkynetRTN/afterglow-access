import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Catalog } from 'src/app/jobs/models/catalog-query';
import { greaterThan, isInteger, isNumber, lessThan } from 'src/app/utils/validators';
import { UpdateCalibrationSettings, UpdateSourceExtractionSettings, UpdateWcsSourceExtractionSettings } from 'src/app/workbench/workbench.actions';
import { WorkbenchState } from 'src/app/workbench/workbench.state';
import { defaults } from '../../workbench/models/global-settings';

@Component({
  selector: 'app-wcs-calibration-settings',
  templateUrl: './wcs-calibration-settings.component.html',
  styleUrls: ['./wcs-calibration-settings.component.scss']
})
export class WcsCalibrationSettingsComponent implements OnInit, OnDestroy {
  destroy$ = new Subject<boolean>();

  sourceExtractionForm = new FormGroup({
    threshold: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    bkSize: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    bkFilterSize: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    fwhm: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0, true)], updateOn: 'blur' }),
    minFwhm: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    maxFwhm: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    minPixels: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    maxEllipticity: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    deblend: new FormControl('', { updateOn: 'change' }),
    deblendLevels: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    deblendContrast: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    centroid: new FormControl('', { updateOn: 'change' }),
    clean: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    satLevel: new FormControl('', { validators: [Validators.required, isNumber], updateOn: 'blur' }),
    discardSaturated: new FormControl('', { updateOn: 'change' }),
    downsample: new FormControl('', { validators: [Validators.required, isInteger, greaterThan(0)], updateOn: 'blur' }),
    clipLo: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0, true), lessThan(100, true)], updateOn: 'blur' }),
    clipHi: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0, true), lessThan(100, true)], updateOn: 'blur' }),
  })

  sourceExtractionSettings$ = this.store.select(WorkbenchState.getWcsSourceExtractionSettings);


  constructor(private store: Store) {
    this.sourceExtractionForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.onSourceExtractionFormChange();
      });

    this.sourceExtractionSettings$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(settings => this.onSourceExtractionSettingsChange())

    //init
    this.onSourceExtractionSettingsChange();
    this.onSourceExtractionFormChange();
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  getValidFormFields() {
    let controls = this.sourceExtractionForm.controls
    return Object.keys(controls).filter(key => controls[key].enabled && (!controls[key].dirty || controls[key].valid))
  }

  onSourceExtractionSettingsChange() {
    let settings = this.store.selectSnapshot(WorkbenchState.getWcsSourceExtractionSettings);
    let value = {};
    this.getValidFormFields().forEach(key => value[key] = settings[key])
    this.sourceExtractionForm.patchValue(value, { emitEvent: false })
  }

  onSourceExtractionFormChange() {
    let controls = this.sourceExtractionForm.controls;

    if (controls.deblend.value) {
      controls.deblendLevels.enable({ emitEvent: false });
      controls.deblendContrast.enable({ emitEvent: false });
    }
    else {
      controls.deblendLevels.disable({ emitEvent: false });
      controls.deblendContrast.disable({ emitEvent: false });
    }

    let value = {};
    this.getValidFormFields().forEach(key => {
      value[key] = controls[key].value
    })

    this.store.dispatch(new UpdateWcsSourceExtractionSettings(value))

  }

  restoreSourceExtractionDefaults() {
    this.sourceExtractionForm.markAsPristine();
    this.store.dispatch(new UpdateWcsSourceExtractionSettings({ ...defaults.sourceExtraction }))
  }

}
