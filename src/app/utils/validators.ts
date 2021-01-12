import { AbstractControl, ValidatorFn } from '@angular/forms';
import { parseDms } from './skynet-astro';

export function floatOrSexagesimalValidator(control: AbstractControl): { [key: string]: any } | null {
    if (control.value) {
        let result = Number(control.value);
        if (!isNaN(result)) return null;

        result = parseDms(control.value)
        if (!isNaN(result)) return null;
    }

    return { floatOrSexagesimal: { value: control.value } };
}
