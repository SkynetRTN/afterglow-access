import { Component, OnInit, Output, EventEmitter, Input, ViewChild, TemplateRef, ViewContainerRef, OnChanges, SimpleChanges } from '@angular/core';
import { Observable, combineLatest, fromEvent } from 'rxjs';
import { map, filter, take } from 'rxjs/operators';
import { Viewer } from '../../../models/viewer';

import { DataFile, ImageFile, getWidth, getHeight } from '../../../../data-files/models/data-file';
import { ImageFileState } from '../../../models/image-file-state';
import { CanvasMouseEvent } from '../../../components/pan-zoom-canvas/pan-zoom-canvas.component';
import { MarkerMouseEvent } from '../../../components/image-viewer-marker-overlay/image-viewer-marker-overlay.component';
import { Subscription } from 'rxjs';
import { ViewMode } from '../../../models/view-mode';
import { Store } from '@ngxs/store';
import { WorkbenchState } from '../../../workbench.state';
import { DataFilesState } from '../../../../data-files/data-files.state';
import { ImageFilesState } from '../../../image-files.state';
import { SetActiveViewer, CloseViewer, KeepViewerOpen, MoveToOtherView } from '../../../workbench.actions';
import { HotkeysService, Hotkey } from 'angular2-hotkeys';
import { ZoomTo, ZoomBy, CenterRegionInViewport } from '../../../image-files.actions';
import { RemoveDataFile } from '../../../../data-files/data-files.actions';
import { OverlayRef, Overlay } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { MatMenuTrigger } from '@angular/material';

export interface ViewerCanvasMouseEvent extends CanvasMouseEvent {
  viewerId: string,
  viewer: Viewer
}

export interface ViewerMarkerMouseEvent extends MarkerMouseEvent {
  viewerId: string,
  viewer: Viewer
}

@Component({
  selector: 'app-workbench-view-manager',
  templateUrl: './workbench-view-manager.component.html',
  styleUrls: ['./workbench-view-manager.component.css']
})
export class WorkbenchViewManagerComponent implements OnInit, OnChanges {
  @ViewChild(MatMenuTrigger, {static: false})
  contextMenu: MatMenuTrigger;
  contextMenuPosition = { x: '0px', y: '0px' };
  mouseOverCloseViewerId: string = null;

  onContextMenu(event: MouseEvent, viewer: Viewer) {
    event.preventDefault();
    this.contextMenuPosition.x = event.clientX + 'px';
    this.contextMenuPosition.y = event.clientY + 'px';
    this.contextMenu.menuData = { 'viewer': viewer };
    this.contextMenu.menu.focusFirstItem('mouse');
    this.contextMenu.openMenu();
  }

  moveToOtherView(viewerId: string) {
    this.store.dispatch(new MoveToOtherView(viewerId));
  }
  
  ViewMode = ViewMode;

  @Input() primaryViewers: Viewer[];
  @Input() secondaryViewers: Viewer[];
  @Input() activeViewerId: string;
  @Input() viewMode: ViewMode;

  @Output() onImageClick = new EventEmitter<ViewerCanvasMouseEvent>();
  @Output() onImageMove = new EventEmitter<ViewerCanvasMouseEvent>();
  @Output() onMarkerClick = new EventEmitter<ViewerMarkerMouseEvent>();

  primarySelectedTabIndex = 0;
  secondarySelectedTabIndex = 0;


  private hotKeys: Array<Hotkey> = [];
  // viewers$: Observable<Viewer[]>;
  // viewMode$: Observable<ViewMode>;
  // activeViewerIndex$: Observable<number>;

  files$: Observable<{[id: string]: DataFile}>;
  fileStates$: Observable<{[id: string]: ImageFileState}>;
  subs: Subscription[] = [];
  // activeViewerIndex: number;
  mouseDownActiveViewerId: string;
  zoomStepFactor: number = 0.75;

  private get viewers() {
    return this.primaryViewers.concat(this.secondaryViewers);
  }

  private get primaryViewerGroupIsActive() {
    return this.activeViewer && this.primaryViewers.includes(this.activeViewer);
  }

  private get activeViewer() {
    return this.viewers.find(v => v.viewerId == this.activeViewerId);
  }

  constructor(private store: Store, private _hotkeysService: HotkeysService, public overlay: Overlay,
    public viewContainerRef: ViewContainerRef) {
    // this.viewMode$ = this.store.select(WorkbenchState.getViewMode);

    // this.viewers$ = combineLatest(this.store.select(WorkbenchState.getViewers), this.viewMode$)
    //   .pipe(map(([viewers, viewMode]) => {
    //     if (!viewers || viewers.length == 0) return [];
    //     if (viewMode == ViewMode.SINGLE) return [viewers[0]];
    //     return viewers;
    //   }));

    // this.activeViewerIndex$ = this.store.select(WorkbenchState.getActiveViewerIndex);
    this.files$ = this.store.select(DataFilesState.getEntities);
    this.fileStates$ = this.store.select(ImageFilesState.getEntities);

    // this.subs.push(this.activeViewerIndex$.subscribe(viewerIndex => {
    //   this.activeViewerIndex = viewerIndex;
    // }))


    this.hotKeys.push(
      new Hotkey(
        "=",
        (event: KeyboardEvent): boolean => {
          let activeViewer = this.activeViewer;
          if(activeViewer && activeViewer.fileId != null) {
            this.zoomIn(activeViewer.fileId);
          }
          
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
          let activeViewer = this.activeViewer;
          if(activeViewer && activeViewer.fileId != null) {
            this.zoomOut(activeViewer.fileId);
          }
          
          return false; // Prevent bubbling
        },
        undefined,
        "Zoom In"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "0",
        (event: KeyboardEvent): boolean => {
          let activeViewer = this.activeViewer;
          if(activeViewer && activeViewer.fileId != null) {
            this.zoomTo(activeViewer.fileId, 1);
          }
          
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
          let activeViewer = this.activeViewer;
          if(activeViewer && activeViewer.fileId != null) {
            this.zoomToFit(activeViewer.fileId);
          }
          
          return false; // Prevent bubbling
        },
        undefined,
        "Zoom To Fit"
      )
    );

   

    this.hotKeys.forEach(hotKey => this._hotkeysService.add(hotKey));
  }


  public zoomIn(fileId: string, imageAnchor: { x: number, y: number } = null) {
    this.zoomBy(fileId, 1.0 / this.zoomStepFactor, imageAnchor);
  }

  public zoomOut(fileId: string, imageAnchor: { x: number, y: number } = null) {
    this.zoomBy(fileId, this.zoomStepFactor, imageAnchor);
  }


  public zoomBy(fileId: string, factor: number, imageAnchor: { x: number, y: number } = null) {
    this.store.dispatch(new ZoomBy(
      fileId,
      factor,
      imageAnchor
    ));
  }

  public zoomToFit(fileId: string, padding: number = 0) {
    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
    let imageFile = dataFiles[fileId] as ImageFile;
    if(imageFile) {
      this.store.dispatch(new CenterRegionInViewport(
        fileId,
        { x: 1, y: 1, width: getWidth(imageFile), height: getHeight(imageFile) }
      ))
    }
    
  }

  public zoomTo(fileId: string, value: number) {
    this.store.dispatch(new ZoomTo(
      fileId,
      value,
      null
    ));
  }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.activeViewerId && changes.activeViewerId.previousValue != changes.activeViewerId.currentValue) {
      let primaryViewer = this.primaryViewers.find(v => v.viewerId == changes.activeViewerId.currentValue);
      if(primaryViewer) this.primarySelectedTabIndex = this.primaryViewers.indexOf(primaryViewer);

      let secondaryViewer = this.secondaryViewers.find(v => v.viewerId == changes.activeViewerId.currentValue);
      if(secondaryViewer) this.secondarySelectedTabIndex = this.secondaryViewers.indexOf(secondaryViewer);

    }
  }

  ngOnDestroy() {
    this.hotKeys.forEach(hotKey => this._hotkeysService.remove(hotKey));
  }

  viewerTrackByFn(index, item) {
    return index;
  }

  closeViewer(viewerId: string) {
    this.store.dispatch(new CloseViewer(viewerId));
  }

  keepViewerOpen(viewerId: string) {
    this.store.dispatch(new KeepViewerOpen(viewerId));
  }

  closeAll(viewerId: string) {
    this.store.dispatch(this.viewers.map(v => new CloseViewer(v.viewerId)));
  }

  setActiveViewer($event: Event, viewerId: string, viewer: Viewer) {
    this.mouseDownActiveViewerId = this.activeViewerId;
    if (viewerId != this.activeViewerId) {
      this.store.dispatch(new SetActiveViewer(viewerId));
      $event.preventDefault();
      $event.stopImmediatePropagation();
    }
  }

  handleImageMove($event: CanvasMouseEvent, viewerId: string, viewer: Viewer) {
    this.onImageMove.emit({
      viewerId: viewerId,
      viewer: viewer,
      ...$event
    });
  }

  handleImageClick($event: CanvasMouseEvent, viewerId: string, viewer: Viewer) {
    if(viewerId != this.mouseDownActiveViewerId) return;

    this.onImageClick.emit({
      viewerId: viewerId,
      viewer: viewer,
      ...$event
    });
  }

  handleMarkerClick($event: MarkerMouseEvent, viewerId: string, viewer: Viewer) {
    if(viewerId != this.mouseDownActiveViewerId) return;

    this.onMarkerClick.emit({
      viewerId: viewerId,
      viewer: viewer,
      ...$event
    });
  }
  
  onPrimarySelectedTabIndexChange(index) {
    this.primarySelectedTabIndex = index;
    this.store.dispatch(new SetActiveViewer(this.primaryViewers[index].viewerId));
  }
  
  onSecondarySelectedTabIndexChange(index) {
    this.secondarySelectedTabIndex = index;
    this.store.dispatch(new SetActiveViewer(this.secondaryViewers[index].viewerId));
  }

}
