import { Component, OnInit, Input, Output, EventEmitter, OnChanges, ChangeDetectionStrategy, SimpleChanges, OnDestroy, AfterViewInit } from '@angular/core';
import { PixelNormalizer } from '../../../../data-files/models/pixel-normalizer';
import { StretchMode } from '../../../../data-files/models/stretch-mode';
import {
  grayColorMap,
  rainbowColorMap,
  coolColorMap,
  heatColorMap,
  redColorMap,
  greenColorMap,
  blueColorMap,
  aColorMap,
  balmerColorMap,
  oiiColorMap,
  COLOR_MAPS_BY_NAME,
  COLOR_MAPS,
} from '../../../../data-files/models/color-map';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ImageLayer, isImageLayer } from 'src/app/data-files/models/data-file';
import { greaterThan, isNumber, lessThan } from 'src/app/utils/validators';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { map, distinctUntilChanged, takeUntil, debounceTime, filter, auditTime, switchMap, withLatestFrom, tap } from 'rxjs/operators'
import { Store } from '@ngxs/store';
import { UpdateNormalizer } from 'src/app/data-files/data-files.actions';
import { DataFilesState } from 'src/app/data-files/data-files.state';

@Component({
  selector: 'app-normalizer-form',
  templateUrl: './normalizer-form.component.html',
  styleUrls: ['./normalizer-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NormalizerFormComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  @Input('layerId')
  set layerId(viewer: string) {
    this.layerId$.next(viewer);
  }
  get layerId() {
    return this.layerId$.getValue();
  }
  protected layerId$ = new BehaviorSubject<string>(null);

  @Input() showMode = true;
  @Input() showLevels = true;
  @Input() showColorMap = true;
  @Input() showStretchMode = true;
  @Input() showInverted = true;
  @Input() showLayerScale = true;
  @Input() showLayerOffset = true;

  destroy$ = new Subject<boolean>();
  layer$ = this.layerId$.pipe(
    switchMap(layerId => this.store.select(DataFilesState.getLayerById(layerId))),
    map(layer => layer && isImageLayer(layer) ? layer : null)
  )
  normalizer$ = this.layer$.pipe(
    map(layer => layer?.normalizer),
    distinctUntilChanged()
  )
  linkLayerOptions$ = this.layer$.pipe(
    switchMap(layer => this.store.select(DataFilesState.getLayersByFileId(layer.fileId)).pipe(
      map(linkedLayerOptions => linkedLayerOptions.filter(isImageLayer).filter(linkedLayer => linkedLayer.id != layer.id))
    ))
  )
  canBeLinked$ = this.linkLayerOptions$.pipe(
    map(linkLayerOptions => linkLayerOptions.length != 0 && !linkLayerOptions.some(layer => layer.normalizer.linkSourceLayerId == this.layerId))
  )

  presetClick$ = new Subject<'faint' | 'default' | 'bright'>();



  backgroundStep = 0.1;
  peakStep = 0.1;
  midStep = 0.1;
  StretchMode = StretchMode;
  stretchModeOptions = [

    { label: 'Linear', value: StretchMode.Linear },
    { label: 'Logarithmic', value: StretchMode.Log },
    { label: 'Square Root', value: StretchMode.SquareRoot },
    { label: 'Hyperbolic Arcsine', value: StretchMode.HyperbolicArcSinh },
    { label: 'Midtone', value: StretchMode.MidTone },
    // { label: 'Exponential', value: StretchMode.Exponential },
    // { label: 'Square', value: StretchMode.Square },
    // { label: 'Hyperbolic Sine', value: StretchMode.HyperbolicSine },
  ];

  colorMaps = COLOR_MAPS;

  backgroundPercentileControl = this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0), lessThan(100, true)], updateOn: 'change' })
  midPercentileControl = this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0), lessThan(100, true)], updateOn: 'change' })
  peakPercentileControl = this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0), lessThan(100, true)], updateOn: 'change' })
  backgroundLevelControl = this.fb.control('', { validators: [Validators.required, isNumber], updateOn: 'change' })
  midLevelControl = this.fb.control('', { validators: [Validators.required, isNumber], updateOn: 'change' })
  peakLevelControl = this.fb.control('', { validators: [Validators.required, isNumber], updateOn: 'change' })
  colorMapControl = this.fb.control('', { validators: [Validators.required], updateOn: 'change' })
  stretchModeControl = this.fb.control('', { validators: [Validators.required], updateOn: 'change' })
  invertedControl = this.fb.control('', { updateOn: 'change' })
  layerScaleControl = this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'change' })
  layerOffsetControl = this.fb.control('', { validators: [Validators.required, isNumber], updateOn: 'change' })
  modeControl = this.fb.control('', { validators: [Validators.required, isNumber], updateOn: 'change' })
  linkSourceLayerIdControl = this.fb.control('', { validators: [Validators.required], updateOn: 'change' })
  linkModeControl = this.fb.control('', { validators: [Validators.required], updateOn: 'change' })

  form = this.fb.group({
    backgroundPercentile: this.backgroundPercentileControl,
    midPercentile: this.midPercentileControl,
    peakPercentile: this.peakPercentileControl,
    backgroundLevel: this.backgroundLevelControl,
    midLevel: this.midLevelControl,
    peakLevel: this.peakLevelControl,
    colorMapName: this.colorMapControl,
    stretchMode: this.stretchModeControl,
    inverted: this.invertedControl,
    layerScale: this.layerScaleControl,
    layerOffset: this.layerOffsetControl,
    mode: this.modeControl,
    linkSourceLayerId: this.linkSourceLayerIdControl,
    linkMode: this.linkModeControl
  })

  private addDebouncedChangeHandler(field: FormControl, handler: (value: any) => void, debounce = 250) {
    field.valueChanges.pipe(
      auditTime(debounce),
      filter(value => field.valid),
      distinctUntilChanged(),
    ).subscribe(handler)
  }

  private bindField(name: string, control: FormControl, observable$: Observable<any>, debounce = 0, storeToFormMapper = (value) => value, formToStoreMapper = (value) => value) {
    control.valueChanges.pipe(
      takeUntil(this.destroy$),
      auditTime(debounce),
      filter(value => control.valid),
      distinctUntilChanged(),
    ).subscribe(value => this.store.dispatch(new UpdateNormalizer(this.layerId, { [name]: formToStoreMapper(value) })))

    observable$.pipe(
      map(obj => obj ? obj[name] : null),
      takeUntil(this.destroy$),
      distinctUntilChanged(),
    ).subscribe(value => {
      let formValue = storeToFormMapper(value)
      if (control.value == value) return;
      control.patchValue(formValue, { emitEvent: false })
    })
  }


  constructor(private decimalPipe: DecimalPipe, private fb: FormBuilder, private store: Store) {
    //only update form fields if the value is different to prevent 1.000 in the form from being replaced with 1 and interfere with typing
    this.bindField('backgroundPercentile', this.backgroundPercentileControl, this.normalizer$, 250)
    this.bindField('midPercentile', this.midPercentileControl, this.normalizer$, 250)
    this.bindField('peakPercentile', this.peakPercentileControl, this.normalizer$, 250)
    this.bindField('backgroundLevel', this.backgroundLevelControl, this.normalizer$, 250)
    this.bindField('midLevel', this.midLevelControl, this.normalizer$, 250)
    this.bindField('peakLevel', this.peakLevelControl, this.normalizer$, 250)
    this.bindField('colorMapName', this.colorMapControl, this.normalizer$)
    this.bindField('stretchMode', this.stretchModeControl, this.normalizer$)
    this.bindField('inverted', this.invertedControl, this.normalizer$)
    this.bindField('mode', this.modeControl, this.normalizer$, 0, (value) => value == 'percentile', (value) => value ? 'percentile' : 'pixel')
    this.bindField('layerScale', this.layerScaleControl, this.normalizer$, 250)
    this.bindField('layerOffset', this.layerOffsetControl, this.normalizer$, 250)
    this.bindField('linkSourceLayerId', this.linkSourceLayerIdControl, this.normalizer$, 0, (value) => value || 'none', (value) => value == 'none' ? null : value)
    this.bindField('linkMode', this.linkModeControl, this.normalizer$)
    this.form.valueChanges.subscribe(value => this.updateSteps(value))

    this.normalizer$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(normalizer => {

      if (!normalizer) return;

      this.updateSteps(normalizer);

      if (normalizer.linkSourceLayerId) {
        this.linkModeControl.enable({ emitEvent: false })
        this.stretchModeControl.disable({ emitEvent: false })
        this.modeControl.disable({ emitEvent: false })
      }
      else {
        this.linkModeControl.disable({ emitEvent: false })
        this.stretchModeControl.enable({ emitEvent: false })
        this.modeControl.enable({ emitEvent: false })
      }
    })

    this.presetClick$.pipe(
      takeUntil(this.destroy$),
      withLatestFrom(this.layer$)
    ).subscribe(([value, layer]) => {
      let normalizer = layer.normalizer;
      let backgroundPercentile = 10;
      let midPercentile = 99.5;
      let peakPercentile = 99.999;

      if (normalizer.stretchMode != StretchMode.MidTone) {
        let peakLookup = {
          'faint': 95,
          'default': 99,
          'bright': 99.999
        }

        peakPercentile = peakLookup[value]
      }
      else {
        backgroundPercentile = 1;
        let midLookup = {
          'faint': 50,
          'default': 97.5,
          'bright': 99.9
        }

        midPercentile = midLookup[value];
      }

      this.store.dispatch(
        new UpdateNormalizer(layer.id, {
          mode: 'percentile',
          backgroundPercentile: backgroundPercentile,
          midPercentile: midPercentile,
          peakPercentile: peakPercentile
        })
      );
    });

  }

  ngOnInit() { }

  ngAfterViewInit(): void {

  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  calcStep(percentile: number) {
    if (percentile > 50) {
      return percentile == 100
        ? Math.pow(10, -3)
        : Math.round((100 - percentile) * Math.pow(10, -1.0) * Math.pow(10, 4)) / Math.pow(10, 4);
    } else {
      return percentile == 0
        ? Math.pow(10, -3)
        : Math.round(percentile * Math.pow(10, -1.0) * Math.pow(10, 4)) / Math.pow(10, 4);
    }
  }

  updateSteps(value: PixelNormalizer) {
    this.backgroundStep = this.calcStep(value.backgroundPercentile);
    this.midStep = this.calcStep(value.midPercentile);
    this.peakStep = this.calcStep(value.peakPercentile);
  }

  ngOnChanges(changes: SimpleChanges) {

  }

  // getFormattedPeakLevel() {
  //   let peak = this.normalizer.peakLevel;
  //   if (peak === undefined || peak === null) return '';
  //   let result = this.decimalPipe.transform(peak, '1.0-3').replace(',', '')
  //   return result;
  // }

  // getFormattedBackgroundLevel() {
  //   let background = this.normalizer.backgroundLevel;
  //   if (background === undefined || background === null) return ''
  //   let result = this.decimalPipe.transform(background, '1.0-3').replace(',', '')
  //   return result;
  // }

  // getFormattedMidLevel() {
  //   let mid = this.normalizer.midLevel;
  //   if (mid === undefined || mid === null) return ''
  //   let result = this.decimalPipe.transform(mid, '1.0-3').replace(',', '')
  //   return result;
  // }

  getSelectedColorMap(name: string) {
    return this.colorMaps.find(cm => cm.name == name);
  }
}
