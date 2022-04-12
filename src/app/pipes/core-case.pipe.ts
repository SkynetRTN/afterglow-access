import { Pipe, PipeTransform } from '@angular/core';
import * as snakecaseKeys from 'snakecase-keys';
import { DeepCopy } from '../utils/deep-copy';

@Pipe({ name: 'coreCase' })
export class CoreCasePipe implements PipeTransform {
    constructor() { }
    transform(value: object): object {
        value = DeepCopy.copy(value);
        idToNumber(value);
        return snakecaseKeys(value, { deep: true });
    }

}

export function isPositiveInteger(str: string) {
    return /^\+?\d+$/.test(str);
}

export function idToString(o: Object) {
    if (o && typeof o === 'object') {
        Object.keys(o).forEach((k) => {
            if (o[k] !== null) {
                if (typeof o[k] === 'object') {
                    idToString(o[k]);
                    return;
                }
                if ((k == 'id' || k.endsWith('_id')) && typeof o[k] === 'number') {
                    o[k] = (o[k] as number).toString();
                } else if ((k == 'ids' || k.endsWith('_ids')) && Array.isArray(o[k])) {
                    o[k] = (o[k] as Array<any>).map((value) => (typeof o[k] === 'number' ? (value as number).toString() : o[k]));
                }
            }
        });
    }
}

export function idToNumber(o: Object) {
    if (o && typeof o === 'object') {
        Object.keys(o).forEach((k) => {
            if (o[k] !== null) {
                if (typeof o[k] === 'object') {
                    idToNumber(o[k]);
                    return;
                }
                if ((k == 'id' || k.endsWith('Id')) && typeof o[k] === 'string' && isPositiveInteger(o[k])) {
                    let parsed = parseInt(o[k]);
                    if (!isNaN(parsed)) {
                        o[k] = parsed;
                    }
                } else if ((k == 'ids' || k.endsWith('Ids')) && Array.isArray(o[k]) && isPositiveInteger(o[k])) {
                    o[k] = (o[k] as Array<any>).map((value) =>
                        typeof o[k] === 'string' && !isNaN(parseInt(value)) ? parseInt(value) : o[k]
                    );
                }
            }
        });
    }
}