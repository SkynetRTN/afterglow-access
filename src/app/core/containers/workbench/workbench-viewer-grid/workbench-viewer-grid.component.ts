import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
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
import { SetActiveViewer } from '../../../workbench.actions';
import { HotkeysService, Hotkey } from 'angular2-hotkeys';
import { ZoomTo, ZoomBy, CenterRegionInViewport } from '../../../image-files.actions';
import { RemoveDataFile } from '../../../../data-files/data-files.actions';

export interface ViewerGridCanvasMouseEvent extends CanvasMouseEvent {
  viewerId: string,
  viewer: Viewer
}

export interface ViewerGridMarkerMouseEvent extends MarkerMouseEvent {
  viewerId: string,
  viewer: Viewer
}

@Component({
  selector: 'app-workbench-viewer-grid',
  templateUrl: './workbench-viewer-grid.component.html',
  styleUrls: ['./workbench-viewer-grid.component.css']
})
export class WorkbenchViewerGridComponent implements OnInit {
  ViewMode = ViewMode;

  @Input() viewers: Viewer[];
  @Input() activeViewerId: string;
  @Input() viewMode: ViewMode;

  @Output() onImageClick = new EventEmitter<ViewerGridCanvasMouseEvent>();
  @Output() onImageMove = new EventEmitter<ViewerGridCanvasMouseEvent>();
  @Output() onMarkerClick = new EventEmitter<ViewerGridMarkerMouseEvent>();


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

  constructor(private store: Store, private _hotkeysService: HotkeysService) {
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
          let activeViewer = this.viewers.find(v => v.viewerId == this.activeViewerId);
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
          let activeViewer = this.viewers.find(v => v.viewerId == this.activeViewerId);
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
          let activeViewer = this.viewers.find(v => v.viewerId == this.activeViewerId);
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
          let activeViewer = this.viewers.find(v => v.viewerId == this.activeViewerId);
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

  ngOnDestroy() {
    this.hotKeys.forEach(hotKey => this._hotkeysService.remove(hotKey));
  }

  viewerTrackByFn(index, item) {
    return index;
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


}
