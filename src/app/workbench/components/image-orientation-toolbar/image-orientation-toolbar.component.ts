import { Component, Input, OnInit } from '@angular/core';
import { Store } from '@ngxs/store';
import { Flip, ResetImageTransform, ResetViewportTransform, RotateBy } from '../../../data-files/data-files.actions';
import { DataFile, ImageHdu } from '../../../data-files/models/data-file';

@Component({
  selector: 'app-image-orientation-toolbar',
  templateUrl: './image-orientation-toolbar.component.html',
  styleUrls: ['./image-orientation-toolbar.component.scss'],
})
export class ImageOrientationToolbarComponent implements OnInit {
  @Input() data: DataFile | ImageHdu;
  @Input() viewportSize: { width: number; height: number };

  constructor(private store: Store) {}

  isDisabled() {
    return !(this.data && this.viewportSize);
  }

  onFlipClick() {
    if (!this.data || !this.viewportSize) return;
    this.store.dispatch(
      new Flip(
        this.data.imageDataId,
        this.data.imageTransformId,
        this.data.viewportTransformId,
        'horizontal',
        this.viewportSize
      )
    );
  }

  onMirrorClick() {
    if (!this.data || !this.viewportSize) return;
    this.store.dispatch(
      new Flip(
        this.data.imageDataId,
        this.data.imageTransformId,
        this.data.viewportTransformId,
        'vertical',
        this.viewportSize
      )
    );
  }

  onRotateClick() {
    if (!this.data || !this.viewportSize) return;
    this.store.dispatch(
      new RotateBy(
        this.data.imageDataId,
        this.data.imageTransformId,
        this.data.viewportTransformId,
        this.viewportSize,
        90
      )
    );
  }

  onResetOrientationClick() {
    if (!this.data || !this.viewportSize) return;
    this.store.dispatch(
      new ResetImageTransform(this.data.imageDataId, this.data.imageTransformId, this.data.viewportTransformId)
    );
    this.store.dispatch(
      new ResetViewportTransform(this.data.imageDataId, this.data.imageTransformId, this.data.viewportTransformId)
    );
  }

  ngOnInit(): void {}
}
