import {
  Component,
  OnInit,
  OnChanges,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnDestroy,
} from '@angular/core';
import { getWidth, getHeight, DataFile, ImageHdu, PixelType } from '../../../data-files/models/data-file';
import { Subject, timer, BehaviorSubject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { takeUntil } from 'rxjs/operators';
import { Store } from '@ngxs/store';
import { CloseDataFile, ZoomTo } from '../../../data-files/data-files.actions';
import { getPixel, IImageData } from '../../../data-files/models/image-data';
import { DataFilesState } from '../../../data-files/data-files.state';
import {
  MoveByEvent,
  ZoomByEvent,
  LoadTileEvent,
  ZoomToEvent,
  ZoomToFitEvent,
} from '../pan-zoom-canvas/pan-zoom-canvas.component';
import { Wcs } from '../../../image-tools/wcs';
import { levenbergMarquardt as LM } from 'ml-levenberg-marquardt';
import { Ellipse } from 'src/app/utils/ellipse-fitter';
import { centroidPsf } from '../../models/centroider';

const GAUSSIAN_FITTING_RADIUS = 15;
const GAUSSIAN_FITTING_THETAS = 8;

@Component({
  selector: 'app-image-viewer-status-bar',
  templateUrl: './image-viewer-status-bar.component.html',
  styleUrls: ['./image-viewer-status-bar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageViewerStatusBarComponent implements OnInit, OnChanges, OnDestroy {
  @Input() rawImageData: IImageData<PixelType>;
  @Input() normalizedImageData: IImageData<Uint32Array>;
  @Input() wcs: Wcs;
  @Input() imageMouseX: number;
  @Input() imageMouseY: number;
  @Input('hasFocus')
  set hasFocus(hasFocus: boolean) {
    this.hasFocus$.next(hasFocus);
  }
  get hasFocus() {
    return this.hasFocus$.getValue();
  }
  private hasFocus$ = new BehaviorSubject<boolean>(null);

  @Output() downloadSnapshot = new EventEmitter();
  @Output() exportImageData = new EventEmitter();
  @Output() onSaveFile = new EventEmitter();
  @Output() onCloseFile = new EventEmitter();
  @Output() onMoveBy = new EventEmitter<MoveByEvent>();
  @Output() onZoomBy = new EventEmitter<ZoomByEvent>();
  @Output() onZoomTo = new EventEmitter<ZoomToEvent>();
  @Output() onZoomToFit = new EventEmitter<ZoomToFitEvent>();
  @Output() onLoadTile = new EventEmitter<LoadTileEvent>();

  pixelScale: number = null;
  raHours: number;
  decDegs: number;
  pixelValue: number;
  gaussian: {
    background: number;
    peak: number;
    fwhmX: number;
    fwhmY: number;
  };
  colorValue: { red: number; green: number; blue: number; alpha: number };

  private zoomStepFactor: number = 0.75;
  private startZoomIn$ = new Subject<boolean>();
  private stopZoomIn$ = new Subject<boolean>();

  private startZoomOut$ = new Subject<boolean>();
  private stopZoomOut$ = new Subject<boolean>();

  constructor(private store: Store, private dialog: MatDialog) { }

  ngOnDestroy() { }

  ngOnInit() { }

  ngOnChanges() {
    if (this.imageMouseX == null || this.imageMouseY == null) {
      this.pixelValue = null;
      this.colorValue = null;
      this.raHours = null;
      this.decDegs = null;
      this.gaussian = null;
      return;
    }
    this.gaussian = null;
    if (this.rawImageData) {
      this.pixelValue = getPixel(this.rawImageData, this.imageMouseX, this.imageMouseY);
      // this.gaussian = this.fitGaussian(this.rawImageData, this.imageMouseX, this.imageMouseY);
      this.updateFwhm(this.rawImageData, this.imageMouseX, this.imageMouseY)

    }
    if (this.normalizedImageData) {
      let c = getPixel(this.normalizedImageData, this.imageMouseX, this.imageMouseY);
      this.colorValue = c
        ? { red: c & 0xff, green: (c >> 8) & 0xff, blue: (c >> 16) & 0xff, alpha: (c >> 24) & 0xff }
        : null;
    }
    if (this.wcs && this.wcs.isValid()) {
      let raDec = this.wcs.pixToWorld([this.imageMouseX, this.imageMouseY]);
      this.raHours = raDec[0];
      this.decDegs = raDec[1];
      this.pixelScale = this.wcs.getPixelScale() * 60 * 60;
    } else {
      this.raHours = null;
      this.decDegs = null;
      this.pixelScale = null;
    }
  }

  updateFwhm(imageData: IImageData<PixelType>, cx: number, cy: number) {
    let gaussianFn = ([b, p, c, w]: [number, number, number, number]) => {
      return (t) => b + p * Math.exp(-0.5 * Math.pow((t - c) / w, 2))
    }

    let centroidedXY = centroidPsf(imageData, cx, cy)
    cx = centroidedXY.x;
    cy = centroidedXY.y;

    cx = Math.min(imageData.width - GAUSSIAN_FITTING_RADIUS, Math.max(GAUSSIAN_FITTING_RADIUS, cx))
    cy = Math.min(imageData.height - GAUSSIAN_FITTING_RADIUS, Math.max(GAUSSIAN_FITTING_RADIUS, cy))

    let ts: number[] = [];
    let vxs: number[] = [];
    let vys: number[] = [];

    for (let r = -GAUSSIAN_FITTING_RADIUS; r <= GAUSSIAN_FITTING_RADIUS; r++) {
      let x = cx + r;
      let y = cy + r;
      let vx = getPixel(imageData, x, cy, false);
      let vy = getPixel(imageData, cx, y, false);
      ts.push(r)
      vxs.push(vx)
      vys.push(vy);
    }

    let fitGaussian = (ts, vs) => {
      let minValue = Math.min(...vs);
      let maxValue = Math.max(...vs);
      let initialValues = [minValue, maxValue, 0, 1];
      const options = {
        damping: 1.5,
        initialValues: initialValues,
        minValues: [minValue, minValue, -GAUSSIAN_FITTING_RADIUS, 0],
        maxValues: [maxValue, maxValue, GAUSSIAN_FITTING_RADIUS / 2, Number.MAX_VALUE],
        gradientDifference: 10e-2,
        maxIterations: 100,
        errorTolerance: 10e-3,
      };

      return LM({ x: ts, y: vs }, gaussianFn, options)
    }

    let xFit = fitGaussian(ts, vxs);
    let yFit = fitGaussian(ts, vys);
    // ts.forEach((t, i) => {
    //   console.log(`${t}, ${vxs[i]}, ${vys[i]}`)
    // })
    // console.log(xFit.parameterValues[3])
    // console.log(yFit.parameterValues[3])
    // console.log('--------------------')

    this.gaussian = {
      fwhmX: 2.35482 * xFit.parameterValues[3],
      fwhmY: 2.35482 * yFit.parameterValues[3],
      peak: null,
      background: null,
    }

    // console.log(xFit.parameterValues[3], 2.35482 * xFit.parameterValues[3])
    // console.log(yFit.parameterValues[3], 2.35482 * yFit.parameterValues[3])




  }



  // fitGaussian<T>(imageData: IImageData<T>, cx: number, cy: number) {


  //   cx = Math.min(imageData.width - GAUSSIAN_FITTING_RADIUS, Math.max(GAUSSIAN_FITTING_RADIUS, cx))
  //   cy = Math.min(imageData.height - GAUSSIAN_FITTING_RADIUS, Math.max(GAUSSIAN_FITTING_RADIUS, cy))

  //   let gaussians: { background: number, peak: number, fwhm: number, center: number }[] = []
  //   let fwhmEllipsePoints: { x: number, y: number }[] = [];
  //   let backgrounds: number[] = [];
  //   let peaks: number[] = [];
  //   for (let i = 0; i < GAUSSIAN_FITTING_THETAS; i++) {
  //     let theta = Math.PI * i / GAUSSIAN_FITTING_THETAS;
  //     let ts: number[] = [];
  //     let vs: number[] = [];
  //     for (let r = -GAUSSIAN_FITTING_RADIUS; r <= GAUSSIAN_FITTING_RADIUS; r++) {
  //       let x = cx + r * Math.sin(theta)
  //       let y = cy + r * Math.cos(theta)
  //       let v = getPixel(imageData, x, y, false)
  //       ts.push(r)
  //       vs.push(v)
  //     }

  //     let minValue = Math.min(...vs);
  //     let maxValue = Math.max(...vs);
  //     let initialValues = [minValue, maxValue, 0, 1];
  //     const options = {
  //       damping: 1.5,
  //       initialValues: initialValues,
  //       minValues: [minValue, minValue, -GAUSSIAN_FITTING_RADIUS, 0],
  //       maxValues: [maxValue, maxValue, GAUSSIAN_FITTING_RADIUS / 2, Number.MAX_VALUE],
  //       gradientDifference: 10e-2,
  //       maxIterations: 100,
  //       errorTolerance: 10e-3,
  //     };

  //     let fit = LM({ x: ts, y: vs }, gaussianFn, options)
  //     let gaussian = { background: fit.parameterValues[0], peak: fit.parameterValues[1], center: fit.parameterValues[2], fwhm: fit.parameterValues[3] }
  //     let ellipseX = gaussian.fwhm * Math.sin(theta);
  //     let ellipseY = gaussian.fwhm * Math.cos(theta);
  //     fwhmEllipsePoints.push({ x: ellipseX, y: ellipseY })
  //     backgrounds.push(gaussian.background)
  //     peaks.push(gaussian.peak)
  //     gaussians.push(gaussian)
  //   }
  //   let ellipse = new Ellipse()
  //   ellipse.setFromPoints(fwhmEllipsePoints)
  //   let semi = ellipse.semi;
  //   let peak = peaks.sort()[GAUSSIAN_FITTING_THETAS / 2]
  //   let background = backgrounds.sort()[GAUSSIAN_FITTING_THETAS / 2]
  //   return {
  //     fwhmX: gaussians[0].fwhm,
  //     fwhmY: gaussians[GAUSSIAN_FITTING_THETAS / 2].fwhm,
  //     A: semi[0],
  //     B: semi[1],
  //     theta: ellipse.angle,
  //     background: background,
  //     peak: peak
  //   };
  // }

  onDownloadSnapshotClick() {
    this.downloadSnapshot.emit();
  }

  onCloseFileClick() {
    this.onCloseFile.emit();
  }

  onSaveFileClick() {
    this.onSaveFile.emit();
  }

  public startZoomIn() {
    timer(0, 125)
      .pipe(takeUntil(this.stopZoomIn$))
      .subscribe((t) => {
        this.zoomIn();
      });
  }

  public stopZoomIn() {
    this.stopZoomIn$.next(true);
  }

  public startZoomOut() {
    timer(0, 125)
      .pipe(takeUntil(this.stopZoomOut$))
      .subscribe((t) => {
        this.zoomOut();
      });
  }

  public stopZoomOut() {
    this.stopZoomOut$.next(true);
  }

  public zoomIn(imageAnchor: { x: number; y: number } = null) {
    this.onZoomBy.emit({ factor: 1.0 / this.zoomStepFactor, anchor: imageAnchor });
    // this.zoomBy(1.0 / this.zoomStepFactor, imageAnchor);
  }

  public zoomOut(imageAnchor: { x: number; y: number } = null) {
    this.onZoomBy.emit({ factor: this.zoomStepFactor, anchor: imageAnchor });
    // this.zoomBy(this.zoomStepFactor, imageAnchor);
  }

  public zoomTo(value: number) {
    this.onZoomTo.emit({ factor: value, anchor: null });
    // this.store.dispatch(new ZoomTo(
    //   this.hdu.transformation,
    //   this.hdu.rawImageDataId,
    //   value,
    //   null
    // ));
  }

  public zoomBy(factor: number, imageAnchor: { x: number; y: number } = null) {
    this.onZoomBy.emit({ factor: factor, anchor: imageAnchor });
    // this.store.dispatch(new ZoomBy(
    //   this.hdu.id,
    //   factor,
    //   imageAnchor
    // ));
  }

  public zoomToFit(padding: number = 0) {
    this.onZoomToFit.emit({});
    // this.store.dispatch(new CenterRegionInViewport(
    //   this.hdu.id,
    //   { x: 1, y: 1, width: getWidth(this.hdu), height: getHeight(this.hdu) }
    // ))
  }
}
