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
import { calcLevels, calcPercentiles, getBinCenter, ImageHist } from 'src/app/data-files/models/image-hist';
import { PixelNormalizer } from 'src/app/data-files/models/pixel-normalizer';

import { levenbergMarquardt as LM } from 'ml-levenberg-marquardt';

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



  backgroundPercentile$ = new Subject<number>();
  peakPercentile$ = new Subject<number>();
  backgroundLevel$ = new Subject<number>();
  peakLevel$ = new Subject<number>();
  normalizerMode$ = new Subject<'pixel' | 'percentile'>();
  stretchMode$ = new Subject<StretchMode>();
  presetClick$ = new Subject<{ backgroundPercentile: number, peakPercentile: number }>();

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
      withLatestFrom(this.hdus$),
      map(([firstHdu, hdus]) => {
        if (!firstHdu.normalizer) return null;
        let refBackgroundLevel = firstHdu.normalizer.backgroundLevel * firstHdu.normalizer.channelScale + firstHdu.normalizer.channelOffset;
        let refPeakLevel = firstHdu.normalizer.peakLevel * firstHdu.normalizer.channelScale + firstHdu.normalizer.channelOffset;

        let synced = hdus.every(hdu => {
          if (isImageHdu(hdu)) {
            if (hdu.id == firstHdu.id) return true;
            let backgroundLevel = hdu.normalizer.backgroundLevel * hdu.normalizer.channelScale + hdu.normalizer.channelOffset;
            let peakLevel = hdu.normalizer.peakLevel * hdu.normalizer.channelScale + hdu.normalizer.channelOffset;
            console.log(backgroundLevel, refBackgroundLevel, (backgroundLevel - refBackgroundLevel) / refBackgroundLevel, peakLevel, refPeakLevel, (peakLevel - refPeakLevel) / refPeakLevel)
            return Math.abs((backgroundLevel - refBackgroundLevel) / refBackgroundLevel) < 0.01 && Math.abs((peakLevel - refPeakLevel) / refPeakLevel) < 0.01
          }
          return true;
        })

        if (!synced) return null;

        return {
          ...firstHdu.normalizer,
          backgroundLevel: refBackgroundLevel,
          peakLevel: refPeakLevel,
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




    this.presetClick$.pipe(takeUntil(this.destroy$), withLatestFrom(this.activeImageHdu$, this.hdus$)).subscribe(([value, activeHdu, hdus]) => {
      if (activeHdu) {
        this.store.dispatch(
          new UpdateNormalizer(activeHdu.id, {
            mode: 'percentile',
            backgroundPercentile: value.backgroundPercentile,
            peakPercentile: value.peakPercentile
          })
        );
      }
      else {
        let refLevels: { backgroundLevel: number, peakLevel: number };
        hdus.forEach(hdu => {
          if (!isImageHdu(hdu)) return

          if (refLevels === undefined) {
            refLevels = calcLevels(hdu.hist, value.backgroundPercentile, value.peakPercentile);
            refLevels = { backgroundLevel: refLevels.backgroundLevel * hdu.normalizer.channelScale + hdu.normalizer.channelOffset, peakLevel: refLevels.peakLevel * hdu.normalizer.channelScale + hdu.normalizer.channelOffset }
            this.store.dispatch(new UpdateNormalizer(hdu.id, { mode: 'percentile', backgroundPercentile: value.backgroundPercentile, peakPercentile: value.peakPercentile }));
            return;
          }
          let backgroundLevel = (refLevels.backgroundLevel - hdu.normalizer.channelOffset) / hdu.normalizer.channelScale
          let peakLevel = (refLevels.peakLevel - hdu.normalizer.channelOffset) / hdu.normalizer.channelScale

          this.store.dispatch(new UpdateNormalizer(hdu.id, { mode: 'pixel', backgroundLevel: backgroundLevel, peakLevel: peakLevel }));

        })
      }
    });

    this.backgroundPercentile$.pipe(takeUntil(this.destroy$), auditTime(500), withLatestFrom(this.activeImageHdu$, this.hdus$)).subscribe(([value, activeHdu, hdus]) => {
      if (activeHdu) {
        this.store.dispatch(new UpdateNormalizer(activeHdu.id, { backgroundPercentile: value }));
      }
      else {
        let refBackgroundLevel: number;
        hdus.forEach(hdu => {
          if (!isImageHdu(hdu)) return

          if (refBackgroundLevel === undefined) {
            refBackgroundLevel = calcLevels(hdu.hist, value, hdu.normalizer.peakPercentile)?.backgroundLevel * hdu.normalizer.channelScale + hdu.normalizer.channelOffset
            this.store.dispatch(new UpdateNormalizer(hdu.id, { mode: 'percentile', backgroundPercentile: value }));
            return;
          }
          let backgroundLevel = (refBackgroundLevel - hdu.normalizer.channelOffset) / hdu.normalizer.channelScale
          let percentiles = calcPercentiles(hdu.hist, backgroundLevel, hdu.normalizer.peakLevel)

          this.store.dispatch(new UpdateNormalizer(hdu.id, { mode: 'pixel', backgroundLevel: backgroundLevel }));

        })
      }
    });

    this.peakPercentile$.pipe(takeUntil(this.destroy$), auditTime(500), withLatestFrom(this.activeImageHdu$, this.hdus$)).subscribe(([value, activeHdu, hdus]) => {
      if (activeHdu) {
        this.store.dispatch(new UpdateNormalizer(activeHdu.id, { peakPercentile: value }));
      }
      else {
        let refPeakLevel: number;
        hdus.forEach(hdu => {
          if (!isImageHdu(hdu)) return

          if (refPeakLevel === undefined) {
            refPeakLevel = calcLevels(hdu.hist, hdu.normalizer.backgroundPercentile, value)?.peakLevel * hdu.normalizer.channelScale + hdu.normalizer.channelOffset
            this.store.dispatch(new UpdateNormalizer(hdu.id, { mode: 'percentile', peakPercentile: value }));
            return;
          }
          let peakLevel = (refPeakLevel - hdu.normalizer.channelOffset) / hdu.normalizer.channelScale
          let percentiles = calcPercentiles(hdu.hist, hdu.normalizer.backgroundLevel, peakLevel)

          this.store.dispatch(new UpdateNormalizer(hdu.id, { mode: 'pixel', peakLevel: peakLevel }));

        })
      }
    });

    this.backgroundLevel$.pipe(takeUntil(this.destroy$), auditTime(500), withLatestFrom(this.activeImageHdu$, this.hdus$)).subscribe(([value, activeHdu, hdus]) => {
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

    this.peakLevel$.pipe(takeUntil(this.destroy$), auditTime(500), withLatestFrom(this.activeImageHdu$, this.hdus$)).subscribe(([value, activeHdu, hdus]) => {
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

    this.normalizerMode$.pipe(takeUntil(this.destroy$), withLatestFrom(this.activeImageHdu$, this.hdus$)).subscribe(([value, activeHdu, hdus]) => {
      if (activeHdu) {
        this.store.dispatch(new UpdateNormalizer(activeHdu.id, { mode: value }));
      }
      else {
        hdus.forEach(hdu => {
          if (isImageHdu(hdu)) {
            this.store.dispatch(new UpdateNormalizer(hdu.id, { mode: value }));
          }
        })
      }
    });

    this.stretchMode$.pipe(takeUntil(this.destroy$), withLatestFrom(this.activeImageHdu$, this.hdus$)).subscribe(([value, activeHdu, hdus]) => {
      if (activeHdu) {
        this.store.dispatch(new UpdateNormalizer(activeHdu.id, { stretchMode: value }));
      }
      else {
        hdus.forEach(hdu => {
          if (isImageHdu(hdu)) {
            this.store.dispatch(new UpdateNormalizer(hdu.id, { stretchMode: value }));
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
        if (isImageHdu(hdu)) {
          let backgroundLevel = hdu.normalizer.backgroundLevel * hdu.normalizer.channelScale + hdu.normalizer.channelOffset;
          let peakLevel = hdu.normalizer.peakLevel * hdu.normalizer.channelScale + hdu.normalizer.channelOffset;
          this.store.dispatch(new UpdateNormalizer(hdu.id, { mode: 'pixel', channelOffset: 0, channelScale: 1, backgroundLevel: backgroundLevel, peakLevel: peakLevel }))
        }

      })
    })

    this.updateChannelFittingEvent$.pipe(
      takeUntil(this.destroy$),
      withLatestFrom(this.file$, this.hdus$)
    ).subscribe(([event, file, hdus]) => {



      // let fitLinear = (hdu: ImageHdu, ref: ImageHdu) => {

      //   let linearFn = ([m, b]: [number, number]) => {
      //     return (x) => {
      //       let center = x * m + b
      //       let index = (center - ref.hist.minBin) / (ref.hist.maxBin - ref.hist.minBin);
      //       index = Math.min(ref.hist.data.length - 1, Math.max(0, index))
      //       return ref.hist.data[Math.floor(index)]
      //     }
      //   }

      //   let xs: number[] = [];
      //   let ys: number[] = [];
      //   for (let i = 0; i < hdu.hist.data.length; i++) {
      //     xs.push(getBinCenter(hdu.hist, i))
      //     ys.push(hdu.hist.data[i]);
      //   }


      //   let initialValues = [1, 0];
      //   const options = {
      //     damping: 1.5,
      //     initialValues: initialValues,
      //     gradientDifference: 10e-2,
      //     maxIterations: 100,
      //     errorTolerance: 10e-3,
      //   };

      //   let fit = LM({ x: xs, y: ys }, linearFn, options)

      //   return {
      //     hdu: hdu,
      //     m: fit.parameterValues[0],
      //     b: fit.parameterValues[1]
      //   }

      // }

      // let imageHdus: ImageHdu[] = hdus.filter(isImageHdu);
      // if (imageHdus.length <= 1) return;

      // let ref = imageHdus.shift();
      // let fits = imageHdus.map(hdu => fitLinear(hdu, ref))


      // let actions: any[] = [];
      // let refBackground = ref.normalizer.backgroundLevel;
      // let refPeakLevel = ref.normalizer.peakLevel;

      // if (refBackground === undefined || refPeakLevel === undefined) {
      //   let refLevels = calcLevels(ref.hist, ref.normalizer.backgroundPercentile, ref.normalizer.peakPercentile)
      //   refBackground = refLevels.backgroundLevel;
      //   refPeakLevel = refLevels.peakLevel;
      //   actions.push(new UpdateNormalizer(ref.id, { mode: 'pixel', channelOffset: 0, channelScale: 1, backgroundLevel: refLevels.backgroundLevel, peakLevel: refLevels.peakLevel }))
      // }

      // fits.forEach(fit => {
      //   let backgroundLevel = (refBackground - (event.offsetEnabled ? fit.b : 0)) / (event.scaleEnabled ? fit.m : 1);
      //   let peakLevel = (refPeakLevel - (event.offsetEnabled ? fit.b : 0)) / (event.scaleEnabled ? fit.m : 1)
      //   actions.push(new UpdateNormalizer(fit.hdu.id, { mode: 'pixel', channelOffset: event.offsetEnabled ? fit.b : 0, channelScale: event.scaleEnabled ? fit.m : 1, backgroundLevel: backgroundLevel, peakLevel: peakLevel }))
      // })

      // this.store.dispatch(actions)










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

        // let modeN = histData[0];
        // let modeIndex = 0;
        // for (let i = 0; i < histData.length; i++) {
        //   if (histData[i] >= modeN) {
        //     modeN = histData[i];
        //     modeIndex = i
        //   }
        // }
        // let mode = getBinCenter(hist, modeIndex);
        let mode = median

        let devData: [number, number][] = []
        for (let i = 0; i < histData.length; i++) {
          devData[i] = [Math.abs(getBinCenter(hist, i) - mode), histData[i]]
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
          mode: mode,
          deviation: deviation
        }
      }

      let fits: {
        hdu: ImageHdu
        median: number,
        mode: number,
        deviation: number
      }[] = []

      hdus.forEach(hdu => {
        if (!isImageHdu(hdu)) return;
        fits.push(getFit(hdu))
      })

      fits = fits.sort((a, b) => b.mode - a.mode)

      fits.forEach(fit => {
        console.log(fit.hdu.name, fit.median, fit.mode, fit.deviation)
      })

      let actions: any[] = [];
      let ref = fits[0]

      let refBackground = ref.hdu.normalizer.backgroundLevel;
      let refPeakLevel = ref.hdu.normalizer.peakLevel;

      if (refBackground === undefined || refPeakLevel === undefined) {
        let refLevels = calcLevels(ref.hdu.hist, ref.hdu.normalizer.backgroundPercentile, ref.hdu.normalizer.peakPercentile)
        refBackground = refLevels.backgroundLevel;
        refPeakLevel = refLevels.peakLevel;
        actions.push(new UpdateNormalizer(ref.hdu.id, { mode: 'pixel', channelOffset: 0, channelScale: 1, backgroundLevel: refLevels.backgroundLevel, peakLevel: refLevels.peakLevel }))
      }


      this.store.dispatch(new UpdateNormalizer(ref.hdu.id, { channelOffset: 0, channelScale: 1 }))
      for (let i = 1; i < fits.length; i++) {
        let fit = fits[i];
        let m = ref.deviation / fit.deviation;
        let b = -fit.mode * m + ref.mode;

        let backgroundLevel = (refBackground - (event.offsetEnabled ? b : 0)) / (event.scaleEnabled ? m : 1);
        let peakLevel = (refPeakLevel - (event.offsetEnabled ? b : 0)) / (event.scaleEnabled ? m : 1)
        actions.push(new UpdateNormalizer(fit.hdu.id, { mode: 'pixel', channelOffset: event.offsetEnabled ? b : 0, channelScale: event.scaleEnabled ? m : 1, backgroundLevel: backgroundLevel, peakLevel: peakLevel }))
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

        if (!this.whiteBalanceMode || !file || !file.rgbaImageDataId || !$event.hitImage) return
        let compositeImageData = this.store.selectSnapshot(DataFilesState.getImageDataById(file.rgbaImageDataId));
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

  onNormalizerModeChange(value: 'percentile' | 'pixel') {
    this.normalizerMode$.next(value);
  }

  onColorMapChange(hdu: ImageHdu, value: string) {
    this.store.dispatch(new UpdateNormalizer(hdu.id, { colorMapName: value }));
  }

  onStretchModeChange(value: StretchMode) {
    this.stretchMode$.next(value)
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

  onPresetClick(lowerPercentile: number, upperPercentile: number) {
    this.presetClick$.next({ backgroundPercentile: lowerPercentile, peakPercentile: upperPercentile })
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
