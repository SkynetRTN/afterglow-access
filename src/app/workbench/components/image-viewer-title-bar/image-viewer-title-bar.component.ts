import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { getWidth, getHeight, DataFile, ImageHdu } from '../../../data-files/models/data-file';
import { Subject, BehaviorSubject, Observable, timer, interval } from 'rxjs';
import { filter, flatMap, takeUntil } from "rxjs/operators";
import { Store } from '@ngxs/store';
import { ZoomTo, ZoomBy, CenterRegionInViewport } from '../../workbench-file-states.actions';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { CloseHdu } from '../../../data-files/hdus.actions';

@Component({
  selector: 'app-image-viewer-title-bar',
  templateUrl: './image-viewer-title-bar.component.html',
  styleUrls: ['./image-viewer-title-bar.component.scss']
})
export class ImageViewerTitleBarComponent implements OnInit {
  @Input() hdu: ImageHdu;
  @Output() downloadSnapshot = new EventEmitter();

  private zoomStepFactor: number = 0.75;
  private startZoomIn$ = new Subject<boolean>();
  private stopZoomIn$ = new Subject<boolean>();
  
  private startZoomOut$ = new Subject<boolean>();
  private stopZoomOut$ = new Subject<boolean>();

  constructor(private store: Store, private dialog: MatDialog) {
  }

  ngOnInit() {
  }

  onDownloadSnapshotClick() {
    this.downloadSnapshot.emit();
  }

  removeFromLibrary() {
    if(!this.hdu) return;
    let imageFileId = this.hdu.id;

    let dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: "300px",
      data: {
        message: "Are you sure you want to delete this file from your library?",
        confirmationBtn: {
          color: 'warn',
          label: 'Delete File'
        }
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.store.dispatch(new CloseHdu(imageFileId));
      }
    });

  }

  public startZoomIn() {
    timer(0, 125).pipe(
      takeUntil(this.stopZoomIn$),

    ).subscribe(t => {
      this.zoomIn();
    });
  }

  public stopZoomIn() {
    this.stopZoomIn$.next(true);
  }

  public startZoomOut() {
    timer(0, 125).pipe(
      takeUntil(this.stopZoomOut$),

    ).subscribe(t => {
      this.zoomOut();
    });
  }

  public stopZoomOut() {
    this.stopZoomOut$.next(true);
  }

  public zoomIn(imageAnchor: { x: number, y: number } = null) {
    this.zoomBy(1.0 / this.zoomStepFactor, imageAnchor);
  }

  public zoomOut(imageAnchor: { x: number, y: number } = null) {
    this.zoomBy(this.zoomStepFactor, imageAnchor);
  }

  public zoomTo(value: number) {
    this.store.dispatch(new ZoomTo(
      this.hdu.id,
      value,
      null
    ));
  }

  public zoomBy(factor: number, imageAnchor: { x: number, y: number } = null) {
    this.store.dispatch(new ZoomBy(
      this.hdu.id,
      factor,
      imageAnchor
    ));
  }

  public zoomToFit(padding: number = 0) {
    this.store.dispatch(new CenterRegionInViewport(
      this.hdu.id,
      { x: 1, y: 1, width: getWidth(this.hdu), height: getHeight(this.hdu) }
    ))
  }

}
