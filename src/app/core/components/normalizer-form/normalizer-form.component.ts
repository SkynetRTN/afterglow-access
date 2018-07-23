import { Component, OnInit, Input, Output, EventEmitter, OnChanges } from '@angular/core';

import { PixelNormalizer, normalize } from '../../models/pixel-normalizer';
import {
  ColorMap, grayColorMap, rainbowColorMap, coolColorMap,
  heatColorMap, redColorMap, greenColorMap, blueColorMap, aColorMap
} from '../../models/color-map';
import { StretchMode } from '../../models/stretch-mode';

@Component({
  selector: 'app-normalizer-form',
  templateUrl: './normalizer-form.component.html',
  styleUrls: ['./normalizer-form.component.scss']
})
export class NormalizerFormComponent implements OnInit, OnChanges {
  @Input() normalizer: PixelNormalizer;

  @Output() onBackgroundLevelChange = new EventEmitter<number>();
  @Output() onPeakLevelChange = new EventEmitter<number>();
  @Output() onColorMapChange = new EventEmitter<ColorMap>();
  @Output() onStretchModeChange = new EventEmitter<StretchMode>();
  @Output() onInvertedChange = new EventEmitter<boolean>();

  levelStep = 0.1;

  private stretchModeOptions = [
    { label: "Linear", value: StretchMode.Linear },
    { label: "Log", value: StretchMode.Log },
    { label: "Square Root", value: StretchMode.SquareRoot },
    { label: "ArcSinh", value: StretchMode.ArcSinh }
  ];

  private colorMaps = [grayColorMap, rainbowColorMap, coolColorMap, heatColorMap, redColorMap, greenColorMap, blueColorMap, aColorMap];

  constructor() { }

  ngOnInit() {
  }

  ngOnChanges() {
    // console.log(this.normalizer.peakLevel, this.normalizer.backgroundLevel);
    // if (!this.normalizer || this.normalizer.peakLevel == null || this.normalizer.backgroundLevel == null) {
    //   this.levelStep = 0.1;
    // }
    // else {
    //   let step = Math.abs(this.normalizer.peakLevel - this.normalizer.backgroundLevel) / 50;
    //   if (step == 0) step = 0.1

    //   let precision = Math.floor(Math.log10(step)) * -1;
    //   let factor = Math.pow(10, precision);
    //   this.levelStep = Math.round(step * factor) / factor;
        
    //   this.normalizer.peakLevel = this.levelStep * Math.round(this.normalizer.peakLevel / this.levelStep);
    //   this.normalizer.backgroundLevel = this.levelStep * Math.round(this.normalizer.backgroundLevel / this.levelStep);

    //   this.normalizer.backgroundLevel = Math.round(this.normalizer.backgroundLevel * factor) / factor;
    //   this.normalizer.peakLevel = Math.round(this.normalizer.peakLevel * factor) / factor;

    // }

    // console.log(this.normalizer.peakLevel, this.normalizer.backgroundLevel);

  }

}
