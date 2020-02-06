import {
  Component,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ChangeDetectionStrategy,
  OnInit,
  HostBinding,
  Input
} from "@angular/core";

import * as SVG from "svgjs";
import { Observable, Subscription, Subject, BehaviorSubject, combineLatest } from "rxjs";
import { map, filter, debounceTime, tap, withLatestFrom } from "rxjs/operators";

import {
  ImageFile,
  DataFile,
  getWidth,
  getHeight,
  getDegsPerPixel
} from "../../../../data-files/models/data-file";
import { Normalization } from "../../../models/normalization";
import { PlotterFileState } from "../../../models/plotter-file-state";
import { PlotterComponent } from "../../../components/plotter/plotter.component";
import {
  ViewportChangeEvent,
  CanvasMouseEvent
} from "../../../components/pan-zoom-canvas/pan-zoom-canvas.component";
import { CentroidSettings } from "../../../models/centroid-settings";
import { ImageFileState } from "../../../models/image-file-state";
import { WorkbenchTool, PlotterPageSettings } from "../../../models/workbench-state";
import { centroidDisk, centroidPsf } from "../../../models/centroider";
import { PosType } from "../../../models/source";
import { Router } from '@angular/router';
import { MarkerMouseEvent } from '../../../components/image-viewer-marker-overlay/image-viewer-marker-overlay.component';
import { Store, Actions, ofActionSuccessful } from '@ngxs/store';
import { WorkbenchState } from '../../../workbench.state';
import { SetActiveTool, SetLastRouterPath, UpdateCentroidSettings, UpdatePlotterPageSettings, SetViewerFile, SetViewerMarkers, ClearViewerMarkers } from '../../../workbench.actions';
import { UpdateLine, StartLine } from '../../../image-files.actions';
import { ImageFilesState } from '../../../image-files.state';
import { DataFilesState } from '../../../../data-files/data-files.state';
import { WorkbenchPageBaseComponent } from '../workbench-page-base/workbench-page-base.component';
import { LoadDataFileHdr } from '../../../../data-files/data-files.actions';
import { MarkerType, LineMarker, RectangleMarker, Marker } from '../../../models/marker';

@Component({
  selector: "app-plotter-page",
  templateUrl: "./plotter-page.component.html",
  styleUrls: ["./plotter-page.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlotterPageComponent extends WorkbenchPageBaseComponent implements OnInit, AfterViewInit, OnDestroy {
  PosType = PosType;

  @HostBinding('class') @Input('class') classList: string = 'fx-workbench-outlet';
  @ViewChild("plotter", { static: false })
  plotter: PlotterComponent;
  plotterFileState$: Observable<PlotterFileState>;
  plotterPageSettings$: Observable<PlotterPageSettings>;
  plotterSyncEnabled$: Observable<boolean>;
  mode$: Observable<'1D' | '2D' | '3D'>;

  markerUpdater: Subscription;

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
    skyPosAngle;
  }>;



  constructor(private actions$: Actions, store: Store, router: Router) {
    super(store, router);
    this.plotterFileState$ = this.activeImageFileState$.pipe(
      filter(state => state != null),
      map(state => state.plotter)
    );
    this.plotterPageSettings$ = store.select(WorkbenchState.getPlotterPageSettings);
    this.plotterSyncEnabled$ = this.plotterPageSettings$.pipe(map(settings => settings.plotterSyncEnabled));
    this.mode$ = this.plotterPageSettings$.pipe(map(settings => settings.plotterMode));

    this.lineStart$ = this.plotterFileState$.pipe(
      map(state => state.lineMeasureStart),
      filter(line => line !== null),
      withLatestFrom(this.activeImageFile$),
      map(([line, imageFile]) => {
        return this.normalizeLine(imageFile, line);
      })
    );

    this.lineEnd$ = this.plotterFileState$.pipe(
      map(state => state.lineMeasureEnd),
      filter(line => line !== null),
      withLatestFrom(this.activeImageFile$),
      map(([line, imageFile]) => {
        return this.normalizeLine(imageFile, line);
      })
    );

    this.vectorInfo$ = combineLatest(
      this.lineStart$,
      this.lineEnd$,
      this.activeImageFile$
    ).pipe(
      map(([lineStart, lineEnd, imageFile]) => {
        let pixelSeparation = null;
        let skySeparation = null;
        let pixelPosAngle = null;
        let skyPosAngle = null;

        if(!lineStart || !lineEnd) return;

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

          if(getDegsPerPixel(imageFile) != undefined)  {
            skySeparation = pixelSeparation*getDegsPerPixel(imageFile)*3600;
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
          skyPosAngle: skyPosAngle
        };
      })
    );

    this.markerUpdater = combineLatest(
      this.viewerFileIds$,
      this.viewerImageFileHeaders$,
      this.store.select(WorkbenchState.getPlotterPageSettings),
      this.store.select(ImageFilesState.getEntities),
    ).pipe(
      withLatestFrom(
        this.store.select(WorkbenchState.getViewers),
        this.store.select(DataFilesState.getEntities)
      )
    ).subscribe(([[fileIds, imageFiles, plotterPageSettings, imageFileStates], viewers, dataFiles]) => {
      viewers.forEach((viewer) => {
        let fileId = viewer.fileId;
        if (fileId == null || !dataFiles[fileId]) {
          this.store.dispatch(new SetViewerMarkers(viewer.viewerId, []));
          return;
        }
        let file = dataFiles[fileId] as ImageFile;
        if (!file.headerLoaded) {
          this.store.dispatch(new SetViewerMarkers(viewer.viewerId, []));
          return;
        }
        let plotter = imageFileStates[fileId].plotter;
        let lineMeasureStart = plotter.lineMeasureStart;
        let lineMeasureEnd = plotter.lineMeasureEnd;

        if (!lineMeasureStart || !lineMeasureEnd) {
          this.store.dispatch(new SetViewerMarkers(viewer.viewerId, []));
          return;
        }

        if (!file) {
          this.store.dispatch(new SetViewerMarkers(viewer.viewerId, []));
        }

        let startPrimaryCoord = lineMeasureStart.primaryCoord;
        let startSecondaryCoord = lineMeasureStart.secondaryCoord;
        let startPosType = lineMeasureStart.posType;
        let endPrimaryCoord = lineMeasureEnd.primaryCoord;
        let endSecondaryCoord = lineMeasureEnd.secondaryCoord;
        let endPosType = lineMeasureEnd.posType;

        let x1 = startPrimaryCoord;
        let y1 = startSecondaryCoord;
        let x2 = endPrimaryCoord;
        let y2 = endSecondaryCoord;

        if (startPosType == PosType.SKY || endPosType == PosType.SKY) {
          if (!file.headerLoaded || !file.wcs.isValid()) {
            this.store.dispatch(new SetViewerMarkers(viewer.viewerId, []));
            return;
          }
          let wcs = file.wcs;
          if (startPosType == PosType.SKY) {
            let xy = wcs.worldToPix([startPrimaryCoord, startSecondaryCoord]);
            x1 = Math.max(Math.min(xy[0], getWidth(file)), 0);
            y1 = Math.max(Math.min(xy[1], getHeight(file)), 0);
          }

          if (endPosType == PosType.SKY) {
            let xy = wcs.worldToPix([endPrimaryCoord, endSecondaryCoord]);
            x2 = Math.max(Math.min(xy[0], getWidth(file)), 0);
            y2 = Math.max(Math.min(xy[1], getHeight(file)), 0);
          }
        }

        let markers: Marker[] = [];
        if (plotterPageSettings.plotterMode == '1D') {
          markers = [
            {
              type: MarkerType.LINE,
              x1: x1,
              y1: y1,
              x2: x2,
              y2: y2
            } as LineMarker
          ];
        }
        else {
          markers = [
            {
              type: MarkerType.RECTANGLE,
              x: Math.min(x1, x2),
              y: Math.min(y1, y2),
              width: Math.abs(x2 - x1),
              height: Math.abs(y2 - y1)
            } as RectangleMarker
          ];
        }


        this.store.dispatch(new SetViewerMarkers(viewer.viewerId, markers));
      })
    })


    this.store.dispatch(
      new SetActiveTool(WorkbenchTool.PLOTTER)
    );

    this.store.dispatch(
      new SetLastRouterPath(router.url)
    )
  }

  private normalizeLine(
    imageFile: ImageFile,
    line: { primaryCoord: number; secondaryCoord: number; posType: PosType }
  ) {
    if(!imageFile.headerLoaded) return;

    let x = null;
    let y = null;
    let raHours = null;
    let decDegs = null;
    if (line.posType == PosType.PIXEL) {
      x = line.primaryCoord;
      y = line.secondaryCoord;
      if (imageFile.wcs.isValid()) {
        let wcs = imageFile.wcs;
        let raDec = wcs.pixToWorld([line.primaryCoord, line.secondaryCoord]);
        raHours = raDec[0];
        decDegs = raDec[1];
      }
    } else {
      raHours = line.primaryCoord;
      decDegs = line.secondaryCoord;
      if (imageFile.wcs.isValid()) {
        let wcs = imageFile.wcs;
        let xy = wcs.worldToPix([line.primaryCoord, line.secondaryCoord]);
        x = xy[0];
        y = xy[1];
      }
    }
    return { x: x, y: y, raHours: raHours, decDegs: decDegs };
  }

  ngOnInit() {
  }

  ngAfterViewInit() { }

  ngOnChanges() { }

  ngOnDestroy() {
    this.store.dispatch(new ClearViewerMarkers());

    this.markerUpdater.unsubscribe();
  }

  onModeChange($event) {
    this.store.dispatch(
      new UpdatePlotterPageSettings({ plotterMode: $event })
    )
  }

  onPlotterSyncEnabledChange($event) {
    this.store.dispatch(
      new UpdatePlotterPageSettings({ plotterSyncEnabled: $event.checked })
    );
  }

  onImageMove($event: CanvasMouseEvent) {
    let imageFile = this.store.selectSnapshot(DataFilesState.getEntities)[$event.targetFile.id];
    let measuring = this.store.selectSnapshot(ImageFilesState.getEntities)[$event.targetFile.id].plotter.measuring;
    if (measuring) {
      let primaryCoord = $event.imageX;
      let secondaryCoord = $event.imageY;
      let posType = PosType.PIXEL;
      if (imageFile.wcs.isValid()) {
        let wcs = imageFile.wcs;
        let raDec = wcs.pixToWorld([primaryCoord, secondaryCoord]);
        primaryCoord = raDec[0];
        secondaryCoord = raDec[1];
        posType = PosType.SKY;
      }
      this.store.dispatch(
        new UpdateLine(
          $event.targetFile.id,
          {
            primaryCoord: primaryCoord,
            secondaryCoord: secondaryCoord,
            posType: posType
          }
        )
      );
    }
  }

  onMarkerClick($event: MarkerMouseEvent) {
  }

  onImageClick($event: CanvasMouseEvent) {
    let imageFile = this.store.selectSnapshot(DataFilesState.getEntities)[$event.targetFile.id] as ImageFile;
    let plotterPageSettings = this.store.selectSnapshot(WorkbenchState.getPlotterPageSettings);
    if ($event.hitImage && imageFile) {
      let x = $event.imageX;
      let y = $event.imageY;
      if (
        plotterPageSettings &&
        plotterPageSettings.centroidClicks
      ) {
        let result;
        if (plotterPageSettings.planetCentroiding) {
          result = centroidDisk(imageFile, x, y);
        } else {
          result = centroidPsf(imageFile, x, y);
        }

        x = result.x;
        y = result.y;
      }

      let primaryCoord = x;
      let secondaryCoord = y;
      let posType = PosType.PIXEL;
      if (imageFile.wcs.isValid()) {
        let wcs = imageFile.wcs;
        let raDec = wcs.pixToWorld([primaryCoord, secondaryCoord]);
        primaryCoord = raDec[0];
        secondaryCoord = raDec[1];
        posType = PosType.SKY;
      }

      this.store.dispatch(
        new StartLine(
          $event.targetFile.id,
          {
            primaryCoord: primaryCoord,
            secondaryCoord: secondaryCoord,
            posType: posType
          }
        )
      );
    }
  }

  onCentroidClicksChange($event) {
    this.store.dispatch(
      new UpdatePlotterPageSettings({ centroidClicks: $event.checked })
    );
  }

  onPlanetCentroidingChange($event) {
    this.store.dispatch(
      new UpdatePlotterPageSettings({ planetCentroiding: $event.checked })
    );
  }

  onInterpolatePixelsChange($event) {
    this.store.dispatch(
      new UpdatePlotterPageSettings({ interpolatePixels: $event.checked })
    );
  }
}
