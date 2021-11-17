import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Store } from '@ngxs/store';
import { combineLatest, Observable, Subject } from 'rxjs';
import { map, takeUntil, tap } from 'rxjs/operators';
import { Catalog } from 'src/app/jobs/models/catalog-query';
import { greaterThan, isNumber, lessThan } from '../../../utils/validators';
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
    calibrationEnabled: new FormControl(false),
    zeroPoint: new FormControl('', { validators: this.isNumber, updateOn: 'blur' }),
    catalog: new FormControl('', { validators: [Validators.required] }),
    sourceInclusionPercentageEnabled: new FormControl(false),
    sourceInclusionPercentage: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0), lessThan(100, true)], updateOn: 'blur' }),
    minSnrEnabled: new FormControl(false),
    minSnr: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    maxSnrEnabled: new FormControl(false),
    maxSnr: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    sourceMatchTol: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    threshold: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    bkSize: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    bkFilterSize: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    fwhm: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0, true)], updateOn: 'blur' }),
    minFwhm: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    maxFwhm: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    minPixels: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    maxEllipticity: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    deblend: new FormControl(false),
    deblendLevels: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    deblendContrast: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    centroid: new FormControl(false),
    clean: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    satLevel: new FormControl('', { validators: [Validators.required, isNumber], updateOn: 'blur' }),
    discardSaturated: new FormControl(false),

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
      controls.b.disable({ emitEvent: false });
      controls.bOut.disable({ emitEvent: false });
      controls.theta.disable({ emitEvent: false });
      controls.thetaOut.disable({ emitEvent: false });

      value = {
        ...value,
        b: this.photSettingsForm.value.a,
        bOut: this.photSettingsForm.value.aOut,
        theta: 0,
        thetaOut: 0,
      };

      this.photSettingsForm.patchValue(value, { emitEvent: false });

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

    let calibrationEnabled = controls.calibrationEnabled.value;
    (calibrationEnabled && controls.sourceInclusionPercentageEnabled.value) ? controls.sourceInclusionPercentage.enable({ emitEvent: false }) : controls.sourceInclusionPercentage.disable({ emitEvent: false });
    (calibrationEnabled && controls.minSnrEnabled.value) ? controls.minSnr.enable({ emitEvent: false }) : controls.minSnr.disable({ emitEvent: false });
    (calibrationEnabled && controls.maxSnrEnabled.value) ? controls.maxSnr.enable({ emitEvent: false }) : controls.maxSnr.disable({ emitEvent: false });

    if (controls.deblend.value) {
      controls.deblendLevels.enable({ emitEvent: false });
      controls.deblendContrast.enable({ emitEvent: false });
    }
    else {
      controls.deblendLevels.disable({ emitEvent: false });
      controls.deblendContrast.disable({ emitEvent: false });
    }

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
