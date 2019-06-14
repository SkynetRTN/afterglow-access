import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ChangeDetectionStrategy,
  HostBinding,
  Input
} from "@angular/core";
import { Observable, Subscription, Subject, BehaviorSubject, combineLatest} from "rxjs";
import { map, filter, debounceTime, tap } from "rxjs/operators";
import { Store } from "@ngrx/store";

import { ImageFile, DataFile, Header, getHasWcs, getWidth, getHeight, getDegsPerPixel, getStartTime, getCenterTime, getExpLength, getObject, getTelescope, getFilter } from "../../../../data-files/models/data-file";

import * as fromCore from "../../../reducers";
import * as fromRoot from "../../../../reducers";
import * as fromDataFiles from "../../../../data-files/reducers";
import * as workbenchActions from "../../../actions/workbench";
import * as transformationActions from "../../../actions/transformation";
import * as normalizationActions from "../../../actions/normalization";
import { Dictionary } from "@ngrx/entity/src/models";
import { ImageFileState } from "../../../models/image-file-state";
import { Marker, MarkerType } from "../../../models/marker";
import { ViewMode } from "../../../models/view-mode";
import { WorkbenchState, WorkbenchTool } from "../../../models/workbench-state";
import { environment } from "../../../../../environments/environment.prod";
import { Viewer } from "../../../models/viewer";
import { DecimalPipe, DatePipe } from "@angular/common";
import { MatSlideToggleChange } from "@angular/material";
import { Router } from '@angular/router';

// import { DataFile, ImageFile } from '../../../models'
// import { DataFileLibraryStore } from '../../../stores/data-file-library.store'
// import { ImageInfoComponent } from '../../../components/image-info/image-info.component'

@Component({
  selector: "app-info-page",
  templateUrl: "./info-page.component.html",
  styleUrls: ["./info-page.component.css"],
  // changeDetection: ChangeDetectionStrategy.OnPush
})
export class InfoPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @HostBinding('class') @Input('class') classList: string = 'fx-workbench-outlet';
  inFullScreenMode$: Observable<boolean>;
  fullScreenPanel$: Observable<'file' | 'viewer' | 'tool'>;
  imageFile$: Observable<ImageFile>;
  header$: Observable<Header>;
  headerSummary$: Observable<Header>;
  viewers$: Observable<Array<Viewer>>;
  showRawHeader: boolean = false;
  useSystemTime$ = new BehaviorSubject<boolean>(true);
  
  showConfig$: Observable<boolean>;
  lastImageFile: ImageFile;
  workbenchState$: Observable<WorkbenchState>;
  fileEntities$: Observable<Dictionary<DataFile>>;
  fileStateEntities$: Observable<Dictionary<ImageFileState>>;
  activeViewerIndex$: Observable<number>;
  activeViewer$: Observable<Viewer>;
  subs: Subscription[] = [];
  columnsDisplayed = ['key', 'value', 'comment'];

  
  constructor(private store: Store<fromRoot.State>, private decimalPipe: DecimalPipe, private datePipe: DatePipe, router: Router) {
    this.fullScreenPanel$ = this.store.select(fromCore.workbench.getFullScreenPanel);
    this.inFullScreenMode$ = this.store.select(fromCore.workbench.getInFullScreenMode);
    this.workbenchState$ = this.store.select(fromCore.getWorkbenchState);
    this.fileEntities$ = this.store.select(fromDataFiles.getDataFiles);
    this.fileStateEntities$ = this.store.select(fromCore.getImageFileStates);
    this.viewers$ = this.store.select(fromCore.workbench.getViewers);
    this.activeViewer$ = this.store.select(fromCore.workbench.getActiveViewer);
    this.activeViewerIndex$ = this.store.select(
      fromCore.workbench.getActiveViewerIndex
    );
    this.imageFile$ = store.select(fromCore.workbench.getActiveFile);
    this.header$ = this.imageFile$.pipe(filter(imageFile => imageFile != null), map(imageFile => imageFile.header))
    this.headerSummary$ = combineLatest(this.useSystemTime$, this.imageFile$.pipe(filter(imageFile => imageFile != null))).pipe(map(([useSystemTime, imageFile]) => {
      let result: Header = [];
      let width = getWidth(imageFile);
      let height = getHeight(imageFile);
      let hasWcs = getHasWcs(imageFile);
      let degsPerPixel = getDegsPerPixel(imageFile);
      let startTime = getStartTime(imageFile);
      let expLength = getExpLength(imageFile);
      let centerTime = getCenterTime(imageFile);
      let telescope = getTelescope(imageFile);
      let object = getObject(imageFile);
      let filter = getFilter(imageFile);

      let systemTimeZone: string = (new Date()).getTimezoneOffset().toString();

      

      if(width && height) {
        result.push({
          key: 'Size',
          value: `${width} x ${height} pixels`,
          comment: ''
        })

        if(degsPerPixel) {
          let fovX = width*degsPerPixel;
          let fovY = height*degsPerPixel;
          let units = 'degs';
          if(fovX < 1 && fovY < 1) {
            units = 'arcmins';
            fovX *= 60;
            fovY *= 60;
          }
          result.push({
            key: 'FOV',
            value: `${decimalPipe.transform(fovX, '1.0-1')} x ${decimalPipe.transform(fovY, '1.0-1')} ${units}`,
            comment: ''
          })

          if(startTime) {
            result.push({
              key: 'Start',
              value: `${datePipe.transform(startTime, 'yyyy-MM-dd HH:mm:ss z', useSystemTime ? systemTimeZone : 'UTC')}`,
              comment: ''
            })
          }

          if(centerTime) {
            result.push({
              key: 'Center',
              value: `${datePipe.transform(centerTime, 'yyyy-MM-dd HH:mm:ss z', useSystemTime ? systemTimeZone : 'UTC')}`,
              comment: ''
            })
          }

          if(telescope) {
            result.push({
              key: 'Telescope',
              value: `${telescope}`,
              comment: ''
            })
          }

          if(filter) {
            result.push({
              key: 'Filter',
              value: `${filter}`,
              comment: ''
            })
          }

          if(expLength !== undefined) {
            result.push({
              key: 'Exp Length',
              value: `${expLength}`,
              comment: ''
            })
          }
        }
      }

      result.push({
        key: 'WCS',
        value: hasWcs,
        comment: ''
      })
      

      return result;
    }));
    
    this.showConfig$ = store.select(fromCore.workbench.getShowConfig);

    this.subs.push(
      this.imageFile$.subscribe(imageFile => {
        this.lastImageFile = imageFile;
        // if(imageFile) this.store.dispatch(new markerActions.ClearMarkers({file: imageFile}));
      })
    );

    this.store.dispatch(
      new workbenchActions.SetActiveTool({ tool: WorkbenchTool.INFO })
    );

    this.store.dispatch(
      new workbenchActions.SetLastRouterPath({path: router.url})
    )
  }

  
  ngOnInit() {
    this.store.dispatch(new workbenchActions.DisableMultiFileSelection());
  }

  ngOnDestroy() {
    this.subs.forEach(sub => sub.unsubscribe());
  }

  ngAfterViewInit() {}

  onShowRawHeaderChange($event: MatSlideToggleChange) {
    this.showRawHeader = $event.checked;
  }

  onUseSystemTimeChange($event: MatSlideToggleChange) {
    this.useSystemTime$.next($event.checked);
  }
}
