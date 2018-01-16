import { Component, OnInit, Input, Output, EventEmitter} from '@angular/core';

@Component({
  selector: '[app-svg-rectangle]',
  templateUrl: './svg-rectangle.component.html',
  styleUrls: ['./svg-rectangle.component.css']
})
export class SvgRectangleComponent implements OnInit {

  @Input() x: number;
  @Input() y: number;
  @Input() width: number;
  @Input() height: number;

  constructor() { }

  ngOnInit() {
  }

}
