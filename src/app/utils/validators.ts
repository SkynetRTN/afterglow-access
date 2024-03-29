import { AbstractControl, ValidationErrors, ValidatorFn, Validators, FormControl } from '@angular/forms';
import { parseDms } from './skynet-astro';

function isEmptyInputValue(value: any): boolean {
  // we don't check for string here so it also works with arrays
  return value == null || value.length === 0;
}

export function isNumberOrSexagesimalValidator(control: AbstractControl): ValidationErrors | null {
  if (isEmptyInputValue(control.value) || isNumber(control) == null) {
    return null; // don't validate empty values to allow optional controls
  }

  let result = parseDms(control.value);
  if (!isNaN(result)) return null;

  return { isNumberOrSexagesimal: { value: control.value } };
}

export function isNumber(control: AbstractControl): ValidationErrors | null {
  if (isEmptyInputValue(control.value)) {
    return null; // don't validate empty values to allow optional controls
  }

  let numericRegex = /^[-+]?([0-9]+(\.[0-9]*)?|\.[0-9]+)$/;
  let result = Validators.pattern(numericRegex)(control);
  if (result == null) return null;
  return { isNumber: 'Not a valid number' };
}

export function isInteger(control: AbstractControl): ValidationErrors | null {
  if (isEmptyInputValue(control.value)) {
    return null; // don't validate empty values to allow optional controls
  }

  let numericRegex = /^[-+]?([0-9]+(\.[0-9]*)?|\.[0-9]+)$/;
  let result = Validators.pattern(numericRegex)(control);
  if (result == null) {
    const value = parseFloat(control.value);
    if (!isNaN(value)) {
      if (Number.isInteger(value)) {
        return null
      }
      else {
        return { isInteger: 'Not a valid integer' };
      }
    }
  }
  return { isInteger: 'Not a valid number' };
}

export function lessThan(max: number, inclusive = false): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (isEmptyInputValue(control.value) || isEmptyInputValue(max)) {
      return null; // don't validate empty values to allow optional controls
    }
    const value = parseFloat(control.value);
    // Controls with NaN values after parsing should be treated as not having a
    // maximum, per the HTML forms spec: https://www.w3.org/TR/html5/forms.html#attr-input-max
    return !isNaN(value) && (inclusive ? value > max : value >= max) ? { lessThan: { max: max, actual: control.value } } : null;
  };
}

export function greaterThan(min: number, inclusive = false): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (isEmptyInputValue(control.value) || isEmptyInputValue(min)) {
      return null; // don't validate empty values to allow optional controls
    }
    const value = parseFloat(control.value);
    // Controls with NaN values after parsing should be treated as not having a
    // maximum, per the HTML forms spec: https://www.w3.org/TR/html5/forms.html#attr-input-max
    return !isNaN(value) && (inclusive ? value < min : value <= min) ? { greaterThan: { min: min, actual: control.value } } : null;
  };
}

export function isValidFilename(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const name = control.value; // give the value inside the field
    return /^[-\w^&'@{}[\],$=!#().%+~ ]+$/g.test(name) ? null : { isValidFilename: 'Not a valid file/folder name' };
  };
}
