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
import { CorrelationIdGenerator } from '../../../../utils/correlated-action';
import { Actions, ofActionCompleted, Store } from '@ngxs/store';
import {
  DataFile,
  ImageLayer,
  ILayer,
  PixelType,
  ITransformableImageData,
  TableLayer,
  isImageLayer,
  getFilter,
  ColorBalanceMode,
} from '../../../../data-files/models/data-file';
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
} from '../../../../data-files/data-files.actions';
import { StretchMode } from '../../../../data-files/models/stretch-mode';
import { LayerType } from '../../../../data-files/models/data-file-type';
import { Transform } from '../../../../data-files/models/transformation';
import { getPixel, IImageData } from '../../../../data-files/models/image-data';
import { WorkbenchState } from '../../../workbench.state';
import { DataFilesState } from '../../../../data-files/data-files.state';
import { BlendMode, BLEND_MODE_OPTIONS } from '../../../../data-files/models/blend-mode';
import { AfterglowConfigService } from '../../../../afterglow-config.service';
import { ImageViewerEventService } from '../../../services/image-viewer-event.service';
import { MatDialog } from '@angular/material/dialog';
import { PsfMatchingDialogComponent } from '../../../components/psf-matching-dialog/psf-matching-dialog.component';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { calcLevels, calcPercentiles, getBinCenter, getCountsPerBin, ImageHistogram } from 'src/app/data-files/models/image-histogram';
import { PixelNormalizer } from 'src/app/data-files/models/pixel-normalizer';
import { erf } from 'src/app/utils/math';
import { linear } from 'everpolate';

import { saveAs } from 'file-saver/dist/FileSaver';
import { PhotometricColorBalanceDialogComponent } from '../../../components/photometric-color-balance-dialog/photometric-color-balance-dialog.component';
import { fitHistogram } from 'src/app/utils/histogram-fitting';
import { SourceNeutralizationDialogComponent } from '../../../components/source-neutralization-dialog/source-neutralization-dialog.component';
import { DisplayState } from '../display.state';
import { SetCompositeNormalizationLayerId } from '../display.actions';
import { COLOR_MAPS_BY_NAME } from 'src/app/data-files/models/color-map';
import { greaterThan, isNumber, lessThan } from 'src/app/utils/validators';
const SAVE_CSV_FILES = false;



@Component({
  selector: 'app-display-panel',
  templateUrl: './display-panel.component.html',
  styleUrls: ['./display-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisplayPanelComponent implements OnInit, AfterViewInit, OnDestroy {
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
  layers$: Observable<ILayer[]>;
  selectedLayer$: Observable<ILayer>;
  selectedImageLayer$: Observable<ImageLayer>;
  selectedImageLayerHistData$: Observable<{ id: string, hist: ImageHistogram, normalizer: PixelNormalizer }[]>;
  compositeNormalizationLayer$: Observable<ImageLayer>;
  compositeHistData$: Observable<{ id: string, hist: ImageHistogram, normalizer: PixelNormalizer }[]>;
  showCompositeNormalizationLayerColorMap$: Observable<boolean>;

  destroy$ = new Subject<boolean>();

  colorPickerMode = false;
  color = '#FFFFFF';
  whiteBalanceMode = false;
  resetWhiteBalance$ = new Subject<any>();
  neutralizeBackgroundsEvent$ = new Subject<any>();
  neutralizeSourcesEvent$ = new Subject<any>();
  resetColorBalanceEvent$ = new Subject<any>();
  photometricColorBalanceEvent$ = new Subject<any>();
  resetLinking$ = new Subject<any>();
  linkAllPercentile$ = new Subject<any>();
  linkAllPixelValue$ = new Subject<any>();


  layerSelectionForm = this.fb.group({
    selectedLayerId: this.fb.control('', Validators.required),
  })

  compositionSettingsForm = this.fb.group({
    blendMode: this.fb.control('', Validators.required),
    alpha: this.fb.control('', [Validators.required, isNumber, greaterThan(0, true), lessThan(1, true)]),
  })
  blendModeOptions = BLEND_MODE_OPTIONS

  channelMixer$: Observable<[[number, number, number], [number, number, number], [number, number, number]]>;
  channelMixerControls = [
    [new FormControl(''), new FormControl(''), new FormControl('')],
    [new FormControl(''), new FormControl(''), new FormControl('')],
    [new FormControl(''), new FormControl(''), new FormControl('')]
  ]

  constructor(private store: Store, private afterglowConfig: AfterglowConfigService, private dialog: MatDialog, private eventService: ImageViewerEventService, private cd: ChangeDetectorRef, private actions$: Actions, private fb: FormBuilder) {
    this.viewportSize$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getViewportSizeByViewerId(viewerId)))
    );

    this.file$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getFileByViewerId(viewerId)))
    );

    this.layers$ = this.file$.pipe(
      switchMap((file) => file ? this.store.select(DataFilesState.getLayersByFileId(file.id)) : of([]))
    )


    this.showCompositeNormalizationLayerColorMap$ = this.layers$.pipe(
      map(layers => layers.filter(isImageLayer).map(layer => layer.normalizer.colorMapName)),
      map(colorMapNames => colorMapNames.length != 0 && colorMapNames.some(name => name != colorMapNames[0]))
    )

    this.selectedLayer$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getLayerByViewerId(viewerId)))
    )

    this.selectedImageLayer$ = this.selectedLayer$.pipe(
      map(layer => layer && isImageLayer(layer) ? layer : null)
    )

    this.selectedImageLayerHistData$ = this.selectedImageLayer$.pipe(
      map(layer => {
        if (!layer) return [];
        return [{ id: layer.id, hist: layer.histogram, normalizer: layer.normalizer }]
      })
    )

    this.file$.pipe(
      switchMap((file) => file ? this.store.select(DisplayState.getCompositeNormalizationLayerIdByFileId(file.id)) : of(null)),
      withLatestFrom(this.layers$)
    ).subscribe(([selectedLayerId, layers]) => {

      if (!selectedLayerId || layers.map(l => l.id).includes(selectedLayerId)) return;
      let imageLayers = layers.filter(isImageLayer)
      if (imageLayers.length == 0) return null;
      this.store.dispatch(new SetCompositeNormalizationLayerId(imageLayers[0].id))
    })

    this.compositeNormalizationLayer$ = this.file$.pipe(
      switchMap((file) => file ? this.store.select(DisplayState.getCompositeNormalizationLayerByFileId(file.id)) : of(null))
    )

    this.compositeNormalizationLayer$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(layer => {
      if (!layer) return;
      this.layerSelectionForm.patchValue({ selectedLayerId: layer.id }, { emitEvent: false })
    })

    this.layerSelectionForm.valueChanges.subscribe(value => {
      this.store.dispatch(new SetCompositeNormalizationLayerId(value.selectedLayerId))
    })


    this.compositeNormalizationLayer$.pipe(
      map(layer => layer?.blendMode),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(blendMode => {
      this.compositionSettingsForm.patchValue({ blendMode: blendMode }, { emitEvent: false })
    })

    this.compositeNormalizationLayer$.pipe(
      map(layer => layer?.alpha),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(alpha => {
      this.compositionSettingsForm.patchValue({ alpha: alpha }, { emitEvent: false })
    })

    this.compositionSettingsForm.valueChanges.pipe(
      withLatestFrom(this.compositeNormalizationLayer$)
    ).subscribe(([value, selectedImageLayer]) => {
      if (!selectedImageLayer || !this.compositionSettingsForm.valid) return;
      this.store.dispatch(new UpdateBlendMode(selectedImageLayer.id, value.blendMode))
      this.store.dispatch(new UpdateAlpha(selectedImageLayer.id, value.alpha))
    })





    this.channelMixer$ = this.file$.pipe(
      map(file => file?.channelMixer)
    )



    this.compositeHistData$ = this.layers$.pipe(
      map(layers => layers.map(layer => {
        if (!isImageLayer(layer)) return null;
        if (!layer.visible) return null;
        return { id: layer.id, hist: layer.histogram, normalizer: layer.normalizer }
      }).filter(value => value !== null))
    )


    this.resetWhiteBalance$.pipe(
      takeUntil(this.destroy$),
      withLatestFrom(this.file$)
    ).subscribe(([v, file]) => {
      if (!file) return;
      // this.store.dispatch(new UpdateChannelMixer(file.id, [1, 1, 1]))
    })

    this.resetLinking$.pipe(
      takeUntil(this.destroy$),
      withLatestFrom(this.layers$)
    ).subscribe(([v, layers]) => {
      this.store.dispatch(layers.filter(isImageLayer).map(layer => new UpdateNormalizer(layer.id, { linkSourceLayerId: null })))

    })

    this.linkAllPercentile$.pipe(
      takeUntil(this.destroy$),
      withLatestFrom(this.compositeNormalizationLayer$, this.layers$)
    ).subscribe(([v, selectedImageLayer, layers]) => {
      if (!selectedImageLayer) return;

      this.store.dispatch(new UpdateNormalizer(selectedImageLayer.id, { linkSourceLayerId: null }))
      this.store.dispatch(layers.filter(isImageLayer).filter(layer => layer.id != selectedImageLayer.id).map(layer => new UpdateNormalizer(layer.id, { linkSourceLayerId: selectedImageLayer.id, linkMode: 'percentile' })))

    })

    this.linkAllPixelValue$.pipe(
      takeUntil(this.destroy$),
      withLatestFrom(this.compositeNormalizationLayer$, this.layers$)
    ).subscribe(([v, selectedImageLayer, layers]) => {
      if (!selectedImageLayer) return;
      this.store.dispatch(new UpdateNormalizer(selectedImageLayer.id, { linkSourceLayerId: null }))
      this.store.dispatch(layers.filter(isImageLayer).filter(layer => layer.id != selectedImageLayer.id).map(layer => new UpdateNormalizer(layer.id, { linkSourceLayerId: selectedImageLayer.id, linkMode: 'pixel' })))

    })

    this.resetColorBalanceEvent$.pipe(
      takeUntil(this.destroy$),
      withLatestFrom(this.file$, this.layers$)
    ).subscribe(([event, file, layers]) => {
      layers.forEach(layer => {
        if (isImageLayer(layer)) {
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
        layer: { id: string, histogram: ImageHistogram, normalizer: PixelNormalizer }
        bkgMu: number,
        bkgSigma: number,
        bkgPeak: number,
        xSrc: Float32Array,
        ySrc: Float32Array,
        norm: number
      }[] = []

      // fit backgrounds
      layers.forEach(layer => {
        if (!isImageLayer(layer)) return;
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

  onFileNormalizationLayerChange() {

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

  getColorMap(layer: ILayer) {
    if (!isImageLayer(layer)) return null;
    return COLOR_MAPS_BY_NAME[layer.normalizer.colorMapName] || null;
  }





}
