import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  Input,
  HostBinding
} from "@angular/core";
import { Subject } from "rxjs";
import { auditTime } from "rxjs/operators";

declare let d3: any;

import { Normalization } from "../../models/normalization";
import { StretchMode } from "../../models/stretch-mode";
import { appConfig } from "../../../../environments/environment.prod";
import { Router } from "@angular/router";
import { CorrelationIdGenerator } from '../../../utils/correlated-action';
import { Store } from '@ngxs/store';
import { UpdateNormalizer, Flip, RotateBy, ResetImageTransform } from '../../workbench-file-states.actions';
import { DataFile, ImageHdu } from '../../../data-files/models/data-file';

@Component({
  selector: "app-display-panel",
  templateUrl: "./display-panel.component.html",
  styleUrls: ["./display-panel.component.scss"]
  //changeDetection: ChangeDetectionStrategy.OnPush
})
export class DisplayToolsetComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() hdu: ImageHdu;
  @Input() normalization: Normalization;

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
          backgroundPercentile: this.normalization.normalizer.peakPercentile,
          peakPercentile: this.normalization.normalizer.backgroundPercentile
        }
      )
    );
  }

  onFlipClick() {
    this.store.dispatch(
      new Flip(this.hdu.id)
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
      new RotateBy(this.hdu.id, 90)
    );
  }

  onResetOrientationClick() {
    this.store.dispatch(
      new ResetImageTransform(this.hdu.id)
    );
  }




  ngOnInit() {
  }

  ngOnDestroy() {
  }

  ngAfterViewInit() { }
}
