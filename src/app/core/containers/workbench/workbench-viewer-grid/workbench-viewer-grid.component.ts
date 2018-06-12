import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Store } from '@ngrx/store';
import { Viewer } from '../../../models/viewer';

import * as fromCore from '../../../reducers';
import * as fromRoot from '../../../../reducers';
import * as fromDataFiles from '../../../../data-files/reducers';
import * as workbenchActions from '../../../actions/workbench';
import { Dictionary } from '@ngrx/entity/src/models';
import { DataFile } from '../../../../data-files/models/data-file';
import { ImageFileState } from '../../../models/image-file-state';
import { WorkbenchState } from '../../../models/workbench-state';
import { CanvasMouseEvent } from '../../../components/pan-zoom-canvas/pan-zoom-canvas.component';
import { Marker } from '../../../models/marker';
import { MarkerMouseEvent } from '../../../components/image-viewer-marker-overlay/image-viewer-marker-overlay.component';
import { Subscription } from 'rxjs';
import { ViewMode } from '../../../models/view-mode';

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

  constructor(private store: Store<fromRoot.State>) {
    this.viewMode$ = this.store.select(fromCore.workbench.getViewMode);

    this.viewers$ = Observable.combineLatest(this.store.select(fromCore.workbench.getViewers), this.viewMode$)
      .map(([viewers, viewMode]) => {
        if (!viewers || viewers.length == 0) return [];
        if (viewMode == ViewMode.SINGLE) return [viewers[0]];
        return viewers;
      });

    this.activeViewerIndex$ = this.store.select(fromCore.workbench.getActiveViewerIndex);
    this.files$ = this.store.select(fromDataFiles.getDataFiles);
    this.fileStates$ = this.store.select(fromCore.getImageFileStates);

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
      this.store.dispatch(new workbenchActions.SetActiveViewer({ viewerIndex: viewerIndex }));
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
