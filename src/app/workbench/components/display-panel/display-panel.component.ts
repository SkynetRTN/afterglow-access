import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  Input,
  HostBinding,
  Output,
  EventEmitter
} from "@angular/core";
import { Subject, BehaviorSubject, Observable, combineLatest } from "rxjs";
import { auditTime, map, tap } from "rxjs/operators";

declare let d3: any;

import { appConfig } from "../../../../environments/environment.prod";
import { Router } from "@angular/router";
import { CorrelationIdGenerator } from '../../../utils/correlated-action';
import { Store } from '@ngxs/store';
import { DataFile, ImageHdu, IHdu } from '../../../data-files/models/data-file';
import { PixelNormalizer } from '../../../data-files/models/pixel-normalizer';
import { UpdateNormalizer, RotateBy, ResetImageTransform, Flip } from '../../../data-files/data-files.actions';
import { StretchMode } from '../../../data-files/models/stretch-mode';
import { DataFilesState } from '../../../data-files/data-files.state';
import { HduType } from '../../../data-files/models/data-file-type';
import { MatSelectChange } from '@angular/material/select';

@Component({
  selector: "app-display-panel",
  templateUrl: "./display-panel.component.html",
  styleUrls: ["./display-panel.component.scss"]
  //changeDetection: ChangeDetectionStrategy.OnPush
})
export class DisplayToolsetComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input("hdu")
  set hdu(hdu: IHdu) {
    this.hdu$.next(hdu);
  }
  get hdu() {
    return this.hdu$.getValue();
  }
  private hdu$ = new BehaviorSubject<IHdu>(null);

  @Input("viewportSize")
  set viewportSize(viewportSize: {width: number, height: number}) {
    this.viewportSize$.next(viewportSize);
  }
  get viewportSize() {
    return this.viewportSize$.getValue();
  }
  private viewportSize$ = new BehaviorSubject<{width: number, height: number}>(null);

  imageHdu$: Observable<ImageHdu>;
  imageHdu: ImageHdu;

  levels$: Subject<{ background: number; peak: number }> = new Subject<{
    background: number;
    peak: number;
  }>();
  backgroundPercentile$: Subject<number> = new Subject<number>();
  peakPercentile$: Subject<number> = new Subject<number>();

  upperPercentileDefault = appConfig.upperPercentileDefault;
  lowerPercentileDefault = appConfig.lowerPercentileDefault;

  constructor(private corrGen: CorrelationIdGenerator, private store: Store, private router: Router) {


    this.imageHdu$ = this.hdu$.pipe(
      map(hdu => hdu && hdu.hduType == HduType.IMAGE ? hdu as ImageHdu : null),
      tap(hdu => this.imageHdu = hdu)
    )

    
    this.levels$.pipe(auditTime(25)).subscribe(value => {
      this.store.dispatch(
        new UpdateNormalizer(this.imageHdu.id, { backgroundPercentile: value.background, peakPercentile: value.peak })
      );
    });

    this.backgroundPercentile$.pipe(auditTime(25)).subscribe(value => {
      this.store.dispatch(
        new UpdateNormalizer(this.imageHdu.id, { backgroundPercentile: value })
      );
    });

    this.peakPercentile$
      .pipe(auditTime(25))

      .subscribe(value => {
        this.store.dispatch(
          new UpdateNormalizer(this.imageHdu.id, { peakPercentile: value })
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
      new UpdateNormalizer(this.imageHdu.id, { colorMapName: value })
    );
  }

  onStretchModeChange(value: StretchMode) {
    this.store.dispatch(
      new UpdateNormalizer(this.imageHdu.id, { stretchMode: value })
    );
  }

  onInvertedChange(value: boolean) {
    this.store.dispatch(
      new UpdateNormalizer(this.imageHdu.id, { inverted: value })
    );
  }

  onPresetClick(lowerPercentile: number, upperPercentile: number) {
    this.store.dispatch(
      new UpdateNormalizer(this.imageHdu.id,
        {
          backgroundPercentile: lowerPercentile,
          peakPercentile: upperPercentile
        }
      )
    );
  }

  onInvertClick() {
    this.store.dispatch(
      new UpdateNormalizer(this.imageHdu.id,
        {
          backgroundPercentile: this.imageHdu.normalizer.peakPercentile,
          peakPercentile: this.imageHdu.normalizer.backgroundPercentile
        }
      )
    );
  }

  onFlipClick() {
    this.store.dispatch(
      new Flip(this.imageHdu.transformation, this.imageHdu.rawImageDataId)
    );
  }

  // onMirrorClick() {
  //   this.store.dispatch([
  //     new RotateBy(this.imageHdu.id, 90),
  //     new Flip(this.imageHdu.id)
  //   ]);
  // }

  onRotateClick() {
    this.store.dispatch(
      new RotateBy(this.imageHdu.transformation, this.imageHdu.rawImageDataId, this.viewportSize, 90)
    );
  }

  onResetOrientationClick() {
    this.store.dispatch(
      new ResetImageTransform(this.imageHdu.transformation, this.imageHdu.rawImageDataId)
    );
  }




  ngOnInit() {
  }

  ngOnDestroy() {
  }

  ngAfterViewInit() { }
}
