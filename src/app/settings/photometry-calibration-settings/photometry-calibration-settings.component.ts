import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatSelectionListChange } from '@angular/material/list';
import { Store } from '@ngxs/store';
import { Subject, Observable } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { Catalog } from 'src/app/jobs/models/catalog-query';
import { greaterThan, isNumber, lessThan } from 'src/app/utils/validators';
import { CalibrationSettings } from 'src/app/workbench/models/calibration-settings';
import { UpdateCalibrationSettings } from 'src/app/workbench/workbench.actions';
import { WorkbenchState } from 'src/app/workbench/workbench.state';
import { defaults } from '../../workbench/models/global-settings';

@Component({
  selector: 'app-photometry-calibration-settings',
  templateUrl: './photometry-calibration-settings.component.html',
  styleUrls: ['./photometry-calibration-settings.component.scss']
})
export class PhotometryCalibrationSettingsComponent implements OnInit, OnDestroy {
  destroy$ = new Subject<boolean>();

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

  settings$ = this.store.select(WorkbenchState.getCalibrationSettings);
  catalogs$ = this.store.select(WorkbenchState.getCatalogs);
  selectedCatalog$: Observable<Catalog>;

  constructor(private store: Store) {
    this.calibrationForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.onFormChange());

    this.settings$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(settings => this.onSettingsChange())

    //init
    this.onSettingsChange();
    this.onFormChange();
  }

  getValidFormFields() {
    let controls = this.calibrationForm.controls
    return Object.keys(controls).filter(key => controls[key].enabled && (!controls[key].dirty || controls[key].valid))
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  onSettingsChange() {
    let settings = this.store.selectSnapshot(WorkbenchState.getCalibrationSettings);
    let value = {};
    this.getValidFormFields().forEach(key => value[key] = settings[key])
    this.calibrationForm.patchValue(value, { emitEvent: false })
  }

  onFormChange() {
    let controls = this.calibrationForm.controls;
    let calibrationEnabled = controls.calibrationEnabled.value;

    (calibrationEnabled && controls.sourceInclusionPercentageEnabled.value) ? controls.sourceInclusionPercentage.enable({ emitEvent: false }) : controls.sourceInclusionPercentage.disable({ emitEvent: false });
    (calibrationEnabled && controls.minSnrEnabled.value) ? controls.minSnr.enable({ emitEvent: false }) : controls.minSnr.disable({ emitEvent: false });
    (calibrationEnabled && controls.maxSnrEnabled.value) ? controls.maxSnr.enable({ emitEvent: false }) : controls.maxSnr.disable({ emitEvent: false });
    (calibrationEnabled && controls.variableCheckEnabled.value) ? controls.variableCheckTol.enable({ emitEvent: false }) : controls.variableCheckTol.disable({ emitEvent: false });
    (calibrationEnabled && controls.maxStarRmsEnabled.value) ? controls.maxStarRms.enable({ emitEvent: false }) : controls.maxStarRms.disable({ emitEvent: false });
    (calibrationEnabled && controls.maxStarsEnabled.value) ? controls.maxStars.enable({ emitEvent: false }) : controls.maxStars.disable({ emitEvent: false });

    let value = {};
    this.getValidFormFields().forEach(key => {
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

  restoreDefaults() {
    this.calibrationForm.markAsPristine();
    this.store.dispatch(new UpdateCalibrationSettings({
      ...defaults.calibration,
    }))
  }

}
