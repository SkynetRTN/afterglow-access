import { Pipe, PipeTransform } from "@angular/core";
/*
 * Raise the value exponentially
 * Takes an exponent argument that defaults to 1.
 * Usage:
 *   value | exponentialStrength:exponent
 * Example:
 *   {{ 2 |  exponentialStrength:10}}
 *   formats to: 1024
 */
@Pipe({ name: "region-filter" })
export class RegionFilterPipe implements PipeTransform {
  transform(
    value: Array<{ x: number; y: number }>,
    region: { x: number; y: number; width: number; height: number }
  ): Array<{ x: number; y: number }> {
    return value.filter((v) => {
      return v.x >= region.x && v.y >= region.y && v.x < region.x + region.width && v.y < region.y + region.height;
    });
  }
}
