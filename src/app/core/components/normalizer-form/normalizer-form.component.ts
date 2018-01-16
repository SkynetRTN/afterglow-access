import { Component, OnInit, Input, Output, EventEmitter  } from '@angular/core';

import { PixelNormalizer } from '../../models/pixel-normalizer';
import { ColorMap, grayColorMap, rainbowColorMap, coolColorMap,
  heatColorMap, redColorMap, greenColorMap, blueColorMap, aColorMap } from '../../models/color-map';
import { StretchMode } from '../../models/stretch-mode';

@Component({
  selector: 'app-normalizer-form',
  templateUrl: './normalizer-form.component.html',
  styleUrls: ['./normalizer-form.component.scss']
})
export class NormalizerFormComponent implements OnInit {
  @Input() normalizer: PixelNormalizer;

  @Output() onBackgroundLevelChange = new EventEmitter<number>();
  @Output() onPeakLevelChange = new EventEmitter<number>();
  @Output() onColorMapChange = new EventEmitter<ColorMap>();
  @Output() onStretchModeChange = new EventEmitter<StretchMode>();

  private stretchModeOptions = [
    {label: "Linear",  value: StretchMode.Linear},
    {label: "Log",  value: StretchMode.Log},
    {label: "Square Root",  value: StretchMode.SquareRoot},
    {label: "ArcSinh",  value: StretchMode.ArcSinh}
  ];

  private colorMaps = [grayColorMap, rainbowColorMap, coolColorMap, heatColorMap, redColorMap, greenColorMap, blueColorMap, aColorMap];

  constructor() { }

  ngOnInit() {
  }

}
