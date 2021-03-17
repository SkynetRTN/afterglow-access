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
  takeUntil,
  tap,
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
import { ToolPanelBaseComponent } from '../tool-panel-base/tool-panel-base.component';
import { WorkbenchState } from '../../workbench.state';
import { HduType } from '../../../data-files/models/data-file-type';
import { WorkbenchImageHduState } from '../../models/workbench-file-state';
import { centroidDisk, centroidPsf } from '../../models/centroider';
import { StartLine, UpdateLine, UpdatePlottingPanelConfig } from '../../workbench.actions';

@Component({
  selector: 'app-plotting-panel',
  templateUrl: './plotting-panel.component.html',
  styleUrls: ['./plotting-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlottingPanelComponent extends ToolPanelBaseComponent
  implements OnInit, AfterViewInit, OnDestroy {

  state$: Observable<PlottingPanelState>;
  config$: Observable<PlottingPanelConfig>;
  dataSource$: Observable<'raw' | 'normalized'>;
  colorMode$: Observable<'grayscale' | 'rgba'>;
  imageData$: Observable<IImageData<PixelType>>
  @ViewChild('plotter') plotter: PlotterComponent;
  PosType = PosType;

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

  constructor(store: Store) {
    super(store);

    this.config$ = this.store.select(WorkbenchState.getPlottingPanelConfig);

    this.state$ = combineLatest(this.fileState$, this.hduState$).pipe(
      map(([fileState, hduState]) => {
        if (hduState && hduState.hduType != HduType.IMAGE) {
          // only image HDUs support plotting
          return null;
        }
        return (hduState as WorkbenchImageHduState)?.plottingPanelStateId || fileState?.plottingPanelStateId
      }),
      distinctUntilChanged(),
      switchMap(id => this.store.select(WorkbenchState.getPlottingPanelStateById).pipe(
        map(fn => fn(id))
      ))
    )



    this.dataSource$ = combineLatest(this.rawImageData$, this.normalizedImageData$, this.config$).pipe(
      map(([rawImageData, normalizedImageData, config]) => {
        //TODO allow user to switch between raw and normalized values when both are available
        return rawImageData ? 'raw' : 'normalized'
      }),
    )

    this.colorMode$ = this.dataSource$.pipe(
      map(dataSource => dataSource == 'raw' ? 'grayscale' : 'rgba')
    )

    this.imageData$ = combineLatest(this.rawImageData$, this.normalizedImageData$, this.dataSource$).pipe(
      map(([rawImageData, normalizedImageData, dataSource]) => {
        return dataSource == 'raw' ? rawImageData : normalizedImageData
      }),
    )

    this.lineStart$ = combineLatest(this.header$, this.state$).pipe(
      map(([header, state]) => {
        if (!state || !state.lineMeasureStart) return null;
        return this.normalizeLine(header, state.lineMeasureStart);
      })
    );

    this.lineEnd$ = combineLatest(this.header$, this.state$).pipe(
      map(([header, state]) => {
        if (!state || !state.lineMeasureEnd) return null;

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

    let imageData$ = combineLatest(this.rawImageData$, this.normalizedImageData$).pipe(
      map(([rawImageData, normalizedImageData]) => {
        return rawImageData || normalizedImageData
      }),
    )

    this.imageClickEvent$.pipe(
      takeUntil(this.destroy$),
      withLatestFrom(this.state$, this.config$, this.header$, imageData$)
    ).subscribe(([$event, state, config, header, imageData]) => {
      if (!$event || !imageData) {
        return;
      }

      if($event.viewerId != this.viewer?.id) return;

      if ($event.hitImage) {
        let x = $event.imageX;
        let y = $event.imageY;
        if (config && config.centroidClicks) {
          let result;
          if (config.planetCentroiding) {
            result = centroidDisk(imageData, x, y);
          } else {
            result = centroidPsf(imageData, x, y);
          }

          x = result.x;
          y = result.y;
        }

        let primaryCoord = x;
        let secondaryCoord = y;
        let posType = PosType.PIXEL;
        if (header?.wcs?.isValid()) {
          let wcs = header.wcs;
          let raDec = wcs.pixToWorld([primaryCoord, secondaryCoord]);
          primaryCoord = raDec[0];
          secondaryCoord = raDec[1];
          posType = PosType.SKY;
        }

        this.store.dispatch(
          new StartLine(state.id, {
            primaryCoord: primaryCoord,
            secondaryCoord: secondaryCoord,
            posType: posType,
          })
        );
      }

    })

    this.imageMouseMoveEvent$.pipe(
      takeUntil(this.destroy$),
      withLatestFrom(this.config$)
    ).subscribe(([$event, config]) => {
      if (!$event) {
        return;
      }

      //allow events from different viewers
      let header = null;
      let stateId = this.store.selectSnapshot(WorkbenchState.getPlottingPanelStateIdFromViewerId)($event.viewerId);
      let state = this.store.selectSnapshot(WorkbenchState.getPlottingPanelStateById)(stateId);
      if(!state) {
        return;
      }
      if($event.viewer.hduId) {
        header = this.store.selectSnapshot(DataFilesState.getHeaderByHduId)($event.viewer.hduId);
      }

      let measuring = state.measuring;
      if (measuring) {
        let primaryCoord = $event.imageX;
        let secondaryCoord = $event.imageY;
        let posType = PosType.PIXEL;
        if (header?.wcs?.isValid()) {
          let wcs = header.wcs;
          let raDec = wcs.pixToWorld([primaryCoord, secondaryCoord]);
          primaryCoord = raDec[0];
          secondaryCoord = raDec[1];
          posType = PosType.SKY;
        }
        this.store.dispatch(
          new UpdateLine(state.id, {
            primaryCoord: primaryCoord,
            secondaryCoord: secondaryCoord,
            posType: posType,
          })
        );
      }
    })
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
      if (header?.wcs?.isValid()) {
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
      if (header?.wcs?.isValid()) {
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

  ngOnInit() { }

  ngAfterViewInit() { }

  ngOnDestroy() { }

  onModeChange(mode: '1D' | '2D' | '3D') {
    this.store.dispatch(new UpdatePlottingPanelConfig({ plotMode: mode }));
  }

  onPlotterSyncEnabledChange($event: MatCheckboxChange) {
    this.store.dispatch(new UpdatePlottingPanelConfig({ plotterSyncEnabled: $event.checked }));
  }

  onCentroidClicksChange($event: MatCheckboxChange) {
    this.store.dispatch(new UpdatePlottingPanelConfig({ centroidClicks: $event.checked }));
  }

  onPlanetCentroidingChange($event: MatCheckboxChange) {
    this.store.dispatch(new UpdatePlottingPanelConfig({ planetCentroiding: $event.checked }));
  }

  onInterpolatePixelsChange($event: MatCheckboxChange) {
    this.store.dispatch(new UpdatePlottingPanelConfig({ interpolatePixels: $event.checked }));
  }
}
