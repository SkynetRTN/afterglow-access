import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Catalog } from 'src/app/jobs/models/catalog-query';
import { greaterThan, isNumber, lessThan } from 'src/app/utils/validators';
import { UpdateCalibrationSettings, UpdateSourceExtractionSettings } from 'src/app/workbench/workbench.actions';
import { WorkbenchState } from 'src/app/workbench/workbench.state';
import { defaults } from '../../workbench/models/global-settings';

@Component({
  selector: 'app-source-extraction-settings',
  templateUrl: './source-extraction-settings.component.html',
  styleUrls: ['./source-extraction-settings.component.scss']
})
export class SourceExtractionSettingsComponent implements OnInit, OnDestroy {
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
  })

  settings$ = this.store.select(WorkbenchState.getSourceExtractionSettings);
  catalogs$: Observable<Catalog[]>;
  selectedCatalog$: Observable<Catalog>;

  constructor(private store: Store) {
    this.sourceExtractionForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.onFormChange();
      });

    this.settings$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(settings => this.onSettingsChange())

    //init
    this.onSettingsChange();
    this.onFormChange();
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

  onSettingsChange() {
    let settings = this.store.selectSnapshot(WorkbenchState.getSourceExtractionSettings);
    let value = {};
    this.getValidFormFields().forEach(key => value[key] = settings[key])
    this.sourceExtractionForm.patchValue(value, { emitEvent: false })
  }

  onFormChange() {
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

    this.store.dispatch(new UpdateSourceExtractionSettings(value))

  }

  restoreDefaults() {
    this.sourceExtractionForm.markAsPristine();
    this.store.dispatch(new UpdateSourceExtractionSettings({ ...defaults.sourceExtraction }))
  }

}
