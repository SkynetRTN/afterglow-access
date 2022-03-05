import { Component, OnInit, OnDestroy, AfterViewInit, Input, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subject, BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
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
  TableHdu,
  isImageHdu,
} from '../../../data-files/models/data-file';
import {
  UpdateNormalizer,
  RotateBy,
  ResetImageTransform,
  Flip,
  UpdateBlendMode,
  UpdateAlpha,
  ResetViewportTransform,
  UpdateChannelMixer,
} from '../../../data-files/data-files.actions';
import { StretchMode } from '../../../data-files/models/stretch-mode';
import { HduType } from '../../../data-files/models/data-file-type';
import { Transform } from '../../../data-files/models/transformation';
import { getPixel, IImageData } from '../../../data-files/models/image-data';
import { WorkbenchState } from '../../workbench.state';
import { DataFilesState } from '../../../data-files/data-files.state';
import { BlendMode } from '../../../data-files/models/blend-mode';
import { AfterglowConfigService } from '../../../afterglow-config.service';
import { ImageViewerEventService } from '../../services/image-viewer-event.service';
import { MatDialog } from '@angular/material/dialog';
import { PsfMatchingDialogComponent } from '../../components/psf-matching-dialog/psf-matching-dialog.component';
import { FormControl } from '@angular/forms';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { getBinCenter, ImageHist } from 'src/app/data-files/models/image-hist';
import { PixelNormalizer } from 'src/app/data-files/models/pixel-normalizer';

@Component({
  selector: 'app-display-panel',
  templateUrl: './display-panel.component.html',
  styleUrls: ['./display-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisplayToolPanelComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input('viewerId')
  set viewerId(viewer: string) {
    this.viewerId$.next(viewer);
  }
  get viewerId() {
    return this.viewerId$.getValue();
  }
  protected viewerId$ = new BehaviorSubject<string>(null);

  viewportSize$: Observable<{ width: number; height: number }>;
  file$: Observable<DataFile>;
  hdus$: Observable<IHdu[]>;
  compositeHistData$: Observable<{ hist: ImageHist, normalizer: PixelNormalizer }[]>;
  activeHdu$: Observable<IHdu>;
  activeImageHdu$: Observable<ImageHdu>;
  activeHistData$: Observable<{ hist: ImageHist, normalizer: PixelNormalizer }>;
  activeTableHdu$: Observable<TableHdu>;
  firstImageHdu$: Observable<ImageHdu>;
  compositeNormalizer$: Observable<PixelNormalizer>;
  destroy$ = new Subject<boolean>();



  backgroundPercentile$: Subject<number> = new Subject<number>();
  peakPercentile$: Subject<number> = new Subject<number>();
  backgroundLevel$: Subject<number> = new Subject<number>();
  peakLevel$: Subject<number> = new Subject<number>();

  upperPercentileDefault: number;
  lowerPercentileDefault: number;
  colorPickerMode = false;
  color = '#FFFFFF';
  whiteBalanceMode = false;
  resetWhiteBalance$ = new Subject<any>();
  updateChannelFittingEvent$ = new Subject<{ scaleEnabled: boolean, offsetEnabled: boolean }>();
  resetChannelFittingEvent$ = new Subject<any>();

  channelMixer$: Observable<[[number, number, number], [number, number, number], [number, number, number]]>;
  channelMixerControls = [
    [new FormControl(''), new FormControl(''), new FormControl('')],
    [new FormControl(''), new FormControl(''), new FormControl('')],
    [new FormControl(''), new FormControl(''), new FormControl('')]
  ]

  constructor(private store: Store, private afterglowConfig: AfterglowConfigService, private dialog: MatDialog, private eventService: ImageViewerEventService, private cd: ChangeDetectorRef) {
    this.viewportSize$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getViewportSizeByViewerId(viewerId)))
    );

    this.file$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getFileByViewerId(viewerId)))
    );

    this.channelMixer$ = this.file$.pipe(
      map(file => file?.channelMixer)
    )

    this.hdus$ = this.file$.pipe(
      switchMap((file) => file ? this.store.select(DataFilesState.getHdusByFileId(file.id)) : [])
    )

    this.compositeHistData$ = this.hdus$.pipe(
      map(hdus => hdus.map(hdu => {
        if (!isImageHdu(hdu)) return null;
        return { hist: hdu.hist, normalizer: hdu.normalizer }
      }).filter(value => value !== null))
    )

    this.firstImageHdu$ = this.hdus$.pipe(
      map(hdus => {
        return hdus.find(hdu => isImageHdu(hdu)) as ImageHdu | null;
      }))

    this.compositeNormalizer$ = this.firstImageHdu$.pipe(
      map(imageHdu => {
        if (!imageHdu.normalizer) return null;
        return {
          ...imageHdu.normalizer,
          backgroundLevel: imageHdu.normalizer.backgroundLevel * imageHdu.normalizer.channelScale + imageHdu.normalizer.channelOffset,
          peakLevel: imageHdu.normalizer.peakLevel * imageHdu.normalizer.channelScale + imageHdu.normalizer.channelOffset,
          channelOffset: 0,
          channelScale: 1
        }
      })
    )



    this.activeHdu$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getHduByViewerId(viewerId)))
    );

    this.activeImageHdu$ = this.activeHdu$.pipe(map((hdu) => (hdu && hdu.type == HduType.IMAGE ? (hdu as ImageHdu) : null)));
    this.activeHistData$ = this.activeImageHdu$.pipe(
      map(hdu => hdu ? { hist: hdu.hist, normalizer: hdu.normalizer } : { hist: null, normalizer: null })
    )


    this.activeTableHdu$ = this.activeHdu$.pipe(map((hdu) => (hdu && hdu.type == HduType.TABLE ? (hdu as TableHdu) : null)));

    this.upperPercentileDefault = this.afterglowConfig.saturationDefault;
    this.lowerPercentileDefault = this.afterglowConfig.backgroundDefault;

    this.backgroundPercentile$.pipe(auditTime(500), withLatestFrom(this.activeImageHdu$)).subscribe(([value, imageHdu]) => {
      this.store.dispatch(new UpdateNormalizer(imageHdu.id, { backgroundPercentile: value }));
    });

    this.peakPercentile$.pipe(auditTime(500), withLatestFrom(this.activeImageHdu$)).subscribe(([value, imageHdu]) => {
      this.store.dispatch(new UpdateNormalizer(imageHdu.id, { peakPercentile: value }));
    });

    this.backgroundLevel$.pipe(auditTime(500), withLatestFrom(this.activeImageHdu$, this.hdus$)).subscribe(([value, activeHdu, hdus]) => {
      if (activeHdu) {
        this.store.dispatch(new UpdateNormalizer(activeHdu.id, { backgroundLevel: value }));
      }
      else {
        hdus.forEach(hdu => {
          if (isImageHdu(hdu)) {
            this.store.dispatch(new UpdateNormalizer(hdu.id, { backgroundLevel: (value - hdu.normalizer.channelOffset) / hdu.normalizer.channelScale, mode: 'pixel' }));
          }
        })
      }
    });

    this.peakLevel$.pipe(auditTime(500), withLatestFrom(this.activeImageHdu$, this.hdus$)).subscribe(([value, activeHdu, hdus]) => {
      if (activeHdu) {
        this.store.dispatch(new UpdateNormalizer(activeHdu.id, { peakLevel: value }));
      }
      else {
        hdus.forEach(hdu => {
          if (isImageHdu(hdu)) {
            this.store.dispatch(new UpdateNormalizer(hdu.id, { peakLevel: (value - hdu.normalizer.channelOffset) / hdu.normalizer.channelScale, mode: 'pixel' }));
          }
        })
      }
    });

    this.resetWhiteBalance$.pipe(
      takeUntil(this.destroy$),
      withLatestFrom(this.file$)
    ).subscribe(([v, file]) => {
      if (!file) return;
      // this.store.dispatch(new UpdateChannelMixer(file.id, [1, 1, 1]))
    })

    this.resetChannelFittingEvent$.pipe(
      takeUntil(this.destroy$),
      withLatestFrom(this.file$, this.hdus$)
    ).subscribe(([event, file, hdus]) => {
      hdus.forEach(hdu => {
        this.store.dispatch(new UpdateNormalizer(hdu.id, { channelOffset: 0, channelScale: 1 }))
      })
    })

    this.updateChannelFittingEvent$.pipe(
      takeUntil(this.destroy$),
      withLatestFrom(this.file$, this.hdus$)
    ).subscribe(([event, file, hdus]) => {
      let getFit = (hdu: ImageHdu) => {
        let hist = hdu.hist;
        let histData = hist.data;
        let N = histData.reduce((result, value) => result += value, 0)
        let sM = 0;
        let sM1 = 0;
        let M: number;
        for (M = 1; M < histData.length; M++) {
          sM1 = sM;
          sM += 0.5 * histData[M - 1] + 0.5 * histData[M]
          if (sM >= 0.5 * N) break;
        }
        let xM = getBinCenter(hist, M)
        let xM1 = getBinCenter(hist, M - 1)
        let median = xM1 + (xM - xM1) * (0.5 * N - sM1) / (sM - sM1);


        let devData: [number, number][] = []
        for (let i = 0; i < histData.length; i++) {
          devData[i] = [Math.abs(getBinCenter(hist, i) - median), histData[i]]
        }
        devData = devData.sort((a, b) => a[0] - b[0])

        let sD = 0
        let sD1 = 0;
        let D: number;
        for (D = 1; D < devData.length; D++) {
          sD1 = sD;
          sD += 0.317 * devData[D - 1][1] + 0.683 * devData[D][1]
          if (sD >= 0.683 * N) break;
        }
        let xD = devData[D][0]
        let xD1 = devData[D - 1][0]
        let deviation = xD1 + (xD - xD1) * (0.683 * N - sD1) / (sD - sD1);

        return {
          hdu: hdu,
          median: median,
          deviation: deviation
        }
      }

      let fits: {
        hdu: ImageHdu
        median: number,
        deviation: number
      }[] = []

      hdus.forEach(hdu => {
        if (!isImageHdu(hdu)) return;
        fits.push(getFit(hdu))
      })

      fits = fits.sort((a, b) => b.median - a.median)

      let actions: any[] = [];
      let ref = fits[0]
      console.log(ref.hdu.name, ref.median, ref.deviation)
      this.store.dispatch(new UpdateNormalizer(ref.hdu.id, { channelOffset: 0, channelScale: 1 }))
      for (let i = 1; i < fits.length; i++) {
        let fit = fits[i];
        let m = ref.deviation / fit.deviation;
        let b = -fit.median * m + ref.median;
        actions.push(new UpdateNormalizer(fit.hdu.id, { channelOffset: event.offsetEnabled ? b : 0, channelScale: event.scaleEnabled ? m : 1 }))
        console.log(fit.hdu.name, fit.median, fit.deviation, m, b)
      }

      this.store.dispatch(actions)

    })

    this.channelMixerControls.forEach((row, i) => {
      row.forEach((control, j) => {
        control.valueChanges.pipe(
          takeUntil(this.destroy$),
          withLatestFrom(this.file$),
        ).subscribe(([value, file]) => {
          if (file && value !== null) {
            let channelMixer: [[number, number, number], [number, number, number], [number, number, number]] = JSON.parse(JSON.stringify(file.channelMixer));
            channelMixer[i][j] = value;
            this.store.dispatch(new UpdateChannelMixer(file.id, channelMixer))
          }
        })
      })
    })

    this.channelMixer$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(mixer => {
      if (!mixer) return;
      this.channelMixerControls.forEach((row, i) => {
        row.forEach((control, j) => {
          control.setValue(mixer[i][j], { emitEvent: false })
        })
      })
    })

    this.eventService.imageClickEvent$
      .pipe(
        takeUntil(this.destroy$),
        withLatestFrom(this.file$)
      )
      .subscribe(([$event, file]) => {

        if (!this.whiteBalanceMode || !file || !file.compositeId || !$event.hitImage) return
        let compositeImageData = this.store.selectSnapshot(DataFilesState.getImageDataById(file.compositeId));
        let color = getPixel(compositeImageData, $event.imageX, $event.imageY);
        if (!color) return;
        let b = (color >> 16) & 0xff;
        let g = (color >> 8) & 0xff;
        let r = (color >> 0) & 0xff;

        let componentToHex = (c) => {
          var hex = c.toString(16);
          return hex.length == 1 ? "0" + hex : hex;
        }

        let rgbToHex = (r, g, b) => {
          return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
        }

        let hexToRgb = (hex) => {
          var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          } : null;
        }

        let targetRGB = hexToRgb(this.color);
        let rScale = targetRGB.r / r
        let gScale = targetRGB.g / g
        let bScale = targetRGB.b / b
        // this.store.dispatch(new UpdateChannelMixer(file.id, [rScale, gScale, bScale]))



        // if (this.colorPickerMode) {
        //   let hex = rgbToHex(r, g, b);
        //   this.color = hex;
        //   this.cd.markForCheck();
        // }
        // else if (this.whiteBalanceMode) {
        //   let targetRGB = hexToRgb(this.color);
        //   let rScale = targetRGB.r / r
        //   let gScale = targetRGB.g / g
        //   let bScale = targetRGB.b / b
        //   this.store.dispatch(new UpdateWhiteBalance(file.id, [rScale, gScale, bScale]))
        // }




      });

  }

  onBackgroundPercentileChange(value: number) {
    this.backgroundPercentile$.next(value);
  }

  onPeakPercentileChange(value: number) {
    this.peakPercentile$.next(value);
  }

  onBackgroundLevelChange(value: number) {
    this.backgroundLevel$.next(value);
  }

  onPeakLevelChange(value: number) {
    this.peakLevel$.next(value);
  }

  onColorMapChange(hdu: ImageHdu, value: string) {
    this.store.dispatch(new UpdateNormalizer(hdu.id, { colorMapName: value }));
  }

  onStretchModeChange(hdu: ImageHdu, value: StretchMode) {
    this.store.dispatch(new UpdateNormalizer(hdu.id, { stretchMode: value }));
  }

  onInvertedChange(hdu: ImageHdu, value: boolean) {
    this.store.dispatch(new UpdateNormalizer(hdu.id, { inverted: value }));
  }

  onChannelScaleChange(hdu: ImageHdu, value: number) {
    this.store.dispatch(new UpdateNormalizer(hdu.id, { channelScale: value }));
  }

  onChannelOffsetChange(hdu: ImageHdu, value: number) {
    this.store.dispatch(new UpdateNormalizer(hdu.id, { channelOffset: value }));
  }

  onNormalizerModeChange(hdu: ImageHdu, value: 'percentile' | 'pixel') {
    this.store.dispatch(new UpdateNormalizer(hdu.id, { mode: value }));
  }

  onPresetClick(hdu: ImageHdu, lowerPercentile: number, upperPercentile: number) {
    this.store.dispatch(
      new UpdateNormalizer(hdu.id, {
        backgroundPercentile: lowerPercentile,
        peakPercentile: upperPercentile,
        backgroundLevel: undefined,
        peakLevel: undefined,
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

  ngOnInit() { }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  ngAfterViewInit() { }

  openPsfMatchingDialog(file: DataFile) {
    let dialogRef = this.dialog.open(PsfMatchingDialogComponent, {
      width: '100%',
      height: '100%',
      maxWidth: '1200px',
      maxHeight: '800px',
      data: file.id,
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        //this.store.dispatch(new UpdateSettings(result));
      }
    });
  }

  onColorPickerOpen() {
    this.whiteBalanceMode = true
  }

  onColorPickerClose() {
    setTimeout(() => this.whiteBalanceMode = false, 100)
  }

  onResetWhiteBalance() {
    this.resetWhiteBalance$.next(true);
  }

  onChannelMixerChange($event) {
    console.log($event);
  }

  fitChannels() {
    this.updateChannelFittingEvent$.next({ scaleEnabled: true, offsetEnabled: true });
  }

  fitChannelScales() {
    this.updateChannelFittingEvent$.next({ scaleEnabled: true, offsetEnabled: false });
  }

  resetChannelFitting() {
    this.resetChannelFittingEvent$.next(true)
  }
}
