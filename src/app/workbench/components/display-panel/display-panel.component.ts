import { Component, OnInit, OnDestroy, AfterViewInit, Input } from "@angular/core";
import { Subject, BehaviorSubject, Observable, combineLatest } from "rxjs";
import { auditTime, map, tap } from "rxjs/operators";

declare let d3: any;

import { appConfig } from "../../../../environments/environment.prod";
import { Router } from "@angular/router";
import { CorrelationIdGenerator } from "../../../utils/correlated-action";
import { Store } from "@ngxs/store";
import { DataFile, ImageHdu, IHdu, PixelType } from "../../../data-files/models/data-file";
import { UpdateNormalizer, RotateBy, ResetImageTransform, Flip } from "../../../data-files/data-files.actions";
import { StretchMode } from "../../../data-files/models/stretch-mode";
import { HduType } from "../../../data-files/models/data-file-type";
import { Transform } from "../../../data-files/models/transformation";
import { IImageData } from "../../../data-files/models/image-data";

@Component({
  selector: "app-display-panel",
  templateUrl: "./display-panel.component.html",
  styleUrls: ["./display-panel.component.scss"],
  //changeDetection: ChangeDetectionStrategy.OnPush
})
export class DisplayToolsetComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input("file")
  set file(file: DataFile) {
    this.file$.next(file);
  }
  get file() {
    return this.file$.getValue();
  }
  private file$ = new BehaviorSubject<DataFile>(null);

  @Input("hdu")
  set hdu(hdu: ImageHdu) {
    this.hdu$.next(hdu);
  }
  get hdu() {
    return this.hdu$.getValue();
  }
  private hdu$ = new BehaviorSubject<ImageHdu>(null);

  @Input("viewportTransform")
  set viewportTransform(viewportTransform: Transform) {
    this.viewportTransform$.next(viewportTransform);
  }
  get viewportTransform() {
    return this.viewportTransform$.getValue();
  }
  private viewportTransform$ = new BehaviorSubject<Transform>(null);

  @Input("imageTransform")
  set imageTransform(imageTransform: Transform) {
    this.imageTransform$.next(imageTransform);
  }
  get imageTransform() {
    return this.imageTransform$.getValue();
  }
  private imageTransform$ = new BehaviorSubject<Transform>(null);

  @Input("imageData")
  set imageData(imageData: IImageData<PixelType>) {
    this.imageData$.next(imageData);
  }
  get imageData() {
    return this.imageData$.getValue();
  }
  private imageData$ = new BehaviorSubject<IImageData<PixelType>>(null);

  @Input("viewportSize")
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

  upperPercentileDefault = appConfig.upperPercentileDefault;
  lowerPercentileDefault = appConfig.lowerPercentileDefault;

  constructor(private corrGen: CorrelationIdGenerator, private store: Store, private router: Router) {
    this.levels$.pipe(auditTime(25)).subscribe((value) => {
      this.store.dispatch(
        new UpdateNormalizer(this.hdu.id, { backgroundPercentile: value.background, peakPercentile: value.peak })
      );
    });

    this.backgroundPercentile$.pipe(auditTime(25)).subscribe((value) => {
      this.store.dispatch(new UpdateNormalizer(this.hdu.id, { backgroundPercentile: value }));
    });

    this.peakPercentile$
      .pipe(auditTime(25))

      .subscribe((value) => {
        this.store.dispatch(new UpdateNormalizer(this.hdu.id, { peakPercentile: value }));
      });
  }

  onBackgroundPercentileChange(value: number) {
    this.backgroundPercentile$.next(value);
  }

  onPeakPercentileChange(value: number) {
    this.peakPercentile$.next(value);
  }

  onColorMapChange(value: string) {
    this.store.dispatch(new UpdateNormalizer(this.hdu.id, { colorMapName: value }));
  }

  onStretchModeChange(value: StretchMode) {
    this.store.dispatch(new UpdateNormalizer(this.hdu.id, { stretchMode: value }));
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
    this.store.dispatch(new Flip(this.imageData.id, this.imageTransform.id, this.viewportTransform.id));
  }

  // onMirrorClick() {
  //   this.store.dispatch([
  //     new RotateBy(this.hdu.id, 90),
  //     new Flip(this.hdu.id)
  //   ]);
  // }

  onRotateClick() {
    this.store.dispatch(
      new RotateBy(this.imageData.id, this.imageTransform.id, this.viewportTransform.id, this.viewportSize, 90)
    );
  }

  onResetOrientationClick() {
    this.store.dispatch(new ResetImageTransform(this.imageData.id, this.imageTransform.id, this.viewportTransform.id));
  }

  ngOnInit() {}

  ngOnDestroy() {}

  ngAfterViewInit() {}
}
