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
import { MarkerType, Marker, CircleMarker, RectangleMarker } from '../../models/marker';
import { DELETE, ESCAPE } from '@angular/cdk/keycodes';
import { Router } from '@angular/router';
import { Store, Actions } from '@ngxs/store';
import { CustomMarkerPanelConfig } from '../../models/workbench-state';
import { CustomMarkerPanelState } from '../../models/marker-file-state';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { DataFile, ImageHdu, IHdu } from '../../../data-files/models/data-file';
import { MatSelectChange } from '@angular/material/select';
import { HduType } from '../../../data-files/models/data-file-type';
import { ToolPanelBaseComponent } from '../tool-panel-base/tool-panel-base.component';
import { WorkbenchImageHduState } from '../../models/workbench-file-state';
import { WorkbenchState } from '../../workbench.state';
import { KeyboardShortcutsComponent, ShortcutInput } from 'ng-keyboard-shortcuts';
import {
  AddCustomMarkers,
  DeselectCustomMarkers,
  RemoveCustomMarkers,
  SelectCustomMarkers,
  SetCustomMarkerSelection,
  UpdateCustomMarker,
  UpdateCustomMarkerPanelConfig,
} from '../../workbench.actions';
import { centroidDisk, centroidPsf } from '../../models/centroider';

@Component({
  selector: 'app-custom-marker-panel',
  templateUrl: './custom-marker-panel.component.html',
  styleUrls: ['./custom-marker-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomMarkerPanelComponent extends ToolPanelBaseComponent implements OnInit, OnDestroy {
  state$: Observable<CustomMarkerPanelState>;
  state: CustomMarkerPanelState;
  config$: Observable<CustomMarkerPanelConfig>;
  selectedMarkers$: Observable<Marker[]>;
  circleMarker$: Observable<CircleMarker>;
  rectangleMarker$: Observable<RectangleMarker>;

  MarkerType = MarkerType;
  shortcuts: ShortcutInput[] = [];
  @ViewChild(KeyboardShortcutsComponent) private keyboard: KeyboardShortcutsComponent;

  constructor(store: Store) {
    super(store);

    this.state$ = combineLatest(this.fileState$, this.hduState$).pipe(
      map(([fileState, hduState]) => {
        if (hduState && hduState.hduType != HduType.IMAGE) {
          // only image HDUs support custom markers
          return null;
        }
        return (hduState as WorkbenchImageHduState)?.customMarkerPanelStateId || fileState?.customMarkerPanelStateId;
      }),
      distinctUntilChanged(),
      switchMap((id) => this.store.select(WorkbenchState.getCustomMarkerPanelStateById).pipe(map((fn) => fn(id))))
    );

    this.state$.pipe(takeUntil(this.destroy$)).subscribe((state) => (this.state = state));

    this.config$ = store.select(WorkbenchState.getCustomMarkerPanelConfig);

    this.selectedMarkers$ = this.state$.pipe(
      map((state) => Object.values(state.markerEntities)),
      map((markers) => markers.filter((m) => m.selected))
    );

    this.circleMarker$ = this.selectedMarkers$.pipe(
      map((markers) =>
        markers.length == 1 && markers[0].type == MarkerType.CIRCLE ? (markers[0] as CircleMarker) : null
      )
    );
    this.rectangleMarker$ = this.selectedMarkers$.pipe(
      map((markers) =>
        markers.length == 1 && markers[0].type == MarkerType.RECTANGLE ? (markers[0] as RectangleMarker) : null
      )
    );

    let imageData$ = combineLatest(this.rawImageData$, this.normalizedImageData$).pipe(
      map(([rawImageData, normalizedImageData]) => {
        return rawImageData || normalizedImageData;
      })
    );

    this.markerClickEvent$.pipe(takeUntil(this.destroy$), withLatestFrom(this.state$)).subscribe(([$event, state]) => {
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

    this.imageClickEvent$
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
                result = centroidDisk(imageData, x, y, centroidSettings.diskCentroiderSettings);
              } else {
                result = centroidPsf(imageData, x, y, centroidSettings.psfCentroiderSettings);
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
              labelRadius: 8,
              labelTheta: 0,
            };

            this.store.dispatch(new AddCustomMarkers(state.id, [customMarker]));
          } else {
            this.store.dispatch(new SetCustomMarkerSelection(state.id, []));
          }
        }
      });
  }

  selectCustomMarkers(fileId: string, customMarkers: Marker[]) {
    this.store.dispatch(new SelectCustomMarkers(fileId, customMarkers));
  }

  deselectCustomMarkers(fileId: string, customMarkers: Marker[]) {
    this.store.dispatch(new DeselectCustomMarkers(fileId, customMarkers));
  }

  ngOnInit() {}

  ngOnDestroy() {}

  ngAfterViewInit() {
    this.keyboard
      .select('del')
      .pipe(withLatestFrom(this.state$))
      .subscribe(([e, state]) => {
        this.deleteSelectedMarkers(Object.values(state.markerEntities));
      });
  }

  onMarkerChange($event, marker: Marker) {
    if (!this.viewer || !this.state) return;

    this.store.dispatch(new UpdateCustomMarker(this.state.id, $event.id, $event.changes));
  }

  deleteSelectedMarkers(markers: Marker[]) {
    if (!this.viewer || !this.state) return;
    this.store.dispatch(new RemoveCustomMarkers(this.state.id, markers));
  }

  onCentroidClicksChange($event) {
    this.store.dispatch(
      new UpdateCustomMarkerPanelConfig({
        centroidClicks: $event.checked,
      })
    );
  }

  onPlanetCentroidingChange($event) {
    this.store.dispatch(
      new UpdateCustomMarkerPanelConfig({
        usePlanetCentroiding: $event.checked,
      })
    );
  }
}
