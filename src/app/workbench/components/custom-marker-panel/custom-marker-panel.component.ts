import { Component, OnInit, HostListener, Input, OnDestroy, Output, EventEmitter } from "@angular/core";
import { map } from "rxjs/operators";
import { MarkerType, Marker } from "../../models/marker";
import { DELETE, ESCAPE } from "@angular/cdk/keycodes";
import { Router } from '@angular/router';
import { Store, Actions } from '@ngxs/store';
import { CustomMarkerPanelConfig } from '../../models/workbench-state';
import { CustomMarkerPanelState } from '../../models/marker-file-state';
import { BehaviorSubject, Observable } from 'rxjs';
import { DataFile, ImageHdu } from '../../../data-files/models/data-file';

@Component({
  selector: "app-custom-marker-panel",
  templateUrl: "./custom-marker-panel.component.html",
  styleUrls: ["./custom-marker-panel.component.css"]
})
export class CustomMarkerPanelComponent implements OnInit, OnDestroy {
  @Input() hdu: ImageHdu;
  @Input() state: CustomMarkerPanelState;
  @Input() config: CustomMarkerPanelConfig;
  
  @Output() configChange: EventEmitter<Partial<CustomMarkerPanelConfig>> = new EventEmitter();
  @Output() markerChange: EventEmitter<{id: string, changes: Partial<Marker>}> = new EventEmitter();
  @Output() markerDelete: EventEmitter<Marker[]> = new EventEmitter();

  MarkerType = MarkerType;

  constructor(private actions$: Actions, store: Store, router: Router, ) {
  }

  ngOnInit() { }

  ngOnDestroy() {
  }

  @HostListener("document:keyup", ["$event"])
  keyEvent($event: KeyboardEvent) {
    let selectedMarkers = this.getSelectedMarkers();
    if (
      selectedMarkers.length != 0
    ) {
      if ($event.keyCode === DELETE) {
        this.markerDelete.emit(selectedMarkers);
      }
      if ($event.keyCode === ESCAPE) {
        selectedMarkers.forEach(m => this.markerChange.emit({
          id: m.id,
          changes: {
            selected: false
          }
        }))
      }
    }
  }

  getSelectedMarkers() {
    let markers = Object.values(this.state.entities);
    if(!this.state || !markers) return [];
    return markers.filter(m => m.selected);
  }

  onMarkerChange($event, marker: Marker) {
    this.markerChange.emit({
      id: marker.id,
      changes: {
        ...$event
      }
    });
  }

  deleteSelectedMarkers(markers: Marker[]) {
    this.markerDelete.emit(markers)
  }

  onCentroidClicksChange($event) {
    this.configChange.emit({
      centroidClicks: $event.checked
    });
  }

  onPlanetCentroidingChange($event) {
    this.configChange.emit({
      usePlanetCentroiding: $event.checked
    });
  }

}
