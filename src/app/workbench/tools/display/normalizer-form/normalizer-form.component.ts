import { Component, OnInit, Input, Output, EventEmitter, OnChanges, ChangeDetectionStrategy, SimpleChanges, OnDestroy } from '@angular/core';
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
import { BehaviorSubject, Subject } from 'rxjs';
import { map, distinctUntilChanged, takeUntil, debounceTime, filter, auditTime, switchMap, withLatestFrom } from 'rxjs/operators'
import { Store } from '@ngxs/store';
import { UpdateNormalizer } from 'src/app/data-files/data-files.actions';
import { DataFilesState } from 'src/app/data-files/data-files.state';

@Component({
  selector: 'app-normalizer-form',
  templateUrl: './normalizer-form.component.html',
  styleUrls: ['./normalizer-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NormalizerFormComponent implements OnInit, OnChanges, OnDestroy {
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

  backgroundPercentileField = this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0), lessThan(100, true)], updateOn: 'change' })
  midPercentileField = this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0), lessThan(100, true)], updateOn: 'change' })
  peakPercentileField = this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0), lessThan(100, true)], updateOn: 'change' })
  backgroundLevelField = this.fb.control('', { validators: [Validators.required, isNumber], updateOn: 'change' })
  midLevelField = this.fb.control('', { validators: [Validators.required, isNumber], updateOn: 'change' })
  peakLevelField = this.fb.control('', { validators: [Validators.required, isNumber], updateOn: 'change' })
  colorMapField = this.fb.control('', { validators: [Validators.required], updateOn: 'change' })
  stretchModeField = this.fb.control('', { validators: [Validators.required], updateOn: 'change' })
  invertedField = this.fb.control('', { updateOn: 'change' })
  layerScaleField = this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'change' })
  layerOffsetField = this.fb.control('', { validators: [Validators.required, isNumber], updateOn: 'change' })
  modeField = this.fb.control('', { validators: [Validators.required, isNumber], updateOn: 'change' })
  linkSourceLayerIdField = this.fb.control('', { validators: [Validators.required], updateOn: 'change' })
  linkModeField = this.fb.control('', { validators: [Validators.required], updateOn: 'change' })

  form = this.fb.group({
    backgroundPercentile: this.backgroundPercentileField,
    midPercentile: this.midPercentileField,
    peakPercentile: this.peakPercentileField,
    backgroundLevel: this.backgroundLevelField,
    midLevel: this.midLevelField,
    peakLevel: this.peakLevelField,
    colorMapName: this.colorMapField,
    stretchMode: this.stretchModeField,
    inverted: this.invertedField,
    layerScale: this.layerScaleField,
    layerOffset: this.layerOffsetField,
    mode: this.modeField,
    linkSourceLayerId: this.linkSourceLayerIdField,
    linkMode: this.linkModeField
  })

  private addDebouncedChangeHandler(field: FormControl, handler: (value: any) => void, debounce = 250) {
    field.valueChanges.pipe(
      auditTime(debounce),
      filter(value => field.valid),
      distinctUntilChanged()
    ).subscribe(handler)
  }


  constructor(private decimalPipe: DecimalPipe, private fb: FormBuilder, private store: Store) {



    this.normalizer$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(normalizer => {

      if (!normalizer) return;

      this.updateSteps(normalizer);

      if (normalizer.linkSourceLayerId) {
        this.linkModeField.enable({ emitEvent: false })
        this.stretchModeField.disable({ emitEvent: false })
        this.modeField.disable({ emitEvent: false })
      }
      else {
        this.linkModeField.disable({ emitEvent: false })
        this.stretchModeField.enable({ emitEvent: false })
        this.modeField.enable({ emitEvent: false })
      }


      this.form.patchValue({
        ...normalizer,
        backgroundPercentile: this.decimalPipe.transform(normalizer.backgroundPercentile, '1.0-5'),
        midPercentile: this.decimalPipe.transform(normalizer.midPercentile, '1.0-5'),
        peakPercentile: this.decimalPipe.transform(normalizer.peakPercentile, '1.0-5'),
        backgroundLevel: this.decimalPipe.transform(normalizer.backgroundLevel, '1.0-5'),
        midLevel: this.decimalPipe.transform(normalizer.midLevel, '1.0-5'),
        peakLevel: this.decimalPipe.transform(normalizer.peakLevel, '1.0-5'),
        linkSourceLayerId: normalizer.linkSourceLayerId || 'none',
        mode: normalizer.mode == 'percentile'
      }, { emitEvent: false })
    })


    this.addDebouncedChangeHandler(this.backgroundPercentileField, value => this.store.dispatch(new UpdateNormalizer(this.layerId, { backgroundPercentile: value })))
    this.addDebouncedChangeHandler(this.midPercentileField, value => this.store.dispatch(new UpdateNormalizer(this.layerId, { midPercentile: value })))
    this.addDebouncedChangeHandler(this.peakPercentileField, value => this.store.dispatch(new UpdateNormalizer(this.layerId, { peakPercentile: value })))
    this.addDebouncedChangeHandler(this.backgroundLevelField, value => this.store.dispatch(new UpdateNormalizer(this.layerId, { backgroundLevel: value })))
    this.addDebouncedChangeHandler(this.midLevelField, value => this.store.dispatch(new UpdateNormalizer(this.layerId, { midLevel: value })))
    this.addDebouncedChangeHandler(this.peakLevelField, value => this.store.dispatch(new UpdateNormalizer(this.layerId, { peakLevel: value })))

    this.colorMapField.valueChanges.subscribe(value => this.store.dispatch(new UpdateNormalizer(this.layerId, { colorMapName: value })))
    this.stretchModeField.valueChanges.subscribe(value => this.store.dispatch(new UpdateNormalizer(this.layerId, { stretchMode: value })))
    this.invertedField.valueChanges.subscribe(value => this.store.dispatch(new UpdateNormalizer(this.layerId, { inverted: value })))
    this.modeField.valueChanges.subscribe(value => this.store.dispatch(new UpdateNormalizer(this.layerId, { mode: value ? 'percentile' : 'pixel' })))

    this.addDebouncedChangeHandler(this.layerScaleField, value => this.store.dispatch(new UpdateNormalizer(this.layerId, { layerScale: value })))
    this.addDebouncedChangeHandler(this.layerOffsetField, value => this.store.dispatch(new UpdateNormalizer(this.layerId, { layerOffset: value })))


    this.linkSourceLayerIdField.valueChanges.subscribe(value => this.store.dispatch(new UpdateNormalizer(this.layerId, { linkSourceLayerId: value == 'none' ? null : value })))
    this.linkModeField.valueChanges.subscribe(value => this.store.dispatch(new UpdateNormalizer(this.layerId, { linkMode: value })))

    this.form.valueChanges.subscribe(value => this.updateSteps(value))

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
