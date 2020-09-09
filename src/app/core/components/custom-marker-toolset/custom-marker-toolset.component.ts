import { Component, OnInit, HostListener, Input, OnDestroy, Output, EventEmitter } from "@angular/core";
import { map } from "rxjs/operators";
import { MarkerType, Marker } from "../../models/marker";
import { DELETE, ESCAPE } from "@angular/cdk/keycodes";
import { Router } from '@angular/router';
import { Store, Actions } from '@ngxs/store';
import { CustomMarkerToolsetConfig } from '../../models/workbench-state';
import { ImageFile } from '../../../data-files/models/data-file';
import { CustomMarkerState } from '../../models/marker-file-state';
import { BehaviorSubject, Observable } from 'rxjs';

export interface CustomMarkerToolsetFileState  {
  file: ImageFile;
  markers: Marker[]
}

@Component({
  selector: "app-custom-marker-toolset",
  templateUrl: "./custom-marker-toolset.component.html",
  styleUrls: ["./custom-marker-toolset.component.css"]
})
export class CustomMarkerToolsetComponent implements OnInit, OnDestroy {
  @Input() state: CustomMarkerToolsetFileState;
  @Input() config: CustomMarkerToolsetConfig;
  
  @Output() configChange: EventEmitter<Partial<CustomMarkerToolsetConfig>> = new EventEmitter();
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
    if(!this.state || !this.state.markers) return [];
    return this.state.markers.filter(m => m.selected);
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
