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
import { Store } from "@ngrx/store";

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

import * as fromDataProviders from "../../../../data-providers/reducers";

import * as fromCore from "../../../reducers";
import * as fromRoot from "../../../../reducers";
import * as fromDataFiles from "../../../../data-files/reducers";
import * as workbenchActions from "../../../actions/workbench";
import * as transformationActions from "../../../actions/transformation";
import * as markerActions from "../../../actions/markers";
import * as surveyActions from "../../../actions/survey";
import * as dataProviderActions from "../../../../data-providers/actions/data-provider";
import * as normalizationActions from "../../../actions/normalization";
import * as dataFileActions from "../../../../data-files/actions/data-file";
import * as imageFileActions from "../../../../data-files/actions/image-file";
import { Dictionary } from "@ngrx/entity/src/models";
import { ImageFileState } from "../../../models/image-file-state";
import { Marker, MarkerType } from "../../../models/marker";
import { ViewMode } from "../../../models/view-mode";
import { WorkbenchState, WorkbenchTool } from "../../../models/workbench-state";
import { environment } from "../../../../../environments/environment.prod";
import { Router } from "@angular/router";
import { MatButtonToggleChange } from "@angular/material";
import { DataProvider } from '../../../../data-providers/models/data-provider';
import { CorrelationIdGenerator } from '../../../../utils/correlated-action';

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
  workbenchState$: Observable<WorkbenchState>;
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

  constructor(private store: Store<fromRoot.State>, private router: Router, private corrGen: CorrelationIdGenerator) {
    this.fullScreenPanel$ = this.store.select(
      fromCore.workbench.getFullScreenPanel
    );
    this.inFullScreenMode$ = this.store.select(
      fromCore.workbench.getInFullScreenMode
    );
    this.workbenchState$ = this.store.select(fromCore.getWorkbenchState);
    this.fileEntities$ = this.store.select(fromDataFiles.getDataFiles);
    this.fileStateEntities$ = this.store.select(fromCore.getImageFileStates);
    this.viewers$ = this.store.select(fromCore.workbench.getViewers);
    this.activeViewer$ = this.store.select(fromCore.workbench.getActiveViewer);
    this.activeViewerIndex$ = this.store.select(
      fromCore.workbench.getActiveViewerIndex
    );
    this.imageFile$ = store.select(fromCore.workbench.getActiveFile);
    this.viewerSyncEnabled$ = store.select(
      fromCore.workbench.getViewerSyncEnabled
    );
    this.normalizationSyncEnabled$ = store.select(
      fromCore.workbench.getNormalizationSyncEnabled
    );
    this.normalization$ = store
      .select(fromCore.workbench.getActiveFileState)
      .pipe(
        filter(fileState => fileState != null),
        map(fileState => fileState.normalization)
      );
    this.showConfig$ = store.select(fromCore.workbench.getShowConfig);
    this.surveyImportCorrId$ = store.select(fromCore.workbench.getSurveyImportCorrId);

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
        new normalizationActions.UpdateNormalizer({
          file: this.lastImageFile,
          changes: { backgroundPercentile: value.background, peakPercentile: value.peak }
        })
      );
    });

    this.backgroundPercentile$.pipe(auditTime(25)).subscribe(value => {
      this.store.dispatch(
        new normalizationActions.UpdateNormalizer({
          file: this.lastImageFile,
          changes: { backgroundPercentile: value }
        })
      );
    });

    this.peakPercentile$
      .pipe(auditTime(25))

      .subscribe(value => {
        this.store.dispatch(
          new normalizationActions.UpdateNormalizer({
            file: this.lastImageFile,
            changes: { peakPercentile: value }
          })
        );
      });

    this.store.dispatch(
      new workbenchActions.SetActiveTool({ tool: WorkbenchTool.VIEWER })
    );

    this.store.dispatch(
      new workbenchActions.SetLastRouterPath({ path: router.url })
    );

    this.surveyDataProvider$ = this.store.select(fromDataProviders.getDataProviders).pipe(
      map(dataProviders => dataProviders.find(dp => dp.name == 'Imaging Surveys'))
    );
  }

  setViewModeOption($event: MatButtonToggleChange) {
    this.store.dispatch(
      new workbenchActions.SetViewMode({ viewMode: $event.value })
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
      new normalizationActions.UpdateNormalizer({
        file: this.lastImageFile,
        changes: { colorMap: value }
      })
    );
  }

  onStretchModeChange(value: StretchMode) {
    this.store.dispatch(
      new normalizationActions.UpdateNormalizer({
        file: this.lastImageFile,
        changes: { stretchMode: value }
      })
    );
  }

  onInvertedChange(value: boolean) {
    this.store.dispatch(
      new normalizationActions.UpdateNormalizer({
        file: this.lastImageFile,
        changes: { inverted: value }
      })
    );
  }

  onPresetClick(lowerPercentile: number, upperPercentile: number) {
    this.store.dispatch(
      new normalizationActions.UpdateNormalizer({
        file: this.lastImageFile,
        changes: {
          backgroundPercentile: lowerPercentile,
          peakPercentile: upperPercentile
        }
      })
    );
  }

  onActiveViewerIndexChange(value: number) {
    this.store.dispatch(
      new workbenchActions.SetActiveViewer({ viewerIndex: value })
    );
  }

  onInvertClick() {
    this.store.dispatch(
      new normalizationActions.UpdateNormalizer({
        file: this.lastImageFile,
        changes: {
          backgroundPercentile: this.lastViewerState.normalizer.peakPercentile,
          peakPercentile: this.lastViewerState.normalizer.backgroundPercentile
        }
      })
    );
  }

  onFlipClick() {
    this.store.dispatch(
      new transformationActions.Flip({ file: this.lastImageFile })
    );
  }

  onRotateClick() {
    this.store.dispatch(
      new transformationActions.RotateBy({
        file: this.lastImageFile,
        rotationAngle: 90
      })
    );
  }

  onResetOrientationClick() {
    this.store.dispatch(
      new transformationActions.ResetImageTransform({
        file: this.lastImageFile
      })
    );
  }

  onViewerSyncEnabledChange($event) {
    this.store.dispatch(
      new workbenchActions.SetViewerSyncEnabled({ enabled: $event.checked })
    );
  }

  onNormalizationSyncEnabledChange($event) {
    this.store.dispatch(
      new workbenchActions.SetNormalizationSyncEnabled({
        enabled: $event.checked
      })
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
      new surveyActions.ImportFromSurvey({
        surveyDataProviderId:  surveyDataProvider.id,
        raHours: centerRaDec[0],
        decDegs: centerRaDec[1],
        widthArcmins: width,
        heightArcmins: height
      },
      this.corrGen.next())
    );
  }

  ngOnInit() {
    this.store.dispatch(new workbenchActions.DisableMultiFileSelection());
  }

  ngOnDestroy() {
    this.subs.forEach(sub => sub.unsubscribe());
  }

  ngAfterViewInit() {}
}
