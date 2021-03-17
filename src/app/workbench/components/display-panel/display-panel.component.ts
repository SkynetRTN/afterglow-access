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
  withLatestFrom,
  concatMap,
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
import { ToolPanelBaseComponent } from '../tool-panel-base/tool-panel-base.component';

@Component({
  selector: 'app-display-panel',
  templateUrl: './display-panel.component.html',
  styleUrls: ['./display-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisplayToolsetComponent extends ToolPanelBaseComponent
  implements OnInit, AfterViewInit, OnDestroy {

  levels$: Subject<{ background: number; peak: number }> = new Subject<{
    background: number;
    peak: number;
  }>();
  backgroundPercentile$: Subject<number> = new Subject<number>();
  peakPercentile$: Subject<number> = new Subject<number>();

  upperPercentileDefault: number;
  lowerPercentileDefault: number;

  constructor(
    store: Store,
    private afterglowConfig: AfterglowConfigService
  ) {
    super(store);

    this.upperPercentileDefault = this.afterglowConfig.saturationDefault;
    this.lowerPercentileDefault = this.afterglowConfig.backgroundDefault;

    this.backgroundPercentile$.pipe(
      auditTime(25),
      withLatestFrom(this.imageHdu$)
    ).subscribe(([value, imageHdu]) => {
      this.store.dispatch(
        new UpdateNormalizer(imageHdu.id, { backgroundPercentile: value })
      );
    });

    this.peakPercentile$.pipe(
      auditTime(25),
      withLatestFrom(this.imageHdu$)
    ).subscribe(([value, imageHdu]) => {
      this.store.dispatch(
        new UpdateNormalizer(imageHdu.id, { peakPercentile: value })
      );
    });
  }

  onBackgroundPercentileChange(value: number) {
    this.backgroundPercentile$.next(value);
  }

  onPeakPercentileChange(value: number) {
    this.peakPercentile$.next(value);
  }

  onColorMapChange(hdu: ImageHdu, value: string) {
    this.store.dispatch(
      new UpdateNormalizer(hdu.id, { colorMapName: value })
    );
  }

  onStretchModeChange(hdu: ImageHdu, value: StretchMode) {
    this.store.dispatch(
      new UpdateNormalizer(hdu.id, { stretchMode: value })
    );
  }

  onInvertedChange(hdu: ImageHdu, value: boolean) {
    this.store.dispatch(new UpdateNormalizer(hdu.id, { inverted: value }));
  }

  onPresetClick(hdu: ImageHdu, lowerPercentile: number, upperPercentile: number) {
    this.store.dispatch(
      new UpdateNormalizer(hdu.id, {
        backgroundPercentile: lowerPercentile,
        peakPercentile: upperPercentile,
      })
    );
  }

  onInvertClick(hdu: ImageHdu) {
    this.store.dispatch(
      new UpdateNormalizer(hdu.id, {
        backgroundPercentile: hdu.normalizer.peakPercentile,
        peakPercentile: hdu.normalizer.backgroundPercentile,
      })
    );
  }

  onFlipClick(t: ITransformableImageData, viewportSize: {width: number, height: number}) {
    
    this.store.dispatch(
      new Flip(
        t.imageDataId,
        t.imageTransformId,
        t.viewportTransformId,
        'horizontal',
        viewportSize
      )
    );
  }

  onMirrorClick(t: ITransformableImageData, viewportSize: {width: number, height: number}) {
    this.store.dispatch(
      new Flip(
        t.imageDataId,
        t.imageTransformId,
        t.viewportTransformId,
        'vertical',
        viewportSize
      )
    );
  }

  onRotateClick(t: ITransformableImageData, viewportSize: {width: number, height: number}) {
    this.store.dispatch(
      new RotateBy(
        t.imageDataId,
        t.imageTransformId,
        t.viewportTransformId,
        viewportSize,
        90
      )
    );
  }

  onResetOrientationClick(t: ITransformableImageData, viewportSize: {width: number, height: number}) {
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

  ngOnInit() { }

  ngOnDestroy() { }

  ngAfterViewInit() { }
}
