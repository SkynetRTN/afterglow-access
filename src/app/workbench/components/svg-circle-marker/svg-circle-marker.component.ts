import { Component, OnInit, Input, ChangeDetectionStrategy, AfterViewInit, ChangeDetectorRef } from '@angular/core';

@Component({
  selector: '[app-svg-circle-marker]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './svg-circle-marker.component.html',
  styleUrls: ['./svg-circle-marker.component.css']
})
export class SvgCircleMarkerComponent implements OnInit, AfterViewInit {
  @Input() x: number;
  @Input() y: number;
  @Input() radius: number;
  @Input() label: string;
  @Input() showOutline: boolean = true;
  @Input() showShadow: boolean = true;
  @Input() selected: boolean = false;

  @Input() stroke: string = '#002175';
  @Input() strokeWidth: number = 3;
  @Input() selectedStroke: string = '#ff8b00';

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit() {
  }

  ngAfterViewInit() {
  }

}

