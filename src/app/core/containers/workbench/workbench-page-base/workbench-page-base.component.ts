import {
  Component,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  OnInit,
  HostBinding,
  Input
} from "@angular/core";

import * as moment_ from "moment";
const moment = moment_;

import { MatCheckboxChange } from "@angular/material/checkbox";
import { MatDialog } from "@angular/material/dialog";
import { Select, Store } from '@ngxs/store';
import { Observable, Subscription, combineLatest, merge, zip } from "rxjs";
import {
  map,
  flatMap,
  tap,
  filter,
  catchError,
  mergeMap,
  distinctUntilChanged,
  withLatestFrom,
  switchMap
} from "rxjs/operators";

import * as jStat from "jstat";
import { saveAs } from "file-saver/dist/FileSaver";

import {
  ImageFile, DataFile, Header
} from "../../../../data-files/models/data-file";
import {
  PhotometryFileState,
} from "../../../models/photometry-file-state";
import { ImageFileState } from "../../../models/image-file-state";
import {
  ViewerGridCanvasMouseEvent,
  ViewerGridMarkerMouseEvent
} from "../workbench-viewer-grid/workbench-viewer-grid.component";
import {
  PhotometryJob,
  PhotometryJobResult,
  PhotometryJobSettings
} from "../../../../jobs/models/photometry";
import { Router } from "@angular/router";
import { WorkbenchState } from '../../../workbench.state';
import { SetLastRouterPath } from '../../../workbench.actions';
import { DataFilesState } from '../../../../data-files/data-files.state';
import { Viewer } from '../../../models/viewer';
import { ViewMode } from '../../../models/view-mode';
import { DataFileType } from '../../../../data-files/models/data-file-type';
import { LoadDataFile } from '../../../../data-files/data-files.actions';
@Component({
  selector: "app-workbench-page-base",
  template: ``,
  styleUrls: ["./workbench-page-base.component.css"]
})
export class WorkbenchPageBaseComponent implements OnDestroy {
  inFullScreenMode$: Observable<boolean>;
  fullScreenPanel$: Observable<"file" | "viewer" | "tool">;
  showConfig$: Observable<boolean>;
  activeImageFile$: Observable<ImageFile>;
  activeImageFileState$: Observable<ImageFileState>;
  allImageFiles$: Observable<Array<ImageFile>>;
  primaryViewers$: Observable<Viewer[]>;
  secondaryViewers$: Observable<Viewer[]>;
  viewMode$: Observable<ViewMode>;
  activeViewerId$: Observable<string>;
  activeViewer$: Observable<Viewer>;
  viewerFileIds$: Observable<string[]>;
  viewerImageFiles$: Observable<ImageFile[]>;
  viewerImageFileHeaders$: Observable<Header[]>;
  fileLoaderSub: Subscription;

  constructor(
    protected store: Store,
    protected router: Router
  ) {
    this.fullScreenPanel$ = this.store.select(WorkbenchState.getFullScreenPanel);
    this.inFullScreenMode$ = this.store.select(WorkbenchState.getInFullScreenMode);
    this.showConfig$ = store.select(WorkbenchState.getShowConfig);
    this.activeImageFile$ = store.select(WorkbenchState.getActiveImageFile);
    this.activeImageFileState$ = store.select(WorkbenchState.getActiveImageFileState);
    this.allImageFiles$ = store.select(DataFilesState.getImageFiles);
    this.viewMode$ = this.store.select(WorkbenchState.getViewMode);
    this.primaryViewers$ = this.store.select(WorkbenchState.getPrimaryViewers);
    this.secondaryViewers$ = this.store.select(WorkbenchState.getSecondaryViewers);
    this.activeViewerId$ = this.store.select(WorkbenchState.getActiveViewerId);
    this.activeViewer$ = this.store.select(WorkbenchState.getActiveViewer);

    this.viewerFileIds$ = this.store.select(WorkbenchState.getViewerIds).pipe(
      flatMap(viewerIds => {
        return combineLatest(
          ...viewerIds.map(viewerId => {
            return this.store.select(WorkbenchState.getViewerById).pipe(
              map(fn => fn(viewerId).fileId),
              distinctUntilChanged()
            )
          })
        )
      })
    )

    this.viewerImageFiles$ = this.viewerFileIds$.pipe(
      flatMap(fileIds => {
        return combineLatest(
          ...fileIds.map(fileId => {
            return this.store.select(DataFilesState.getDataFileById).pipe(
              map(fn => {
                if(fileId == null || !fn(fileId) || fn(fileId).type != DataFileType.IMAGE) return null;
                return fn(fileId) as ImageFile;
              }),
              distinctUntilChanged()
            )
          })
        )
      })
    )

    this.viewerImageFileHeaders$ = this.viewerFileIds$.pipe(
      flatMap(fileIds => {
        return combineLatest(
          ...fileIds.map(fileId => {
            return this.store.select(DataFilesState.getDataFileById).pipe(
              map(fn => {
                if(fileId == null ||  !fn(fileId) || fn(fileId).type != DataFileType.IMAGE) return null;
                return fn(fileId).header;
              }),
              distinctUntilChanged()
            )
          })
        )
      })
    )

    this.fileLoaderSub = this.viewerFileIds$.subscribe(ids => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      ids.forEach(id => {
        let f = dataFiles[id];
        if(f && (!f.headerLoaded && !f.headerLoading) || (f.type == DataFileType.IMAGE || !(f as ImageFile).histLoaded) && !(f as ImageFile).histLoading) {
          this.store.dispatch(new LoadDataFile(id));
        }
      })
    })

    this.store.dispatch(
      new SetLastRouterPath(router.url)
    );
  }

  ngOnDestroy() {
    this.fileLoaderSub.unsubscribe();
  }
}

