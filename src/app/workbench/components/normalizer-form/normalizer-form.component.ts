import { Component, OnInit, Input, Output, EventEmitter, OnChanges } from "@angular/core";
import { PixelNormalizer } from "../../../data-files/models/pixel-normalizer";
import { StretchMode } from "../../../data-files/models/stretch-mode";
import {
  grayColorMap,
  rainbowColorMap,
  coolColorMap,
  heatColorMap,
  redColorMap,
  greenColorMap,
  blueColorMap,
  aColorMap,
} from "../../../data-files/models/color-map";

@Component({
  selector: "app-normalizer-form",
  templateUrl: "./normalizer-form.component.html",
  styleUrls: ["./normalizer-form.component.scss"],
})
export class NormalizerFormComponent implements OnInit, OnChanges {
  @Input() normalizer: PixelNormalizer;

  @Output() backgroundPercentileChange = new EventEmitter<number>();
  @Output() peakPercentileChange = new EventEmitter<number>();
  @Output() colorMapChange = new EventEmitter<string>();
  @Output() stretchModeChange = new EventEmitter<StretchMode>();
  @Output() invertedChange = new EventEmitter<boolean>();

  backgroundStep = 0.1;
  peakStep = 0.1;

  stretchModeOptions = [
    { label: "Linear", value: StretchMode.Linear },
    { label: "Logarithmic", value: StretchMode.Log },
    { label: "Square Root", value: StretchMode.SquareRoot },
    { label: "Hyperbolic Arcsine", value: StretchMode.ArcSinh },
  ];

  colorMaps = [
    grayColorMap,
    rainbowColorMap,
    coolColorMap,
    heatColorMap,
    redColorMap,
    greenColorMap,
    blueColorMap,
    aColorMap,
  ];

  constructor() {}

  ngOnInit() {}

  calcStep(percentile: number) {
    if (percentile > 50) {
      // return Math.pow(10,-Math.round(1-Math.log10((100-percentile)/0.999999)));
      return percentile == 100
        ? Math.pow(10, -3)
        : Math.round((100 - percentile) * Math.pow(10, -1.0) * Math.pow(10, 4)) / Math.pow(10, 4);
    } else {
      // return Math.pow(10,-Math.round(1-Math.log10(percentile/1.000001)));
      return percentile == 0
        ? Math.pow(10, -3)
        : Math.round(percentile * Math.pow(10, -1.0) * Math.pow(10, 4)) / Math.pow(10, 4);
    }
  }

  ngOnChanges() {
    if (!this.normalizer || this.normalizer.peakPercentile == null || this.normalizer.backgroundPercentile == null) {
      this.backgroundStep = 0.1;
      this.peakStep = 0.1;
    } else {
      this.backgroundStep = this.calcStep(this.normalizer.backgroundPercentile);
      this.peakStep = this.calcStep(this.normalizer.peakPercentile);

      // console.log(this.peakStep, this.normalizer.peakPercentile);
    }

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
