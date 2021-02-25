import { Component, OnInit, Input, OnChanges, ChangeDetectionStrategy } from "@angular/core";
import { LineMarker } from '../../models/marker';

@Component({
  selector: "[app-svg-line-marker]",
  templateUrl: "./svg-line-marker.component.html",
  styleUrls: ["./svg-line-marker.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SvgLineMarkerComponent implements OnInit, OnChanges {
  @Input() marker: LineMarker;
  @Input() showOutline: boolean = true;
  @Input() showShadow: boolean = true;

  constructor() {}

  ngOnInit() {}

  ngOnChanges() {}
}
