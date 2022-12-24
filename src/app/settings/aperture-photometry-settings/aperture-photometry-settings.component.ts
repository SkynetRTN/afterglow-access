import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { greaterThan, isNumber, lessThan } from 'src/app/utils/validators';
import { UpdatePhotometrySettings } from 'src/app/workbench/workbench.actions';
import { WorkbenchState } from 'src/app/workbench/workbench.state';
import { defaults } from '../../workbench/models/global-settings';

@Component({
  selector: 'app-aperture-photometry-settings',
  templateUrl: './aperture-photometry-settings.component.html',
  styleUrls: ['./aperture-photometry-settings.component.scss']
})
export class AperturePhotometrySettingsComponent implements OnInit, OnDestroy {

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

  settings$ = this.store.select(WorkbenchState.getPhotometrySettings);

  constructor(private store: Store) {
    this.photometryForm.valueChanges
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
    let controls = this.photometryForm.controls
    return Object.keys(controls).filter(key => controls[key].enabled && (!controls[key].dirty || controls[key].valid))
  }

  onSettingsChange() {
    let settings = this.store.selectSnapshot(WorkbenchState.getPhotometrySettings);
    let value = {};
    this.getValidFormFields().forEach(key => value[key] = settings[key])
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
    this.getValidFormFields().forEach(key => {
      value[key] = controls[key].value
    })

    this.store.dispatch(new UpdatePhotometrySettings(value))
  }

  restoreDefaults() {
    this.photometryForm.markAsPristine();
    this.store.dispatch(new UpdatePhotometrySettings({ ...defaults.photometry }))
  }

}
