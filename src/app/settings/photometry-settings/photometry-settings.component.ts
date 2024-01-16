import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { greaterThan, isInteger, isNumber, lessThan } from 'src/app/utils/validators';
import { UpdateCalibrationSettings, UpdatePhotometrySettings, UpdateSourceExtractionSettings } from 'src/app/workbench/workbench.actions';
import { WorkbenchState } from 'src/app/workbench/workbench.state';
import { defaults } from '../../workbench/models/global-settings';
import { MatSelectionListChange } from '@angular/material/list';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Catalog } from 'src/app/jobs/models/catalog-query';

@Component({
  selector: 'app-photometry-settings',
  templateUrl: './photometry-settings.component.html',
  styleUrls: ['./photometry-settings.component.scss']
})
export class PhotometrySettingsComponent implements OnInit, OnDestroy {

  destroy$ = new Subject<boolean>();

  apertureModes = [
    { label: 'Adaptive Aperture', value: 'adaptive' },
    { label: 'Constant Aperture', value: 'constant' },
  ];

  sNumber = [Validators.required, isNumber];
  greaterThanZero = [Validators.required, isNumber, greaterThan(0)];
  minZero = [Validators.required, isNumber, Validators.min(0)];

  photometryForm = new FormGroup({
    mode: new FormControl('', { validators: [Validators.required] }),
    gain: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    centroidRadius: new FormControl('', { validators: this.minZero, updateOn: 'blur' }),
    a: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    aIn: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    aOut: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    elliptical: new FormControl('', { updateOn: 'change' }),
    b: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    bOut: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    theta: new FormControl('', { validators: [...this.minZero, lessThan(360)], updateOn: 'blur' }),
    thetaOut: new FormControl('', { validators: [...this.minZero, lessThan(360)], updateOn: 'blur' }),
    constantAperCorr: new FormControl(false, { updateOn: 'change' }),
    aKrFactor: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    aInKrFactor: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    aOutKrFactor: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    autoAper: new FormControl(false, { updateOn: 'change' }),
    fixAper: new FormControl(false, { updateOn: 'change' }),
    fixEll: new FormControl(false, { updateOn: 'change' }),
    fixRot: new FormControl(false, { updateOn: 'change' }),
    adaptiveAperCorr: new FormControl(false, { updateOn: 'change' }),
  });

  photometrySettings$ = this.store.select(WorkbenchState.getPhotometrySettings);


  calibrationForm = new FormGroup({
    calibrationEnabled: new FormControl('', { updateOn: 'change' }),
    zeroPoint: new FormControl('', { validators: isNumber, updateOn: 'blur' }),
    sourceInclusionPercentageEnabled: new FormControl('', { updateOn: 'change' }),
    sourceInclusionPercentage: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0), lessThan(100, true)], updateOn: 'blur' }),
    minSnrEnabled: new FormControl('', { updateOn: 'change' }),
    minSnr: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    maxSnrEnabled: new FormControl('', { updateOn: 'change' }),
    maxSnr: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    sourceMatchTol: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    variableCheckEnabled: new FormControl('', { updateOn: 'change' }),
    variableCheckTol: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    maxStarRmsEnabled: new FormControl('', { updateOn: 'change' }),
    maxStarRms: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    maxStarsEnabled: new FormControl('', { updateOn: 'change' }),
    maxStars: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
  })

  calibrationSettings$ = this.store.select(WorkbenchState.getCalibrationSettings);
  catalogs$ = this.store.select(WorkbenchState.getCatalogs);
  selectedCatalog$: Observable<Catalog>;



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

  sourceExtractionSettings$ = this.store.select(WorkbenchState.getSourceExtractionSettings);

  constructor(private store: Store) {
    this.photometryForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.onFormChange();
      });

    this.photometrySettings$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(settings => this.onPhotometrySettingsChange())

    //init
    this.onPhotometrySettingsChange();
    this.onFormChange();


    this.calibrationForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.onCalibrationFormChange());

    this.calibrationSettings$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(settings => this.onCalibrationSettingsChange())

    //init
    this.onCalibrationSettingsChange();
    this.onCalibrationFormChange();


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

  getValidFormFields(form: FormGroup) {
    let controls = form.controls
    return Object.keys(controls).filter(key => controls[key].enabled && (!controls[key].dirty || controls[key].valid))
  }

  onPhotometrySettingsChange() {
    let settings = this.store.selectSnapshot(WorkbenchState.getPhotometrySettings);
    let value = {};
    this.getValidFormFields(this.photometryForm).forEach(key => value[key] = settings[key])
    this.photometryForm.patchValue(value, { emitEvent: false })
  }

  onFormChange() {
    let controls = this.photometryForm.controls;
    let elliptical = controls.elliptical.value;
    if (!elliptical) {
      controls.b.disable({ emitEvent: false });
      controls.bOut.disable({ emitEvent: false });
      controls.theta.disable({ emitEvent: false });
      controls.thetaOut.disable({ emitEvent: false });

      this.photometryForm.patchValue({
        b: this.photometryForm.value.a,
        bOut: this.photometryForm.value.aOut,
        theta: 0,
        thetaOut: 0,
      }, { emitEvent: false });

    } else {
      controls.b.enable({ emitEvent: false });
      controls.bOut.enable({ emitEvent: false });
      controls.theta.enable({ emitEvent: false });
      controls.thetaOut.enable({ emitEvent: false });
    }

    let autoAper = controls.autoAper.value;
    if (autoAper) {
      controls.aKrFactor.disable({ emitEvent: false });
    } else {
      controls.aKrFactor.enable({ emitEvent: false });
    }


    let value = {};
    this.getValidFormFields(this.photometryForm).forEach(key => {
      value[key] = controls[key].value
    })

    this.store.dispatch(new UpdatePhotometrySettings(value))
  }

  restorePhotometryDefaults() {
    this.photometryForm.markAsPristine();
    this.store.dispatch(new UpdatePhotometrySettings({ ...defaults.photometry }))
  }


  onCalibrationSettingsChange() {
    let settings = this.store.selectSnapshot(WorkbenchState.getCalibrationSettings);
    let value = {};
    this.getValidFormFields(this.calibrationForm).forEach(key => value[key] = settings[key])
    this.calibrationForm.patchValue(value, { emitEvent: false })
  }

  onCalibrationFormChange() {
    let controls = this.calibrationForm.controls;
    let calibrationEnabled = controls.calibrationEnabled.value;

    (calibrationEnabled && controls.sourceInclusionPercentageEnabled.value) ? controls.sourceInclusionPercentage.enable({ emitEvent: false }) : controls.sourceInclusionPercentage.disable({ emitEvent: false });
    (calibrationEnabled && controls.minSnrEnabled.value) ? controls.minSnr.enable({ emitEvent: false }) : controls.minSnr.disable({ emitEvent: false });
    (calibrationEnabled && controls.maxSnrEnabled.value) ? controls.maxSnr.enable({ emitEvent: false }) : controls.maxSnr.disable({ emitEvent: false });
    (calibrationEnabled && controls.variableCheckEnabled.value) ? controls.variableCheckTol.enable({ emitEvent: false }) : controls.variableCheckTol.disable({ emitEvent: false });
    (calibrationEnabled && controls.maxStarRmsEnabled.value) ? controls.maxStarRms.enable({ emitEvent: false }) : controls.maxStarRms.disable({ emitEvent: false });
    (calibrationEnabled && controls.maxStarsEnabled.value) ? controls.maxStars.enable({ emitEvent: false }) : controls.maxStars.disable({ emitEvent: false });

    let value = {};
    this.getValidFormFields(this.calibrationForm).forEach(key => {
      value[key] = controls[key].value
    })

    this.store.dispatch(new UpdateCalibrationSettings(value))
  }

  getCatalogLabel(catalogName: string) {
    let catalog = this.store.selectSnapshot(WorkbenchState.getCatalogs).find(c => c.name == catalogName);
    if (!catalog) return '';

    let filters = Object.keys(catalog.mags).join(', ');
    let customFilters = catalog.filterLookup ? Object.keys(catalog.filterLookup).map(f => `${f}*`).join(', ') : '';
    if (customFilters) {
      filters = `${filters}, ${customFilters}`
    }
    return `${catalog.name} (${filters})`


  }

  onCatalogSelectionChange($event: MatSelectionListChange) {
    let catalogs = [...this.store.selectSnapshot(WorkbenchState.getCalibrationSettings).selectedCatalogs];
    $event.options.forEach(option => {
      if (option.selected) {
        if (!catalogs.includes(option.value)) catalogs.push(option.value)
      }
      else {
        catalogs = catalogs.filter(catalog => catalog != option.value)
      }
    })

    this.store.dispatch(new UpdateCalibrationSettings({ selectedCatalogs: catalogs }))

  }

  onCatalogDrop($event: CdkDragDrop<string[]>) {
    let catalogOrder = [...this.store.selectSnapshot(WorkbenchState.getCalibrationSettings).catalogOrder]
    moveItemInArray(catalogOrder, $event.previousIndex, $event.currentIndex)
    this.store.dispatch(new UpdateCalibrationSettings({ catalogOrder: catalogOrder }))
  }

  restoreCalibrationDefaults() {
    this.calibrationForm.markAsPristine();
    this.store.dispatch(new UpdateCalibrationSettings({
      ...defaults.calibration,
    }))
  }



  onSourceExtractionSettingsChange() {
    let settings = this.store.selectSnapshot(WorkbenchState.getSourceExtractionSettings);
    let value = {};
    this.getValidFormFields(this.sourceExtractionForm).forEach(key => value[key] = settings[key])
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
    this.getValidFormFields(this.sourceExtractionForm).forEach(key => {
      value[key] = controls[key].value
    })

    this.store.dispatch(new UpdateSourceExtractionSettings(value))

  }

  restoreSourceExtractionDefaults() {
    this.sourceExtractionForm.markAsPristine();
    this.store.dispatch(new UpdateSourceExtractionSettings({ ...defaults.sourceExtraction }))
  }

}
