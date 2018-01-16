import { Pipe, PipeTransform } from '@angular/core';
import { DecimalPipe } from '@angular/common'
/*
 * Raise the value exponentially
 * Takes an exponent argument that defaults to 1.
 * Usage:
 *   value | exponentialStrength:exponent
 * Example:
 *   {{ 2 |  exponentialStrength:10}}
 *   formats to: 1024
*/
@Pipe({name: 'dms'})
export class DmsPipe implements PipeTransform {

  constructor(private decimalPipe: DecimalPipe) {

  }
  transform(value: number, secondsDigitInfo: string = '2.0-3'): string {
    let sign = '+';
    if(value < 0)  {
        sign = '-';
        value *= -1;
    }

    let degrees = Math.floor(value);
    value = 60*(value - degrees);
    let minutes = Math.floor(value);
    let seconds = 60*(value - minutes);

    return sign + this.decimalPipe.transform(degrees, '2.0-0') + ':' + this.decimalPipe.transform(minutes, '2.0-0') + ':' + this.decimalPipe.transform(seconds, secondsDigitInfo);
  }
}