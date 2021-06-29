import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';
import { greaterThan, isNumber, lessThan } from '../../../utils/validators';
import { PhotometrySettings } from '../../models/photometry-settings';

@Component({
  selector: 'app-phot-settings-dialog',
  templateUrl: './phot-settings-dialog.component.html',
  styleUrls: ['./phot-settings-dialog.component.scss'],
})
export class PhotSettingsDialogComponent implements OnInit, OnDestroy {
  settings: PhotometrySettings;

  destroy$ = new Subject<boolean>();

  isNumber = [Validators.required, isNumber];
  greaterThanZero = [Validators.required, isNumber, greaterThan(0)];
  minZero = [Validators.required, isNumber, Validators.min(0)];

  constantApertureForm = new FormGroup({
    gain: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    zeroPoint: new FormControl('', { validators: this.isNumber, updateOn: 'blur' }),
    centroidRadius: new FormControl('', { validators: this.minZero, updateOn: 'blur' }),
    a: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    aIn: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    aOut: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    elliptical: new FormControl('', [Validators.required]),
    b: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    bOut: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    theta: new FormControl('', { validators: [...this.minZero, lessThan(360)], updateOn: 'blur' }),
    thetaOut: new FormControl('', { validators: [...this.minZero, lessThan(360)], updateOn: 'blur' }),
  });

  adaptiveApertureForm = new FormGroup({
    gain: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    zeroPoint: new FormControl('', { validators: this.isNumber, updateOn: 'blur' }),
    centroidRadius: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    aKrFactor: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    aInKrFactor: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    aOutKrFactor: new FormControl('', { validators: this.greaterThanZero, updateOn: 'blur' }),
    fixAper: new FormControl(false, { updateOn: 'blur' }),
    fixEll: new FormControl(false, { updateOn: 'blur' }),
    fixRot: new FormControl(false, { updateOn: 'blur' }),
  });

  constructor(
    public dialogRef: MatDialogRef<PhotSettingsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PhotometrySettings
  ) {
    this.settings = data;

    this.constantApertureForm.patchValue(this.settings);
    this.adaptiveApertureForm.patchValue(this.settings);

    this.constantApertureForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      if (!value.elliptical) {
        value = {
          ...value,
          b: value.a,
          bOut: value.aOut,
          theta: 0,
          thetaOut: 0,
        };

        this.constantApertureForm.patchValue(value, { emitEvent: false });
      }
      this.settings = {
        ...this.settings,
        ...value,
      };
    });

    this.constantApertureForm.controls.elliptical.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => this.updateDisabledControls(value));

    this.adaptiveApertureForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      this.settings = {
        ...this.settings,
        ...value,
      };
    });

    this.updateDisabledControls(this.settings.elliptical);
  }

  updateDisabledControls(elliptical: boolean) {
    let controls = this.constantApertureForm.controls;
    if (!elliptical) {
      controls.b.disable();
      controls.bOut.disable();
      controls.theta.disable();
      controls.thetaOut.disable();
    } else {
      controls.b.enable();
      controls.bOut.enable();
      controls.theta.enable();
      controls.thetaOut.enable();
    }
  }

  ngOnInit() {
    // this.dialogRef.updateSize('700px');

    this.dialogRef.updateSize('800px', '750px');
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
