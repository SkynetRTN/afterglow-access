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
  take,
} from 'rxjs/operators';

declare let d3: any;

import { Router } from '@angular/router';
import { CorrelationIdGenerator } from '../../../utils/correlated-action';
import { Actions, ofActionCompleted, Store } from '@ngxs/store';
import {
  DataFile,
  ImageHdu,
  IHdu,
  PixelType,
  ITransformableImageData,
  TableHdu,
  isImageHdu,
  getFilter,
  ColorBalanceMode,
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
  SetFileColorBalanceMode,
  SyncFileNormalizers,
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
import { fitHistogram } from 'src/app/utils/histogram-fitting';
import { SourceNeutralizationDialogComponent } from '../../components/source-neutralization-dialog/source-neutralization-dialog.component';
const SAVE_CSV_FILES = false;



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

  ColorBalanceMode = ColorBalanceMode;
  viewportSize$: Observable<{ width: number; height: number }>;
  file$: Observable<DataFile>;
  layers$: Observable<IHdu[]>;
  compositeHistData$: Observable<{ id: string, hist: ImageHist, normalizer: PixelNormalizer }[]>;
  activeHdu$: Observable<IHdu>;
  activeImageHdu$: Observable<ImageHdu>;
  activeHistData$: Observable<{ id: string, hist: ImageHist, normalizer: PixelNormalizer }>;
  activeTableHdu$: Observable<TableHdu>;
  firstImageHdu$: Observable<ImageHdu>;
  compositeNormalizer$: Observable<PixelNormalizer>;
  compositeNormalizersSynced$: Observable<boolean>;
  destroy$ = new Subject<boolean>();

  referenceLayerOptions$: Observable<ImageHdu[]>;

  setFileColorBalanceModeEvent$ = new Subject<ColorBalanceMode>();
  backgroundPercentile$ = new Subject<number>();
  midPercentile$ = new Subject<number>();
  peakPercentile$ = new Subject<number>();
  backgroundLevel$ = new Subject<number>();
  midLevel$ = new Subject<number>();
  peakLevel$ = new Subject<number>();
  normalizerMode$ = new Subject<'pixel' | 'percentile'>();
  stretchMode$ = new Subject<StretchMode>();
  presetClick$ = new Subject<'faint' | 'default' | 'bright'>();
  syncClick$ = new Subject<any>();

  upperPercentileDefault: number;
  lowerPercentileDefault: number;
  colorPickerMode = false;
  color = '#FFFFFF';
  whiteBalanceMode = false;
  resetWhiteBalance$ = new Subject<any>();
  neutralizeBackgroundsEvent$ = new Subject<any>();
  neutralizeSourcesEvent$ = new Subject<any>();
  resetColorBalanceEvent$ = new Subject<any>();
  photometricColorBalanceEvent$ = new Subject<any>();

  channelMixer$: Observable<[[number, number, number], [number, number, number], [number, number, number]]>;
  channelMixerControls = [
    [new FormControl(''), new FormControl(''), new FormControl('')],
    [new FormControl(''), new FormControl(''), new FormControl('')],
    [new FormControl(''), new FormControl(''), new FormControl('')]
  ]

  constructor(private store: Store, private afterglowConfig: AfterglowConfigService, private dialog: MatDialog, private eventService: ImageViewerEventService, private cd: ChangeDetectorRef, private actions$: Actions) {
    this.viewportSize$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getViewportSizeByViewerId(viewerId)))
    );

    this.file$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getFileByViewerId(viewerId)))
    );

    this.channelMixer$ = this.file$.pipe(
      map(file => file?.channelMixer)
    )

    this.layers$ = this.file$.pipe(
      switchMap((file) => file ? this.store.select(DataFilesState.getHdusByFileId(file.id)) : [])
    )

    this.compositeHistData$ = this.layers$.pipe(
      map(layers => layers.map(layer => {
        if (!isImageHdu(layer)) return null;
        if (!layer.visible) return null;
        return { id: layer.id, hist: layer.hist, normalizer: layer.normalizer }
      }).filter(value => value !== null))
    )

    this.firstImageHdu$ = this.layers$.pipe(
      map(layers => {
        return layers.find(layer => isImageHdu(layer)) as ImageHdu | null;
      }))

    this.referenceLayerOptions$ = this.layers$.pipe(
      map(layers => layers.filter(isImageHdu).filter(layer => layer.visible))
    )

    this.compositeNormalizersSynced$ = combineLatest(
      this.file$.pipe(map(file => file.colorBalanceMode), distinctUntilChanged()),
      this.layers$.pipe(
        map(layers => layers.filter(isImageHdu)
          .filter(layer => layer.visible)
          .map(layer => layer.normalizer)
        )
      )
    ).pipe(
      map(([colorBalanceMode, normalizers]) => {
        if (normalizers.length == 0) return false;
        if (normalizers.length == 1) return true;

        if (!normalizers.every(n => n.stretchMode == normalizers[0].stretchMode)) return false;

        let isEqual = (a: number, b: number, p: number) => Math.abs((a - b) / a) <= p
        if (colorBalanceMode == ColorBalanceMode.PERCENTILE) {
          if (!normalizers.every(n => isEqual(n.peakPercentile, normalizers[0].peakPercentile, 1e-6))) return false;
          if (!normalizers.every(n => isEqual(n.backgroundPercentile, normalizers[0].backgroundPercentile, 1e-6))) return false;

          if (normalizers[0].stretchMode == StretchMode.MidTone) {
            if (!normalizers.every(n => isEqual(n.midPercentile, normalizers[0].midPercentile, 1e-6))) return false;
          }
        }
        else {
          if (!normalizers.every(n => isEqual(n.peakLevel, normalizers[0].peakLevel, 1e-6))) return false;
          if (!normalizers.every(n => isEqual(n.backgroundLevel, normalizers[0].backgroundLevel, 1e-6))) return false;

          if (normalizers[0].stretchMode == StretchMode.MidTone) {
            if (!normalizers.every(n => isEqual(n.midLevel, normalizers[0].midLevel, 1e-6))) return false;
          }
        }

        return true;

      })
    )

    this.compositeNormalizer$ = this.firstImageHdu$.pipe(
      map(firstImageHdu => firstImageHdu?.normalizer)
    )

    this.activeHdu$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getHduByViewerId(viewerId)))
    );

    this.activeImageHdu$ = this.activeHdu$.pipe(map((layer) => (layer && layer.type == HduType.IMAGE ? (layer as ImageHdu) : null)));
    this.activeHistData$ = this.activeImageHdu$.pipe(
      map(layer => layer ? { id: layer.id, hist: layer.hist, normalizer: layer.normalizer } : { id: null, hist: null, normalizer: null })
    )


    this.activeTableHdu$ = this.activeHdu$.pipe(map((layer) => (layer && layer.type == HduType.TABLE ? (layer as TableHdu) : null)));

    this.upperPercentileDefault = this.afterglowConfig.saturationDefault;
    this.lowerPercentileDefault = this.afterglowConfig.backgroundDefault;




    this.presetClick$.pipe(takeUntil(this.destroy$), withLatestFrom(this.activeImageHdu$, this.layers$)).subscribe(([value, activeHdu, layers]) => {
      let layer = activeHdu;
      let file: DataFile;
      if (!layer) {
        let imageHdus = layers.filter(isImageHdu);
        layer = imageHdus.find(layer => layer.hist.loaded && layer.visible)
        if (!layer) return;
        file = this.store.selectSnapshot(DataFilesState.getFileById(layer.fileId))
      }

      if (!layer) return;
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



      if (!file) {
        this.store.dispatch(
          new UpdateNormalizer(activeHdu.id, {
            mode: 'percentile',
            backgroundPercentile: backgroundPercentile,
            midPercentile: midPercentile,
            peakPercentile: peakPercentile
          })
        );
      }
      else {
        if (file.colorBalanceMode == ColorBalanceMode.PERCENTILE) {
          this.store.dispatch([
            new UpdateNormalizer(layer.id, {
              mode: 'percentile',
              backgroundPercentile: backgroundPercentile,
              midPercentile: midPercentile,
              peakPercentile: peakPercentile
            }), new SyncFileNormalizers(file.id, layer.id)]
          );
        }
        else if (file.colorBalanceMode == ColorBalanceMode.HISTOGRAM_FITTING) {
          let levels = calcLevels(layer.hist, backgroundPercentile, midPercentile, peakPercentile);
          this.store.dispatch([new UpdateNormalizer(layer.id, {
            // mode: 'pixel',
            backgroundLevel: levels.backgroundLevel * layer.normalizer.layerScale + layer.normalizer.layerOffset,
            midLevel: levels.midLevel * layer.normalizer.layerScale + layer.normalizer.layerOffset,
            peakLevel: levels.peakLevel * layer.normalizer.layerScale + layer.normalizer.layerOffset,
            backgroundPercentile: backgroundPercentile,
            midPercentile: midPercentile,
            peakPercentile: peakPercentile
          }), new SyncFileNormalizers(file.id, layer.id)]);
        }

      }
    });

    this.syncClick$.pipe(
      takeUntil(this.destroy$),
      withLatestFrom(this.file$, this.layers$)
    ).subscribe(([value, file, layers]) => {
      if (file) {
        let imageHdus = layers.filter(isImageHdu);
        let layer = imageHdus.find(layer => layer.hist.loaded && layer.visible)
        if (layer) {
          this.store.dispatch(new SyncFileNormalizers(file.id, layer.id))
        }
      }
    })


    this.setFileColorBalanceModeEvent$.pipe(
      takeUntil(this.destroy$),
      withLatestFrom(this.file$)
    ).subscribe(([value, file]) => {
      if (file) {
        this.store.dispatch(new SetFileColorBalanceMode(file.id, value))
      }
    })

    this.backgroundPercentile$.pipe(takeUntil(this.destroy$), auditTime(500), withLatestFrom(this.activeImageHdu$, this.layers$)).subscribe(([value, activeHdu, layers]) => {
      let layer = activeHdu || layers.find(isImageHdu);
      if (!layer) return;
      let actions = [];
      actions.push(new UpdateNormalizer(layer.id, { backgroundPercentile: value }));
      if (!activeHdu) {
        actions.push(new SyncFileNormalizers(layer.fileId, layer.id))
      }
      this.store.dispatch(actions);
    });

    this.midPercentile$.pipe(takeUntil(this.destroy$), auditTime(500), withLatestFrom(this.activeImageHdu$, this.layers$)).subscribe(([value, activeHdu, layers]) => {
      let layer = activeHdu || layers.find(isImageHdu);
      if (!layer) return;
      let actions = [];
      actions.push(new UpdateNormalizer(layer.id, { midPercentile: value }));
      if (!activeHdu) {
        actions.push(new SyncFileNormalizers(layer.fileId, layer.id))
      }
      this.store.dispatch(actions);
    });

    this.peakPercentile$.pipe(takeUntil(this.destroy$), auditTime(500), withLatestFrom(this.activeImageHdu$, this.layers$)).subscribe(([value, activeHdu, layers]) => {
      let layer = activeHdu || layers.find(isImageHdu);
      if (!layer) return;
      let actions = [];
      actions.push(new UpdateNormalizer(layer.id, { peakPercentile: value }));
      if (!activeHdu) {
        actions.push(new SyncFileNormalizers(layer.fileId, layer.id))
      }
      this.store.dispatch(actions);
    });

    this.backgroundLevel$.pipe(takeUntil(this.destroy$), auditTime(500), withLatestFrom(this.activeImageHdu$, this.layers$)).subscribe(([value, activeHdu, layers]) => {
      let layer = activeHdu || layers.find(isImageHdu);
      if (!layer) return;
      let actions = [];
      actions.push(new UpdateNormalizer(layer.id, { backgroundLevel: value, mode: 'pixel' }));
      if (!activeHdu) {
        actions.push(new SyncFileNormalizers(layer.fileId, layer.id))
      }
      this.store.dispatch(actions);
    });

    this.midLevel$.pipe(takeUntil(this.destroy$), auditTime(500), withLatestFrom(this.activeImageHdu$, this.layers$)).subscribe(([value, activeHdu, layers]) => {
      let layer = activeHdu || layers.find(isImageHdu);
      if (!layer) return;
      let actions = [];
      actions.push(new UpdateNormalizer(layer.id, { midLevel: value, mode: 'pixel' }));
      if (!activeHdu) {
        actions.push(new SyncFileNormalizers(layer.fileId, layer.id))
      }
      this.store.dispatch(actions);
    });

    this.peakLevel$.pipe(takeUntil(this.destroy$), auditTime(500), withLatestFrom(this.activeImageHdu$, this.layers$)).subscribe(([value, activeHdu, layers]) => {
      let layer = activeHdu || layers.find(isImageHdu);
      if (!layer) return;
      let actions = [];
      actions.push(new UpdateNormalizer(layer.id, { peakLevel: value, mode: 'pixel' }));
      if (!activeHdu) {
        actions.push(new SyncFileNormalizers(layer.fileId, layer.id))
      }
      this.store.dispatch(actions);
    });

    this.normalizerMode$.pipe(takeUntil(this.destroy$), withLatestFrom(this.activeImageHdu$, this.layers$)).subscribe(([value, activeHdu, layers]) => {
      let layer = activeHdu || layers.find(isImageHdu);
      if (!layer) return;
      this.store.dispatch(new UpdateNormalizer(layer.id, { mode: value }));
    });

    this.stretchMode$.pipe(takeUntil(this.destroy$), withLatestFrom(this.activeImageHdu$, this.layers$)).subscribe(([value, activeHdu, layers]) => {
      let layer = activeHdu || layers.find(isImageHdu);
      if (!layer) return;
      let actions = [];
      actions.push(new UpdateNormalizer(layer.id, { stretchMode: value }));
      if (!activeHdu) {
        actions.push(new SyncFileNormalizers(layer.fileId, layer.id))
      }
      this.store.dispatch(actions);
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
      withLatestFrom(this.file$, this.layers$)
    ).subscribe(([event, file, layers]) => {
      layers.forEach(layer => {
        if (isImageHdu(layer)) {
          let backgroundLevel = layer.normalizer.backgroundLevel * layer.normalizer.layerScale + layer.normalizer.layerOffset;
          let peakLevel = layer.normalizer.peakLevel * layer.normalizer.layerScale + layer.normalizer.layerOffset;
          this.store.dispatch(new UpdateNormalizer(layer.id, { mode: 'pixel', layerOffset: 0, layerScale: 1, backgroundLevel: backgroundLevel, peakLevel: peakLevel }))
        }

      })
    })

    this.photometricColorBalanceEvent$.pipe(
      takeUntil(this.destroy$),
      withLatestFrom(this.file$, this.layers$)
    ).subscribe(
      ([event, file, layers]) => {
        let ref = this.dialog.open(PhotometricColorBalanceDialogComponent, {
          width: '100%',
          height: '100%',
          maxWidth: '599px',
          maxHeight: '800px',
          data: file.id
        })
        ref.afterClosed().pipe().subscribe((result: { layerId: string, scale: number, offset: number }[]) => {
          if (result) {
            this.store.dispatch(result.map(r => new UpdateNormalizer(r.layerId, { layerScale: r.scale, layerOffset: r.offset })))
          }
        });
      }
    )

    this.neutralizeSourcesEvent$.pipe(
      takeUntil(this.destroy$),
      withLatestFrom(this.file$, this.layers$)
    ).subscribe(
      ([event, file, layers]) => {
        let ref = this.dialog.open(SourceNeutralizationDialogComponent, {
          width: '100%',
          height: '100%',
          maxWidth: '599px',
          maxHeight: '400px',
          data: file.id
        })
        ref.afterClosed().pipe().subscribe((result: { layerId: string, scale: number, offset: number }[]) => {
          if (result) {
            this.store.dispatch(result.map(r => new UpdateNormalizer(r.layerId, { layerScale: r.scale, layerOffset: r.offset })))
          }
        });
      }
    )

    this.neutralizeBackgroundsEvent$.pipe(
      takeUntil(this.destroy$),
      withLatestFrom(this.file$, this.layers$),
      map(([event, file, layers]) => layers)
    ).subscribe((layers) => {
      let fits: {
        layer: { id: string, hist: ImageHist, normalizer: PixelNormalizer }
        bkgMu: number,
        bkgSigma: number,
        bkgPeak: number,
        xSrc: Float32Array,
        ySrc: Float32Array,
        norm: number
      }[] = []

      // fit backgrounds
      layers.forEach(layer => {
        if (!isImageHdu(layer)) return;
        fits.push(fitHistogram(layer, false))
      })

      // fits.forEach(fit => {
      //   console.log(`${fit.layer.name}: ${fit.layer.hist.minBin}, ${fit.layer.hist.maxBin}, ${fit.layer.hist.data.length}, ${getCountsPerBin(fit.layer.hist)} | ${fit.bkgMu}, ${fit.bkgSigma}`)
      // })

      let actions: any[] = [];
      let ref = fits[0]
      let refScale = ref.layer.normalizer.layerScale;

      for (let i = 0; i < fits.length; i++) {
        let fit = fits[i];
        if (fit == ref) continue;

        let targetScale = fit.layer.normalizer.layerScale;
        let targetOffset = fit.layer.normalizer.layerOffset;

        let xRef = new Float32Array(ref.xSrc);
        xRef.forEach((x, index) => { xRef[index] = Math.log(x) })

        let yRef = new Float32Array(ref.ySrc);
        yRef.forEach((y, index) => { yRef[index] = Math.sqrt(y) })
        targetOffset = -fit.bkgMu * targetScale + (ref.bkgMu * refScale);

        actions.push(new UpdateNormalizer(fit.layer.id, { mode: 'pixel', layerOffset: targetOffset }))
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

  onColorBalanceModeChange(value: ColorBalanceMode) {

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

  onColorMapChange(layer: ImageHdu, value: string) {
    this.store.dispatch(new UpdateNormalizer(layer.id, { colorMapName: value }));
  }

  onStretchModeChange(value: StretchMode) {
    this.stretchMode$.next(value)
  }

  onInvertedChange(layer: ImageHdu, value: boolean) {
    this.store.dispatch(new UpdateNormalizer(layer.id, { inverted: value }));
  }

  onLayerScaleChange(layer: ImageHdu, value: number) {
    this.store.dispatch(new UpdateNormalizer(layer.id, { layerScale: value }));
  }

  onLayerOffsetChange(layer: ImageHdu, value: number) {
    this.store.dispatch(new UpdateNormalizer(layer.id, { layerOffset: value }));
  }

  onPresetClick(option: 'faint' | 'default' | 'bright') {

    this.presetClick$.next(option)
  }

  onInvertClick(layer: ImageHdu) {
    this.store.dispatch(
      new UpdateNormalizer(layer.id, {
        backgroundPercentile: layer.normalizer.peakPercentile,
        peakPercentile: layer.normalizer.backgroundPercentile,
      })
    );
  }

  onSyncClick(refHduId: string) {
    console.log('ref: ', refHduId)
    this.syncClick$.next();
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


  photometricWhiteBalance() {
    this.photometricColorBalanceEvent$.next(true);
  }





}
