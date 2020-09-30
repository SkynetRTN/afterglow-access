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
import { map, filter, take, tap } from "rxjs/operators";
import { Viewer } from "../../models/viewer";

import {
  DataFile,
  getWidth,
  getHeight,
  ImageHdu,
} from "../../../data-files/models/data-file";
import { WorkbenchDataFileState } from "../../models/workbench-file-state";
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
  SplitViewerPanel,
  MoveViewer,
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
import { CdkDragDrop } from '@angular/cdk/drag-drop';

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
    this.store.dispatch(new SplitViewerPanel(viewerId));
  }

  ViewMode = ViewMode;

  @Input("viewers")
  set viewers(viewers: Viewer[]) {
    this.viewers$.next(viewers);
  }
  get viewers() {
    return this.viewers$.getValue();
  }
  viewers$ = new BehaviorSubject<Viewer[]>([]);

  @Input() id: string;
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
  fileStates$: Observable<{ [id: string]: WorkbenchDataFileState }>;
  dropListConnections$: Observable<string[]>;
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
    this.dropListConnections$ =   this.store.select(WorkbenchState.getViewerIds).pipe(
      map(ids => ids.map(id => 'tab-' + id)),
    );
     

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

  // TODO: LAYER
  public zoomBy(
    fileId: string,
    factor: number,
    imageAnchor: { x: number; y: number } = null
  ) {
    this.store.dispatch(new ZoomBy(fileId, 0, factor, imageAnchor));
  }

  public zoomToFit(fileId: string, padding: number = 0) {
    // TODO: LAYER
    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
    let dataFile = dataFiles[fileId];
    if (dataFile) {
      this.store.dispatch(
        new CenterRegionInViewport(fileId, 0, {
          x: 1,
          y: 1,
          width: getWidth(dataFile.hdus[0] as ImageHdu),
          height: getHeight(dataFile.hdus[0] as ImageHdu),
        })
      );
    }
  }

  public zoomTo(fileId: string, value: number) {
    // TODO: LAYER
    this.store.dispatch(new ZoomTo(fileId, 0, value, null));
  }

  ngOnInit() {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes.selectedViewerId  || changes.viewers) {
      let nextSelectedViewerIndex = this.viewers.map(viewer => viewer.viewerId).indexOf(this.selectedViewerId);
      if(this.selectedViewerIndex != nextSelectedViewerIndex) {
      this.selectedViewerIndex = nextSelectedViewerIndex;
      }
      
    }
  }

  ngOnDestroy() {
    this.hotKeys.forEach((hotKey) => this._hotkeysService.remove(hotKey));
  }

  viewerTrackByFn(index, item: Viewer) {
    // using the viewer's unique ID causes problems when the viewers are reordered.
    // Example,  open three viewers,  split one viewer to the right then drag a second viewer into the right panel.
    // The right panel's tab group shows the correct selected index but it does not detect that the viewer at that index
    // has changed and so it does not updatae the tab content.
    // return item.viewerId;
    return index;
  }

  closeViewer(viewerId: string) {
    this.store.dispatch(new CloseViewer(viewerId));
  }

  closeOtherViewers(viewerId: string) {
    this.store.dispatch([this.viewers.filter(viewer => viewer.viewerId != viewerId).map(viewer => new CloseViewer(viewer.viewerId))]);
  }

  closeViewersToTheRight(viewerId: string) {
    let viewerIds = this.viewers.map(viewer => viewer.viewerId)
    let index = viewerIds.indexOf(viewerId);
    if(index != -1) {
      let viewerIdsToClose = viewerIds.slice(index+1, viewerIds.length)
      this.store.dispatch(viewerIdsToClose.map(id => new CloseViewer(id)));
    }
  }

  closeAllViewers() {
    let viewerIds = this.viewers.map(viewer => viewer.viewerId)
    this.store.dispatch(viewerIds.map(id => new CloseViewer(id)));
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
    // if (viewerId != this.mouseDownActiveViewerId) return;

    this.onMarkerClick.emit({
      viewerId: viewerId,
      viewer: viewer,
      ...$event,
    });
  }

  onSelectedViewerIndexChange(index) {
    // can't use this since it fires for both programmatic changes as well as user intiiated changes
    // use the click and mouse down events on the tab label for now until a better solution can be found
    // example: if the user drags the currently focused tab to a different panel,  the state action handler
    // will set focus to the tab in the new panel.  However,  the tab group in the source panel will detect
    // the change in selected index and fire this event which changes focus back to this panel.
    
    // if(index < 0 || index >= this.viewers.length) return;

    // let viewerId = this.viewers[index].viewerId;
    // if (viewerId != this.selectedViewerId || !this.hasFocus) {
    //   this.store.dispatch(new SetFocusedViewer(viewerId));
    // }

  }



  drop(event: CdkDragDrop<string[]>) {
    var srcViewerId = event.previousContainer.id.replace("tab-","");
    var targetViewerId = event.container.id.replace("tab-","");
    if(srcViewerId == targetViewerId) return;

    this.store.dispatch(new MoveViewer(srcViewerId, targetViewerId))
    // if(previousIndex!=NaN && currentIndex!=NaN && previousIndex!=undefined && currentIndex!=undefined && previousIndex!=currentIndex){
    //      //Do stuff
    //     .....
    //     //END Stuff
    //     moveItemInArray(this.views, previousIndex, currentIndex);
    // }
  }

  splitViewerPanel(viewerId: string, direction: 'up' | 'down' | 'left' | 'right') {
    this.store.dispatch(new SplitViewerPanel(viewerId, direction));
  }
}
