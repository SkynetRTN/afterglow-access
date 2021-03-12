import {
  Component,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  OnInit,
  HostBinding,
  Input,
  SimpleChanges,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';

import {
  Observable,
  Subscription,
  Subject,
  BehaviorSubject,
  combineLatest,
  of,
} from 'rxjs';
import {
  map,
  withLatestFrom,
  switchMap,
  distinctUntilChanged,
} from 'rxjs/operators';
import {
  getDegsPerPixel,
  DataFile,
  ImageHdu,
  PixelType,
  Header,
} from '../../../data-files/models/data-file';
import { PlottingPanelState } from '../../models/plotter-file-state';
import { PlotterComponent } from '../plotter/plotter.component';
import { PlottingPanelConfig } from '../../models/workbench-state';
import { PosType } from '../../models/source';
import { Router } from '@angular/router';
import { MarkerMouseEvent } from '../image-viewer-marker-overlay/image-viewer-marker-overlay.component';
import { Store, Actions } from '@ngxs/store';
import { IImageData } from '../../../data-files/models/image-data';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { DataFilesState } from '../../../data-files/data-files.state';

@Component({
  selector: 'app-plotting-panel',
  templateUrl: './plotting-panel.component.html',
  styleUrls: ['./plotting-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlottingPanelComponent
  implements OnInit, AfterViewInit, OnDestroy {
  @Input('file')
  set file(file: DataFile) {
    this.file$.next(file);
  }
  get file() {
    return this.file$.getValue();
  }
  private file$ = new BehaviorSubject<DataFile>(null);

  @Input('hdu')
  set hdu(hdu: ImageHdu) {
    this.hdu$.next(hdu);
  }
  get hdu() {
    return this.hdu$.getValue();
  }
  private hdu$ = new BehaviorSubject<ImageHdu>(null);

  @Input('state')
  set state(state: PlottingPanelState) {
    this.state$.next(state);
  }
  get state() {
    return this.state$.getValue();
  }
  private state$ = new BehaviorSubject<PlottingPanelState>(null);

  @Input() config: PlottingPanelConfig;
  @Input() colorMode: 'grayscale' | 'rgba';

  @Output() configChange: EventEmitter<
    Partial<PlottingPanelConfig>
  > = new EventEmitter();

  PosType = PosType;
  @HostBinding('class') @Input('class') classList: string =
    'fx-workbench-outlet';
  @ViewChild('plotter') plotter: PlotterComponent;

  header$: Observable<Header>;
  rawImageData$: Observable<IImageData<PixelType>>;
  normalizedImageData$: Observable<IImageData<Uint32Array>>;
  imageData$: Observable<IImageData<PixelType>>

  lineStart$: Observable<{
    x: number;
    y: number;
    raHours: number;
    decDegs: number;
  }>;
  lineEnd$: Observable<{
    x: number;
    y: number;
    raHours: number;
    decDegs: number;
  }>;
  vectorInfo$: Observable<{
    pixelSeparation: number;
    pixelPosAngle: number;
    skySeparation: number;
    skyPosAngle: number;
  }>;

  constructor(private actions$: Actions, private store: Store, router: Router) {
    let headerId$ = combineLatest(this.file$, this.hdu$).pipe(
      switchMap(([file, hdu]) => {
        if (hdu) {
          return of(hdu.headerId)
        } else if (file) {
          return this.store
            .select(DataFilesState.getFirstImageHduHeaderIdByFileId)
            .pipe(map((fn) => fn(file.id)));
        }
        return of(null);
      })
    );

    this.header$ = headerId$.pipe(
      distinctUntilChanged(),
      switchMap(headerId => this.store.select(DataFilesState.getHeaderById).pipe(
        map(fn => fn(headerId))
      ))
    )

    this.rawImageData$ = combineLatest(this.file$, this.hdu$).pipe(
      map(([file, hdu]) => hdu?.rawImageDataId || null),
      distinctUntilChanged(),
      switchMap((id) =>
        this.store
          .select(DataFilesState.getImageDataById)
          .pipe(map((fn) => fn(id)))
      )
    );

    this.normalizedImageData$ = combineLatest(this.file$, this.hdu$).pipe(
      map(([file, hdu]) => hdu ? hdu.imageDataId : file?.imageDataId),
      distinctUntilChanged(),
      switchMap((id) =>
        this.store
          .select(DataFilesState.getImageDataById)
          .pipe(map((fn) => fn(id) as IImageData<Uint32Array>))
      )
    );

    //TODO allow user to switch between raw and normalized values when both are available
    this.imageData$ = combineLatest(this.rawImageData$, this.normalizedImageData$).pipe(
      map(([rawImageData, normalizedImageData]) => {
        this.colorMode = rawImageData ? 'grayscale' : 'rgba';
        return rawImageData || normalizedImageData;
      }),
    )

    this.lineStart$ = combineLatest(this.header$, this.state$).pipe(
      map(([header, state]) => {
        if (!state || !state.lineMeasureStart || !header) return null;
        return this.normalizeLine(header, state.lineMeasureStart);
      })
    );

    this.lineEnd$ = combineLatest(this.header$, this.state$).pipe(
      map(([header, state]) => {
        if (!state || !state.lineMeasureEnd || !header) return null;

        return this.normalizeLine(header, state.lineMeasureEnd);
      })
    );

    this.vectorInfo$ = combineLatest(this.lineStart$, this.lineEnd$, this.header$).pipe(
      map(([lineStart, lineEnd, header]) => {
        let pixelSeparation = null;
        let skySeparation = null;
        let pixelPosAngle = null;
        let skyPosAngle = null;

        if (!lineStart || !lineEnd) return null;

        if (
          lineStart.x !== null &&
          lineStart.y !== null &&
          lineEnd.x !== null &&
          lineEnd.y !== null
        ) {
          let deltaX = lineEnd.x - lineStart.x;
          let deltaY = lineEnd.y - lineStart.y;
          pixelPosAngle = (Math.atan2(deltaY, -deltaX) * 180.0) / Math.PI - 90;
          pixelPosAngle = pixelPosAngle % 360;
          if (pixelPosAngle < 0) pixelPosAngle += 360;
          pixelSeparation = Math.sqrt(
            Math.pow(deltaX, 2) + Math.pow(deltaY, 2)
          );

          // if (getDegsPerPixel(this.hdu) != undefined) {
          //   skySeparation =
          //     pixelSeparation * getDegsPerPixel(this.hdu) * 3600;
          // }
          if (header) {
            let degsPerPixel =
              header.wcs && header.wcs.isValid()
                ? header.wcs.getPixelScale()
                : getDegsPerPixel(header);
            if (degsPerPixel) {
              skySeparation = pixelSeparation * degsPerPixel * 3600;
            }
          }
        }

        if (
          lineStart.raHours !== null &&
          lineStart.decDegs !== null &&
          lineEnd.raHours !== null &&
          lineEnd.decDegs !== null
        ) {
          let centerDec = (lineStart.decDegs + lineEnd.decDegs) / 2;
          let deltaRa =
            (lineEnd.raHours - lineStart.raHours) *
            15 *
            3600 *
            Math.cos((centerDec * Math.PI) / 180);
          let deltaDec = (lineEnd.decDegs - lineStart.decDegs) * 3600;
          skyPosAngle = (Math.atan2(deltaDec, -deltaRa) * 180.0) / Math.PI - 90;
          skyPosAngle = skyPosAngle % 360;
          if (skyPosAngle < 0) skyPosAngle += 360;
          skySeparation = Math.sqrt(
            Math.pow(deltaRa, 2) + Math.pow(deltaDec, 2)
          );
        }

        return {
          pixelSeparation: pixelSeparation,
          skySeparation: skySeparation,
          pixelPosAngle: pixelPosAngle,
          skyPosAngle: skyPosAngle,
        };
      })
    );
  }

  private normalizeLine(
    header: Header,
    line: { primaryCoord: number; secondaryCoord: number; posType: PosType }
  ) {
    let x = null;
    let y = null;
    let raHours = null;
    let decDegs = null;
    if (line.posType == PosType.PIXEL) {
      x = line.primaryCoord;
      y = line.secondaryCoord;
      if (header.wcs && header.wcs.isValid()) {
        let raDec = header.wcs.pixToWorld([
          line.primaryCoord,
          line.secondaryCoord,
        ]);
        raHours = raDec[0];
        decDegs = raDec[1];
      }
    } else {
      raHours = line.primaryCoord;
      decDegs = line.secondaryCoord;
      if (header.wcs && header.wcs.isValid()) {
        let xy = header.wcs.worldToPix([
          line.primaryCoord,
          line.secondaryCoord,
        ]);
        x = xy[0];
        y = xy[1];
      }
    }
    return { x: x, y: y, raHours: raHours, decDegs: decDegs };
  }

  ngOnInit() {}

  ngAfterViewInit() {}

  ngOnChanges(changes: SimpleChanges): void {}

  ngOnDestroy() {}

  onModeChange(mode: '1D' | '2D' | '3D') {
    this.configChange.emit({ plotMode: mode });
  }

  onPlotterSyncEnabledChange($event: MatCheckboxChange) {
    this.configChange.emit({ plotterSyncEnabled: $event.checked });
  }

  onCentroidClicksChange($event: MatCheckboxChange) {
    this.configChange.emit({ centroidClicks: $event.checked });
  }

  onPlanetCentroidingChange($event: MatCheckboxChange) {
    this.configChange.emit({ planetCentroiding: $event.checked });
  }

  onInterpolatePixelsChange($event: MatCheckboxChange) {
    this.configChange.emit({ interpolatePixels: $event.checked });
  }
}
