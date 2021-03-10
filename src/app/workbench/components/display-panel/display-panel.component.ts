import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  Input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Subject, BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import {
  auditTime,
  map,
  tap,
  switchMap,
  distinct,
  distinctUntilChanged,
} from 'rxjs/operators';

declare let d3: any;

import { Router } from '@angular/router';
import { CorrelationIdGenerator } from '../../../utils/correlated-action';
import { Store } from '@ngxs/store';
import {
  DataFile,
  ImageHdu,
  IHdu,
  PixelType,
  ITransformableImageData,
} from '../../../data-files/models/data-file';
import {
  UpdateNormalizer,
  RotateBy,
  ResetImageTransform,
  Flip,
  UpdateBlendMode,
  UpdateAlpha,
  ResetViewportTransform,
} from '../../../data-files/data-files.actions';
import { StretchMode } from '../../../data-files/models/stretch-mode';
import { HduType } from '../../../data-files/models/data-file-type';
import { Transform } from '../../../data-files/models/transformation';
import { IImageData } from '../../../data-files/models/image-data';
import { WorkbenchState } from '../../workbench.state';
import { DataFilesState } from '../../../data-files/data-files.state';
import { BlendMode } from '../../../data-files/models/blend-mode';
import { AfterglowConfigService } from '../../../afterglow-config.service';

@Component({
  selector: 'app-display-panel',
  templateUrl: './display-panel.component.html',
  styleUrls: ['./display-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisplayToolsetComponent
  implements OnInit, AfterViewInit, OnDestroy {
  @Input('file')
  set file(file: DataFile) {
    this.file$.next(file);
  }
  get file() {
    return this.file$.getValue();
  }
  private file$ = new BehaviorSubject<DataFile>(null);

  @Input('hdu')
  set hdu(hdu: ImageHdu) {
    this.hdu$.next(hdu);
  }
  get hdu() {
    return this.hdu$.getValue();
  }
  private hdu$ = new BehaviorSubject<ImageHdu>(null);

  @Input('viewportSize')
  set viewportSize(viewportSize: { width: number; height: number }) {
    this.viewportSize$.next(viewportSize);
  }
  get viewportSize() {
    return this.viewportSize$.getValue();
  }
  private viewportSize$ = new BehaviorSubject<{ width: number; height: number }>(null);

  HduType = HduType;

  levels$: Subject<{ background: number; peak: number }> = new Subject<{
    background: number;
    peak: number;
  }>();
  backgroundPercentile$: Subject<number> = new Subject<number>();
  peakPercentile$: Subject<number> = new Subject<number>();

  upperPercentileDefault: number;
  lowerPercentileDefault: number;

  constructor(
    private corrGen: CorrelationIdGenerator,
    private store: Store,
    private router: Router,
    private afterglowConfig: AfterglowConfigService
  ) {

    this.upperPercentileDefault = this.afterglowConfig.saturationDefault;
    this.lowerPercentileDefault = this.afterglowConfig.backgroundDefault;

    this.backgroundPercentile$.pipe(auditTime(25)).subscribe((value) => {
      this.store.dispatch(
        new UpdateNormalizer(this.hdu.id, { backgroundPercentile: value })
      );
    });

    this.peakPercentile$.pipe(auditTime(25)).subscribe((value) => {
      this.store.dispatch(
        new UpdateNormalizer(this.hdu.id, { peakPercentile: value })
      );
    });
  }

  onBackgroundPercentileChange(value: number) {
    this.backgroundPercentile$.next(value);
  }

  onPeakPercentileChange(value: number) {
    this.peakPercentile$.next(value);
  }

  onColorMapChange(value: string) {
    this.store.dispatch(
      new UpdateNormalizer(this.hdu.id, { colorMapName: value })
    );
  }

  onStretchModeChange(value: StretchMode) {
    this.store.dispatch(
      new UpdateNormalizer(this.hdu.id, { stretchMode: value })
    );
  }

  onInvertedChange(value: boolean) {
    this.store.dispatch(new UpdateNormalizer(this.hdu.id, { inverted: value }));
  }

  onPresetClick(lowerPercentile: number, upperPercentile: number) {
    this.store.dispatch(
      new UpdateNormalizer(this.hdu.id, {
        backgroundPercentile: lowerPercentile,
        peakPercentile: upperPercentile,
      })
    );
  }

  onInvertClick() {
    this.store.dispatch(
      new UpdateNormalizer(this.hdu.id, {
        backgroundPercentile: this.hdu.normalizer.peakPercentile,
        peakPercentile: this.hdu.normalizer.backgroundPercentile,
      })
    );
  }

  onFlipClick() {
    let t: ITransformableImageData = this.hdu || this.file;

    this.store.dispatch(
      new Flip(
        t.imageDataId,
        t.imageTransformId,
        t.viewportTransformId,
        'horizontal',
        this.viewportSize
      )
    );
  }

  onMirrorClick() {
    let t: ITransformableImageData = this.hdu || this.file;

    this.store.dispatch(
      new Flip(
        t.imageDataId,
        t.imageTransformId,
        t.viewportTransformId,
        'vertical',
        this.viewportSize
      )
    );
  }

  onRotateClick() {
    let t: ITransformableImageData = this.hdu || this.file;

    this.store.dispatch(
      new RotateBy(
        t.imageDataId,
        t.imageTransformId,
        t.viewportTransformId,
        this.viewportSize,
        90
      )
    );
  }

  onResetOrientationClick() {
    let t: ITransformableImageData = this.hdu || this.file;

    this.store.dispatch(
      new ResetImageTransform(
        t.imageDataId,
        t.imageTransformId,
        t.viewportTransformId,
      )
    );
    this.store.dispatch(
      new ResetViewportTransform(
        t.imageDataId,
        t.imageTransformId,
        t.viewportTransformId,
      )
    );
  }

  ngOnInit() {}

  ngOnDestroy() {}

  ngAfterViewInit() {}
}
