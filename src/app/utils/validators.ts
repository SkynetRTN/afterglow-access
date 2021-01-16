import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { parseDms } from './skynet-astro';

function isEmptyInputValue(value: any): boolean {
  // we don't check for string here so it also works with arrays
  return value == null || value.length === 0;
}

export function isNumberOrSexagesimalValidator(control: AbstractControl): ValidationErrors | null {
  if (isEmptyInputValue(control.value) || isNumber(control) == null) {
    return null;  // don't validate empty values to allow optional controls
  }

  let result = parseDms(control.value)
  if (!isNaN(result)) return null;

  return { isNumberOrSexagesimal: { value: control.value } };
}

export function isNumber(control: AbstractControl): ValidationErrors | null {
  if (isEmptyInputValue(control.value)) {
    return null;  // don't validate empty values to allow optional controls
  }

  let numericRegex = /^[-+]?([0-9]+(\.[0-9]*)?|\.[0-9]+)$/;
  let result = Validators.pattern(numericRegex)(control);
  if (result == null) return null;
  return { 'isNumber': 'Not a valid number' }
}

export function lessThan(max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (isEmptyInputValue(control.value) || isEmptyInputValue(max)) {
      return null;  // don't validate empty values to allow optional controls
    }
    const value = parseFloat(control.value);
    // Controls with NaN values after parsing should be treated as not having a
    // maximum, per the HTML forms spec: https://www.w3.org/TR/html5/forms.html#attr-input-max
    return !isNaN(value) && value >= max ? { 'lessThan': { 'max': max, 'actual': control.value } } : null;
  };
}

export function greaterThan(min: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (isEmptyInputValue(control.value) || isEmptyInputValue(min)) {
      return null;  // don't validate empty values to allow optional controls
    }
    const value = parseFloat(control.value);
    // Controls with NaN values after parsing should be treated as not having a
    // maximum, per the HTML forms spec: https://www.w3.org/TR/html5/forms.html#attr-input-max
    return !isNaN(value) && value <= min ? { 'greaterThan': { 'min': min, 'actual': control.value } } : null;
  };
}