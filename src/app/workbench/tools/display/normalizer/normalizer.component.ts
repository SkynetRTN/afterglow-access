import { Component, OnInit, Input } from '@angular/core';
import { Store } from '@ngxs/store';
import { BehaviorSubject, Subject } from 'rxjs';
import {
  auditTime,
  map,
  tap,
  switchMap,
  takeUntil,
  distinct,
  distinctUntilChanged,
  withLatestFrom,
  concatMap,
  take,
} from 'rxjs/operators';
import { UpdateNormalizer } from 'src/app/data-files/data-files.actions';
import { DataFilesState } from 'src/app/data-files/data-files.state';
import { DataFile, ImageLayer, isImageLayer } from 'src/app/data-files/models/data-file';
import { StretchMode } from 'src/app/data-files/models/stretch-mode';

@Component({
  selector: 'app-normalizer',
  templateUrl: './normalizer.component.html',
  styleUrls: ['./normalizer.component.scss']
})
export class NormalizerComponent implements OnInit {
  @Input('layerId')
  set layerId(viewer: string) {
    this.layerId$.next(viewer);
  }
  get layerId() {
    return this.layerId$.getValue();
  }
  protected layerId$ = new BehaviorSubject<string>(null);


  destroy$ = new Subject<boolean>();
  layer$ = this.layerId$.pipe(
    switchMap(layerId => this.store.select(DataFilesState.getLayerById(layerId))),
    map(layer => layer && isImageLayer(layer) ? layer : null)
  )
  normalizer$ = this.layer$.pipe(
    map(layer => layer.normalizer)
  )
  linkLayerOptions$ = this.layer$.pipe(
    switchMap(layer => this.store.select(DataFilesState.getLayersByFileId(layer.fileId)).pipe(
      map(linkedLayerOptions => linkedLayerOptions.filter(isImageLayer).filter(linkedLayer => linkedLayer.id != layer.id))
    ))
  )
  canBeLinked$ = this.linkLayerOptions$.pipe(
    map(linkLayerOptions => linkLayerOptions.length != 0 && !linkLayerOptions.some(layer => layer.normalizer.linkSourceLayerId == this.layerId))
  )
  backgroundPercentile$ = new Subject<number>();
  midPercentile$ = new Subject<number>();
  peakPercentile$ = new Subject<number>();
  backgroundLevel$ = new Subject<number>();
  midLevel$ = new Subject<number>();
  peakLevel$ = new Subject<number>();
  normalizerMode$ = new Subject<'pixel' | 'percentile'>();
  stretchMode$ = new Subject<StretchMode>();
  presetClick$ = new Subject<'faint' | 'default' | 'bright'>();

  constructor(private store: Store) {
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

    this.backgroundPercentile$.pipe(takeUntil(this.destroy$), auditTime(500), withLatestFrom(this.layer$)).subscribe(([value, layer]) => {
      if (!layer) return;
      this.store.dispatch(new UpdateNormalizer(layer.id, { backgroundPercentile: value }));
    });

    this.midPercentile$.pipe(takeUntil(this.destroy$), auditTime(500), withLatestFrom(this.layer$)).subscribe(([value, layer]) => {
      if (!layer) return;
      this.store.dispatch(new UpdateNormalizer(layer.id, { midPercentile: value }));
    });

    this.peakPercentile$.pipe(takeUntil(this.destroy$), auditTime(500), withLatestFrom(this.layer$)).subscribe(([value, layer]) => {
      if (!layer) return;
      this.store.dispatch(new UpdateNormalizer(layer.id, { peakPercentile: value }));
    });

    this.backgroundLevel$.pipe(takeUntil(this.destroy$), auditTime(500), withLatestFrom(this.layer$)).subscribe(([value, layer]) => {
      if (!layer) return;
      this.store.dispatch(new UpdateNormalizer(layer.id, { backgroundLevel: value, mode: 'pixel' }));
    });

    this.midLevel$.pipe(takeUntil(this.destroy$), auditTime(500), withLatestFrom(this.layer$)).subscribe(([value, layer]) => {
      if (!layer) return;
      this.store.dispatch(new UpdateNormalizer(layer.id, { midLevel: value, mode: 'pixel' }));
    });

    this.peakLevel$.pipe(takeUntil(this.destroy$), auditTime(500), withLatestFrom(this.layer$)).subscribe(([value, layer]) => {
      if (!layer) return;
      this.store.dispatch(new UpdateNormalizer(layer.id, { peakLevel: value, mode: 'pixel' }));
    });

    this.normalizerMode$.pipe(takeUntil(this.destroy$), withLatestFrom(this.layer$)).subscribe(([value, layer]) => {
      if (!layer) return;
      this.store.dispatch(new UpdateNormalizer(layer.id, { mode: value }));
    });

    this.stretchMode$.pipe(takeUntil(this.destroy$), withLatestFrom(this.layer$)).subscribe(([value, layer]) => {
      if (!layer) return;
      this.store.dispatch(new UpdateNormalizer(layer.id, { stretchMode: value }));
    });
  }

  ngOnInit(): void {
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  onPresetClick(option: 'faint' | 'default' | 'bright') {

    this.presetClick$.next(option)
  }

  onBackgroundPercentileChange(value: number) {
    this.backgroundPercentile$.next(value);
  }

  onMidPercentileChange(value: number) {
    this.midPercentile$.next(value);
  }

  onPeakPercentileChange(value: number) {
    this.peakPercentile$.next(value);
  }

  onBackgroundLevelChange(value: number) {
    this.backgroundLevel$.next(value);
  }

  onMidLevelChange(value: number) {
    this.midLevel$.next(value);
  }

  onPeakLevelChange(value: number) {
    this.peakLevel$.next(value);
  }

  onNormalizerModeChange(value: 'percentile' | 'pixel') {
    this.normalizerMode$.next(value);
  }

  onStretchModeChange(value: StretchMode) {
    this.stretchMode$.next(value)
  }

  onLinkSourceLayerIdChange(linkSourceLayerId: string) {
    this.store.dispatch(new UpdateNormalizer(this.layerId, { linkSourceLayerId: linkSourceLayerId }));
  }

  onLinkModeChange(linkMode: 'percentile' | 'pixel') {
    this.store.dispatch(new UpdateNormalizer(this.layerId, { linkMode: linkMode }));
  }

  onColorMapChange(value: string) {
    this.store.dispatch(new UpdateNormalizer(this.layerId, { colorMapName: value }));
  }

  onInvertedChange(value: boolean) {
    this.store.dispatch(new UpdateNormalizer(this.layerId, { inverted: value }));
  }

  onLayerScaleChange(value: number) {
    this.store.dispatch(new UpdateNormalizer(this.layerId, { layerScale: value }));
  }

  onLayerOffsetChange(value: number) {
    this.store.dispatch(new UpdateNormalizer(this.layerId, { layerOffset: value }));
  }



}
