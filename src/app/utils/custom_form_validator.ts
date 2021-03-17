import { FormControl, Validators, ValidationErrors } from '@angular/forms';

function isEmptyInputValue(value: any): boolean {
  // we don't check for string here so it also works with arrays
  return value == null || value.length === 0;
}

// create your class that extends the angular validator class
export class CustomValidators extends Validators {
  // create a static method for your validation
  static validateNumber(control: FormControl): ValidationErrors | null {
    if (isEmptyInputValue(control.value)) {
      return null; // don't validate empty values to allow optional controls
    }
    const value = parseFloat(control.value);

    return isNaN(value) ? { notANumber: { value: control.value } } : null;
  }
}
