import { ChangeDetectionStrategy, Component, Input, OnChanges, OnInit } from '@angular/core';
import { CrosshairMarker } from '../../models/marker';

@Component({
  selector: '[app-svg-crosshair-marker]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './svg-crosshair-marker.component.html',
  styleUrls: ['./svg-crosshair-marker.component.scss']
})
export class SvgCrosshairMarkerComponent implements OnInit, OnChanges {
  @Input() marker: CrosshairMarker;
  @Input() showOutline: boolean = true;
  @Input() showShadow: boolean = true;
  @Input() stroke: string = 'rgb(0,33,117,0.9)';
  @Input() strokeWidth: number = 3;
  @Input() selectedStroke: string = '#ff8b00';
  @Input() strokeOpacity: number = 1;

  constructor() {}

  ngOnInit() {}

  ngOnChanges() {}

  hitRegionRadius() {
    return Math.max(5, this.marker?.radius)
  }

}
