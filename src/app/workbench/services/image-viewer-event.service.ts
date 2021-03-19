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
  mouseDragEvent$ = new Subject<ViewerCanvasMouseDragEvent>();
  mouseDropEvent$ = new Subject<ViewerCanvasMouseDragEvent>();
  markerClickEvent$ = new Subject<ViewerMarkerMouseEvent>();

  constructor() {}
}
