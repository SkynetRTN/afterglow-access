import { Component, OnInit, Input, ViewChild, ElementRef, OnChanges, Output, EventEmitter, ChangeDetectionStrategy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { Point, Matrix, Rectangle } from "paper"
import { ImageFile } from '../../../data-files/models/data-file';
import { Marker, MarkerType, CircleMarker } from '../../models/marker';

export type MarkerMouseEvent = {
  targetFile: ImageFile;
  marker: Marker;
  mouseEvent: MouseEvent;
}

@Component({
  selector: 'app-image-viewer-marker-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './image-viewer-marker-overlay.component.html',
  styleUrls: ['./image-viewer-marker-overlay.component.css']
})
export class ImageViewerMarkerOverlayComponent implements OnInit, OnChanges, AfterViewInit {
  MarkerType = MarkerType;
  
  @Input() imageFile: ImageFile;
  @Input() transform: Matrix;
  @Input() markers: Marker[];
  @Input() svgWidth: number;
  @Input() svgHeight: number;

  @Output() onMarkerClick = new EventEmitter<MarkerMouseEvent>();

  @ViewChild('svgGroup', { static: true }) svgGroup: ElementRef;
  @ViewChild('svgTextGroup', { static: false }) svgTextGroup: ElementRef;
  @ViewChild('svgElementRef', { static: true }) svgElementRef: ElementRef;

  private lastTransform: Matrix;

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit() {
  }

  ngOnChanges() {
    if(!this.transform || !this.svgGroup || this.transform == this.lastTransform) return;
    this.lastTransform = this.transform;
    let t = this.lastTransform;
    this.svgGroup.nativeElement.setAttribute('transform', `matrix(${t.a} ${t.b} ${t.c} ${t.d} ${t.tx} ${t.ty})`);
    // this.svgTextGroup.nativeElement.setAttribute('transform', `matrix(${t.a} ${t.b} ${t.c} ${t.d} ${t.tx} ${t.ty})`);
  }

  ngAfterViewInit() {
    //this.cdr.detach();
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

  get svg() : SVGElement {
    return this.svgElementRef.nativeElement;
  }

  markerToSvgTextData(marker: Marker) {
    if(marker.type != MarkerType.CIRCLE) return null;
    let m = marker as CircleMarker;
    if(!m.label) return null;
    let p = this.transform.transform(new Point(m.x, m.y));
    let mirrored = this.transform.scaling.x < 0;
    let flipped = this.transform.scaling.y >= 0;
    let rotation = Math.round(-Math.atan2(-this.transform.b, this.transform.a)*180.0/Math.PI);
    
    
    let labelTheta = m.labelTheta;
    // console.log(labelTheta, mirrored, flipped, rotation);
    

    if(mirrored) {
      flipped = !flipped;
      labelTheta += 180;
    }
    while(labelTheta < 0) labelTheta += 360;
    labelTheta = labelTheta % 360;
    if(flipped) {
      if(labelTheta <= 180) {
        labelTheta = 180-labelTheta;
      }
      else {
        labelTheta = (180-(labelTheta-180))+180
      }
    }

    labelTheta += rotation;
    while(labelTheta < 0) labelTheta += 360;
    labelTheta = labelTheta % 360;

    let radius = m.radius + m.labelGap;
    if(radius < 0) {
      radius *= -1;
      labelTheta += 180;
      while(labelTheta < 0) labelTheta += 360;
      labelTheta = labelTheta % 360;
    }
    /*TODO: Find better way of determining line height and positioning label */
    if(labelTheta > 90 && labelTheta < 270) {
      radius += 10 * Math.abs(Math.cos(labelTheta*Math.PI/180)); // line height ?
    }
    let dx = radius * Math.sin(labelTheta*Math.PI/180);
    let dy = -radius * Math.cos(labelTheta*Math.PI/180);
    let anchor = 'middle';
    if(labelTheta > 0 && labelTheta < 180) anchor = 'start';
    if(labelTheta > 180 && labelTheta < 360) anchor = 'end';
    
    
    return {
      x: p.x,
      y: p.y,
      dx: 0,
      dy: 0,
      text: m.label,
      transform: `translate(${p.x},${p.y}) scale(${Math.abs(this.transform.scaling.x)}, ${Math.abs(this.transform.scaling.y)}) translate(${-p.x},${-p.y}) translate(${dx},${dy}) `,
      selected: m.selected,
      anchor: anchor,
    }
  }


}
