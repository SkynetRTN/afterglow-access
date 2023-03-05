import { Component, OnInit, Input, Output, EventEmitter, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { BlendMode, BLEND_MODE_OPTIONS } from '../../../data-files/models/blend-mode';
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
  COLOR_MAPS_BY_NAME,
  COLOR_MAPS,
} from '../../../data-files/models/color-map';
import { MatMenuTrigger } from '@angular/material/menu';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-image-layer-toolbar',
  templateUrl: './image-layer-toolbar.component.html',
  styleUrls: ['./image-layer-toolbar.component.scss'],
})
export class ImageLayerToolbarComponent implements OnInit, AfterViewInit, OnDestroy {
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

  colorMaps = COLOR_MAPS;
  blendModeOptions = BLEND_MODE_OPTIONS;

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
