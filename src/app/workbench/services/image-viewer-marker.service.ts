import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Marker } from '../models/marker';

@Injectable({
  providedIn: 'root',
})
export class ImageViewerMarkerService {
  private entities: { [viewerId: string]: BehaviorSubject<Marker[]> } = {};

  constructor() {}

  getMarkerStream(viewerId: string) {
    if (!this.entities[viewerId]) {
      this.entities[viewerId] = new BehaviorSubject<Marker[]>([]);
    }
    return this.entities[viewerId];
  }

  deleteMarkerStream(viewerId: string) {
    if (viewerId in this.entities) {
      delete this.entities[viewerId];
    }
  }

  updateMarkers(viewerId: string, markers: Marker[]) {
    this.getMarkerStream(viewerId).next(markers);
  }

  clearMarkers() {
    Object.keys(this.entities).forEach((viewerId) => {
      this.entities[viewerId].next([]);
    });
  }
}
