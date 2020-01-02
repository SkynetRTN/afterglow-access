import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Viewer } from '../../../models/viewer';

import { Dictionary } from '@ngrx/entity/src/models';
import { DataFile } from '../../../../data-files/models/data-file';
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

export interface ViewerGridCanvasMouseEvent extends CanvasMouseEvent {
  viewerIndex: number,
  viewer: Viewer
}

export interface ViewerGridMarkerMouseEvent extends MarkerMouseEvent {
  viewerIndex: number,
  viewer: Viewer
}

@Component({
  selector: 'app-workbench-viewer-grid',
  templateUrl: './workbench-viewer-grid.component.html',
  styleUrls: ['./workbench-viewer-grid.component.css']
})
export class WorkbenchViewerGridComponent implements OnInit {
  ViewMode = ViewMode;

  @Output() onImageClick = new EventEmitter<ViewerGridCanvasMouseEvent>();
  @Output() onImageMove = new EventEmitter<ViewerGridCanvasMouseEvent>();
  @Output() onMarkerClick = new EventEmitter<ViewerGridMarkerMouseEvent>();

  viewers$: Observable<Viewer[]>;
  viewMode$: Observable<ViewMode>;
  activeViewerIndex$: Observable<number>;
  files$: Observable<Dictionary<DataFile>>;
  fileStates$: Observable<Dictionary<ImageFileState>>;
  subs: Subscription[] = [];
  activeViewerIndex: number;
  mouseDownActiveViewerIndex: number;

  constructor(private store: Store) {
    this.viewMode$ = this.store.select(WorkbenchState.getViewMode);

    this.viewers$ = combineLatest(this.store.select(WorkbenchState.getViewers), this.viewMode$)
      .pipe(map(([viewers, viewMode]) => {
        if (!viewers || viewers.length == 0) return [];
        if (viewMode == ViewMode.SINGLE) return [viewers[0]];
        return viewers;
      }));

    this.activeViewerIndex$ = this.store.select(WorkbenchState.getActiveViewerIndex);
    this.files$ = this.store.select(DataFilesState.getEntities);
    this.fileStates$ = this.store.select(ImageFilesState.getEntities);

    this.subs.push(this.activeViewerIndex$.subscribe(viewerIndex => {
      this.activeViewerIndex = viewerIndex;
    }))
  }

  ngOnInit() {
  }

  viewerTrackByFn(index, item) {
    return index;
  }

  setActiveViewer($event: Event, viewerIndex: number, viewer: Viewer) {
    this.mouseDownActiveViewerIndex = this.activeViewerIndex;
    if (viewerIndex != this.activeViewerIndex) {
      this.store.dispatch(new SetActiveViewer(viewerIndex));
      $event.preventDefault();
      $event.stopImmediatePropagation();
    }
  }

  handleImageMove($event: CanvasMouseEvent, viewerIndex: number, viewer: Viewer) {
    this.onImageMove.emit({
      viewerIndex: viewerIndex,
      viewer: viewer,
      ...$event
    });
  }

  handleImageClick($event: CanvasMouseEvent, viewerIndex: number, viewer: Viewer) {
    if(viewerIndex != this.mouseDownActiveViewerIndex) return;

    this.onImageClick.emit({
      viewerIndex: viewerIndex,
      viewer: viewer,
      ...$event
    });
  }

  handleMarkerClick($event: MarkerMouseEvent, viewerIndex: number, viewer: Viewer) {
    if(viewerIndex != this.mouseDownActiveViewerIndex) return;

    this.onMarkerClick.emit({
      viewerIndex: viewerIndex,
      viewer: viewer,
      ...$event
    });
  }


}
