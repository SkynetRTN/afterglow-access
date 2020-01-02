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

import { ImageFile, DataFile, Header, getWidth, getHeight, getDegsPerPixel, getStartTime, getCenterTime, getExpLength, getObject, getTelescope, getFilter } from "../../../../data-files/models/data-file";

import { Dictionary } from "@ngrx/entity/src/models";
import { ImageFileState } from "../../../models/image-file-state";
import { WorkbenchStateModel, WorkbenchTool } from "../../../models/workbench-state";
import { Viewer } from "../../../models/viewer";
import { DecimalPipe, DatePipe } from "@angular/common";
import { MatSlideToggleChange } from "@angular/material/slide-toggle";
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { WorkbenchState } from '../../../workbench.state';
import { DataFilesState } from '../../../../data-files/data-files.state';
import { ImageFilesState } from '../../../image-files.state';
import { SetActiveTool, SetLastRouterPath, DisableMultiFileSelection } from '../../../workbench.actions';

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
  workbenchState$: Observable<WorkbenchStateModel>;
  fileEntities$: Observable<Dictionary<DataFile>>;
  fileStateEntities$: Observable<Dictionary<ImageFileState>>;
  activeViewerIndex$: Observable<number>;
  activeViewer$: Observable<Viewer>;
  subs: Subscription[] = [];
  columnsDisplayed = ['key', 'value', 'comment'];

  
  constructor(private store: Store, private decimalPipe: DecimalPipe, private datePipe: DatePipe, router: Router) {
    this.fullScreenPanel$ = this.store.select(WorkbenchState.getFullScreenPanel);
    this.inFullScreenMode$ = this.store.select(WorkbenchState.getInFullScreenMode);
    this.workbenchState$ = this.store.select(WorkbenchState.getState);
    this.fileEntities$ = this.store.select(DataFilesState.getEntities);
    this.fileStateEntities$ = this.store.select(ImageFilesState.getEntities);
    this.viewers$ = this.store.select(WorkbenchState.getViewers);
    this.activeViewer$ = this.store.select(WorkbenchState.getActiveViewer);
    this.activeViewerIndex$ = this.store.select(
      WorkbenchState.getActiveViewerIndex
    );
    this.imageFile$ = store.select(WorkbenchState.getActiveImageFile);
    this.header$ = this.imageFile$.pipe(filter(imageFile => imageFile != null), map(imageFile => imageFile.header))
    this.headerSummary$ = combineLatest(this.useSystemTime$, this.imageFile$.pipe(filter(imageFile => imageFile != null))).pipe(map(([useSystemTime, imageFile]) => {
      let result: Header = [];
      let width = getWidth(imageFile);
      let height = getHeight(imageFile);
      let hasWcs = imageFile.wcs.isValid();
      let degsPerPixel = getDegsPerPixel(imageFile);
      let startTime = getStartTime(imageFile);
      let expLength = getExpLength(imageFile);
      let centerTime = getCenterTime(imageFile);
      let telescope = getTelescope(imageFile);
      let object = getObject(imageFile);
      let filter = getFilter(imageFile);

      let systemTimeZone: string = (new Date()).getTimezoneOffset().toString();

      result.push({
        key: 'ID',
        value: `${imageFile.id}`,
        comment: ''
      });

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
    
    this.showConfig$ = store.select(WorkbenchState.getShowConfig);

    this.subs.push(
      this.imageFile$.subscribe(imageFile => {
        this.lastImageFile = imageFile;
        // if(imageFile) this.store.dispatch(new markerActions.ClearMarkers({file: imageFile}));
      })
    );

    this.store.dispatch(
      new SetActiveTool(WorkbenchTool.INFO)
    );

    this.store.dispatch(
      new SetLastRouterPath(router.url)
    )
  }

  
  ngOnInit() {
    this.store.dispatch(new DisableMultiFileSelection());
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
