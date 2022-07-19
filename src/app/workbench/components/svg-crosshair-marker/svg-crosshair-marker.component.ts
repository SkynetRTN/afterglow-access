import { ChangeDetectionStrategy, Component, Input, OnChanges, OnInit } from '@angular/core';

@Component({
  selector: '[app-svg-crosshair-marker]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './svg-crosshair-marker.component.html',
  styleUrls: ['./svg-crosshair-marker.component.scss']
})
export class SvgCrosshairMarkerComponent implements OnInit, OnChanges {
  @Input() x: number;
  @Input() y: number;
  @Input() radius: number;
  @Input() showArrow: boolean = false;
  @Input() showOutline: boolean = true;
  @Input() showShadow: boolean = true;
  @Input() stroke: string = 'rgb(0,33,117,0.9)';
  @Input() strokeWidth: number = 3;
  @Input() strokeOpacity: number = 1;

  constructor() { }

  ngOnInit() { }

  ngOnChanges() { }

}
