import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  Input,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  HostBinding
} from "@angular/core";
import { Observable, Subscription, Subject } from "rxjs";
import { map, filter, auditTime, tap } from "rxjs/operators";

declare let d3: any;

import { calcLevels } from "../../../../data-files/models/image-hist";
import {
  ImageFile,
  DataFile,
  getWidth,
  getHeight
} from "../../../../data-files/models/data-file";

import { Normalization } from "../../../models/normalization";
import { Viewer } from "../../../models/viewer";
import { Transformation } from "../../../models/transformation";
import { ColorMap } from "../../../models/color-map";
import { StretchMode } from "../../../models/stretch-mode";
import { Dictionary } from "@ngrx/entity/src/models";
import { ImageFileState } from "../../../models/image-file-state";
import { Marker, MarkerType } from "../../../models/marker";
import { ViewMode } from "../../../models/view-mode";
import { WorkbenchStateModel, WorkbenchTool } from "../../../models/workbench-state";
import { environment } from "../../../../../environments/environment.prod";
import { Router } from "@angular/router";
import { MatButtonToggleChange } from "@angular/material";
import { DataProvider } from '../../../../data-providers/models/data-provider';
import { CorrelationIdGenerator } from '../../../../utils/correlated-action';
import { Store } from '@ngxs/store';
import { WorkbenchState } from '../../../workbench.state';
import { DataFilesState } from '../../../../data-files/data-files.state';
import { ImageFilesState } from '../../../image-files.state';
import { UpdateNormalizer, Flip, RotateBy, ResetImageTransform } from '../../../image-files.actions';
import { SetActiveTool, SetLastRouterPath, SetViewMode, SetActiveViewer, SetViewerSyncEnabled, SetNormalizationSyncEnabled, ImportFromSurvey, DisableMultiFileSelection } from '../../../workbench.actions';
import { DataProvidersState } from '../../../../data-providers/data-providers.state';

// import { DataFile, ImageFile } from '../../../models'
// import { DataFileLibraryStore } from '../../../stores/data-file-library.store'
// import { ImageViewerComponent } from '../../../components/image-viewer/image-viewer.component'

@Component({
  selector: "app-viewer-page",
  templateUrl: "./viewer-page.component.html",
  styleUrls: ["./viewer-page.component.scss"]
  //changeDetection: ChangeDetectionStrategy.OnPush
})
export class ViewerPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @HostBinding("class") @Input("class") classList: string =
    "fx-workbench-outlet";
  inFullScreenMode$: Observable<boolean>;
  fullScreenPanel$: Observable<"file" | "viewer" | "tool">;

  ViewMode = ViewMode;
  viewers$: Observable<Array<Viewer>>;
  activeViewerIndex$: Observable<number>;
  activeViewer$: Observable<Viewer>;
  fileEntities$: Observable<Dictionary<DataFile>>;
  fileStateEntities$: Observable<Dictionary<ImageFileState>>;
  workbenchState$: Observable<WorkbenchStateModel>;
  viewerSyncEnabled$: Observable<boolean>;
  normalizationSyncEnabled$: Observable<boolean>;

  surveyDataProvider$: Observable<DataProvider>;
  surveyImportCorrId$: Observable<string>;

  imageFile$: Observable<ImageFile>;
  normalization$: Observable<Normalization>;
  showConfig$: Observable<boolean>;
  lastImageFile: ImageFile;
  lastViewerState: Normalization;
  markers: Marker[] = [];
  subs: Subscription[] = [];

  levels$: Subject<{ background: number; peak: number }> = new Subject<{
    background: number;
    peak: number;
  }>();
  backgroundPercentile$: Subject<number> = new Subject<number>();
  peakPercentile$: Subject<number> = new Subject<number>();

  upperPercentileDefault = environment.upperPercentileDefault;
  lowerPercentileDefault = environment.lowerPercentileDefault;

  constructor(private store: Store, private router: Router, private corrGen: CorrelationIdGenerator) {
    this.fullScreenPanel$ = this.store.select(
      WorkbenchState.getFullScreenPanel
    );
    this.inFullScreenMode$ = this.store.select(
      WorkbenchState.getInFullScreenMode
    );
    this.workbenchState$ = this.store.select(WorkbenchState.getState);
    this.fileEntities$ = this.store.select(DataFilesState.getEntities);
    this.fileStateEntities$ = this.store.select(ImageFilesState.getEntities);
    this.viewers$ = this.store.select(WorkbenchState.getViewers);
    this.activeViewer$ = this.store.select(WorkbenchState.getActiveViewer);
    this.activeViewerIndex$ = this.store.select(
      WorkbenchState.getActiveViewerIndex
    );
    this.imageFile$ = store.select(WorkbenchState.getActiveImageFile);
    this.viewerSyncEnabled$ = store.select(
      WorkbenchState.getViewerSyncEnabled
    );
    this.normalizationSyncEnabled$ = store.select(
      WorkbenchState.getNormalizationSyncEnabled
    );
    this.normalization$ = store
      .select(WorkbenchState.getActiveImageFileState)
      .pipe(
        filter(fileState => fileState != null),
        map(fileState => fileState.normalization)
      );
    this.showConfig$ = store.select(WorkbenchState.getShowConfig);
    this.surveyImportCorrId$ = store.select(WorkbenchState.getSurveyImportCorrId);

    this.subs.push(
      this.imageFile$.subscribe(imageFile => {
        this.lastImageFile = imageFile;
        // if(imageFile) this.store.dispatch(new markerActions.ClearMarkers({file: imageFile}));
      })
    );

    this.subs.push(
      this.normalization$.subscribe(normalization => {
        this.lastViewerState = normalization;
      })
    );

    this.levels$.pipe(auditTime(25)).subscribe(value => {
      this.store.dispatch(
        new UpdateNormalizer(this.lastImageFile.id, { backgroundPercentile: value.background, peakPercentile: value.peak })
      );
    });

    this.backgroundPercentile$.pipe(auditTime(25)).subscribe(value => {
      this.store.dispatch(
        new UpdateNormalizer(this.lastImageFile.id, { backgroundPercentile: value })
      );
    });

    this.peakPercentile$
      .pipe(auditTime(25))

      .subscribe(value => {
        this.store.dispatch(
          new UpdateNormalizer(this.lastImageFile.id, { peakPercentile: value })
        );
      });

    this.store.dispatch(
      new SetActiveTool(WorkbenchTool.VIEWER)
    );

    this.store.dispatch(
      new SetLastRouterPath(router.url)
    );

    this.surveyDataProvider$ = this.store.select(DataProvidersState.getDataProviders).pipe(
      map(dataProviders => dataProviders.find(dp => dp.name == 'Imaging Surveys'))
    );
  }

  setViewModeOption($event: MatButtonToggleChange) {
    this.store.dispatch(
      new SetViewMode($event.value)
    );
  }

  onBackgroundPercentileChange(value: number) {
    this.backgroundPercentile$.next(value);
  }

  onPeakPercentileChange(value: number) {
    this.peakPercentile$.next(value);
  }

  onColorMapChange(value: ColorMap) {
    this.store.dispatch(
      new UpdateNormalizer(this.lastImageFile.id, { colorMap: value })
    );
  }

  onStretchModeChange(value: StretchMode) {
    this.store.dispatch(
      new UpdateNormalizer(this.lastImageFile.id, { stretchMode: value })
    );
  }

  onInvertedChange(value: boolean) {
    this.store.dispatch(
      new UpdateNormalizer(this.lastImageFile.id, { inverted: value })
    );
  }

  onPresetClick(lowerPercentile: number, upperPercentile: number) {
    this.store.dispatch(
      new UpdateNormalizer(this.lastImageFile.id,
        {
          backgroundPercentile: lowerPercentile,
          peakPercentile: upperPercentile
        }
      )
    );
  }

  onActiveViewerIndexChange(value: number) {
    this.store.dispatch(
      new SetActiveViewer(value)
    );
  }

  onInvertClick() {
    this.store.dispatch(
      new UpdateNormalizer(this.lastImageFile.id,
        {
          backgroundPercentile: this.lastViewerState.normalizer.peakPercentile,
          peakPercentile: this.lastViewerState.normalizer.backgroundPercentile
        }
      )
    );
  }

  onFlipClick() {
    this.store.dispatch(
      new Flip(this.lastImageFile.id)
    );
  }

  onRotateClick() {
    this.store.dispatch(
      new RotateBy(this.lastImageFile.id, 90)
    );
  }

  onResetOrientationClick() {
    this.store.dispatch(
      new ResetImageTransform(this.lastImageFile.id)
    );
  }

  onViewerSyncEnabledChange($event) {
    this.store.dispatch(
      new SetViewerSyncEnabled($event.checked)
    );
  }

  onNormalizationSyncEnabledChange($event) {
    this.store.dispatch(
      new SetNormalizationSyncEnabled($event.checked)
    );
  }

  importFromSurvey(surveyDataProvider: DataProvider, imageFile: ImageFile) {
    let centerRaDec = imageFile.wcs.pixToWorld([
      getWidth(imageFile) / 2,
      getHeight(imageFile) / 2
    ]);
    let pixelScale = imageFile.wcs.getPixelScale() * 60;
    let width = pixelScale * getWidth(imageFile);
    let height = pixelScale * getHeight(imageFile);

    this.store.dispatch(
      new ImportFromSurvey(
        surveyDataProvider.id,
        centerRaDec[0],
        centerRaDec[1],
        width,
        height,
        this.corrGen.next())
    );
  }

  ngOnInit() {
    this.store.dispatch(new DisableMultiFileSelection());
  }

  ngOnDestroy() {
    this.subs.forEach(sub => sub.unsubscribe());
  }

  ngAfterViewInit() { }
}
