import {
  Component, OnInit, OnDestroy, AfterViewInit, ViewChild, Input,
  ChangeDetectionStrategy
} from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Store } from '@ngrx/store';

declare let d3: any;

import { Subscription } from 'rxjs/Subscription';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/distinctUntilChanged';

import { calcLevels } from '../../../../data-files/models/image-hist';
import { ImageFile, DataFile } from '../../../../data-files/models/data-file';

import { Normalization } from '../../../models/normalization';
import { Viewer } from '../../../models/viewer';
import { Transformation } from '../../../models/transformation';
import { ColorMap } from '../../../models/color-map';
import { StretchMode } from '../../../models/stretch-mode';

import * as fromCore from '../../../reducers';
import * as fromRoot from '../../../../reducers';
import * as fromDataFiles from '../../../../data-files/reducers';
import * as workbenchActions from '../../../actions/workbench';
import * as transformationActions from '../../../actions/transformation';
import * as normalizationActions from '../../../actions/normalization';
import * as dataFileActions from '../../../../data-files/actions/data-file';
import * as imageFileActions from '../../../../data-files/actions/image-file';
import { Dictionary } from '@ngrx/entity/src/models';
import { ImageFileState } from '../../../models/image-file-state';
import { Marker, MarkerType } from '../../../models/marker';
import { ViewMode } from '../../../models/view-mode';
import { WorkbenchState } from '../../../models/workbench-state';


// import { DataFile, ImageFile } from '../../../models'
// import { DataFileLibraryStore } from '../../../stores/data-file-library.store'
// import { ImageViewerComponent } from '../../../components/image-viewer/image-viewer.component'

@Component({
  selector: 'app-viewer-page',
  templateUrl: './viewer-page.component.html',
  styleUrls: ['./viewer-page.component.css'],
  //changeDetection: ChangeDetectionStrategy.OnPush
})
export class ViewerPageComponent implements OnInit, AfterViewInit, OnDestroy {
  ViewMode = ViewMode;
  viewers$: Observable<Array<Viewer>>;
  activeViewer$: Observable<Viewer>;
  fileEntities$: Observable<Dictionary<DataFile>>;
  fileStateEntities$: Observable<Dictionary<ImageFileState>>;
  workbenchState$: Observable<WorkbenchState>;
  viewerSyncEnabled$: Observable<boolean>;
  viewerSyncAvailable$: Observable<boolean>;

  imageFile$: Observable<ImageFile>;
  normalization$: Observable<Normalization>;
  showConfig$: Observable<boolean>;
  lastImageFile: ImageFile;
  lastViewerState: Normalization;
  markers: Marker[] = [];
  subs: Subscription[] = [];

  levels$: Subject<{ background: number, peak: number }> = new Subject<{ background: number, peak: number }>();
  backgroundLevel$: Subject<number> = new Subject<number>();
  peakLevel$: Subject<number> = new Subject<number>();

  constructor(private store: Store<fromRoot.State>) {
    this.workbenchState$ = this.store.select(fromCore.getWorkbenchGlobalState);
    this.fileEntities$ = this.store.select(fromDataFiles.getDataFiles);
    this.fileStateEntities$ = this.store.select(fromCore.getImageFileStates);
    this.viewers$ = this.store.select(fromCore.workbench.getViewers);
    this.activeViewer$ = this.store.select(fromCore.workbench.getActiveViewer);
    this.imageFile$ = store.select(fromCore.workbench.getActiveFile)
    this.viewerSyncAvailable$ = store.select(fromCore.workbench.getViewerSyncAvailable);
    this.viewerSyncEnabled$ = store.select(fromCore.workbench.getViewerSyncEnabled);
    this.normalization$ = store.select(fromCore.workbench.getActiveFileState).filter(fileState => fileState != null).map(fileState => fileState.normalization);
    this.showConfig$ = store.select(fromCore.workbench.getShowConfig);

    this.subs.push(this.imageFile$.subscribe(imageFile => {
      this.lastImageFile = imageFile;
    }));

    this.subs.push(this.normalization$.subscribe(normalization => {
      this.lastViewerState = normalization;
    }));

    this.levels$
      .debounceTime(50) // wait 300ms after the last event before emitting last event
      .subscribe(value => {
        this.store.dispatch(new normalizationActions.UpdateNormalizer({ file: this.lastImageFile, changes: { backgroundLevel: value.background, peakLevel: value.peak } }));
      });


    this.backgroundLevel$
      .debounceTime(50) // wait 300ms after the last event before emitting last event
      .subscribe(value => {
        this.store.dispatch(new normalizationActions.UpdateNormalizer({ file: this.lastImageFile, changes: { backgroundLevel: value } }));
      });

    this.peakLevel$
      .debounceTime(50) // wait 300ms after the last event before emitting last event
      .subscribe(value => {
        this.store.dispatch(new normalizationActions.UpdateNormalizer({ file: this.lastImageFile, changes: { peakLevel: value } }));
      });

  }

  setViewModeOption(value) {
    this.store.dispatch(new workbenchActions.SetViewMode({ viewMode: value }));
  }

  onBackgroundLevelChange(value: number) {
    this.backgroundLevel$.next(value);
  }

  onPeakLevelChange(value: number) {
    this.peakLevel$.next(value);
  }

  onColorMapChange(value: ColorMap) {
    this.store.dispatch(new normalizationActions.UpdateNormalizer({ file: this.lastImageFile, changes: { colorMap: value } }))
  }

  onStretchModeChange(value: StretchMode) {
    this.store.dispatch(new normalizationActions.UpdateNormalizer({ file: this.lastImageFile, changes: { stretchMode: value } }))
  }

  onMinMaxClick() {
    let result = calcLevels(this.lastImageFile.hist, 10.0, 99.9999)
    this.store.dispatch(new normalizationActions.UpdateNormalizer({ file: this.lastImageFile, changes: { backgroundLevel: result.backgroundLevel, peakLevel: result.peakLevel } }));
  }

  onZScaleClick() {
    let result = calcLevels(this.lastImageFile.hist, 10.0, 99.0);
    this.store.dispatch(new normalizationActions.UpdateNormalizer({ file: this.lastImageFile, changes: { backgroundLevel: result.backgroundLevel, peakLevel: result.peakLevel } }));
  }

  onInvertClick() {
    this.store.dispatch(new normalizationActions.UpdateNormalizer({
      file: this.lastImageFile, changes: {
        backgroundLevel: this.lastViewerState.normalizer.peakLevel,
        peakLevel: this.lastViewerState.normalizer.backgroundLevel
      }
    }));
  }

  onFlipClick() {
    this.store.dispatch(new transformationActions.Flip({ file: this.lastImageFile }));
  }

  onRotateClick() {
    this.store.dispatch(new transformationActions.RotateBy({ file: this.lastImageFile, rotationAngle: 90 }));
  }

  onResetOrientationClick() {
    this.store.dispatch(new transformationActions.ResetImageTransform({ file: this.lastImageFile }));
  }

  onViewerSyncEnabledChange($event) {
    this.store.dispatch(new workbenchActions.SetViewerSyncEnabled({ enabled: $event.checked }));
  }

  ngOnInit() {
    this.store.dispatch(new workbenchActions.DisableMultiFileSelection());
  }

  ngOnDestroy() {
    this.subs.forEach(sub => sub.unsubscribe());
  }

  ngAfterViewInit() {

  }

}
