import {
  Component,
  OnInit,
  HostListener,
  Input,
  OnDestroy,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ViewChild,
} from '@angular/core';
import { distinctUntilChanged, map, switchMap, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import {
  MarkerType,
  Marker,
  CircleMarker,
  RectangleMarker,
  isCircleMarker,
  isRectangleMarker,
} from '../../../models/marker';
import { DELETE, ESCAPE } from '@angular/cdk/keycodes';
import { Router } from '@angular/router';
import { Store, Actions } from '@ngxs/store';
import { BehaviorSubject, Observable, combineLatest, merge, Subject } from 'rxjs';
import { DataFile, ImageLayer, ILayer, PixelType } from '../../../../data-files/models/data-file';
import { MatSelectChange } from '@angular/material/select';
import { LayerType } from '../../../../data-files/models/data-file-type';
import { WorkbenchState } from '../../../workbench.state';
import { KeyboardShortcutsComponent, ShortcutInput } from 'ng-keyboard-shortcuts';
import { centroidDisk, centroidPsf } from '../../../models/centroider';
import { ImageViewerEventService } from '../../../services/image-viewer-event.service';
import { ImageViewerMarkerService } from '../../../services/image-viewer-marker.service';
import { IImageData } from '../../../../data-files/models/image-data';
import { CustomMarkerState, CustomMarkerViewerStateModel } from '../custom-marker.state';
import { CustomMarkerPanelConfig } from '../models/custom-marker-panel-config';
import { AddCustomMarkers, DeselectCustomMarkers, EndCustomMarkerSelectionRegion, RemoveCustomMarkers, SelectCustomMarkers, SetCustomMarkerSelection, UpdateConfig, UpdateCustomMarker, UpdateCustomMarkerSelectionRegion } from '../custom-marker.actions';

@Component({
  selector: 'app-custom-marker-panel',
  templateUrl: './custom-marker-panel.component.html',
  styleUrls: ['./custom-marker-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomMarkerPanelComponent implements OnInit, OnDestroy {
  @Input('viewerId')
  set viewerId(viewer: string) {
    this.viewerId$.next(viewer);
  }
  get viewerId() {
    return this.viewerId$.getValue();
  }
  protected viewerId$ = new BehaviorSubject<string>(null);

  destroy$ = new Subject<boolean>();
  file$: Observable<DataFile>;
  layer$: Observable<ILayer>;
  rawImageData$: Observable<IImageData<PixelType>>;
  normalizedImageData$: Observable<IImageData<Uint32Array>>;
  state$: Observable<CustomMarkerViewerStateModel>;
  state: CustomMarkerViewerStateModel;
  config$: Observable<CustomMarkerPanelConfig>;
  selectedMarkers$: Observable<Marker[]>;

  LayerType = LayerType;
  MarkerType = MarkerType;
  isCircleMarker = isCircleMarker;
  isRectangleMarker = isRectangleMarker;
  shortcuts: ShortcutInput[] = [];
  @ViewChild(KeyboardShortcutsComponent) private keyboard: KeyboardShortcutsComponent;

  constructor(
    private store: Store,
    private eventService: ImageViewerEventService,
    private markerService: ImageViewerMarkerService
  ) {
    this.state$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(CustomMarkerState.getViewerStateByViewerId(viewerId)))
    );
    this.state$.pipe(takeUntil(this.destroy$)).subscribe((state) => (this.state = state));

    this.config$ = store.select(CustomMarkerState.getConfig);

    this.selectedMarkers$ = this.state$.pipe(
      map((state) => (state?.markerEntities ? Object.values(state.markerEntities) : [])),
      map((markers) => markers.filter((m) => m.selected))
    );

    this.file$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getFileByViewerId(viewerId)))
    );

    this.layer$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getLayerByViewerId(viewerId)))
    );

    this.rawImageData$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getRawImageDataByViewerId(viewerId)))
    );

    this.normalizedImageData$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getNormalizedImageDataByViewerId(viewerId)))
    );

    let imageData$ = combineLatest(this.rawImageData$, this.normalizedImageData$).pipe(
      map(([rawImageData, normalizedImageData]) => {
        return rawImageData || normalizedImageData;
      })
    );

    this.eventService.markerClickEvent$
      .pipe(takeUntil(this.destroy$), withLatestFrom(this.state$))
      .subscribe(([$event, state]) => {
        if (!$event) {
          return;
        }
        if ($event.mouseEvent.altKey) {
          return;
        }
        if (typeof $event.marker.id == 'undefined') {
          return;
        }

        if (!state.markerIds.includes($event.marker.id)) {
          return;
        }

        let customMarker = state.markerEntities[$event.marker.id];
        if (!customMarker) return;
        let customMarkerSelected = customMarker.selected;

        if ($event.mouseEvent.ctrlKey) {
          if (!customMarkerSelected) {
            // select the source
            this.selectCustomMarkers(state.id, [customMarker]);
          } else {
            // deselect the source
            this.deselectCustomMarkers(state.id, [customMarker]);
          }
        } else {
          this.store.dispatch(new SetCustomMarkerSelection(state.id, [customMarker]));
        }
        $event.mouseEvent.stopImmediatePropagation();
        $event.mouseEvent.preventDefault();
      });

    this.eventService.imageClickEvent$
      .pipe(takeUntil(this.destroy$), withLatestFrom(this.state$, this.config$, imageData$))
      .subscribe(([$event, state, settings, imageData]) => {
        if (!$event || !imageData) {
          return;
        }

        let centroidSettings = this.store.selectSnapshot(WorkbenchState.getCentroidSettings);
        let selectedCustomMarkers = Object.values(state.markerEntities).filter((marker) => marker.selected);

        if ($event.hitImage) {
          if (selectedCustomMarkers.length == 0 || $event.mouseEvent.altKey) {
            let x = $event.imageX;
            let y = $event.imageY;
            if (settings.centroidClicks) {
              let result: { x: number; y: number };
              if (settings.usePlanetCentroiding) {
                result = centroidDisk(imageData, x, y, centroidSettings);
              } else {
                result = centroidPsf(imageData, x, y, centroidSettings);
              }
              x = result.x;
              y = result.y;
            }

            let customMarker: CircleMarker = {
              type: MarkerType.CIRCLE,
              label: null,
              x: x,
              y: y,
              radius: 10,
              labelRadius: 14,
              labelTheta: 0,
            };

            this.store.dispatch(new AddCustomMarkers(state.id, [customMarker]));
          } else {
            this.store.dispatch(new SetCustomMarkerSelection(state.id, []));
          }
        }
      });

    this.eventService.mouseDragEvent$
      .pipe(takeUntil(this.destroy$), withLatestFrom(this.state$))
      .subscribe(([$event, state]) => {
        if (!$event) {
          return;
        }
        if (!$event.$mouseDownEvent.ctrlKey && !$event.$mouseDownEvent.metaKey && !$event.$mouseDownEvent.shiftKey)
          return;

        let region = {
          x: $event.imageStart.x,
          y: $event.imageStart.y,
          width: $event.imageEnd.x - $event.imageStart.x,
          height: $event.imageEnd.y - $event.imageStart.y,
        };

        this.store.dispatch(new UpdateCustomMarkerSelectionRegion(state.id, region));
      });

    this.eventService.mouseDropEvent$
      .pipe(takeUntil(this.destroy$), withLatestFrom(this.state$))
      .subscribe(([$event, state]) => {
        if (!$event) {
          return;
        }
        if (!$event.$mouseDownEvent.ctrlKey && !$event.$mouseDownEvent.metaKey && !$event.$mouseDownEvent.shiftKey)
          return;

        this.store.dispatch(
          new EndCustomMarkerSelectionRegion(state.id, $event.$mouseUpEvent.shiftKey ? 'remove' : 'append')
        );
      });
  }

  ngOnInit() {
    let visibleViewerIds$: Observable<string[]> = this.store.select(WorkbenchState.getVisibleViewerIds).pipe(
      distinctUntilChanged((x, y) => {
        return x.length == y.length && x.every((value, index) => value == y[index]);
      })
    );

    visibleViewerIds$
      .pipe(
        takeUntil(this.destroy$),
        switchMap((viewerIds) => {
          return merge(...viewerIds.map((viewerId) => this.getViewerMarkers(viewerId)));
        })
      )
      .subscribe((v) => {
        this.markerService.updateMarkers(v.viewerId, v.markers);
      });
  }

  ngOnDestroy() {
    this.markerService.clearMarkers();
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  private getViewerMarkers(viewerId: string) {
    let state$ = this.store.select(CustomMarkerState.getViewerStateByViewerId(viewerId));

    let regionSelectionMarkers$: Observable<Marker[]> = state$.pipe(
      map((state) => state?.markerSelectionRegion),
      distinctUntilChanged(),
      map((region) => {
        if (!region) return [];

        let sourceSelectionMarker: RectangleMarker = {
          id: `MARKER_SELECTION_REGION`,
          x: Math.min(region.x, region.x + region.width),
          y: Math.min(region.y, region.y + region.height),
          width: Math.abs(region.width),
          height: Math.abs(region.height),
          type: MarkerType.RECTANGLE,
        };
        return [sourceSelectionMarker];
      })
    );

    let customMarkers$ = state$.pipe(map((state) => (state ? Object.values(state.markerEntities) : [])));

    return combineLatest([regionSelectionMarkers$, customMarkers$]).pipe(
      map(([regionSelectionMarkers, customMarkers]) => {
        return {
          viewerId: viewerId,
          markers: regionSelectionMarkers.concat(customMarkers),
        };
      })
    );
  }

  selectCustomMarkers(fileId: string, customMarkers: Marker[]) {
    this.store.dispatch(new SelectCustomMarkers(fileId, customMarkers));
  }

  deselectCustomMarkers(fileId: string, customMarkers: Marker[]) {
    this.store.dispatch(new DeselectCustomMarkers(fileId, customMarkers));
  }

  ngAfterViewInit() {
    this.keyboard
      .select('del')
      .pipe(withLatestFrom(this.state$))
      .subscribe(([e, state]) => {
        this.deleteSelectedMarkers(Object.values(state.markerEntities));
      });
  }

  onMarkerChange($event: Partial<Marker>, marker: Marker) {
    if (!this.state) return;

    this.store.dispatch(new UpdateCustomMarker(this.state.id, $event.id, $event));
  }

  deleteSelectedMarkers(markers: Marker[]) {
    if (!this.state) return;
    this.store.dispatch(new RemoveCustomMarkers(this.state.id, markers));
  }

  onCentroidClicksChange($event) {
    this.store.dispatch(
      new UpdateConfig({
        centroidClicks: $event.checked,
      })
    );
  }

  onPlanetCentroidingChange($event) {
    this.store.dispatch(
      new UpdateConfig({
        usePlanetCentroiding: $event.checked,
      })
    );
  }
}
