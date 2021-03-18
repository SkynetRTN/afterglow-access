import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import {
  ViewerCanvasMouseDragEvent,
  ViewerCanvasMouseEvent,
  ViewerMarkerMouseEvent,
} from '../containers/workbench-image-viewer/workbench-image-viewer.component';

@Injectable({
  providedIn: 'root',
})
export class ImageViewerEventService {
  mouseUpEvent$ = new Subject<ViewerCanvasMouseEvent>();
  mouseDownEvent$ = new Subject<ViewerCanvasMouseEvent>();
  mouseMoveEvent$ = new Subject<ViewerCanvasMouseEvent>();
  imageClickEvent$ = new Subject<ViewerCanvasMouseEvent>();
  dragEvent$ = new Subject<ViewerCanvasMouseDragEvent>();
  dropEvent$ = new Subject<ViewerCanvasMouseDragEvent>();
  markerClickEvent$ = new Subject<ViewerMarkerMouseEvent>();

  constructor() {}
}
