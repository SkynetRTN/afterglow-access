import {
  Component,
  OnInit,
  Input,
  ChangeDetectionStrategy,
  AfterViewInit,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
  OnChanges,
  AfterContentChecked
} from "@angular/core";
import { Point, Matrix, Rectangle } from "paper";

@Component({
  selector: "[app-svg-text-marker]",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./svg-text-marker.component.html",
  styleUrls: ["./svg-text-marker.component.css"]
})
export class SvgTextMarkerComponent implements OnInit, AfterViewInit, OnChanges, AfterContentChecked {
  @Input()
  x: number;
  @Input()
  y: number;
  @Input()
  dx: number;
  @Input()
  dy: number;
  @Input()
  text: string;
  @Input()
  selected: boolean = false;
  @Input()
  anchor: 'start' | 'middle' | 'end' | 'inherit' = 'middle';
  @Input()
  showBackground: boolean = true;

  @ViewChild("textSvgElement") textSvgElement: ElementRef;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {}

  ngAfterViewInit() {
  }

  ngAfterContentChecked() {
    // console.log(this.textSvgElement, this.textSvgElement.nativeElement.getBBox(), this.textSvgElement.nativeElement.getBoundingClientRect())
  }

  ngOnChanges() {
    
  }
}
