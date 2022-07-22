import { Component, OnInit, Input, Output, EventEmitter, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { BlendMode } from '../../../data-files/models/blend-mode';
import {
  grayColorMap,
  rainbowColorMap,
  coolColorMap,
  heatColorMap,
  redColorMap,
  greenColorMap,
  blueColorMap,
  aColorMap,
  ColorMap,
} from '../../../data-files/models/color-map';
import { MatMenuTrigger } from '@angular/material/menu';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-image-hdu-toolbar',
  templateUrl: './image-hdu-toolbar.component.html',
  styleUrls: ['./image-hdu-toolbar.component.scss'],
})
export class ImageHduToolbarComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input()
  showBlendMode: boolean = false;

  @Input()
  blendMode: BlendMode = null;

  @Input()
  showColorMap: boolean = false;

  @Input()
  colorMapName: string = '';

  @Input()
  showVisibility: boolean = false;

  @Input()
  visible: boolean = true;

  @Output() onBlendModeChange = new EventEmitter<BlendMode>();
  @Output() onColorMapChange = new EventEmitter<string>();
  @Output() onVisibilityChange = new EventEmitter<boolean>();

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
  blendModeOptions = [
    { label: 'Normal', value: BlendMode.Normal },
    { label: 'Screen', value: BlendMode.Screen },
    { label: 'Lighten', value: BlendMode.Lighten },
    { label: 'Multiply', value: BlendMode.Multiply },
    { label: 'Darken', value: BlendMode.Darken },
    { label: 'Overlay', value: BlendMode.Overlay },
    { label: 'Luminosity', value: BlendMode.Luminosity },
    { label: 'Color', value: BlendMode.Color },
  ];

  @ViewChild('colorMapMenuTrigger') colorMapMenuTrigger: MatMenuTrigger;
  destroy$ = new Subject<boolean>();

  constructor() { }

  ngOnInit(): void { }

  ngAfterViewInit(): void { }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
