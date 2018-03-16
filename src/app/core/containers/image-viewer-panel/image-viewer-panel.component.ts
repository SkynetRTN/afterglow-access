import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

import { Observable } from 'rxjs/Observable';
import { Store } from '@ngrx/store';

import * as fromRoot from '../../../reducers';
import * as fromCore from '../../reducers';
import * as fromDataFiles from '../../../data-files/reducers';
import { Dictionary } from '@ngrx/entity/src/models';
import { DataFile } from '../../../data-files/models/data-file';
import { ImageFileState } from '../../models/image-file-state';
import { Marker } from '../../models/marker';
import { BehaviorSubject } from 'rxjs';
import { CanvasMouseEvent } from '../../components/pan-zoom-canvas/pan-zoom-canvas.component';
import { MarkerMouseEvent } from '../../components/image-viewer-marker-overlay/image-viewer-marker-overlay.component';

@Component({
  selector: 'app-image-viewer-panel',
  templateUrl: './image-viewer-panel.component.html',
  styleUrls: ['./image-viewer-panel.component.css']
})
export class ImageViewerPanelComponent implements OnInit {
  @Input() fileId: string;
  @Input() showInfoBar: boolean = true;
  @Input() markers: Marker[] = [];
  
  @Output() onImageClick = new EventEmitter<CanvasMouseEvent>();
  @Output() onImageMove = new EventEmitter<CanvasMouseEvent>();
  @Output() onMarkerClick = new EventEmitter<MarkerMouseEvent>();
  
  

  files$: Observable<Dictionary<DataFile>>;
  imageFileStates$: Observable<Dictionary<ImageFileState>>;
  imageMouseX: number = null;
  imageMouseY: number = null;


  constructor(private store: Store<fromRoot.State>) {
    this.files$ = this.store.select(fromDataFiles.getDataFiles);
    this.imageFileStates$ = this.store.select(fromCore.getImageFileStates);
   }

  ngOnInit() {
  }

  handleImageMove($event: CanvasMouseEvent) {
    if ($event.hitImage) {
      this.imageMouseX = $event.imageX;
      this.imageMouseY = $event.imageY;
    }
    else {
      this.imageMouseX = null;
      this.imageMouseY = null;
    }

    this.onImageMove.emit($event); 
  }

  handleImageClick($event: CanvasMouseEvent) {
    this.onImageClick.emit($event); 
  }

  handleMarkerClick($event: MarkerMouseEvent) {
    this.onMarkerClick.emit($event); 
  }

}
