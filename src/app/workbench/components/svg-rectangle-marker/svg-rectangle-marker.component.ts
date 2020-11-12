import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: '[app-svg-rectangle-marker]',
  templateUrl: './svg-rectangle-marker.component.html',
  styleUrls: ['./svg-rectangle-marker.component.css']
})
export class SvgRectangleMarkerComponent implements OnInit {
  @Input() x: number;
  @Input() y: number;
  @Input() width: number;
  @Input() height: number;
  @Input() showOutline: boolean = true;
  @Input() selected: boolean = false;

  constructor() { }

  ngOnInit() {
  }

}
