import { Component, OnInit, Input, OnChanges, ViewChild, ElementRef, ChangeDetectionStrategy } from "@angular/core";

import { Matrix, Point } from "paper";

@Component({
  selector: "[app-svg-teardrop-marker]",
  templateUrl: "./svg-teardrop-marker.component.html",
  styleUrls: ["./svg-teardrop-marker.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SvgTeardropMarkerComponent implements OnInit, OnChanges {
  @Input() x: number;
  @Input() y: number;
  @Input() radius: number;
  @Input() theta: number = 0;
  @Input() showOutline: boolean = true;
  @Input() showShadow: boolean = true;
  @Input() selected: boolean = false;

  @ViewChild("svgGroup", { static: true }) svgGroup: ElementRef;
  lastTheta: number;

  constructor() {}

  ngOnInit() {}

  ngOnChanges() {
    let center = new Point(15, 26);
    if (!this.svgGroup) return;
    let t = new Matrix();
    t.translate(this.x - center.x, this.y - center.y);
    t.rotate(-this.theta - 180, center);
    t.scale(this.radius / 12.8, center);
    this.svgGroup.nativeElement.setAttribute("transform", `matrix(${t.a} ${t.b} ${t.c} ${t.d} ${t.tx} ${t.ty})`);
  }
}
