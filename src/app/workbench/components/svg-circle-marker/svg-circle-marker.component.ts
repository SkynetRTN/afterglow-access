import { Component, OnInit, Input, ChangeDetectionStrategy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CircleMarker } from '../../models/marker';

@Component({
  selector: '[app-svg-circle-marker]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './svg-circle-marker.component.html',
  styleUrls: ['./svg-circle-marker.component.css'],
})
export class SvgCircleMarkerComponent implements OnInit, AfterViewInit {
  @Input() marker: CircleMarker;
  @Input() showOutline: boolean = true;
  @Input() showShadow: boolean = true;

  @Input() stroke: string = 'rgb(0,33,117,0.9)';
  @Input() strokeWidth: number = 3;
  @Input() selectedStroke: string = '#ff8b00';

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {}

  ngAfterViewInit() {}
}
