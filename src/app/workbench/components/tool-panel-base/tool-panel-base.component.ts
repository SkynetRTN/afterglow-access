import { Component, AfterViewInit, OnDestroy, OnChanges, OnInit, Input } from '@angular/core';

// import { VgAPI } from "videogular2/compiled/core";
import { Observable, combineLatest, BehaviorSubject, Subject, forkJoin } from 'rxjs';
import { map, distinctUntilChanged, switchMap, flatMap, mergeMap, tap } from 'rxjs/operators';
import { AfterglowDataFileService } from '../../services/afterglow-data-files';
import { DataFile, ImageHdu, IHdu, Header, PixelType } from '../../../data-files/models/data-file';
import { Store } from '@ngxs/store';
import { DataFilesState } from '../../../data-files/data-files.state';
import { Transform, getImageToViewportTransform } from '../../../data-files/models/transformation';
import { HduType } from '../../../data-files/models/data-file-type';
import { IViewer } from '../../models/viewer';
import { WorkbenchState } from '../../workbench.state';
import { IWorkbenchHduState, WorkbenchFileState, WorkbenchImageHduState } from '../../models/workbench-file-state';
import {
  ViewerPanelCanvasMouseDragEvent,
  ViewerPanelCanvasMouseEvent,
  ViewerPanelMarkerMouseEvent,
} from '../../containers/workbench-viewer-layout/workbench-viewer-layout.component';
import { IImageData } from '../../../data-files/models/image-data';

export interface ToolPanelViewerState {
  file: DataFile;
  // hdus: IHdu[],
  hdu: IHdu;
  header: Header;
  imageHdu: ImageHdu;
  normalizedImageData: IImageData<Uint32Array>;
  rawImageData: IImageData<PixelType>;
  fileState: WorkbenchFileState;
  hduState: IWorkbenchHduState;
  // viewportTransform: Transform,
  // imageTransform: Transform,
  // imageToViewportTransform: Transform
}

@Component({
  selector: 'app-tool-panel-base',
  templateUrl: './tool-panel-base.component.html',
  styleUrls: ['./tool-panel-base.component.scss'],
})
export class ToolPanelBaseComponent implements AfterViewInit, OnDestroy, OnChanges, OnInit {
  @Input('viewer')
  set viewer(viewer: IViewer) {
    this.viewer$.next(viewer);
  }
  get viewer() {
    return this.viewer$.getValue();
  }
  protected viewer$ = new BehaviorSubject<IViewer>(null);

  @Input('imageMouseDownEvent')
  set imageMouseDownEvent(imageMouseDownEvent: ViewerPanelCanvasMouseEvent) {
    this.imageMouseDownEvent$.next(imageMouseDownEvent);
  }
  get imageMouseDownEvent() {
    return this.imageMouseDownEvent$.getValue();
  }
  protected imageMouseDownEvent$ = new BehaviorSubject<ViewerPanelCanvasMouseEvent>(null);

  @Input('imageMouseUpEvent')
  set imageMouseUpEvent(imageMouseUpEvent: ViewerPanelCanvasMouseEvent) {
    this.imageMouseUpEvent$.next(imageMouseUpEvent);
  }
  get imageMouseUpEvent() {
    return this.imageMouseUpEvent$.getValue();
  }
  protected imageMouseUpEvent$ = new BehaviorSubject<ViewerPanelCanvasMouseEvent>(null);

  @Input('imageClickEvent')
  set imageClickEvent(imageClickEvent: ViewerPanelCanvasMouseEvent) {
    this.imageClickEvent$.next(imageClickEvent);
  }
  get imageClickEvent() {
    return this.imageClickEvent$.getValue();
  }
  protected imageClickEvent$ = new BehaviorSubject<ViewerPanelCanvasMouseEvent>(null);

  @Input('imageMouseMoveEvent')
  set imageMouseMoveEvent(imageMouseMoveEvent: ViewerPanelCanvasMouseEvent) {
    this.imageMouseMoveEvent$.next(imageMouseMoveEvent);
  }
  get imageMouseMoveEvent() {
    return this.imageMouseMoveEvent$.getValue();
  }
  protected imageMouseMoveEvent$ = new BehaviorSubject<ViewerPanelCanvasMouseEvent>(null);

  @Input('imageMouseDragStartEvent')
  set imageMouseDragStartEvent(imageMouseDragStartEvent: ViewerPanelCanvasMouseDragEvent) {
    this.imageMouseDragStartEvent$.next(imageMouseDragStartEvent);
  }
  get imageMouseDragStartEvent() {
    return this.imageMouseDragStartEvent$.getValue();
  }
  protected imageMouseDragStartEvent$ = new BehaviorSubject<ViewerPanelCanvasMouseDragEvent>(null);

  @Input('imageMouseDragEvent')
  set imageMouseDragEvent(imageMouseDragEvent: ViewerPanelCanvasMouseDragEvent) {
    this.imageMouseDragEvent$.next(imageMouseDragEvent);
  }
  get imageMouseDragEvent() {
    return this.imageMouseDragEvent$.getValue();
  }
  protected imageMouseDragEvent$ = new BehaviorSubject<ViewerPanelCanvasMouseDragEvent>(null);

  @Input('imageMouseDragEndEvent')
  set imageMouseDragEndEvent(imageMouseDragEndEvent: ViewerPanelCanvasMouseDragEvent) {
    this.imageMouseDragEndEvent$.next(imageMouseDragEndEvent);
  }
  get imageMouseDragEndEvent() {
    return this.imageMouseDragEndEvent$.getValue();
  }
  protected imageMouseDragEndEvent$ = new BehaviorSubject<ViewerPanelCanvasMouseDragEvent>(null);

  @Input('markerClickEvent')
  set markerClickEvent(markerClickEvent: ViewerPanelMarkerMouseEvent) {
    this.markerClickEvent$.next(markerClickEvent);
  }
  get markerClickEvent() {
    return this.markerClickEvent$.getValue();
  }
  protected markerClickEvent$ = new BehaviorSubject<ViewerPanelMarkerMouseEvent>(null);

  destroy$: Subject<boolean> = new Subject<boolean>();
  hduId$: Observable<string>;
  fileId$: Observable<string>;
  file$: Observable<DataFile>;
  // hduIds$: Observable<string[]>;
  // hdus$: Observable<IHdu[]>;
  hdu$: Observable<IHdu>;
  headerId$: Observable<string>;
  header$: Observable<Header>;
  imageHdu$: Observable<ImageHdu>;
  rawImageData$: Observable<IImageData<PixelType>>;
  normalizedImageData$: Observable<IImageData<Uint32Array>>;
  hduState$: Observable<IWorkbenchHduState>;
  fileState$: Observable<WorkbenchFileState>;
  // viewportTransform$: Observable<Transform>;
  // imageTransform$: Observable<Transform>;
  // imageToViewportTransform$: Observable<Transform>;
  viewportSize$: Observable<{ width: number; height: number }>;
  viewerState$: Observable<ToolPanelViewerState>;

  HduType = HduType;

  constructor(protected store: Store) {
    this.fileId$ = this.viewer$.pipe(
      map((viewer) => viewer?.fileId),
      distinctUntilChanged()
    );

    this.file$ = this.fileId$.pipe(
      switchMap((fileId) => this.store.select(DataFilesState.getFileById).pipe(map((fn) => fn(fileId))))
    );

    // this.hdus$ = this.file$.pipe(
    //   map(file => file.hduIds),
    //   distinctUntilChanged((a,b) => a && b && a.every((value, index) => b.includes(value))),
    //   mergeMap(hduIds => forkJoin(hduIds.map(id => this.store.select(DataFilesState.getHduById).pipe(
    //     map(fn => fn(id))
    //   )))),
    //   map(hdus => hdus.sort((a,b) => (a.order > b.order) ? 1 : -1))
    // )

    // this.hduIds$ = this.hdus$.pipe(
    //   map((hdus) => hdus.map(hdu => hdu.id)),
    //   distinctUntilChanged((a,b) => a && b && a.length == b.length && a.every((value, index) => b[index]==value))
    // );

    this.hduId$ = this.viewer$.pipe(
      map((viewer) => viewer?.hduId),
      distinctUntilChanged()
    );

    this.hdu$ = this.hduId$.pipe(
      switchMap((hduId) => this.store.select(DataFilesState.getHduById).pipe(map((fn) => fn(hduId))))
    );

    this.headerId$ = this.hdu$.pipe(
      map((hdu) => hdu?.headerId || null),
      distinctUntilChanged()
    );

    this.header$ = this.headerId$.pipe(
      switchMap((headerId) => this.store.select(DataFilesState.getHeaderById).pipe(map((fn) => fn(headerId))))
    );

    this.imageHdu$ = this.hdu$.pipe(map((hdu) => (hdu && hdu.hduType == HduType.IMAGE ? (hdu as ImageHdu) : null)));

    this.hduState$ = this.hduId$.pipe(
      switchMap((hduId) => this.store.select(WorkbenchState.getHduStateById).pipe(map((fn) => fn(hduId))))
    );

    this.fileState$ = this.fileId$.pipe(
      switchMap((fileId) => this.store.select(WorkbenchState.getFileStateById).pipe(map((fn) => fn(fileId))))
    );

    this.viewportSize$ = this.viewer$.pipe(map((viewer) => viewer?.viewportSize));

    this.rawImageData$ = combineLatest(this.file$, this.imageHdu$).pipe(
      map(([file, hdu]) => hdu?.rawImageDataId || null),
      distinctUntilChanged(),
      switchMap((id) => this.store.select(DataFilesState.getImageDataById).pipe(map((fn) => fn(id))))
    );

    this.normalizedImageData$ = combineLatest(this.file$, this.imageHdu$).pipe(
      map(([file, hdu]) => (hdu ? hdu.imageDataId : file?.imageDataId)),
      distinctUntilChanged(),
      switchMap((id) =>
        this.store.select(DataFilesState.getImageDataById).pipe(map((fn) => fn(id) as IImageData<Uint32Array>))
      )
    );

    // this.viewportTransform$ = this.imageHdu$.pipe(
    //   switchMap((hdu) =>
    //     this.store
    //       .select(DataFilesState.getTransformById)
    //       .pipe(map((fn) => fn(hdu?.viewportTransformId)))
    //   )
    // );

    // this.imageTransform$ = this.imageHdu$.pipe(
    //   switchMap((hdu) =>
    //     this.store
    //       .select(DataFilesState.getTransformById)
    //       .pipe(map((fn) => fn(hdu?.imageTransformId)))
    //   )
    // );

    // this.imageToViewportTransform$ = combineLatest(
    //   this.viewportTransform$,
    //   this.imageTransform$
    // ).pipe(
    //   map(([viewportTransform, imageTransform]) => {
    //     if (!viewportTransform || !imageTransform) {
    //       return null;
    //     }
    //     return getImageToViewportTransform(viewportTransform, imageTransform);
    //   })
    // );

    this.viewerState$ = combineLatest([
      this.file$,
      this.hdu$,
      this.header$,
      this.imageHdu$,
      this.rawImageData$,
      this.normalizedImageData$,
      this.fileState$,
      this.hduState$,
    ]).pipe(
      map(([file, hdu, header, imageHdu, rawImageData, normalizedImageData, fileState, hduState]) => {
        return {
          file,
          hdu,
          header,
          imageHdu,
          rawImageData,
          normalizedImageData,
          fileState,
          hduState,
        } as ToolPanelViewerState;
      })
    );
  }

  ngOnInit() {}

  ngAfterViewInit() {}

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  ngOnChanges() {}
}
