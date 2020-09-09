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
  EventEmitter
} from "@angular/core";

import {
  Observable,
  Subscription,
  Subject,
  BehaviorSubject,
  combineLatest,
} from "rxjs";
import { map, withLatestFrom } from "rxjs/operators";
import {
  ImageFile,
  getDegsPerPixel,
} from "../../../data-files/models/data-file";
import { PlottingState } from "../../models/plotter-file-state";
import { PlotterComponent } from "../plotter/plotter.component";
import { CanvasMouseEvent } from "../pan-zoom-canvas/pan-zoom-canvas.component";
import { PlottingToolsetConfig } from "../../models/workbench-state";
import { PosType } from "../../models/source";
import { Router } from "@angular/router";
import { MarkerMouseEvent } from "../image-viewer-marker-overlay/image-viewer-marker-overlay.component";
import { Store, Actions } from "@ngxs/store";

export interface PlottingPanelState {
  file: ImageFile;
  measuring: boolean;
  lineMeasureStart: {
    primaryCoord: number;
    secondaryCoord: number;
    posType: PosType;
  };
  lineMeasureEnd: {
    primaryCoord: number;
    secondaryCoord: number;
    posType: PosType;
  };
}

@Component({
  selector: "app-plotting-toolset",
  templateUrl: "./plotting-toolset.component.html",
  styleUrls: ["./plotting-toolset.component.css"],
})
export class PlottingPanelComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input("state")
  set state(state: PlottingPanelState) {
    this.state$.next(state);
  }
  get state() {
    return this.state$.getValue();
  }
  private state$ = new BehaviorSubject<PlottingPanelState>(null);

  @Input() config: PlottingToolsetConfig;

  @Output() configChange: EventEmitter<Partial<PlottingToolsetConfig>> = new EventEmitter();

  PosType = PosType;
  @HostBinding("class") @Input("class") classList: string =
    "fx-workbench-outlet";
  @ViewChild("plotter", { static: false }) plotter: PlotterComponent;

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
    this.lineStart$ = this.state$.pipe(
      map((state) => {
        if (!state || !state.lineMeasureStart || !state.file) return null;
        return this.normalizeLine(state.file, state.lineMeasureStart);
      })
    );

    this.lineEnd$ = this.state$.pipe(
      map((state) => {
        if (!state || !state.lineMeasureEnd || !state.file) return null;

        return this.normalizeLine(state.file, state.lineMeasureEnd);
      })
    );

    this.vectorInfo$ = combineLatest(this.lineStart$, this.lineEnd$).pipe(
      withLatestFrom(this.state$),
      map(([[lineStart, lineEnd], state]) => {
        let pixelSeparation = null;
        let skySeparation = null;
        let pixelPosAngle = null;
        let skyPosAngle = null;

        if (!lineStart || !lineEnd) return;

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

          if (getDegsPerPixel(state.file) != undefined) {
            skySeparation =
              pixelSeparation * getDegsPerPixel(state.file) * 3600;
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
    imageFile: ImageFile,
    line: { primaryCoord: number; secondaryCoord: number; posType: PosType }
  ) {
    if (!imageFile.headerLoaded) return;

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

  ngOnInit() {}

  ngAfterViewInit() {}

  ngOnChanges(changes: SimpleChanges): void {}

  ngOnDestroy() {}

  onModeChange($event) {
    this.configChange.emit({ plotterMode: $event })
  }

  onPlotterSyncEnabledChange($event) {
    this.configChange.emit({ plotterSyncEnabled: $event.checked })
  }

  onCentroidClicksChange($event) {
    this.configChange.emit({ centroidClicks: $event.checked })
  }

  onPlanetCentroidingChange($event) {
    this.configChange.emit({ planetCentroiding: $event.checked })
  }

  onInterpolatePixelsChange($event) {
    this.configChange.emit({ interpolatePixels: $event.checked })
  }
}
