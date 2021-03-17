import { Component, OnInit, Input, ChangeDetectionStrategy } from '@angular/core';
import { RectangleMarker } from '../../models/marker';

@Component({
  selector: '[app-svg-rectangle-marker]',
  templateUrl: './svg-rectangle-marker.component.html',
  styleUrls: ['./svg-rectangle-marker.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SvgRectangleMarkerComponent implements OnInit {
  @Input() marker: RectangleMarker;
  @Input() showOutline: boolean = true;

  constructor() {}

  ngOnInit() {}
}
