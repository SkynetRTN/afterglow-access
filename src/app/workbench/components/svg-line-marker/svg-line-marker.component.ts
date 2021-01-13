import { Component, OnInit, Input, OnChanges, ChangeDetectionStrategy } from "@angular/core";

@Component({
  selector: "[app-svg-line-marker]",
  templateUrl: "./svg-line-marker.component.html",
  styleUrls: ["./svg-line-marker.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SvgLineMarkerComponent implements OnInit, OnChanges {
  @Input() x1: number;
  @Input() y1: number;
  @Input() x2: number;
  @Input() y2: number;
  @Input() showOutline: boolean = true;
  @Input() showShadow: boolean = true;
  @Input() selected: boolean = false;

  constructor() {}

  ngOnInit() {}

  ngOnChanges() {}
}
