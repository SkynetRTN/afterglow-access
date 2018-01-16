import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: '[app-svg-circle-marker]',
  templateUrl: './svg-circle-marker.component.html',
  styleUrls: ['./svg-circle-marker.component.css']
})
export class SvgCircleMarkerComponent implements OnInit {
  @Input() x: number;
  @Input() y: number;
  @Input() radius: number;
  @Input() showOutline: boolean = true;
  @Input() showShadow: boolean = true;
  @Input() selected: boolean = false;

  constructor() { }

  ngOnInit() {
  }

}

