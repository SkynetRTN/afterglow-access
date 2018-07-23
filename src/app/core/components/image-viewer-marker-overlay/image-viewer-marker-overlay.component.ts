import { Component, OnInit, Input, ViewChild, ElementRef, OnChanges, Output, EventEmitter } from '@angular/core';
import { Point, Matrix, Rectangle } from "paper"
import { ImageFile } from '../../../data-files/models/data-file';
import { Marker } from 'svgjs';
import { MarkerType } from '../../models/marker';

export type MarkerMouseEvent = {
  targetFile: ImageFile;
  marker: Marker;
  mouseEvent: MouseEvent;
}

@Component({
  selector: 'app-image-viewer-marker-overlay',
  templateUrl: './image-viewer-marker-overlay.component.html',
  styleUrls: ['./image-viewer-marker-overlay.component.css']
})
export class ImageViewerMarkerOverlayComponent implements OnInit, OnChanges {
  MarkerType = MarkerType;
  
  @Input() imageFile: ImageFile;
  @Input() transform: Matrix;
  @Input() markerLayers: Array<Marker[]>;
  @Input() svgWidth: number;
  @Input() svgHeight: number;

  @Output() onMarkerClick = new EventEmitter<MarkerMouseEvent>();

  @ViewChild('svgGroup') svgGroup: ElementRef;

  private lastTransform: Matrix;

  constructor() { }

  ngOnInit() {
  }

  ngOnChanges() {
    if(!this.transform || !this.svgGroup || this.transform == this.lastTransform) return;
    this.lastTransform = this.transform;
    let t = this.lastTransform;
    this.svgGroup.nativeElement.setAttribute('transform', `matrix(${t.a} ${t.b} ${t.c} ${t.d} ${t.tx} ${t.ty})`);
  }

  handleMarkerClick($event: MouseEvent, marker: Marker) {
    this.onMarkerClick.emit({
      targetFile: this.imageFile,
      marker: marker,
      mouseEvent: $event
    })
  }

  trackByFn(index, item) {
    return index;
  }

}
