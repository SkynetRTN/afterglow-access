import { Component, OnInit, Input, ChangeDetectionStrategy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { ApertureMarker } from '../../models/marker';

@Component({
  selector: '[app-svg-aperture-marker]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './svg-aperture-marker.component.html',
  styleUrls: ['./svg-aperture-marker.component.css'],
})
export class SvgApertureMarkerComponent implements OnInit, AfterViewInit {
  @Input() marker: ApertureMarker;
  @Input() showOutline: boolean = true;
  @Input() showShadow: boolean = true;

  @Input() apertureStroke: string = 'rgb(0,33,117,0.9)';
  @Input() innerAnnulusStroke: string = 'rgb(0,33,117,0.7)';
  @Input() outerAnnulusStroke: string = 'rgb(0,33,117,0.7)';
  @Input() strokeWidth: number = 2;
  @Input() selectedStroke: string = '#ff8b00';

  constructor(private cdr: ChangeDetectorRef) {}

  getTransform() {
    return `translate(${this.marker.x}, ${this.marker.y}) rotate(${this.marker.apertureTheta * (180.0 / Math.PI)})`;
  }

  ngOnInit() {}

  ngAfterViewInit() {}
}
