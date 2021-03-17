import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: '[app-svg-outlined-ellipse]',
  templateUrl: './svg-outlined-ellipse.component.html',
  styleUrls: ['./svg-outlined-ellipse.component.scss'],
})
export class SvgOutlinedEllipseComponent implements OnInit {
  @Input() cx: number;
  @Input() cy: number;
  @Input() rx: number;
  @Input() ry: number;
  @Input() strokeWidth: number = 3;
  @Input() strokeOpacity: number = 1;
  @Input() stroke: string = '#FF0000';
  @Input() outline: string = '#FFFFFF';
  @Input() outlineWidth: number = 2;
  @Input() outlineOpacity: number = 1;
  @Input() secondaryOutline: string = '#000000';
  @Input() secondaryOutlineWidth: number = 2;
  @Input() secondaryOutlineOpacity: number = 1;

  constructor() {}

  ngOnInit(): void {}
}
