import { ChangeDetectionStrategy, Component, Input, OnChanges, OnInit } from '@angular/core';
import { SourceMarker } from '../../models/marker';

@Component({
  selector: '[app-svg-source-marker]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './svg-source-marker.component.html',
  styleUrls: ['./svg-source-marker.component.scss']
})
export class SvgSourceMarkerComponent implements OnInit, OnChanges {
  @Input() marker: SourceMarker;
  @Input() showOutline: boolean = true;
  @Input() showShadow: boolean = true;

  constructor() { }

  ngOnInit() { }

  ngOnChanges() { }

  getStroke() {
    return this.marker?.style?.stroke || 'rgb(0,33,117,0.9)';
  }

  getSelectedStroke() {
    return this.marker?.style?.selectedStroke || '#ff8b00';
  }

  getStrokeWidth() {
    return this.marker?.style?.strokeWidth || 2;
  }

  getOpacity() {
    return this.marker?.style?.opacity || 1;
  }

  getTranslation() {
    return `translate(${this.marker.x}, ${this.marker.y})`;
  }

  getCrosshairRotation() {
    return `rotate(${-(this.marker.theta || -180) + 90})`
  }

}
