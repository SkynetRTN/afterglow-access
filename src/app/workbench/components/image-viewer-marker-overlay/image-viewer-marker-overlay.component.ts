import { Component, OnInit, Input, ViewChild, ElementRef, OnChanges, Output, EventEmitter, ChangeDetectionStrategy, AfterViewInit, ChangeDetectorRef, SimpleChange, SimpleChanges } from '@angular/core';
import { Point, Matrix, Rectangle } from "paper"
import { Marker, MarkerType, CircleMarker, TeardropMarker } from '../../models/marker';
import { Transform, transformToMatrix } from '../../models/transformation';
import { DataFile, ImageHdu } from '../../../data-files/models/data-file';

export type MarkerMouseEvent = {
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

  @Input() transform: Transform;
  @Input() markers: Marker[];
  @Input() svgWidth: number;
  @Input() svgHeight: number;

  @Output() onMarkerClick = new EventEmitter<MarkerMouseEvent>();

  @ViewChild('svgGroup', { static: true }) svgGroup: ElementRef;
  @ViewChild('svgTextGroup') svgTextGroup: ElementRef;
  @ViewChild('svgElementRef', { static: true }) svgElementRef: ElementRef;

  private lastTransform: Transform;
  public markerTexts: Array<{
    x: number,
    y: number,
    dx: number,
    dy: number,
    text: string,
    transform: string,
    selected: boolean,
    anchor: string
  }> = [];

  constructor(private cdr: ChangeDetectorRef) { }

  trackById(m: Marker) {
    return m.id;
  }

  ngOnInit() {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.transform) return;
    if ((changes.markers && changes.markers.previousValue != changes.markers.currentValue) || (changes.transform && changes.transform.previousValue != changes.transform.currentValue)) {
      this.updateMarkerTexts();
    }

    if (!this.svgGroup) return;

    if (changes.transform && changes.transform.previousValue != changes.transform.currentValue) {
      this.lastTransform = this.transform;
      let t = this.lastTransform;
      this.svgGroup.nativeElement.setAttribute('transform', `matrix(${t.a} ${t.b} ${t.c} ${t.d} ${t.tx} ${t.ty})`);
    }
  }

  ngAfterViewInit() {
    //this.cdr.detach();
  }

  handleMarkerClick($event: MouseEvent, marker: Marker) {
    this.onMarkerClick.emit({
      marker: marker,
      mouseEvent: $event
    })
  }


  get svg(): SVGElement {
    return this.svgElementRef.nativeElement;
  }


  updateMarkerTexts() {
    this.markerTexts = this.markers
      .filter(marker => marker.type == MarkerType.CIRCLE || marker.type == MarkerType.TEARDROP)
      .map(marker => {
        let m = marker as CircleMarker | TeardropMarker;
        let matrix = transformToMatrix(this.transform);
        let p = matrix.transform(new Point(m.x, m.y));
        let mirrored = matrix.scaling.x < 0;
        let flipped = matrix.scaling.y >= 0;
        let rotation = Math.round(-Math.atan2(-this.transform.b, this.transform.a) * 180.0 / Math.PI);


        let labelTheta = m.labelTheta;
        // console.log(labelTheta, mirrored, flipped, rotation);


        if (mirrored) {
          flipped = !flipped;
          labelTheta += 180;
        }
        while (labelTheta < 0) labelTheta += 360;
        labelTheta = labelTheta % 360;
        if (flipped) {
          if (labelTheta <= 180) {
            labelTheta = 180 - labelTheta;
          }
          else {
            labelTheta = (180 - (labelTheta - 180)) + 180
          }
        }

        labelTheta += rotation;
        while (labelTheta < 0) labelTheta += 360;
        labelTheta = labelTheta % 360;

        let radius = m.radius + m.labelGap;
        if (radius < 0) {
          radius *= -1;
          labelTheta += 180;
          while (labelTheta < 0) labelTheta += 360;
          labelTheta = labelTheta % 360;
        }
        /*TODO: Find better way of determining line height and positioning label */
        if (labelTheta > 90 && labelTheta < 270) {
          radius += 10 * Math.abs(Math.cos(labelTheta * Math.PI / 180)); // line height ?
        }
        let dx = radius * Math.sin(labelTheta * Math.PI / 180);
        let dy = -radius * Math.cos(labelTheta * Math.PI / 180);
        let anchor = 'middle';
        if (labelTheta > 0 && labelTheta < 180) anchor = 'start';
        if (labelTheta > 180 && labelTheta < 360) anchor = 'end';


        return {
          x: p.x,
          y: p.y,
          dx: 0,
          dy: 0,
          text: m.label ? m.label : '',
          transform: `translate(${p.x},${p.y}) scale(${Math.abs(matrix.scaling.x)}, ${Math.abs(matrix.scaling.y)}) translate(${-p.x},${-p.y}) translate(${dx},${dy}) `,
          selected: m.selected,
          anchor: anchor,
        }
      })

  }


}
