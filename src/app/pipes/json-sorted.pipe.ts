import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'jsonsorted',
    pure: false,
})
export class JsonSortedPipe implements PipeTransform {
    /**
     * @param value A value of any type to convert into a JSON-format string.
     */
    transform(value: any): string {
        const replacer = (key, value) =>
            value instanceof Object && !(value instanceof Array) ?
                Object.keys(value)
                    .sort()
                    .reduce((sorted, key) => {
                        sorted[key] = value[key];
                        return sorted
                    }, {}) :
                value;

        return JSON.stringify(value, replacer, 2);
    }
}