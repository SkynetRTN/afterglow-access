import { ChangeDetectionStrategy, Component, Input, OnChanges, OnInit } from '@angular/core';
import { PhotometryMarker } from '../../models/marker';

@Component({
  selector: '[app-svg-photometry-marker]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './svg-photometry-marker.component.html',
  styleUrls: ['./svg-photometry-marker.component.scss']
})
export class SvgPhotometryMarkerComponent implements OnInit, OnChanges {
  @Input() marker: PhotometryMarker;
  @Input() showOutline: boolean = true;
  @Input() showShadow: boolean = true;
  // @Input() stroke: string = 'rgb(0,33,117,0.9)';
  // @Input() selectedStroke: string = '#ff8b00';
  // @Input() strokeOpacity: number = 1;
  // @Input() strokeWidth: number = 2;



  // x: photData.x,
  // y: photData.y,
  // apertureA: photData.aperA,
  // apertureB: photData.aperB,
  // apertureTheta: photData.aperTheta,
  // annulusAIn: photData.annulusAIn,
  // annulusBIn: photData.annulusBIn,
  // annulusAOut: photData.annulusAOut,
  // annulusBOut: photData.annulusBOut,
  // labelTheta: 0,
  // labelRadius: Math.max(photData.annulusAOut, photData.annulusBOut) + 15,
  // label: showSourceLabels ? source.label : '',

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

  getApertureRotation() {
    return `rotate(${(this.marker?.photometryData?.aperTheta || 0) * (180.0 / Math.PI)})`
  }

  getCrosshairRotation() {
    return `rotate(${-(this.marker.theta || -180) + 90})`
  }

}
