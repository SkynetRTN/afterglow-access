import { Component, OnInit, Input } from '@angular/core';
import { ColorMap } from '../../models/color-map';

@Component({
  selector: 'app-color-map-swatch',
  templateUrl: './color-map-swatch.component.html',
  styleUrls: ['./color-map-swatch.component.scss']
})
export class ColorMapSwatchComponent implements OnInit {

  @Input() colorMap: ColorMap;
  @Input() samples: number;
  @Input() height = '5px';



  constructor() { }

  ngOnInit(): void {
  }



  getColorSamples() {
    if (!this.colorMap) return [];

    let componentToHex = (c) => {
      var hex = c.toString(16);
      return hex.length == 1 ? "0" + hex : hex;
    }
    let rgbToHex = (r, g, b) => {
      return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    }

    let compositeBitScaler = (256 / 65536)

    let rLen = this.colorMap.redLookup.length;
    let gLen = this.colorMap.greenLookup.length;
    let bLen = this.colorMap.blueLookup.length;

    let result: string[] = [];
    for (let i = 0; i < this.samples; i++) {
      let r = Math.floor(this.colorMap.redLookup[Math.floor(i * rLen / this.samples)] * compositeBitScaler);
      let g = Math.floor(this.colorMap.greenLookup[Math.floor(i * gLen / this.samples)] * compositeBitScaler);
      let b = Math.floor(this.colorMap.blueLookup[Math.floor(i * bLen / this.samples)] * compositeBitScaler);


      result.push(rgbToHex(r, g, b))
    }
    return result;
  }

}
