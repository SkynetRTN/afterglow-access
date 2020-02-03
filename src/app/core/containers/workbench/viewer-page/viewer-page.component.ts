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
import { SetActiveTool, SetLastRouterPath, SetViewMode, SetActiveViewer, SetViewerSyncEnabled, SetNormalizationSyncEnabled, ImportFromSurvey } from '../../../workbench.actions';
import { DataProvidersState } from '../../../../data-providers/data-providers.state';
import { WorkbenchPageBaseComponent } from '../workbench-page-base/workbench-page-base.component';

// import { DataFile, ImageFile } from '../../../models'
// import { DataFileLibraryStore } from '../../../stores/data-file-library.store'
// import { ImageViewerComponent } from '../../../components/image-viewer/image-viewer.component'

@Component({
  selector: "app-viewer-page",
  templateUrl: "./viewer-page.component.html",
  styleUrls: ["./viewer-page.component.scss"]
  //changeDetection: ChangeDetectionStrategy.OnPush
})
export class ViewerPageComponent extends WorkbenchPageBaseComponent implements OnInit, AfterViewInit, OnDestroy {
  @HostBinding("class") @Input("class") classList: string =
    "fx-workbench-outlet";
  
  
  fileEntities$: Observable<Dictionary<DataFile>>;
  fileStateEntities$: Observable<Dictionary<ImageFileState>>;
  workbenchState$: Observable<WorkbenchStateModel>;


  

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

  constructor(private corrGen: CorrelationIdGenerator, store: Store, router: Router) {
    super(store, router);

    this.workbenchState$ = this.store.select(WorkbenchState.getState);
    this.fileEntities$ = this.store.select(DataFilesState.getEntities);
    this.fileStateEntities$ = this.store.select(ImageFilesState.getEntities);
    
    this.activeViewerId$ = this.store.select(
      WorkbenchState.getActiveViewerId
    );
    this.imageFile$ = store.select(WorkbenchState.getActiveImageFile);

    this.normalization$ = store
      .select(WorkbenchState.getActiveImageFileState)
      .pipe(
        filter(fileState => fileState != null),
        map(fileState => fileState.normalization)
      );
    this.showConfig$ = store.select(WorkbenchState.getShowConfig);
    

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

  onActiveViewerIdChange(value: string) {
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

  

  
  ngOnInit() {
  }

  ngOnDestroy() {
    this.subs.forEach(sub => sub.unsubscribe());
  }

  ngAfterViewInit() { }
}
