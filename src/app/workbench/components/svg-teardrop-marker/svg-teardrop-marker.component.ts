import { Component, OnInit, Input, OnChanges, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';

import { Matrix, Point } from 'paper';
// import { TeardropMarker } from '../../models/marker';

@Component({
  selector: '[app-svg-teardrop-marker]',
  templateUrl: './svg-teardrop-marker.component.html',
  styleUrls: ['./svg-teardrop-marker.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SvgTeardropMarkerComponent implements OnInit, OnChanges {
  // @Input() marker: TeardropMarker;
  @Input() showOutline: boolean = true;
  @Input() showShadow: boolean = true;

  lastTheta: number;

  constructor() { }

  getTransform() {
    return ''
    // let center = new Point(15, 26);
    // let t = new Matrix();
    // t.translate(this.marker.x - center.x - 0.5, this.marker.y - center.y - 0.5);
    // t.rotate(-this.marker.theta - 180, center);
    // t.scale(this.marker.radius / 12.8, center);
    // return `matrix(${t.a} ${t.b} ${t.c} ${t.d} ${t.tx} ${t.ty})`;
  }

  ngOnInit() { }

  ngOnChanges() { }
}
