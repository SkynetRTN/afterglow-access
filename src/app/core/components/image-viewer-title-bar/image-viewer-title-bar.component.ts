import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Store } from '@ngrx/store';

import * as dataFileActions from '../../../data-files/actions/data-file';
import * as transformationActions from '../../actions/transformation';
import * as fromRoot from '../../../reducers';
import { ImageFile, getWidth, getHeight } from '../../../data-files/models/data-file';

@Component({
  selector: 'app-image-viewer-title-bar',
  templateUrl: './image-viewer-title-bar.component.html',
  styleUrls: ['./image-viewer-title-bar.component.scss']
})
export class ImageViewerTitleBarComponent implements OnInit {
  @Input() imageFile: ImageFile;
  @Output() downloadSnapshot = new EventEmitter();

  private zoomStepFactor: number = 0.75;

  constructor(private store: Store<fromRoot.State>) { }

  ngOnInit() {
  }

  onDownloadSnapshotClick() {
    this.downloadSnapshot.emit();
  }

  removeFromLibrary() {
    if (this.imageFile) {
      this.store.dispatch(new dataFileActions.RemoveDataFile({ fileId: this.imageFile.id }));
    }
  }

  public zoomIn(imageAnchor: { x: number, y: number } = null) {
    this.zoomBy(1.0 / this.zoomStepFactor, imageAnchor);
  }

  public zoomOut(imageAnchor: { x: number, y: number } = null) {
    this.zoomBy(this.zoomStepFactor, imageAnchor);
  }

  public zoomBy(factor: number, imageAnchor: { x: number, y: number } = null) {
    this.store.dispatch(new transformationActions.ZoomBy({
      file: this.imageFile,
      scaleFactor: factor,
      viewportAnchor: imageAnchor
    }));
  }

  public zoomToFit(padding: number = 0) {
    this.store.dispatch(new transformationActions.CenterRegionInViewport({
      file: this.imageFile,
      region: { x: 1, y: 1, width: getWidth(this.imageFile), height: getHeight(this.imageFile) }
    }))
  }

}
