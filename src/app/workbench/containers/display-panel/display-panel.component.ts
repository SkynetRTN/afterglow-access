import { Component, OnInit, OnDestroy, AfterViewInit, Input, ChangeDetectionStrategy } from '@angular/core';
import { Subject, BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import {
  auditTime,
  map,
  tap,
  switchMap,
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
} from '../../../data-files/models/data-file';
import {
  UpdateNormalizer,
  RotateBy,
  ResetImageTransform,
  Flip,
  UpdateBlendMode,
  UpdateAlpha,
  ResetViewportTransform,
} from '../../../data-files/data-files.actions';
import { StretchMode } from '../../../data-files/models/stretch-mode';
import { HduType } from '../../../data-files/models/data-file-type';
import { Transform } from '../../../data-files/models/transformation';
import { IImageData } from '../../../data-files/models/image-data';
import { WorkbenchState } from '../../workbench.state';
import { DataFilesState } from '../../../data-files/data-files.state';
import { BlendMode } from '../../../data-files/models/blend-mode';
import { AfterglowConfigService } from '../../../afterglow-config.service';
import { ImageViewerEventService } from '../../services/image-viewer-event.service';
import { MatDialog } from '@angular/material/dialog';
import { PsfMatchingDialogComponent } from '../../components/psf-matching-dialog/psf-matching-dialog.component';
import { FormControl } from '@angular/forms';

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
  activeHdu$: Observable<IHdu>;
  activeImageHdu$: Observable<ImageHdu>;
  activeTableHdu$: Observable<TableHdu>;

  destroy$ = new Subject<boolean>();
  colorFormControl = new FormControl('#FFFFFF');
  color = '#FFFFFF';

  levels$: Subject<{ background: number; peak: number }> = new Subject<{
    background: number;
    peak: number;
  }>();
  backgroundPercentile$: Subject<number> = new Subject<number>();
  peakPercentile$: Subject<number> = new Subject<number>();

  upperPercentileDefault: number;
  lowerPercentileDefault: number;

  constructor(private store: Store, private afterglowConfig: AfterglowConfigService, private dialog: MatDialog) {
    this.viewportSize$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getViewportSizeByViewerId(viewerId)))
    );

    this.file$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getFileByViewerId(viewerId)))
    );

    this.hdus$ = this.file$.pipe(
      switchMap((file) => this.store.select(DataFilesState.getHdusByFileId(file.id)))
    )

    this.activeHdu$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getHduByViewerId(viewerId)))
    );

    this.activeImageHdu$ = this.activeHdu$.pipe(map((hdu) => (hdu && hdu.type == HduType.IMAGE ? (hdu as ImageHdu) : null)));

    this.activeTableHdu$ = this.activeHdu$.pipe(map((hdu) => (hdu && hdu.type == HduType.TABLE ? (hdu as TableHdu) : null)));

    this.upperPercentileDefault = this.afterglowConfig.saturationDefault;
    this.lowerPercentileDefault = this.afterglowConfig.backgroundDefault;

    this.backgroundPercentile$.pipe(auditTime(25), withLatestFrom(this.activeImageHdu$)).subscribe(([value, imageHdu]) => {
      this.store.dispatch(new UpdateNormalizer(imageHdu.id, { backgroundPercentile: value }));
    });

    this.peakPercentile$.pipe(auditTime(25), withLatestFrom(this.activeImageHdu$)).subscribe(([value, imageHdu]) => {
      this.store.dispatch(new UpdateNormalizer(imageHdu.id, { peakPercentile: value }));
    });
  }

  onBackgroundPercentileChange(value: number) {
    this.backgroundPercentile$.next(value);
  }

  onPeakPercentileChange(value: number) {
    this.peakPercentile$.next(value);
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

  onPresetClick(hdu: ImageHdu, lowerPercentile: number, upperPercentile: number) {
    this.store.dispatch(
      new UpdateNormalizer(hdu.id, {
        backgroundPercentile: lowerPercentile,
        peakPercentile: upperPercentile,
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
}
