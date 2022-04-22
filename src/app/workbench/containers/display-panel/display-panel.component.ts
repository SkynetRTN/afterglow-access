import { Component, OnInit, OnDestroy, AfterViewInit, Input, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subject, BehaviorSubject, Observable, combineLatest, of, empty } from 'rxjs';
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
  getFilter,
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
  SetFileNormalizerSync,
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
import { calcLevels, calcPercentiles, getBinCenter, getCountsPerBin, ImageHist } from 'src/app/data-files/models/image-hist';
import { PixelNormalizer } from 'src/app/data-files/models/pixel-normalizer';
import { erf } from 'src/app/utils/math';
import { linear } from 'everpolate';

import { saveAs } from 'file-saver/dist/FileSaver';
import { PhotometricColorBalanceDialogComponent } from '../../components/photometric-color-balance-dialog/photometric-color-balance-dialog.component';
const SAVE_CSV_FILES = false;

type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;

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


  setFileNormalizerSyncEvent$ = new Subject<boolean>();
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
  fitHistogramsEvent$ = new Subject<{ fitBackground: boolean, fitSources: boolean }>();
  resetColorBalanceEvent$ = new Subject<any>();

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
      map(firstImageHdu => firstImageHdu?.normalizer)
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
      // let hdu = activeHdu || hdus.find(isImageHdu);
      // if (!hdu) return;
      // this.store.dispatch(
      //   new UpdateNormalizer(hdu.id, {
      //     mode: 'percentile',
      //     backgroundPercentile: value.backgroundPercentile,
      //     peakPercentile: value.peakPercentile
      //   })
      // );

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
        let imageHdus = hdus.filter(isImageHdu);
        let hdu = imageHdus.find(hdu => hdu.hist.loaded)
        if (!hdu) return;

        let levels = calcLevels(hdu.hist, value.backgroundPercentile, value.peakPercentile);
        this.store.dispatch(new UpdateNormalizer(hdu.id, {
          mode: 'pixel',
          backgroundLevel: levels.backgroundLevel * hdu.normalizer.layerScale + hdu.normalizer.layerOffset,
          peakLevel: levels.peakLevel * hdu.normalizer.layerScale + hdu.normalizer.layerOffset
        }));
      }
    });

    this.setFileNormalizerSyncEvent$.pipe(
      takeUntil(this.destroy$),
      withLatestFrom(this.file$)
    ).subscribe(([value, file]) => {
      if (file) {
        let actions: any[] = [new SetFileNormalizerSync(file.id, value)]
        if (value) {
          let hdu = this.store.selectSnapshot(DataFilesState.getFirstImageHduByFileId(file.id));
          if (hdu) {
            actions.push(new UpdateNormalizer(hdu.id, { mode: 'pixel' }));
          }
        }
        this.store.dispatch(actions);
      }
    })

    this.backgroundPercentile$.pipe(takeUntil(this.destroy$), auditTime(500), withLatestFrom(this.activeImageHdu$, this.hdus$)).subscribe(([value, activeHdu, hdus]) => {
      let hdu = activeHdu || hdus.find(isImageHdu);
      if (!hdu) return;
      this.store.dispatch(new UpdateNormalizer(hdu.id, { backgroundPercentile: value }));



      // if (activeHdu) {
      //   this.store.dispatch(new UpdateNormalizer(activeHdu.id, { backgroundPercentile: value }));
      // }
      // else {
      //   let refBackgroundLevel: number;
      //   hdus.forEach(hdu => {
      //     if (!isImageHdu(hdu)) return

      //     if (refBackgroundLevel === undefined) {
      //       refBackgroundLevel = calcLevels(hdu.hist, value, hdu.normalizer.peakPercentile)?.backgroundLevel
      //       this.store.dispatch(new UpdateNormalizer(hdu.id, { mode: 'percentile', backgroundPercentile: value }));
      //       return;
      //     }
      //     this.store.dispatch(new UpdateNormalizer(hdu.id, { mode: 'pixel', backgroundLevel: refBackgroundLevel }));

      //   })
      // }
    });

    this.peakPercentile$.pipe(takeUntil(this.destroy$), auditTime(500), withLatestFrom(this.activeImageHdu$, this.hdus$)).subscribe(([value, activeHdu, hdus]) => {
      let hdu = activeHdu || hdus.find(isImageHdu);
      if (!hdu) return;
      this.store.dispatch(new UpdateNormalizer(hdu.id, { peakPercentile: value }));

      // if (activeHdu) {
      //   this.store.dispatch(new UpdateNormalizer(activeHdu.id, { peakPercentile: value }));
      // }
      // else {
      //   let refPeakLevel: number;
      //   hdus.forEach(hdu => {
      //     if (!isImageHdu(hdu)) return

      //     if (refPeakLevel === undefined) {
      //       refPeakLevel = calcLevels(hdu.hist, hdu.normalizer.backgroundPercentile, value)?.peakLevel
      //       this.store.dispatch(new UpdateNormalizer(hdu.id, { mode: 'percentile', peakPercentile: value }));
      //       return;
      //     }

      //     this.store.dispatch(new UpdateNormalizer(hdu.id, { mode: 'pixel', peakLevel: refPeakLevel }));

      //   })
      // }
    });

    this.backgroundLevel$.pipe(takeUntil(this.destroy$), auditTime(500), withLatestFrom(this.activeImageHdu$, this.hdus$)).subscribe(([value, activeHdu, hdus]) => {
      let hdu = activeHdu || hdus.find(isImageHdu);
      if (!hdu) return;
      this.store.dispatch(new UpdateNormalizer(hdu.id, { backgroundLevel: value, mode: 'pixel' }));


      // if (activeHdu) {
      //   this.store.dispatch(new UpdateNormalizer(activeHdu.id, { backgroundLevel: value }));
      // }
      // else {
      //   hdus.forEach(hdu => {
      //     if (isImageHdu(hdu)) {
      //       this.store.dispatch(new UpdateNormalizer(hdu.id, { backgroundLevel: value, mode: 'pixel' }));
      //     }
      //   })
      // }
    });

    this.peakLevel$.pipe(takeUntil(this.destroy$), auditTime(500), withLatestFrom(this.activeImageHdu$, this.hdus$)).subscribe(([value, activeHdu, hdus]) => {
      let hdu = activeHdu || hdus.find(isImageHdu);
      if (!hdu) return;
      this.store.dispatch(new UpdateNormalizer(hdu.id, { peakLevel: value, mode: 'pixel' }));

      // if (activeHdu) {
      //   this.store.dispatch(new UpdateNormalizer(activeHdu.id, { peakLevel: value }));
      // }
      // else {
      //   hdus.forEach(hdu => {
      //     if (isImageHdu(hdu)) {
      //       this.store.dispatch(new UpdateNormalizer(hdu.id, { peakLevel: value, mode: 'pixel' }));
      //     }
      //   })
      // }
    });

    this.normalizerMode$.pipe(takeUntil(this.destroy$), withLatestFrom(this.activeImageHdu$, this.hdus$)).subscribe(([value, activeHdu, hdus]) => {
      let hdu = activeHdu || hdus.find(isImageHdu);
      if (!hdu) return;
      this.store.dispatch(new UpdateNormalizer(hdu.id, { mode: value }));

      // if (activeHdu) {
      //   this.store.dispatch(new UpdateNormalizer(activeHdu.id, { mode: value }));
      // }
      // else {
      //   hdus.forEach(hdu => {
      //     if (isImageHdu(hdu)) {
      //       this.store.dispatch(new UpdateNormalizer(hdu.id, { mode: value }));
      //     }
      //   })
      // }
    });

    this.stretchMode$.pipe(takeUntil(this.destroy$), withLatestFrom(this.activeImageHdu$, this.hdus$)).subscribe(([value, activeHdu, hdus]) => {
      let hdu = activeHdu || hdus.find(isImageHdu);
      if (!hdu) return;
      this.store.dispatch(new UpdateNormalizer(hdu.id, { stretchMode: value }));


      // if (activeHdu) {
      //   this.store.dispatch(new UpdateNormalizer(activeHdu.id, { stretchMode: value }));
      // }
      // else {
      //   hdus.forEach(hdu => {
      //     if (isImageHdu(hdu)) {
      //       this.store.dispatch(new UpdateNormalizer(hdu.id, { stretchMode: value }));
      //     }
      //   })
      // }
    });

    this.resetWhiteBalance$.pipe(
      takeUntil(this.destroy$),
      withLatestFrom(this.file$)
    ).subscribe(([v, file]) => {
      if (!file) return;
      // this.store.dispatch(new UpdateChannelMixer(file.id, [1, 1, 1]))
    })

    this.resetColorBalanceEvent$.pipe(
      takeUntil(this.destroy$),
      withLatestFrom(this.file$, this.hdus$)
    ).subscribe(([event, file, hdus]) => {
      hdus.forEach(hdu => {
        if (isImageHdu(hdu)) {
          let backgroundLevel = hdu.normalizer.backgroundLevel * hdu.normalizer.layerScale + hdu.normalizer.layerOffset;
          let peakLevel = hdu.normalizer.peakLevel * hdu.normalizer.layerScale + hdu.normalizer.layerOffset;
          this.store.dispatch(new UpdateNormalizer(hdu.id, { mode: 'pixel', layerOffset: 0, layerScale: 1, backgroundLevel: backgroundLevel, peakLevel: peakLevel }))
        }

      })
    })

    this.fitHistogramsEvent$.pipe(
      takeUntil(this.destroy$),
      withLatestFrom(this.file$, this.hdus$)
    ).subscribe(([event, file, hdus]) => {




      let getFit = (hdu: ImageHdu) => {
        let hist = hdu.hist;

        let N0 = 0;
        hist.data.forEach(v => N0 += v)

        // correct for strobing effect which is caused by histogram sampling of images with discrete levels
        let y = new Float32Array(hist.data.length);
        for (let i = 1; i < hist.data.length - 1; i++) {
          let a = hist.data[i - 1];
          let b = hist.data[i];
          let c = hist.data[i + 1];
          y[i] = Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));
        }

        let N = 0;
        y.forEach(v => N += v)


        // renormalize histogram to restore original number of pixels after median filtering
        // remove 0 bins
        let x = new Float32Array(hist.data.length)
        let index = 0;
        for (let i = 0; i < y.length; i++) {
          if (y[i] == 0) {
            continue
          }
          y[index] = y[i] * (N0 / N);
          // y[index] = y[i]
          x[index] = getBinCenter(hist, i);
          index++;
        }
        x = x.slice(0, index)
        y = y.slice(0, index);

        if (x.length == 0) {
          //no pixels left, skip median filter
          x = new Float32Array(hist.data.length);
          y = new Float32Array(hist.data.length);
          index = 0;
          for (let i = 0; i < hist.data.length; i++) {
            if (hist.data[i] == 0) {
              continue
            }
            y[index] = hist.data[i]
            x[index] = getBinCenter(hist, i);
            index++;
          }
          x = x.slice(0, index)
          y = y.slice(0, index)

        }




        // let N0 = 1;
        // let N = 1;
        // let x = new Float32Array(hist.data.length)
        // let y = new Float32Array(hist.data.length);
        // let index = 0;
        // for (let i = 0; i < hist.data.length; i++) {
        //   if (hist.data[i] == 0) {
        //     continue
        //   }
        //   y[index] = hist.data[i];
        //   x[index] = getBinCenter(hist, i);
        //   index++;
        // }
        // x = x.slice(0, index)
        // y = y.slice(0, index);



        this.saveCsv(`${hdu.name}-hist.csv`, x, y)

        // extract background
        let { peak: bkgPeak, mu: bkgMu, sigma: bkgSigma, x: xBkg, y: yBkg } = this.fitBackground(hdu, x, y);

        let xSrc: Float32Array, ySrc: Float32Array;

        if (event.fitSources) {
          //subtract background
          let gaussian = (t: number) => bkgPeak * Math.exp(-0.5 * Math.pow((t - bkgMu) / bkgSigma, 2))
          xSrc = new Float32Array(x.length)
          ySrc = new Float32Array(y.length);
          let startIndex = 0;
          let firstPeakFound = false;
          index = 0;
          for (let i = 0; i < x.length - 1; i++) {
            if (x[i] <= xBkg[xBkg.length - 1]) continue;
            // if (x[i] <= bkgMu) continue;
            let yi = y[i] - gaussian(x[i]);
            if (yi <= 1) continue;

            xSrc[index] = x[i] - bkgMu
            // xSrc[index] = x[i]
            ySrc[index] = yi

            if (!firstPeakFound) {
              if (ySrc[index] >= ySrc[startIndex]) {
                startIndex = index;
              }
              else {
                firstPeakFound = true;
              }
            }


            index++;
          }
          xSrc = xSrc.slice(startIndex, index)
          ySrc = ySrc.slice(startIndex, index);
        }


        this.saveCsv(`${hdu.name}-src.csv`, xSrc, ySrc)



        return {
          hdu: hdu,
          bkgMu: bkgMu,
          bkgSigma: bkgSigma,
          bkgPeak: bkgPeak,
          xSrc: xSrc,
          ySrc: ySrc,
          norm: (N0 / N)
        }

      }

      let fits: {
        hdu: ImageHdu
        bkgMu: number,
        bkgSigma: number,
        bkgPeak: number,
        xSrc: Float32Array,
        ySrc: Float32Array,
        norm: number
      }[] = []

      // fit backgrounds
      hdus.forEach(hdu => {
        if (!isImageHdu(hdu)) return;
        fits.push(getFit(hdu))
      })


      fits = fits.sort((a, b) => b.bkgSigma - a.bkgSigma)
      // fits.forEach(fit => console.log(`${fit.hdu.name} - Background Fit: ${fit.bkgPeak}*EXP(-0.5*POWER((x-${fit.bkgMu})/${fit.bkgSigma},2))`));

      fits.forEach(fit => {
        console.log(`${fit.hdu.name}: ${fit.hdu.hist.minBin}, ${fit.hdu.hist.maxBin}, ${fit.hdu.hist.data.length}, ${getCountsPerBin(fit.hdu.hist)} | ${fit.bkgMu}, ${fit.bkgSigma}`)
      })

      let actions: any[] = [];
      let ref = fits[0]
      let refCorr = getCountsPerBin(ref.hdu.hist)
      // let refCorr = ref.norm
      // let refCorr = 1

      let backgroundLevel: number;
      let peakLevel: number;
      if (ref.hdu.normalizer.mode == 'pixel' && ref.hdu.normalizer.backgroundLevel !== undefined && ref.hdu.normalizer.peakLevel !== undefined) {
        backgroundLevel = ref.hdu.normalizer.backgroundLevel;
        peakLevel = ref.hdu.normalizer.peakLevel;
      }
      else {
        let levels = calcLevels(ref.hdu.hist, ref.hdu.normalizer.backgroundPercentile, ref.hdu.normalizer.peakPercentile)
        backgroundLevel = levels.backgroundLevel;
        peakLevel = levels.peakLevel;
      }

      //rotate origin 45 degrees
      // let rot = Math.cos(45 * Math.PI / 180)
      // let refXs = new Float32Array(ref.xSrc.length);
      // let refYs = new Float32Array(ref.ySrc.length);
      // ref.xSrc.forEach((x, index) => {
      //   refXs[index] = x * rot - ref.ySrc[index] * rot;
      //   refYs[index] = x * rot + ref.ySrc[index] * rot
      // })

      let refScale = event.fitSources ? 1 : ref.hdu.normalizer.layerScale;
      let refOffset = event.fitBackground ? 0 : ref.hdu.normalizer.layerOffset;
      actions.push(new UpdateNormalizer(ref.hdu.id, { layerOffset: refOffset, layerScale: refScale }))

      fits.forEach(fit => {
        console.log(fit.hdu.name, fit.hdu.hist.minBin, fit.hdu.hist.maxBin, getCountsPerBin(fit.hdu.hist), fit.bkgPeak, fit.bkgMu, fit.bkgSigma)
      })
      for (let i = 1; i < fits.length; i++) {

        let fit = fits[i];
        let targetScale = fit.hdu.normalizer.layerScale;
        let targetOffset = fit.hdu.normalizer.layerOffset;

        let xRef = new Float32Array(ref.xSrc);
        xRef.forEach((x, index) => { xRef[index] = Math.log(x) })
        let refXArray = Array.from(xRef)

        let yRef = new Float32Array(ref.ySrc);
        yRef.forEach((y, index) => { yRef[index] = Math.sqrt(y) })


        if (event.fitSources) {
          let fitCorr = getCountsPerBin(fit.hdu.hist)
          // let fitCorr = fit.norm;
          // let fitCorr = 1
          let corr = (fitCorr / refCorr)
          // corr = 1
          console.log(fit.hdu.name, corr)

          let steps = 200;
          let m0 = 2.5;
          let results: { m: number, k2: number, N: number, f: number }[];
          let stepSize = 0.025
          while (stepSize > 0.0001) {
            results = [];
            for (let step = 0; step < steps; step++) {
              let s = stepSize * (step - steps / 2)
              if (m0 + s <= 0) continue;
              let m = m0 + s


              let xs = new Float32Array(fit.xSrc);
              xs.forEach((x, index) => xs[index] = Math.log(x * m))

              let ys = new Float32Array(fit.ySrc);
              ys.forEach((y, index) => ys[index] = Math.sqrt(ys[index] / corr / m))

              let ysInterpolated = new Float32Array(linear(refXArray, Array.from(xs), Array.from(ys)))

              let K2 = 0;
              let N = 0;
              let W = 0;
              let WSum = 0
              let WN = 0.5;
              // console.log(m, xs[0], xs[xs.length - 1])
              xRef.forEach((x, index) => {
                if (x < xs[0] || x > xs[xs.length - 1]) return;
                W += Math.pow(yRef[index], WN);
                WSum += W;
                K2 += W * Math.pow(yRef[index] - ysInterpolated[index], 2);
                N++
              })

              if (N == 0) continue;

              results.push({ m: m, k2: K2, N: N, f: K2 / WSum })
            }
            let bestFitIndex = 0;
            results.forEach((value, index) => {
              if (value.f < results[bestFitIndex].f) bestFitIndex = index;
            })

            m0 = results[bestFitIndex].m
            // console.log(results[bestFitIndex], m0)

            if (bestFitIndex == results.length - 1) {
              stepSize *= 2;
              m0 *= 2;
            }
            else {
              stepSize *= .5
            }

          }
          targetScale = m0;
        }

        if (event.fitBackground) {
          targetOffset = -fit.bkgMu * targetScale + ref.bkgMu;
        }

        console.log(fit.hdu.name, targetScale, targetOffset)



        actions.push(new UpdateNormalizer(fit.hdu.id, { mode: 'pixel', layerOffset: targetOffset, layerScale: targetScale, backgroundLevel: backgroundLevel, peakLevel: peakLevel }))
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

  saveCsv(name: string, x: Float32Array, y: Float32Array) {
    if (!SAVE_CSV_FILES) return

    let csvRows = [];
    x.forEach((x, index) => {
      csvRows.push(`${x}, ${y[index]}`)
    })
    let csv = csvRows.join('\n')
    var blob = new Blob([csv], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, name);
  }
  fitBackground(hdu: ImageHdu, x: Float32Array, y: Float32Array) {
    let index: number;
    let sigma: number, mu: number;

    while (true) {
      mu = this.getWeightedMode(y.length, y, x);
      index = 0;
      let xBkgDevs = new Float32Array(y.length)
      let yBkgDevs = new Float32Array(y.length);
      for (let i = 0; i < y.length; i++) {
        if (x[i] > mu) break;
        yBkgDevs[index] = y[i]
        xBkgDevs[index] = Math.abs(x[i] - mu)
        index++
      }
      xBkgDevs = xBkgDevs.slice(0, index)
      yBkgDevs = yBkgDevs.slice(0, index)
      sigma = this.getWeighted68th(yBkgDevs, xBkgDevs);

      let N = y.length;
      index = 0;
      let xNext = new Float32Array(x.length)
      let yNext = new Float32Array(y.length)
      for (let i = 0; i < y.length; i++) {
        let P = 1 - erf((Math.abs(x[i] - mu) / sigma) / Math.sqrt(2))
        let NP = N * P;
        if (x[i] > mu && NP < 0.5) continue
        xNext[index] = x[i]
        yNext[index] = y[i]
        index++
      }
      xNext = xNext.slice(0, index)
      yNext = yNext.slice(0, index)

      if (xNext.length == x.length) break;

      x = xNext;
      y = yNext;

    }

    let aNumerator = 0, aDenominator = 0, peak = 1;
    let gaussian = (t: number) => Math.exp(-0.5 * Math.pow((t - mu) / sigma, 2))

    //ignore possible pileup in first bin
    for (let i = 1; i < y.length; i++) {
      let g = gaussian(x[i])
      aNumerator += y[i] * g;
      aDenominator += Math.pow(g, 2);
    }
    peak = aNumerator / aDenominator;

    return { peak: peak, mu: mu, sigma: sigma, x: x, y: y }
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

  onLayerScaleChange(hdu: ImageHdu, value: number) {
    this.store.dispatch(new UpdateNormalizer(hdu.id, { layerScale: value }));
  }

  onLayerOffsetChange(hdu: ImageHdu, value: number) {
    this.store.dispatch(new UpdateNormalizer(hdu.id, { layerOffset: value }));
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

  neutralizeBackground() {
    this.fitHistogramsEvent$.next({ fitBackground: true, fitSources: false });
  }

  autoWhiteBalance() {
    this.fitHistogramsEvent$.next({ fitBackground: true, fitSources: true });
  }

  photometricWhiteBalance() {
    let ref = this.dialog.open(PhotometricColorBalanceDialogComponent, {
      width: '100%',
      height: '100%',
      maxWidth: '1200px',
      maxHeight: '800px',
      data: []
    })
    ref.afterClosed().pipe().subscribe();
  }


  resetColorBalance() {
    this.resetColorBalanceEvent$.next(true)
  }




  isEqual(x: number, y: number, maxRelativeError = .00000001, maxAbsoluteError = 2.2250738585072013830902327173324040642192159804623318306e-308)// .000001; .0000001;.00000001
  {
    if (Math.abs(x - y) < maxAbsoluteError) {
      return true;
    }
    let relativeError = (Math.abs(y) > Math.abs(x) ? Math.abs((x - y) / y) : Math.abs((x - y) / x));
    if (relativeError <= maxRelativeError) {
      return true;
    }
    return false;
  }


  getWeightedMean(trueCount: number, w: number[] | TypedArray, y: number[] | TypedArray) {
    let top = 0, bottom = 0;
    for (let i = 0; i < trueCount; i++) {
      top += w[i] * y[i];
      bottom += w[i];
    }

    return top / bottom;
  }

  getWeightedMedian(trueCount: number, w: number[] | TypedArray, y: number[] | TypedArray) {
    let sumCounter = 0;
    let median = 0, totalSum = 0, runningSum = 0;
    for (let i = 0; i < trueCount; i++) {
      totalSum += w[i];
    }
    if (trueCount > 1) {
      runningSum = w[sumCounter] * .5;
      while (runningSum < .5 * totalSum) {
        sumCounter++;
        runningSum += w[sumCounter - 1] * .5 + w[sumCounter] * .5;
      }
      if (sumCounter == 0) {
        median = y[0];
      }
      else {
        median = y[sumCounter - 1] + (.5 * totalSum - (runningSum - (w[sumCounter - 1] * .5 + w[sumCounter] * .5))) / (w[sumCounter - 1] * .5 + w[sumCounter] * .5) * (y[sumCounter] - y[sumCounter - 1]);
      }
    }
    else {
      median = y[0];
    }
    return median;
  }

  getWeightedMode(trueCount: number, w: number[] | TypedArray, y: number[] | TypedArray) {
    let k, lowerLimit = 0, upperLimit = trueCount - 1, lowerLimitIn = -1, upperLimitIn = -1, finalLower = -1, finalUpper = -1, size: number;
    let halfWeightSum = 0, sSum, total, minDist = 999999;
    let sVec: number[];

    while (lowerLimit != lowerLimitIn || upperLimit != upperLimitIn) {
      //std::cout<< lowerLimit << "\t" << upperLimit << "\n";
      lowerLimitIn = lowerLimit;
      upperLimitIn = upperLimit;
      size = upperLimit - lowerLimit + 1;
      minDist = 999999;
      halfWeightSum = 0;
      for (let i = lowerLimit; i < upperLimit + 1; i++) {
        halfWeightSum += w[i];
      }
      halfWeightSum *= .5;

      sVec = Array(size).fill(0)
      sSum = .5 * w[lowerLimit];
      sVec[0] = sSum;
      for (let i = lowerLimit + 1; i < lowerLimit + size; i++) {
        sSum += w[i - 1] * .5 + w[i] * .5;
        sVec[i - lowerLimit] = sSum;
      }

      for (let i = 0; i < sVec.length; i++) {
        if ((sVec[i] < halfWeightSum) || this.isEqual(sVec[i], halfWeightSum)) {
          total = sVec[i] + halfWeightSum;
          k = i; // was 0
          while (k < sVec.length && ((sVec[k] < total) || this.isEqual(sVec[k], total))) {
            k++;
          }
          k--;
          total = Math.abs(y[k + lowerLimit] - y[i + lowerLimit]);


          if (this.isEqual(total, minDist)) {
            finalLower = Math.floor(Math.min(finalLower, i + lowerLimit));
            finalUpper = Math.floor(Math.max(finalUpper, k + lowerLimit));
          }
          else if (total < minDist) {
            minDist = total;
            finalLower = Math.floor(i + lowerLimit);
            finalUpper = k + lowerLimit;
          }
        }
        if ((sVec[i] > halfWeightSum) || this.isEqual(sVec[i], halfWeightSum)) {
          total = sVec[i] - halfWeightSum;
          k = i; // was svec.size() - 1
          while (k > -1 && ((sVec[k] > total) || this.isEqual(sVec[k], total))) {
            k--;
          }
          k++;
          total = Math.abs(y[i + lowerLimit] - y[k + lowerLimit]);


          if (this.isEqual(total, minDist)) {
            finalLower = Math.floor(Math.min(finalLower, k + lowerLimit));
            finalUpper = Math.floor(Math.max(finalUpper, i + lowerLimit));
          }
          else if (total < minDist) {
            minDist = total;
            finalLower = k + lowerLimit;
            finalUpper = i + lowerLimit;
          }
        }
      }

      lowerLimit = finalLower;
      upperLimit = finalUpper;

      sVec = [];
    }

    let newValues = y.slice(lowerLimit, upperLimit + 1);
    let newWeights = w.slice(lowerLimit, upperLimit + 1);
    return this.getWeightedMedian(newWeights.length, newWeights, newValues);
  }

  getWeightedStDev(delta: number, w: number[] | TypedArray, y: number[] | TypedArray) {
    let size = w.length;
    let top = 0, wSum = 0, wSumSq = 0, weight;
    for (let i = 0; i < size; i++) {
      weight = w[i];
      top += weight * y[i] * y[i];
      wSum += weight;
      wSumSq += weight * weight;
    }
    return Math.sqrt(top / (wSum - delta * wSumSq / wSum));
  }

  swap(a: number, b: number, y: number[] | TypedArray) {
    let tmp: number;
    tmp = y[a];
    y[a] = y[b];
    y[b] = tmp;
  }

  QS(left: number, right: number, w: number[] | TypedArray, y: number[] | TypedArray) {
    let i = left, j = right;
    let pivot = y[Math.floor((left + right) / 2)];

    while (i <= j) {
      while (y[i] < pivot) {
        i++;
      }
      while (y[j] > pivot) {
        j--;
      }
      if (i <= j) {
        this.swap(i, j, y);
        this.swap(i, j, w);
        i++;
        j--;
      }
    }

    if (left < j) {
      this.QS(left, j, w, y);
    }
    if (i < right) {
      this.QS(i, right, w, y);
    }
  }

  sort(w: number[] | TypedArray, y: number[] | TypedArray) {
    this.QS(0, y.length - 1, w, y);
  }

  getWeighted68th(w: number[] | TypedArray, y: number[] | TypedArray) {
    let sumCounter = 0;
    let stDev = 0, totalSum = 0, runningSum: number; //, temp = 0, weightTemp = 0;
    this.sort(w, y);
    for (let i = 0; i < y.length; i++) {
      totalSum += w[i];
    }
    if (y.length > 1) {
      runningSum = w[sumCounter] * .682689;
      while (runningSum < .682689 * totalSum) {
        sumCounter++;
        runningSum += w[sumCounter - 1] * .317311 + w[sumCounter] * .682689;
      }
      if (sumCounter == 0) {
        stDev = y[0];
      }
      else {
        stDev = y[sumCounter - 1] + (.682689 * totalSum - (runningSum - (w[sumCounter - 1] * .317311 + w[sumCounter] * .682689))) / (w[sumCounter - 1] * .317311 + w[sumCounter] * .682689) * (y[sumCounter] - y[sumCounter - 1]);
      }
    }
    else {
      stDev = y[0];
    }

    return stDev;
  }


  binarySearch(searchUp: boolean, minimumIndex: number, toFind: number, toSearch: number[]) {
    let low: number, high: number, midPoint = 0, lowIn = -1, highIn = -1;
    if (searchUp) {
      low = minimumIndex;
      high = toSearch.length;
    }
    else {
      low = 0;
      high = minimumIndex;
    }
    while (low != lowIn || high != highIn) {
      lowIn = low;
      highIn = high;
      midPoint = Math.floor((low + (high - low) / 2.0));

      if (this.isEqual(toFind, toSearch[midPoint])) {
        low = midPoint;
        high = midPoint;

      }
      else if (toFind > toSearch[midPoint]) {
        low = midPoint;
      }
      else if (toFind < toSearch[midPoint]) {
        high = midPoint;
      }

    }
    if (searchUp) {
      return low;
    }
    else {
      return high;
    }
  }

  getMedian(y: number[] | TypedArray) {
    let high = (Math.floor(y.length / 2));
    let low = high - 1;
    let runningSum = 0, median = 0;
    let totalSum = y.length;
    if (y.length > 1) {
      if (y.length % 2 == 0) {
        runningSum = y.length / 2.0 + .5;
      }
      else {
        runningSum = y.length / 2.0;
      }
      median = y[low] + (.5 * totalSum - runningSum + 1.0) * (y[high] - y[low]);
    }

    else {
      median = y[0];
    }
    return median;

  }

  getMode(trueCount: number, y: number[]) {
    let k: number, lowerLimit = 0, upperLimit = trueCount - 1, lowerLimitIn = -1, upperLimitIn = -1, finalLower = -1, finalUpper = -1, size: number;
    let halfWeightSum = 0, sSum: number, total: number, minDist = 999999;
    let sVec: number[] = [];
    while (lowerLimit != lowerLimitIn || upperLimit != upperLimitIn) {
      lowerLimitIn = lowerLimit;
      upperLimitIn = upperLimit;
      size = upperLimit - lowerLimit + 1;
      minDist = 999999;
      halfWeightSum = 0;
      halfWeightSum = size;

      halfWeightSum *= 0.5;
      sVec = new Array(size).fill(0);
      sSum = .5;
      sVec[0] = sSum;
      for (let i = lowerLimit + 1; i < lowerLimit + size; i++) {
        sSum += 1;
        sVec[i - lowerLimit] = sSum;
      }
      for (let i = 0; i < sVec.length; i++) {
        if ((sVec[i] < halfWeightSum) || this.isEqual(sVec[i], halfWeightSum)) {
          total = sVec[i] + halfWeightSum;
          /*k = 0;
          while (k < sVec.size() && sVec[k] <= total)
          {
          k++;
          }
          k--;*/
          k = this.binarySearch(true, i, total, sVec);
          total = Math.abs(y[k + lowerLimit] - y[i + lowerLimit]);


          if (this.isEqual(total, minDist)) {
            finalLower = Math.floor(Math.min(finalLower, i + lowerLimit));
            finalUpper = Math.floor(Math.max(finalUpper, k + lowerLimit));
          }
          else if (total < minDist) {
            minDist = total;
            finalLower = Math.floor(i + lowerLimit);
            finalUpper = k + lowerLimit;
          }
        }
        if ((sVec[i] > halfWeightSum) || this.isEqual(sVec[i], halfWeightSum)) {
          total = sVec[i] - halfWeightSum;
          /*k = sVec.size() - 1;
          while (k > -1 && sVec[k] >= total)
          {
          k--;
          }
          k++;*/
          k = this.binarySearch(false, i, total, sVec);

          total = Math.abs(y[i + lowerLimit] - y[k + lowerLimit]);

          if (this.isEqual(total, minDist)) {
            finalLower = Math.floor(Math.min(finalLower, k + lowerLimit));
            finalUpper = Math.floor(Math.max(finalUpper, i + lowerLimit));
          }
          else if (total < minDist) {
            minDist = total;
            finalLower = k + lowerLimit;
            finalUpper = Math.floor(i + lowerLimit);
          }

        }
      }
      lowerLimit = finalLower;
      upperLimit = finalUpper;
      sVec = []
    }
    let newValues = y.slice(lowerLimit, upperLimit + 1);
    return this.getMedian(newValues);
  }

  get68th(y: number[]) {
    let sumCounter = 0;
    let stDev = 0, totalSum = 0, runningSum: number; //, temp = 0, weightTemp = 0;
    y = y.sort();
    for (let i = 0; i < y.length; i++) {
      totalSum += 1.0;
    }
    if (y.length > 1) {
      runningSum = 1.0 * .682689;
      while (runningSum < .682689 * totalSum) {
        sumCounter++;
        runningSum += 1.0 * .317311 + 1.0 * .682689;
      }
      if (sumCounter == 0) {
        stDev = y[0];
      }
      else {
        stDev = y[sumCounter - 1] + (.682689 * totalSum - (runningSum - (1.0 * .317311 + 1.0 * .682689))) / (1.0 * .317311 + 1.0 * .682689) * (y[sumCounter] - y[sumCounter - 1]);
      }
    }
    else {
      stDev = y[0];
    }

    return stDev;

  }

}
