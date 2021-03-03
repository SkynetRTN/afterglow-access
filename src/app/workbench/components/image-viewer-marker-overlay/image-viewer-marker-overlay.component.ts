import {
  Component,
  OnInit,
  Input,
  ViewChild,
  ElementRef,
  OnChanges,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  AfterViewInit,
  ChangeDetectorRef,
  SimpleChange,
  SimpleChanges,
} from "@angular/core";
import { Point, Matrix, Rectangle } from "paper";
import { Marker, MarkerType, CircleMarker, TeardropMarker, RectangleMarker, LineMarker, ApertureMarker } from "../../models/marker";
import { DataFile, ImageHdu } from "../../../data-files/models/data-file";
import { Transform, transformToMatrix } from "../../../data-files/models/transformation";
import { BehaviorSubject, combineLatest, Observable } from "rxjs";
import { map, tap } from "rxjs/operators";

export type MarkerMouseEvent = {
  marker: Marker;
  mouseEvent: MouseEvent;
};

@Component({
  selector: "app-image-viewer-marker-overlay",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./image-viewer-marker-overlay.component.html",
  styleUrls: ["./image-viewer-marker-overlay.component.css"],
})
export class ImageViewerMarkerOverlayComponent implements OnInit, OnChanges, AfterViewInit {
  MarkerType = MarkerType;

  @Input("transform")
  set transform(transform: Transform) {
    this.transform$.next(transform);
  }
  get transform() {
    return this.transform$.getValue();
  }
  private transform$ = new BehaviorSubject<Transform>(null);


  @Input("markers")
  set markers(markers: Marker[]) {
    this.markers$.next(markers);
  }
  get markers() {
    return this.markers$.getValue();
  }
  private markers$ = new BehaviorSubject<Marker[]>(null);

  @Input("svgWidth")
  set svgWidth(svgWidth: number) {
    this.svgWidth$.next(svgWidth);
  }
  get svgWidth() {
    return this.svgWidth$.getValue();
  }
  private svgWidth$ = new BehaviorSubject<number>(null);

  @Input("svgHeight")
  set svgHeight(svgHeight: number) {
    this.svgHeight$.next(svgHeight);
  }
  get svgHeight() {
    return this.svgHeight$.getValue();
  }
  private svgHeight$ = new BehaviorSubject<number>(null);

  @Output() onMarkerClick = new EventEmitter<MarkerMouseEvent>();

  @ViewChild("svgGroup", { static: true }) svgGroup: ElementRef;
  @ViewChild("svgTextGroup", { static: true }) svgTextGroup: ElementRef;
  @ViewChild("svgElementRef", { static: true }) svgElementRef: ElementRef;

  transformAttr$: Observable<string>;
  circleMarkers$: Observable<CircleMarker[]>;
  rectangleMarkers$: Observable<RectangleMarker[]>;
  tearDropMarkers$: Observable<TeardropMarker[]>;
  lineMarkers$: Observable<LineMarker[]>;
  apertureMarkers$: Observable<ApertureMarker[]>;

  markerTexts$: Observable<Array<{
    x: number;
    y: number;
    dx: number;
    dy: number;
    text: string;
    transform: string;
    selected: boolean;
    anchor: string;
  }>>;

  constructor(private cdr: ChangeDetectorRef) {
    this.transformAttr$ = this.transform$.pipe(
      map(t => `matrix(${t.a} ${t.b} ${t.c} ${t.d} ${t.tx} ${t.ty})`)
    )

    this.circleMarkers$ = this.markers$.pipe(
      map(markers => markers.filter(m => m.type == MarkerType.CIRCLE) as CircleMarker[])
    )
    this.rectangleMarkers$ = this.markers$.pipe(
      map(markers => markers.filter(m => m.type == MarkerType.RECTANGLE) as RectangleMarker[])
    )

    this.tearDropMarkers$ = this.markers$.pipe(
      map(markers => markers.filter(m => m.type == MarkerType.TEARDROP) as TeardropMarker[])
    )

    this.lineMarkers$ = this.markers$.pipe(
      map(markers => markers.filter(m => m.type == MarkerType.LINE) as LineMarker[])
    )

    this.apertureMarkers$ = this.markers$.pipe(
      map(markers => markers.filter(m => m.type == MarkerType.APERTURE) as ApertureMarker[])
    )

    this.markerTexts$ = combineLatest([this.circleMarkers$, this.tearDropMarkers$, this.apertureMarkers$, this.transform$]).pipe(
      map(([circleMarkers, tearDropMarkers, apertureMarkers, transform]) => {
        if (!circleMarkers || !tearDropMarkers || !apertureMarkers) return [];
        let markers: (CircleMarker | TeardropMarker | ApertureMarker)[] = [...circleMarkers, ...tearDropMarkers, ...apertureMarkers].filter(marker => marker.label && marker.label != '');
        return markers.map(m => {
          let matrix = transformToMatrix(transform);
          let p = matrix.transform(new Point(m.x, m.y));
          let mirrored = matrix.scaling.x < 0;
          let flipped = matrix.scaling.y >= 0;
          let rotation = Math.round((-Math.atan2(-transform.b, transform.a) * 180.0) / Math.PI);

          let labelTheta = m.labelTheta;
          // console.log(labelTheta, mirrored, flipped, rotation);

          if (mirrored) {
            flipped = !flipped;
            labelTheta += 180;
          }
          while (labelTheta < 0) labelTheta += 360;
          labelTheta = labelTheta % 360;
          if (flipped) {
            if (labelTheta <= 180) {
              labelTheta = 180 - labelTheta;
            } else {
              labelTheta = 180 - (labelTheta - 180) + 180;
            }
          }

          labelTheta += rotation;
          while (labelTheta < 0) labelTheta += 360;
          labelTheta = labelTheta % 360;

          let radius = m.labelRadius;
          if (radius < 0) {
            radius *= -1;
            labelTheta += 180;
            while (labelTheta < 0) labelTheta += 360;
            labelTheta = labelTheta % 360;
          }
          /*TODO: Find better way of determining line height and positioning label */
          if (labelTheta > 90 && labelTheta < 270) {
            radius += 10 * Math.abs(Math.cos((labelTheta * Math.PI) / 180)); // line height ?
          }
          let dx = radius * Math.sin((labelTheta * Math.PI) / 180);
          let dy = -radius * Math.cos((labelTheta * Math.PI) / 180);
          let anchor = "middle";
          if (labelTheta > 0 && labelTheta < 180) anchor = "start";
          if (labelTheta > 180 && labelTheta < 360) anchor = "end";

          return {
            x: p.x,
            y: p.y,
            dx: 0,
            dy: 0,
            text: m.label ? m.label : "",
            transform: `translate(${p.x},${p.y}) scale(${Math.abs(matrix.scaling.x)}, ${Math.abs(
              matrix.scaling.y
            )}) translate(${-p.x},${-p.y}) translate(${dx},${dy}) `,
            selected: m.selected,
            anchor: anchor,
          };
        })

      })

    )
  }
  get svg(): SVGElement {
    return this.svgElementRef.nativeElement;
  }

  trackById(m: Marker) {
    return m.id;
  }

  ngOnInit() { }

  ngOnChanges(changes: SimpleChanges) {
  }

  ngAfterViewInit() {
    //this.cdr.detach();
  }

  handleMarkerClick($event: MouseEvent, marker: Marker) {
    this.onMarkerClick.emit({
      marker: marker,
      mouseEvent: $event,
    });
  }
}
