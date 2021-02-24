import { Component, OnInit, OnChanges, Input, Output, EventEmitter, ChangeDetectionStrategy, OnDestroy } from "@angular/core";
import { getWidth, getHeight, DataFile, ImageHdu, PixelType } from "../../../data-files/models/data-file";
import { Subject, timer, BehaviorSubject } from "rxjs";
import { MatDialog } from "@angular/material/dialog";
import { takeUntil } from "rxjs/operators";
import { Store } from "@ngxs/store";
import { CloseDataFile, ZoomTo } from "../../../data-files/data-files.actions";
import { getPixel, IImageData } from "../../../data-files/models/image-data";
import { DataFilesState } from "../../../data-files/data-files.state";
import {
  MoveByEvent,
  ZoomByEvent,
  LoadTileEvent,
  ZoomToEvent,
  ZoomToFitEvent,
} from "../pan-zoom-canvas/pan-zoom-canvas.component";
import { Wcs } from "../../../image-tools/wcs";
import { HotkeysService, Hotkey } from 'angular2-hotkeys';

@Component({
  selector: "app-image-viewer-status-bar",
  templateUrl: "./image-viewer-status-bar.component.html",
  styleUrls: ["./image-viewer-status-bar.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageViewerStatusBarComponent implements OnInit, OnChanges, OnDestroy {
  @Input() rawImageData: IImageData<PixelType>;
  @Input() normalizedImageData: IImageData<Uint32Array>;
  @Input() wcs: Wcs;
  @Input() imageMouseX: number;
  @Input() imageMouseY: number;
  @Input("hasFocus")
  set hasFocus(hasFocus: boolean) {
    this.hasFocus$.next(hasFocus);
  }
  get hasFocus() {
    return this.hasFocus$.getValue();
  }
  private hasFocus$ = new BehaviorSubject<boolean>(null);

  @Output() downloadSnapshot = new EventEmitter();
  @Output() onSaveFile = new EventEmitter();
  @Output() onCloseFile = new EventEmitter();
  @Output() onMoveBy = new EventEmitter<MoveByEvent>();
  @Output() onZoomBy = new EventEmitter<ZoomByEvent>();
  @Output() onZoomTo = new EventEmitter<ZoomToEvent>();
  @Output() onZoomToFit = new EventEmitter<ZoomToFitEvent>();
  @Output() onLoadTile = new EventEmitter<LoadTileEvent>();

  raHours: number;
  decDegs: number;
  pixelValue: number;
  colorValue: { red: number; green: number; blue: number; alpha: number };

  private zoomStepFactor: number = 0.75;
  private startZoomIn$ = new Subject<boolean>();
  private stopZoomIn$ = new Subject<boolean>();

  private startZoomOut$ = new Subject<boolean>();
  private stopZoomOut$ = new Subject<boolean>();
  private hotKeys: Array<Hotkey> = [];

  constructor(private store: Store, private dialog: MatDialog, private _hotkeysService: HotkeysService) {
    
    this.hotKeys.push(
      new Hotkey(
        "=",
        (event: KeyboardEvent): boolean => {
          this.zoomIn();
          return false; // Prevent bubbling
        },
        undefined,
        "Zoom In"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "-",
        (event: KeyboardEvent): boolean => {
          this.zoomOut();

          return false; // Prevent bubbling
        },
        undefined,
        "Zoom In"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "r",
        (event: KeyboardEvent): boolean => {
          this.zoomTo(1)

          return false; // Prevent bubbling
        },
        undefined,
        "Reset Zoom"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "z",
        (event: KeyboardEvent): boolean => {
          this.zoomToFit();

          return false; // Prevent bubbling
        },
        undefined,
        "Zoom To Fit"
      )
    );

    this.hasFocus$.subscribe(value => {
      if(!value) {
        // this.hotKeys.forEach((hotKey) => this._hotkeysService.remove(hotKey));
      }
      else {
        this.hotKeys.forEach(hotKey => this._hotkeysService.add(hotKey));
      }
    })
    
    

    
  }

  ngOnDestroy() {
    // this.hotKeys.forEach((hotKey) => this._hotkeysService.remove(hotKey));
  }

  ngOnInit() {}

  ngOnChanges() {
    if (this.imageMouseX == null || this.imageMouseY == null) {
      this.pixelValue = null;
      this.colorValue = null;
      this.raHours = null;
      this.decDegs = null;
      return;
    }
    if (this.rawImageData) {
      this.pixelValue = getPixel(this.rawImageData, this.imageMouseX, this.imageMouseY);
    }
    if (this.normalizedImageData) {
      let c = getPixel(this.normalizedImageData, this.imageMouseX, this.imageMouseY);
      this.colorValue = c
        ? { red: c & 0xff, green: (c >> 8) & 0xff, blue: (c >> 16) & 0xff, alpha: (c >> 24) & 0xff }
        : null;
    }
    if (this.wcs && this.wcs.isValid()) {
      let raDec = this.wcs.pixToWorld([this.imageMouseX, this.imageMouseY]);
      this.raHours = raDec[0];
      this.decDegs = raDec[1];
    } else {
      this.raHours = null;
      this.decDegs = null;
    }
  }

  onDownloadSnapshotClick() {
    this.downloadSnapshot.emit();
  }

  onCloseFileClick() {
    this.onCloseFile.emit();
  }

  onSaveFileClick() {
    this.onSaveFile.emit();
  }

  public startZoomIn() {
    timer(0, 125)
      .pipe(takeUntil(this.stopZoomIn$))
      .subscribe((t) => {
        this.zoomIn();
      });
  }

  public stopZoomIn() {
    this.stopZoomIn$.next(true);
  }

  public startZoomOut() {
    timer(0, 125)
      .pipe(takeUntil(this.stopZoomOut$))
      .subscribe((t) => {
        this.zoomOut();
      });
  }

  public stopZoomOut() {
    this.stopZoomOut$.next(true);
  }

  public zoomIn(imageAnchor: { x: number; y: number } = null) {
    this.onZoomBy.emit({ factor: 1.0 / this.zoomStepFactor, anchor: imageAnchor });
    // this.zoomBy(1.0 / this.zoomStepFactor, imageAnchor);
  }

  public zoomOut(imageAnchor: { x: number; y: number } = null) {
    this.onZoomBy.emit({ factor: this.zoomStepFactor, anchor: imageAnchor });
    // this.zoomBy(this.zoomStepFactor, imageAnchor);
  }

  public zoomTo(value: number) {
    this.onZoomTo.emit({ factor: value, anchor: null });
    // this.store.dispatch(new ZoomTo(
    //   this.hdu.transformation,
    //   this.hdu.rawImageDataId,
    //   value,
    //   null
    // ));
  }

  public zoomBy(factor: number, imageAnchor: { x: number; y: number } = null) {
    this.onZoomBy.emit({ factor: factor, anchor: imageAnchor });
    // this.store.dispatch(new ZoomBy(
    //   this.hdu.id,
    //   factor,
    //   imageAnchor
    // ));
  }

  public zoomToFit(padding: number = 0) {
    this.onZoomToFit.emit({});
    // this.store.dispatch(new CenterRegionInViewport(
    //   this.hdu.id,
    //   { x: 1, y: 1, width: getWidth(this.hdu), height: getHeight(this.hdu) }
    // ))
  }
}
