import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  Input,
  ViewChild,
  TemplateRef,
  ViewContainerRef,
  OnChanges,
  SimpleChanges,
} from "@angular/core";
import { Observable, combineLatest, fromEvent, BehaviorSubject } from "rxjs";
import { map, filter, take } from "rxjs/operators";
import { Viewer } from "../../models/viewer";

import {
  DataFile,
  ImageFile,
  getWidth,
  getHeight,
} from "../../../data-files/models/data-file";
import { WorkbenchFileState } from "../../models/workbench-file-state";
import { CanvasMouseEvent } from "../../components/pan-zoom-canvas/pan-zoom-canvas.component";
import { MarkerMouseEvent } from "../../components/image-viewer-marker-overlay/image-viewer-marker-overlay.component";
import { Subscription } from "rxjs";
import { ViewMode } from "../../models/view-mode";
import { Store } from "@ngxs/store";
import { WorkbenchState } from "../../workbench.state";
import { DataFilesState } from "../../../data-files/data-files.state";
import { WorkbenchFileStates } from "../../workbench-file-states.state";
import {
  SetFocusedViewer,
  CloseViewer,
  KeepViewerOpen,
  MoveToOtherView,
} from "../../workbench.actions";
import { HotkeysService, Hotkey } from "angular2-hotkeys";
import {
  ZoomTo,
  ZoomBy,
  CenterRegionInViewport,
} from "../../workbench-file-states.actions";
import { RemoveDataFile } from "../../../data-files/data-files.actions";
import { OverlayRef, Overlay } from "@angular/cdk/overlay";
import { TemplatePortal } from "@angular/cdk/portal";
import { MatMenuTrigger } from "@angular/material";
import { ViewerPanel } from '../../models/workbench-state';

export interface ViewerCanvasMouseEvent extends CanvasMouseEvent {
  viewerId: string;
  viewer: Viewer;
}

export interface ViewerMarkerMouseEvent extends MarkerMouseEvent {
  viewerId: string;
  viewer: Viewer;
}

@Component({
  selector: "app-workbench-viewer-panel",
  templateUrl: "./workbench-viewer-panel.component.html",
  styleUrls: ["./workbench-viewer-panel.component.css"],
})
export class WorkbenchViewerPanelComponent implements OnInit, OnChanges {
  @ViewChild(MatMenuTrigger, { static: false })
  contextMenu: MatMenuTrigger;
  contextMenuPosition = { x: "0px", y: "0px" };
  mouseOverCloseViewerId: string = null;

  onContextMenu(event: MouseEvent, viewer: Viewer) {
    event.preventDefault();
    this.contextMenuPosition.x = event.clientX + "px";
    this.contextMenuPosition.y = event.clientY + "px";
    this.contextMenu.menuData = { viewer: viewer };
    this.contextMenu.menu.focusFirstItem("mouse");
    this.contextMenu.openMenu();
  }

  moveToOtherView(viewerId: string) {
    this.store.dispatch(new MoveToOtherView(viewerId));
  }

  ViewMode = ViewMode;

  @Input("viewers")
  set viewers(viewers: Viewer[]) {
    this.viewers$.next(viewers);
  }
  get viewers() {
    return this.viewers$.getValue();
  }
  private viewers$ = new BehaviorSubject<Viewer[]>([]);

  @Input() selectedViewerId: string;
  @Input() hasFocus: boolean;

  @Output() onImageClick = new EventEmitter<ViewerCanvasMouseEvent>();
  @Output() onImageMove = new EventEmitter<ViewerCanvasMouseEvent>();
  @Output() onMarkerClick = new EventEmitter<ViewerMarkerMouseEvent>();

  selectedViewerIndex = 0;

  private hotKeys: Array<Hotkey> = [];
  // viewers$: Observable<Viewer[]>;
  // viewMode$: Observable<ViewMode>;
  // activeViewerIndex$: Observable<number>;

  files$: Observable<{ [id: string]: DataFile }>;
  fileStates$: Observable<{ [id: string]: WorkbenchFileState }>;
  subs: Subscription[] = [];
  // activeViewerIndex: number;
  mouseDownActiveViewerId: string;
  zoomStepFactor: number = 0.75;

  // private get focusedViewer() {
  //   let focusedViewerId = this.primaryViewerHasFocus ? this.selectedPrimaryViewerId : this.selectedSecondaryViewerId;
  //   return this.viewers.find(v => v.viewerId == focusedViewerId);
  // }

  constructor(
    private store: Store,
    private _hotkeysService: HotkeysService,
    public overlay: Overlay,
    public viewContainerRef: ViewContainerRef
  ) {
    
    this.files$ = this.store.select(DataFilesState.getEntities);
    this.fileStates$ = this.store.select(WorkbenchFileStates.getEntities);

    // this.hotKeys.push(
    //   new Hotkey(
    //     "=",
    //     (event: KeyboardEvent): boolean => {
    //       let activeViewer = this.focusedViewer;
    //       if(activeViewer && activeViewer.fileId != null) {
    //         this.zoomIn(activeViewer.fileId);
    //       }

    //       return false; // Prevent bubbling
    //     },
    //     undefined,
    //     "Zoom In"
    //   )
    // );

    // this.hotKeys.push(
    //   new Hotkey(
    //     "-",
    //     (event: KeyboardEvent): boolean => {
    //       let activeViewer = this.focusedViewer;
    //       if(activeViewer && activeViewer.fileId != null) {
    //         this.zoomOut(activeViewer.fileId);
    //       }

    //       return false; // Prevent bubbling
    //     },
    //     undefined,
    //     "Zoom In"
    //   )
    // );

    // this.hotKeys.push(
    //   new Hotkey(
    //     "0",
    //     (event: KeyboardEvent): boolean => {
    //       let activeViewer = this.focusedViewer;
    //       if(activeViewer && activeViewer.fileId != null) {
    //         this.zoomTo(activeViewer.fileId, 1);
    //       }

    //       return false; // Prevent bubbling
    //     },
    //     undefined,
    //     "Reset Zoom"
    //   )
    // );

    // this.hotKeys.push(
    //   new Hotkey(
    //     "z",
    //     (event: KeyboardEvent): boolean => {
    //       let activeViewer = this.focusedViewer;
    //       if(activeViewer && activeViewer.fileId != null) {
    //         this.zoomToFit(activeViewer.fileId);
    //       }

    //       return false; // Prevent bubbling
    //     },
    //     undefined,
    //     "Zoom To Fit"
    //   )
    // );

    // this.hotKeys.forEach(hotKey => this._hotkeysService.add(hotKey));
  }

  public zoomIn(fileId: string, imageAnchor: { x: number; y: number } = null) {
    this.zoomBy(fileId, 1.0 / this.zoomStepFactor, imageAnchor);
  }

  public zoomOut(fileId: string, imageAnchor: { x: number; y: number } = null) {
    this.zoomBy(fileId, this.zoomStepFactor, imageAnchor);
  }

  public zoomBy(
    fileId: string,
    factor: number,
    imageAnchor: { x: number; y: number } = null
  ) {
    this.store.dispatch(new ZoomBy(fileId, factor, imageAnchor));
  }

  public zoomToFit(fileId: string, padding: number = 0) {
    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
    let imageFile = dataFiles[fileId] as ImageFile;
    if (imageFile) {
      this.store.dispatch(
        new CenterRegionInViewport(fileId, {
          x: 1,
          y: 1,
          width: getWidth(imageFile),
          height: getHeight(imageFile),
        })
      );
    }
  }

  public zoomTo(fileId: string, value: number) {
    this.store.dispatch(new ZoomTo(fileId, value, null));
  }

  ngOnInit() {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes.selectedViewerId) {
      this.selectedViewerIndex = this.viewers.map(viewer => viewer.viewerId).indexOf(this.selectedViewerId);
    }
  }

  ngOnDestroy() {
    this.hotKeys.forEach((hotKey) => this._hotkeysService.remove(hotKey));
  }

  viewerTrackByFn(index, item: Viewer) {
    return item.viewerId;
  }

  closeViewer(viewerId: string) {
    this.store.dispatch(new CloseViewer(viewerId));
  }

  keepViewerOpen(viewerId: string) {
    this.store.dispatch(new KeepViewerOpen(viewerId));
  }

  setFocusedViewer($event: Event, viewerId: string, viewer: Viewer) {
    this.mouseDownActiveViewerId = this.selectedViewerId;
    if (viewerId != this.selectedViewerId || !this.hasFocus) {
      this.store.dispatch(new SetFocusedViewer(viewerId));
      $event.preventDefault();
      $event.stopImmediatePropagation();
    }
  }

  handleImageMove($event: ViewerCanvasMouseEvent, viewerId: string, viewer: Viewer) {
    this.onImageMove.emit({
      viewerId: viewerId,
      viewer: viewer,
      ...$event,
    });
  }

  handleImageClick($event: ViewerCanvasMouseEvent, viewerId: string, viewer: Viewer) {
    // if (viewerId != this.mouseDownActiveViewerId) return;
    this.onImageClick.emit({
      viewerId: viewerId,
      viewer: viewer,
      ...$event,
    });
  }

  handleMarkerClick(
    $event: ViewerMarkerMouseEvent,
    viewerId: string,
    viewer: Viewer
  ) {
    if (viewerId != this.mouseDownActiveViewerId) return;

    this.onMarkerClick.emit({
      viewerId: viewerId,
      viewer: viewer,
      ...$event,
    });
  }

  onSelectedViewerIndexChange(index) {
    // console.log("SELECTED VIEWER INDEX CHANGED")
    // this.selectedViewerIndex = index;
    // this.store.dispatch(new SetFocusedViewer(this.viewers[index].viewerId));
  }
}
