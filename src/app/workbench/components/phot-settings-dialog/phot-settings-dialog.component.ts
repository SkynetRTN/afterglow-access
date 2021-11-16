import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Store } from '@ngxs/store';
import { combineLatest, Observable, Subject } from 'rxjs';
import { map, takeUntil, tap } from 'rxjs/operators';
import { greaterThan, isNumber, lessThan } from '../../../utils/validators';
import { Catalog } from '../../models/catalog';
import { PhotometrySettings, defaults as defaultPhotometrySettings } from '../../models/photometry-settings';
import { WorkbenchState } from '../../workbench.state';

@Component({
  selector: 'app-phot-settings-dialog',
  templateUrl: './phot-settings-dialog.component.html',
  styleUrls: ['./phot-settings-dialog.component.scss'],
})
export class PhotSettingsDialogComponent implements OnInit, OnDestroy {
  apertureModes = [
    { label: 'Adaptive Aperture', value: 'adaptive' },
    { label: 'Constant Aperture', value: 'constant' },
  ];

  calibrationModes = [
    { label: 'Fixed Zero Point', value: 'fixed' },
    { label: 'Catalog Calibration', value: 'catalog' },
  ];

  catalogs$: Observable<Catalog[]>;

  settings: PhotometrySettings;

  destroy$ = new Subject<boolean>();

  isNumber = [Validators.required, isNumber];
  greaterThanZero = [Validators.required, isNumber, greaterThan(0)];
  minZero = [Validators.required, isNumber, Validators.min(0)];

  photSettingsForm = new FormGroup({
    mode: new FormControl('', { validators: [Validators.required] }),
    gain: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    centroidRadius: new FormControl('', { validators: this.minZero, updateOn: 'blur' }),
    a: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    aIn: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    aOut: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    elliptical: new FormControl('', [Validators.required]),
    b: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    bOut: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    theta: new FormControl('', { validators: [...this.minZero, lessThan(360)], updateOn: 'blur' }),
    thetaOut: new FormControl('', { validators: [...this.minZero, lessThan(360)], updateOn: 'blur' }),
    constantAperCorr: new FormControl(false, { updateOn: 'blur' }),
    aKrFactor: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    aInKrFactor: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    aOutKrFactor: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    autoAper: new FormControl(false),
    fixAper: new FormControl(false),
    fixEll: new FormControl(false),
    fixRot: new FormControl(false),
    adaptiveAperCorr: new FormControl(false, { updateOn: 'blur' }),
    calibrationMode: new FormControl('', { validators: [Validators.required] }),
    zeroPoint: new FormControl('', { validators: this.isNumber, updateOn: 'blur' }),
    catalog: new FormControl('', { validators: [Validators.required] }),
    sourceInclusionPercentageEnabled: new FormControl(false),
    sourceInclusionPercentage: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0), lessThan(100, true)], updateOn: 'blur' }),
    minSnrEnabled: new FormControl(false),
    minSnr: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    maxSnrEnabled: new FormControl(false),
    maxSnr: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
  });

  constructor(
    public dialogRef: MatDialogRef<PhotSettingsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PhotometrySettings,
    private store: Store
  ) {
    this.settings = data;
    this.catalogs$ = this.store.select(WorkbenchState.getCatalogs);

    this.photSettingsForm.patchValue(this.settings);

    this.photSettingsForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.onPhotSettingsFormValueChange();
      });

    this.onPhotSettingsFormValueChange();
  }


  onPhotSettingsFormValueChange() {
    let value = this.photSettingsForm.value;
    let controls = this.photSettingsForm.controls;
    let elliptical = controls.elliptical.value;
    if (!elliptical) {
      controls.b.disable({emitEvent: false});
      controls.bOut.disable({emitEvent: false});
      controls.theta.disable({emitEvent: false});
      controls.thetaOut.disable({emitEvent: false});

      value = {
        ...value,
        b: this.photSettingsForm.value.a,
        bOut: this.photSettingsForm.value.aOut,
        theta: 0,
        thetaOut: 0,
      };

      this.photSettingsForm.patchValue(value, { emitEvent: false });

    } else {
      controls.b.enable({emitEvent: false});
      controls.bOut.enable({emitEvent: false});
      controls.theta.enable({emitEvent: false});
      controls.thetaOut.enable({emitEvent: false});
    }

    let autoAper = controls.autoAper.value;
    if (autoAper) {
      controls.aKrFactor.disable({emitEvent: false});
    } else {
      controls.aKrFactor.enable({emitEvent: false});
    }

    let inCatalogMode = controls.calibrationMode.value == 'catalog';
    inCatalogMode ? controls.zeroPoint.disable({emitEvent: false}) : controls.zeroPoint.enable({emitEvent: false});
    (inCatalogMode && controls.sourceInclusionPercentageEnabled.value) ? controls.sourceInclusionPercentage.enable({emitEvent: false}) : controls.sourceInclusionPercentage.disable({emitEvent: false});
    (inCatalogMode && controls.minSnrEnabled.value) ? controls.minSnr.enable({emitEvent: false}) : controls.minSnr.disable({emitEvent: false});
    (inCatalogMode && controls.maxSnrEnabled.value) ? controls.maxSnr.enable({emitEvent: false}) : controls.maxSnr.disable({emitEvent: false});

    this.settings = {
      ...this.settings,
      ...value,
    };

  }

  ngOnInit() {
    // this.dialogRef.updateSize('700px');
    // this.dialogRef.updateSize('800px', '750px');
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  restoreDefaults() {
    this.settings = { ...defaultPhotometrySettings };
    this.photSettingsForm.patchValue(this.settings);
  }
}
