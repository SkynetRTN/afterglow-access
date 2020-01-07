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
import { Observable, Subscription, Subject, BehaviorSubject, combineLatest} from "rxjs";
import { map, filter, debounceTime, tap, withLatestFrom } from "rxjs/operators";

import {
  ImageFile,
  DataFile
} from "../../../../data-files/models/data-file";
import { Normalization } from "../../../models/normalization";
import { PlotterFileState } from "../../../models/plotter-file-state";
import { PlotterComponent } from "../../../components/plotter/plotter.component";
import {
  ViewportChangeEvent,
  CanvasMouseEvent
} from "../../../components/pan-zoom-canvas/pan-zoom-canvas.component";
import { PlotterSettings } from "../../../models/plotter-settings";
import { CentroidSettings } from "../../../models/centroid-settings";
import { ImageFileState } from "../../../models/image-file-state";
import { WorkbenchTool } from "../../../models/workbench-state";
import { centroidDisk, centroidPsf } from "../../../models/centroider";
import { PosType } from "../../../models/source";
import { Router } from '@angular/router';
import { MarkerMouseEvent } from '../../../components/image-viewer-marker-overlay/image-viewer-marker-overlay.component';
import { Store } from '@ngxs/store';
import { WorkbenchState } from '../../../workbench.state';
import { SetActiveTool, SetLastRouterPath, SetPlotMode, SetPlotterSyncEnabled, UpdateCentroidSettings, UpdatePlotterSettings } from '../../../workbench.actions';
import { UpdateLine, StartLine } from '../../../image-files.actions';

@Component({
  selector: "app-plotter-page",
  templateUrl: "./plotter-page.component.html",
  styleUrls: ["./plotter-page.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlotterPageComponent implements OnInit, AfterViewInit, OnDestroy {
  inFullScreenMode$: Observable<boolean>;
  fullScreenPanel$: Observable<'file' | 'viewer' | 'tool'>;


  @HostBinding('class') @Input('class') classList: string = 'fx-workbench-outlet';
  @ViewChild("plotter", { static: false })
  plotter: PlotterComponent;
  imageFile$: Observable<ImageFile>;
  imageFileState$: Observable<ImageFileState>;
  showConfig$: Observable<boolean>;
  plotterSettings$: Observable<PlotterSettings>;
  centroidSettings$: Observable<CentroidSettings>;
  plotterState$: Observable<PlotterFileState>;
  plotterSyncEnabled$: Observable<boolean>;
  PosType = PosType;

  latestImageFile: ImageFile;
  latestCentroidSettings: CentroidSettings;

  mode$: Observable<'1D' | '2D' | '3D'>;

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

  measuring: boolean = false;
  subs: Subscription[] = [];

  private normalizeLine(
    imageFile: ImageFile,
    line: { primaryCoord: number; secondaryCoord: number; posType: PosType }
  ) {
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

  constructor(private store: Store, router: Router) {
    this.fullScreenPanel$ = this.store.select(WorkbenchState.getFullScreenPanel);
    this.inFullScreenMode$ = this.store.select(WorkbenchState.getInFullScreenMode);
    // console.log("HERE:", this.fullScreenPanel$, this.inFullScreenMode$);
    this.imageFile$ = store.select(WorkbenchState.getActiveImageFile);
    this.imageFileState$ = store.select(WorkbenchState.getActiveImageFileState);
    this.plotterState$ = this.imageFileState$.pipe(
      filter(state => state != null),
      map(state => state.plotter)
    );

    let workbenchState$ = store.select(WorkbenchState.getState);
    this.plotterSettings$ = workbenchState$.pipe(
      map(state => state && state.plotterSettings)
    );
    this.centroidSettings$ = workbenchState$.pipe(
      map(state => state && state.centroidSettings)
    );
    this.showConfig$ = store.select(WorkbenchState.getShowConfig);
    this.plotterSyncEnabled$ = store.select(
      WorkbenchState.getPlotterSyncEnabled
    );

    this.mode$ = workbenchState$.pipe(
      map(state => state.plotterMode)
    );

    this.lineStart$ = this.plotterState$.pipe(
      map(state => state.lineMeasureStart),
      filter(line => line !== null),
      withLatestFrom(this.imageFile$),
      map(([line, imageFile]) => {
        return this.normalizeLine(imageFile, line);
      })
    );

    this.lineEnd$ = this.plotterState$.pipe(
      map(state => state.lineMeasureEnd),
      filter(line => line !== null),
      withLatestFrom(this.imageFile$),
      map(([line, imageFile]) => {
        return this.normalizeLine(imageFile, line);
      })
    );

    this.vectorInfo$ = combineLatest(
      this.lineStart$,
      this.lineEnd$,
      this.imageFile$
    ).pipe(
      map(([lineStart, lineEnd, imageFile]) => {
        let pixelSeparation = null;
        let skySeparation = null;
        let pixelPosAngle = null;
        let skyPosAngle = null;

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

    this.subs.push(
      this.plotterState$.subscribe(state => {
        this.measuring = state.measuring;
      })
    );

    this.subs.push(
      this.centroidSettings$.subscribe(settings => {
        this.latestCentroidSettings = settings;
      })
    );

    this.subs.push(
      this.imageFile$.subscribe(imageFile => {
        this.latestImageFile = imageFile;
      })
    );

    this.store.dispatch(
      new SetActiveTool(WorkbenchTool.PLOTTER)
    );

    this.store.dispatch(
      new SetLastRouterPath(router.url)
    )
  }

  ngOnInit() {
  }

  ngAfterViewInit() {}

  ngOnChanges() {}

  ngOnDestroy() {
    this.subs.forEach(sub => sub.unsubscribe());
  }

  onModeChange($event) {
    this.store.dispatch(
      new SetPlotMode($event)
    )
  }

  onPlotterSyncEnabledChange($event) {
    this.store.dispatch(
      new SetPlotterSyncEnabled($event.checked)
    );
  }

  onImageMove($event: CanvasMouseEvent) {
    if (this.measuring) {
      let primaryCoord = $event.imageX;
      let secondaryCoord = $event.imageY;
      let posType = PosType.PIXEL;
      if (this.latestImageFile.wcs.isValid()) {
        let wcs = this.latestImageFile.wcs;
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
    if ($event.hitImage && this.latestImageFile) {
      let x = $event.imageX;
      let y = $event.imageY;
      if (
        this.latestCentroidSettings &&
        this.latestCentroidSettings.centroidClicks
      ) {
        let result;
        if (this.latestCentroidSettings.useDiskCentroiding) {
          result = centroidDisk(this.latestImageFile, x, y);
        } else {
          result = centroidPsf(this.latestImageFile, x, y);
        }

        x = result.x;
        y = result.y;
      }

      let primaryCoord = x;
      let secondaryCoord = y;
      let posType = PosType.PIXEL;
      if (this.latestImageFile.wcs.isValid()) {
        let wcs = this.latestImageFile.wcs;
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
      new UpdateCentroidSettings({ centroidClicks: $event.checked })
    );
  }

  onPlanetCentroidingChange($event) {
    this.store.dispatch(
      new UpdateCentroidSettings({useDiskCentroiding: $event.checked })
    );
  }

  onInterpolatePixelsChange($event) {
    this.store.dispatch(
      new UpdatePlotterSettings({ interpolatePixels: $event.checked })
    );
  }
}
