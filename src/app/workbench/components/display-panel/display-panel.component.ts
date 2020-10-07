import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  Input,
  HostBinding
} from "@angular/core";
import { Subject, BehaviorSubject } from "rxjs";
import { auditTime } from "rxjs/operators";

declare let d3: any;

import { appConfig } from "../../../../environments/environment.prod";
import { Router } from "@angular/router";
import { CorrelationIdGenerator } from '../../../utils/correlated-action';
import { Store } from '@ngxs/store';
import { DataFile, ImageHdu } from '../../../data-files/models/data-file';
import { PixelNormalizer } from '../../../data-files/models/pixel-normalizer';
import { UpdateNormalizer, RotateBy, ResetImageTransform, Flip } from '../../../data-files/data-files.actions';
import { StretchMode } from '../../../data-files/models/stretch-mode';
import { DataFilesState } from '../../../data-files/data-files.state';

@Component({
  selector: "app-display-panel",
  templateUrl: "./display-panel.component.html",
  styleUrls: ["./display-panel.component.scss"]
  //changeDetection: ChangeDetectionStrategy.OnPush
})
export class DisplayToolsetComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() hdu: ImageHdu;
  @Input() normalizer: PixelNormalizer;

  @Input("viewportSize")
  set viewportSize(viewportSize: {width: number, height: number}) {
    this.viewportSize$.next(viewportSize);
  }
  get viewportSize() {
    return this.viewportSize$.getValue();
  }
  private viewportSize$ = new BehaviorSubject<{width: number, height: number}>(null);

  levels$: Subject<{ background: number; peak: number }> = new Subject<{
    background: number;
    peak: number;
  }>();
  backgroundPercentile$: Subject<number> = new Subject<number>();
  peakPercentile$: Subject<number> = new Subject<number>();

  upperPercentileDefault = appConfig.upperPercentileDefault;
  lowerPercentileDefault = appConfig.lowerPercentileDefault;

  constructor(private corrGen: CorrelationIdGenerator, private store: Store, private router: Router) {
    this.levels$.pipe(auditTime(25)).subscribe(value => {
      this.store.dispatch(
        new UpdateNormalizer(this.hdu.id, { backgroundPercentile: value.background, peakPercentile: value.peak })
      );
    });

    this.backgroundPercentile$.pipe(auditTime(25)).subscribe(value => {
      this.store.dispatch(
        new UpdateNormalizer(this.hdu.id, { backgroundPercentile: value })
      );
    });

    this.peakPercentile$
      .pipe(auditTime(25))

      .subscribe(value => {
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
    this.store.dispatch(
      new UpdateNormalizer(this.hdu.id, { inverted: value })
    );
  }

  onPresetClick(lowerPercentile: number, upperPercentile: number) {
    this.store.dispatch(
      new UpdateNormalizer(this.hdu.id,
        {
          backgroundPercentile: lowerPercentile,
          peakPercentile: upperPercentile
        }
      )
    );
  }

  onInvertClick() {
    this.store.dispatch(
      new UpdateNormalizer(this.hdu.id,
        {
          backgroundPercentile: this.normalizer.peakPercentile,
          peakPercentile: this.normalizer.backgroundPercentile
        }
      )
    );
  }

  onFlipClick() {
    this.store.dispatch(
      new Flip(this.hdu.transformation, this.hdu.rawImageDataId)
    );
  }

  // onMirrorClick() {
  //   this.store.dispatch([
  //     new RotateBy(this.hdu.id, 90),
  //     new Flip(this.hdu.id)
  //   ]);
  // }

  onRotateClick() {
    this.store.dispatch(
      new RotateBy(this.hdu.transformation, this.hdu.rawImageDataId, this.viewportSize, 90)
    );
  }

  onResetOrientationClick() {
    this.store.dispatch(
      new ResetImageTransform(this.hdu.transformation, this.hdu.rawImageDataId)
    );
  }




  ngOnInit() {
  }

  ngOnDestroy() {
  }

  ngAfterViewInit() { }
}
