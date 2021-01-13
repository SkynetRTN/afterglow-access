import { Component, OnInit, OnDestroy, ViewChild } from "@angular/core";
import { Observable, combineLatest, merge, of, never, empty, throwError, Subject, concat } from "rxjs";
import {
  map,
  tap,
  filter,
  distinctUntilChanged,
  switchMap,
  withLatestFrom,
  debounceTime,
  throttleTime,
  auditTime,
  skip,
  takeUntil,
  take,
  flatMap,
  catchError,
  concatAll,
} from "rxjs/operators";

import {
  DataFile,
  getWidth,
  getHeight,
  getRaHours,
  getDecDegs,
  getDegsPerPixel,
  Header,
  getSourceCoordinates,
  getCenterTime,
  ImageHdu,
  IHdu,
  PixelType,
} from "../../data-files/models/data-file";
import { SidebarView } from "../models/sidebar-view";
import { Router, ActivatedRoute } from "@angular/router";
import { Subscription } from "../../../../node_modules/rxjs";
import { HotkeysService, Hotkey } from "../../../../node_modules/angular2-hotkeys";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { Store, Actions, ofActionCompleted, ofActionDispatched } from "@ngxs/store";
import { DataFilesState } from "../../data-files/data-files.state";
import { WorkbenchState } from "../workbench.state";
import {
  SetShowConfig,
  SetFullScreen,
  SetFullScreenPanel,
  ShowSidebar,
  LoadCatalogs,
  LoadFieldCals,
  FocusFileListItem,
  SetSidebarView,
  ToggleShowConfig,
  SetViewMode,
  SetFocusedViewer,
  SetViewerSyncEnabled,
  SetNormalizationSyncEnabled,
  ImportFromSurvey,
  UpdatePhotometryPanelConfig,
  SplitViewerPanel,
  KeepViewerOpen,
  SetActiveTool,
  SetViewerMarkers,
  UpdateCustomMarkerPanelConfig,
  UpdatePlottingPanelConfig,
  UpdateFileInfoPanelConfig,
  UpdatePhotometrySettings,
  UpdateSourceExtractionSettings,
  SelectCustomMarkers,
  DeselectCustomMarkers,
  AddCustomMarkers,
  SetCustomMarkerSelection,
  UpdateCustomMarker,
  RemoveCustomMarkers,
  UpdateLine,
  StartLine,
  SetSelectedHduId,
  SyncViewerTransformations,
  SetViewerSyncMode,
  SyncViewerNormalizations,
  SyncPlottingPanelStates,
  SetFileSelection,
  SetFileListFilter,
  UpdateWcsCalibrationPanelState,
  UpdateWcsCalibrationSettings,
} from "../workbench.actions";
import {
  LoadDataProviders,
  LoadDataProvidersSuccess,
  LoadDataProvidersFail,
  ImportAssets,
  ImportAssetsCompleted,
} from "../../data-providers/data-providers.actions";
import { ViewMode } from "../models/view-mode";
import { MatButtonToggleChange } from "@angular/material/button-toggle";
import { MatRadioChange } from "@angular/material/radio";
import { MatSelectChange } from "@angular/material/select";
import { Viewer, ImageViewer, TableViewer } from "../models/viewer";
import { DataProvider } from "../../data-providers/models/data-provider";
import { CorrelationIdGenerator } from "../../utils/correlated-action";
import { DataProvidersState } from "../../data-providers/data-providers.state";
import { AlertDialogComponent, AlertDialogConfig } from "../components/alert-dialog/alert-dialog.component";
import { Navigate } from "@ngxs/router-plugin";
import { WorkbenchImageHduState } from "../models/workbench-file-state";
import {
  WorkbenchTool,
  PlottingPanelConfig,
  PhotometryPanelConfig,
  PixelOpsPanelConfig,
  AligningPanelConfig,
  StackingPanelConfig,
  ViewerPanelContainer,
  WcsCalibrationPanelState,
  WcsCalibrationSettings,
} from "../models/workbench-state";
import { CustomMarkerPanelConfig } from "../models/workbench-state";
import { Marker, MarkerType, CircleMarker, LineMarker, RectangleMarker, TeardropMarker } from "../models/marker";
import { centroidDisk, centroidPsf } from "../models/centroider";
import { PlottingPanelState } from "../models/plotter-file-state";
import { CustomMarker } from "../models/custom-marker";
import { CustomMarkerPanelState } from "../models/marker-file-state";
import { PosType, Source } from "../models/source";
import { SonifierRegionMode, SonificationPanelState } from "../models/sonifier-file-state";
import { FileInfoPanelConfig } from "../models/file-info-panel";
import { SourcesState } from "../sources.state";
import { PhotometrySettings } from "../models/photometry-settings";
import { CentroidSettings } from "../models/centroid-settings";
import { SourceExtractionSettings } from "../models/source-extraction-settings";
import { AddSources } from "../sources.actions";
import { PhotometryPanelState } from "../models/photometry-file-state";
import {
  ViewerPanelCanvasMouseEvent,
  ViewerPanelMarkerMouseEvent,
} from "./workbench-viewer-layout/workbench-viewer-layout.component";
import { HduType } from "../../data-files/models/data-file-type";
import {
  CloseAllDataFiles,
  LoadLibrary,
  LoadDataFile,
  LoadHdu,
  CloseDataFile,
  SaveDataFile,
  LoadLibrarySuccess,
  LoadLibraryFail,
  SaveDataFileSuccess,
  SaveDataFileFail,
} from "../../data-files/data-files.actions";
import { Transform, getImageToViewportTransform } from "../../data-files/models/transformation";
import { Normalization } from "../../data-files/models/normalization";
import { PixelNormalizer } from "../../data-files/models/pixel-normalizer";
import { IImageData } from "../../data-files/models/image-data";
import { Wcs } from "../../image-tools/wcs";
import { WorkbenchDataFileListComponent } from "./workbench-data-file-list/workbench-data-file-list.component";
import { view } from "paper";
import { OpenFileDialogComponent } from "../../data-providers/components/open-file-dialog/open-file-dialog.component";
import { AfterglowDataProviderService } from "../services/afterglow-data-providers";
import { HttpErrorResponse } from "@angular/common/http";
import { SaveDialogComponent } from "../../data-providers/components/save-dialog/save-dialog.component";
import {
  SaveChangesDialogComponent,
  SaveChangesDialogResult,
  FileDialogConfig,
} from "../components/file-dialog/file-dialog.component";
import { MatCheckboxChange } from "@angular/material/checkbox";
import { AfterglowDataFileService } from "../services/afterglow-data-files";
import { UUID } from "angular2-uuid";
import { BatchDownloadJob } from "../../jobs/models/batch-download";
import { JobType } from "../../jobs/models/job-types";
import { CreateJob, CreateJobSuccess, CreateJobFail } from "../../jobs/jobs.actions";
import {
  JobProgressDialogConfig,
  JobProgressDialogComponent,
} from "../components/job-progress-dialog/job-progress-dialog.component";
import { JobsState } from "../../jobs/jobs.state";
import { saveAs } from "file-saver/dist/FileSaver";
import { JobService } from "../../jobs/services/jobs";
import { WcsCalibrationJob, WcsCalibrationJobResult } from "../../jobs/models/wcs_calibration";

enum SaveFileAction {
  Save = "save",
  Discard = "discard",
  Cancel = "cancel",
}

@Component({
  selector: "app-workbench",
  templateUrl: "./workbench.component.html",
  styleUrls: ["./workbench.component.scss"],
})
export class WorkbenchComponent implements OnInit, OnDestroy {
  WorkbenchTool = WorkbenchTool;
  ViewMode = ViewMode;
  HduType = HduType;

  @ViewChild(WorkbenchDataFileListComponent) fileList: WorkbenchDataFileListComponent;

  destroy$: Subject<boolean> = new Subject<boolean>();

  layoutContainer$: Observable<ViewerPanelContainer>;

  inFullScreenMode$: Observable<boolean>;
  fullScreenPanel$: Observable<"file" | "viewer" | "tool">;
  showSidebar$: Observable<boolean>;
  sidebarView$: Observable<SidebarView>;
  files$: Observable<DataFile[]>;
  fileListFilter$: Observable<string>;
  fileListFilterInput$ = new Subject<string>();
  filteredFileIds$: Observable<string[]>;
  filteredFiles$: Observable<DataFile[]>;
  filteredHdus$: Observable<IHdu[]>;
  filteredHduIds$: Observable<string[]>;
  selectedFileIds$: Observable<string[]>;
  fileListSelectAllChecked$: Observable<boolean>;
  fileListSelectAllIndeterminate$: Observable<boolean>;

  fileEntities$: Observable<{ [id: string]: DataFile }>;
  hdus$: Observable<IHdu[]>;
  loadingFiles$: Observable<boolean>;

  viewMode$: Observable<ViewMode>;

  selectedCustomMarkers$: Observable<CustomMarker[]>;
  viewers$: Observable<Viewer[]>;
  viewerSyncEnabled$: Observable<boolean>;
  viewerSyncMode$: Observable<"sky" | "pixel">;
  normalizationSyncEnabled$: Observable<boolean>;
  surveyDataProvider$: Observable<DataProvider>;
  surveyImportCorrId$: Observable<string>;
  dssImportLoading$: Observable<boolean>;
  activeTool$: Observable<WorkbenchTool>;
  showConfig$: Observable<boolean>;

  focusedViewer$: Observable<Viewer>;
  focusedViewerId$: Observable<string>;
  canSplitFocusedViewer$: Observable<boolean>;
  focusedImageViewer$: Observable<ImageViewer>;
  focusedImageViewerId$: Observable<string>;
  focusedTableViewer$: Observable<TableViewer>;
  focusedViewerFileId$: Observable<string>;
  focusedViewerFile$: Observable<DataFile>;
  focusedViewerFileHduList$: Observable<IHdu[]>;
  focusedViewerFileImageHduList$: Observable<ImageHdu[]>;
  focusedViewerHduId$: Observable<string>;
  focusedViewerHdu$: Observable<IHdu>;
  focusedViewerImageHdu$: Observable<ImageHdu>;
  focusedViewerHeader$: Observable<Header>;
  focusedViewerWcs$: Observable<Wcs>;
  focusedViewerViewportSize$: Observable<{ width: number; height: number }>;

  /** Image Viewer */
  focusedViewerRawImageData$: Observable<IImageData<PixelType>>;
  focusedViewerNormalizedImageData$: Observable<IImageData<Uint32Array>>;
  focusedViewerImageTransform$: Observable<Transform>;
  focusedViewerViewportTransform$: Observable<Transform>;
  focusedViewerImageToViewportTransform$: Observable<Transform>;
  fileInfoPanelConfig$: Observable<FileInfoPanelConfig>;
  customMarkerPanelConfig$: Observable<CustomMarkerPanelConfig>;
  customMarkerPanelState$: Observable<CustomMarkerPanelState>;
  plottingPanelState$: Observable<PlottingPanelState>;
  plottingPanelConfig$: Observable<PlottingPanelConfig>;
  plottingPanelImageData$: Observable<IImageData<PixelType>>;
  plottingPanelColorMode$: Observable<"grayscale" | "rgba">;
  sonificationPanelState$: Observable<SonificationPanelState>;
  photometryPanelConfig$: Observable<PhotometryPanelConfig>;
  photometryPanelState$: Observable<PhotometryPanelState>;
  photometryPanelSources$: Observable<Source[]>;
  pixelOpsPanelConfig$: Observable<PixelOpsPanelConfig>;
  aligningPanelConfig$: Observable<AligningPanelConfig>;
  stackingPanelConfig$: Observable<StackingPanelConfig>;

  wcsCalibrationPanelState$: Observable<WcsCalibrationPanelState>;
  wcsCalibrationSettings$: Observable<WcsCalibrationSettings>;
  wcsCalibrationActiveJob$: Observable<WcsCalibrationJob>;
  wcsCalibrationActiveJobResult$: Observable<WcsCalibrationJobResult>;

  photometrySettings$: Observable<PhotometrySettings>;
  centroidSettings$: Observable<CentroidSettings>;
  sourceExtractionSettings$: Observable<SourceExtractionSettings>;

  focusedViewerFileLastActiveHduId$: Observable<string>;
  focusedViewerFileLastActiveHdu$: Observable<IHdu>;
  focusedViewerFileLastActiveHduHeader$: Observable<Header>;
  focusedViewerFileLastActiveImageHduId$: Observable<string>;
  focusedViewerFileLastActiveImageHdu$: Observable<ImageHdu>;

  focusedDataFileListItem$: Observable<{ fileId: string; hduId: string }>;

  fileLoaderSub: Subscription;
  queryParamSub: Subscription;
  transformationSyncSub: Subscription;
  normalizationSyncSub: Subscription;
  plottingPanelSyncSub: Subscription;

  useWcsCenter: boolean = false;
  currentSidebarView = SidebarView.FILES;
  SidebarView = SidebarView;
  hotKeys: Array<Hotkey> = [];

  constructor(
    private actions$: Actions,
    private store: Store,
    private router: Router,
    private _hotkeysService: HotkeysService,
    public dialog: MatDialog,
    private corrGen: CorrelationIdGenerator,
    private activeRoute: ActivatedRoute,
    private dataProviderService: AfterglowDataProviderService,
    private dataFileService: AfterglowDataFileService,
    private jobService: JobService
  ) {
    this.files$ = this.store
      .select(DataFilesState.getFiles)
      .pipe(map((files) => files.sort((a, b) => a.name.localeCompare(b.name))));

    this.fileListFilter$ = this.store.select(WorkbenchState.getFileListFilter);
    this.fileListFilterInput$.pipe(takeUntil(this.destroy$), debounceTime(100)).subscribe((value) => {
      this.store.dispatch(new SetFileListFilter(value));
    });

    this.filteredFiles$ = this.store.select(WorkbenchState.getFilteredFiles);
    this.filteredFileIds$ = this.store.select(WorkbenchState.getFilteredFileIds);
    this.selectedFileIds$ = this.store.select(WorkbenchState.getSelectedFileIds);

    this.filteredHduIds$ = this.store
      .select(WorkbenchState.getFilteredHduIds)
      .pipe(distinctUntilChanged((a, b) => a && b && a.length == b.length && a.every((value, index) => b[index] == value)));
    this.filteredHdus$ = this.filteredHduIds$.pipe(
      switchMap((hduIds) => {
        return combineLatest(
          hduIds.map((hduId) => this.store.select(DataFilesState.getHduById).pipe(map((fn) => fn(hduId))))
        );
      })
    );

    this.fileListSelectAllChecked$ = combineLatest(this.filteredFiles$, this.selectedFileIds$).pipe(
      map(([filteredFiles, selectedFileIds]) => {
        return filteredFiles.length != 0 && selectedFileIds.length == filteredFiles.length;
      })
    );

    this.fileListSelectAllIndeterminate$ = combineLatest(this.filteredFiles$, this.selectedFileIds$).pipe(
      map(([filteredFiles, selectedFileIds]) => {
        return selectedFileIds.length != 0 && selectedFileIds.length != filteredFiles.length;
      })
    );

    this.fileEntities$ = this.store.select(DataFilesState.getFileEntities);

    this.hdus$ = this.store.select(DataFilesState.getHdus).pipe(
      map((hdus) => {
        let fileEntities = this.store.selectSnapshot(DataFilesState.getFileEntities);
        return hdus.sort((a, b) =>
          fileEntities[a.fileId].name > fileEntities[b.fileId].name
            ? 1
            : a.fileId === b.fileId
            ? a.order > b.order
              ? 1
              : -1
            : -1
        );
      })
    );

    this.viewers$ = this.store.select(WorkbenchState.getViewers);

    this.focusedViewer$ = this.store.select(WorkbenchState.getFocusedViewer);
    this.focusedViewerId$ = this.store.select(WorkbenchState.getFocusedViewerId);

    this.canSplitFocusedViewer$ = this.store.select(WorkbenchState.getViewers).pipe(
      map(viewers => viewers && viewers.length > 1)
    )

    this.focusedImageViewer$ = this.store.select(WorkbenchState.getFocusedImageViewer);
    this.focusedImageViewerId$ = this.focusedImageViewer$.pipe(
      map((imageViewer) => (imageViewer ? imageViewer.id : null)),
      distinctUntilChanged()
    );
    this.focusedTableViewer$ = this.store.select(WorkbenchState.getFocusedTableViewer);

    this.focusedViewerFile$ = this.store.select(WorkbenchState.getFocusedViewerFile);
    this.focusedViewerFileId$ = this.focusedViewerFile$.pipe(
      map((file) => (file ? file.id : null)),
      distinctUntilChanged()
    );
    this.focusedViewerHdu$ = this.store.select(WorkbenchState.getFocusedViewerHdu);
    this.focusedViewerHduId$ = this.focusedViewerHdu$.pipe(
      map((hdu) => (hdu ? hdu.id : null)),
      distinctUntilChanged()
    );
    this.focusedViewerImageHdu$ = this.store.select(WorkbenchState.getFocusedViewerImageHdu);
    this.focusedViewerViewportSize$ = this.store.select(WorkbenchState.getFocusedViewerViewportSize);

    this.focusedViewerFileHduList$ = this.focusedViewerFile$.pipe(
      distinctUntilChanged(
        (a, b) => a && b && a.hduIds.length == b.hduIds.length && a.hduIds.every((value, index) => b[index] == value)
      ),
      switchMap((file) => {
        if (!file) {
          return of([]);
        }
        return combineLatest(
          file.hduIds.map((hduId) => this.store.select(DataFilesState.getHduById).pipe(map((fn) => fn(hduId))))
        );
      })
    );

    this.focusedViewerFileImageHduList$ = this.focusedViewerFileHduList$.pipe(
      map((hdus) => (!hdus ? null : (hdus.filter((hdu) => hdu.hduType == HduType.IMAGE) as ImageHdu[])))
    );

    this.focusedViewerFileLastActiveHduId$ = combineLatest([
      this.focusedViewerFile$,
      this.focusedViewerHdu$,
      this.focusedViewerFileHduList$,
    ]).pipe(
      switchMap(([file, hdu, allHdus]) => {
        if (!file || !allHdus) {
          return of(null);
        }
        if (hdu) {
          //use the HDU assigned to the viewer
          return of(hdu.id);
        }
        if (allHdus.length == 1) {
          //if composite file assigned to viewer only has one image hdu,  use it
          return of(allHdus[0].id);
        }
        return this.store.select(WorkbenchState.getFileStateById).pipe(map((fn) => fn(file.id).selectedHduId));
      }),
      distinctUntilChanged()
    );

    this.focusedViewerFileLastActiveHdu$ = this.focusedViewerFileLastActiveHduId$.pipe(
      switchMap((hduId) => this.store.select(DataFilesState.getHduById).pipe(map((fn) => fn(hduId))))
    );

    this.focusedViewerFileLastActiveHduHeader$ = this.focusedViewerFileLastActiveHdu$.pipe(
      switchMap((hdu) => this.store.select(DataFilesState.getHeaderById).pipe(map((fn) => fn(hdu.headerId))))
    );

    this.focusedViewerFileLastActiveImageHduId$ = this.focusedViewerFileLastActiveHdu$.pipe(
      map((hdu) => (!hdu || hdu.hduType != HduType.IMAGE ? null : hdu.id)),
      distinctUntilChanged()
    );

    this.focusedViewerFileLastActiveImageHdu$ = this.focusedViewerFileLastActiveImageHduId$.pipe(
      switchMap((hduId) => this.store.select(DataFilesState.getHduById).pipe(map((fn) => fn(hduId) as ImageHdu)))
    );

    this.focusedViewerRawImageData$ = this.focusedImageViewerId$.pipe(
      switchMap((viewerId) => {
        return this.store.select(WorkbenchState.getRawImageDataIdFromViewerId).pipe(
          map((fn) => fn(viewerId)),
          distinctUntilChanged(),
          switchMap((imageDataId) => this.store.select(DataFilesState.getImageDataById).pipe(map((fn) => fn(imageDataId))))
        );
      })
    );

    this.focusedViewerNormalizedImageData$ = this.focusedImageViewerId$.pipe(
      switchMap((viewerId) => {
        return this.store.select(WorkbenchState.getNormalizedImageDataIdFromViewerId).pipe(
          map((fn) => fn(viewerId)),
          distinctUntilChanged(),
          switchMap((imageDataId) =>
            this.store.select(DataFilesState.getImageDataById).pipe(map((fn) => fn(imageDataId) as IImageData<Uint32Array>))
          )
        );
      })
    );

    this.focusedViewerImageTransform$ = this.focusedImageViewerId$.pipe(
      switchMap((viewerId) => {
        return this.store.select(WorkbenchState.getImageTransformIdFromViewerId).pipe(
          map((fn) => fn(viewerId)),
          distinctUntilChanged(),
          switchMap((transformId) => this.store.select(DataFilesState.getTransformById).pipe(map((fn) => fn(transformId))))
        );
      })
    );

    this.focusedViewerViewportTransform$ = this.focusedImageViewerId$.pipe(
      switchMap((viewerId) => {
        return this.store.select(WorkbenchState.getViewportTransformIdFromViewerId).pipe(
          map((fn) => fn(viewerId)),
          distinctUntilChanged(),
          switchMap((transformId) => this.store.select(DataFilesState.getTransformById).pipe(map((fn) => fn(transformId))))
        );
      })
    );

    this.focusedViewerImageToViewportTransform$ = combineLatest(
      this.focusedViewerImageTransform$,
      this.focusedViewerViewportTransform$
    ).pipe(
      map(([imageTransform, viewportTransform]) => {
        if (!imageTransform || !viewportTransform) {
          return null;
        }
        return getImageToViewportTransform(viewportTransform, imageTransform);
      })
    );

    this.focusedViewerHeader$ = this.focusedImageViewerId$.pipe(
      switchMap((viewerId) => {
        return this.store.select(WorkbenchState.getFirstImageHeaderIdFromViewerId).pipe(
          map((fn) => fn(viewerId)),
          distinctUntilChanged(),
          switchMap((headerId) => this.store.select(DataFilesState.getHeaderById).pipe(map((fn) => fn(headerId))))
        );
      })
    );

    this.focusedViewerWcs$ = this.focusedViewerHeader$.pipe(
      map((header) => (header ? header.wcs : null)),
      distinctUntilChanged()
    );

    this.focusedDataFileListItem$ = this.focusedViewer$.pipe(
      distinctUntilChanged((a, b) => a && b && a.fileId == b.fileId && a.hduId == b.hduId),
      map((viewer) => {
        if (!viewer) {
          return null;
        }
        let fileEntities = this.store.selectSnapshot(DataFilesState.getFileEntities);
        let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);

        let fileId = viewer.fileId;
        let hduId = viewer.hduId;
        if (viewer.hduId) {
          //if viewer HDU is from a single-hdu file, the hdus are hidden in the data file list.
          //focus the file instead

          let file = fileEntities[viewer.fileId];
          if (file && file.hduIds.length == 1) {
            hduId = null;
          }
        }

        return { fileId: fileId, hduId: hduId };
      })
    );

    this.activeTool$ = this.store.select(WorkbenchState.getActiveTool);
    this.sidebarView$ = this.store.select(WorkbenchState.getSidebarView);
    this.showConfig$ = this.store.select(WorkbenchState.getShowConfig);
    this.showSidebar$ = this.store.select(WorkbenchState.getShowSidebar);
    this.loadingFiles$ = this.store.select(DataFilesState.getLoading);
    this.viewMode$ = this.store.select(WorkbenchState.getViewMode);
    this.dssImportLoading$ = store.select(WorkbenchState.getDssImportLoading);
    this.surveyDataProvider$ = this.store
      .select(DataProvidersState.getDataProviders)
      .pipe(map((dataProviders) => dataProviders.find((dp) => dp.name == "Imaging Surveys")));

    /* VIEWER */
    this.layoutContainer$ = this.store.select(WorkbenchState.getRootViewerPanelContainer);

    /* GLOBAL SETTINGS */
    this.centroidSettings$ = this.store.select(WorkbenchState.getCentroidSettings);
    this.photometrySettings$ = this.store.select(WorkbenchState.getPhotometrySettings);
    this.sourceExtractionSettings$ = this.store.select(WorkbenchState.getSourceExtractionSettings);

    /* DISPLAY PANEL */

    /* FILE INFO PANEL */
    this.fileInfoPanelConfig$ = store.select(WorkbenchState.getFileInfoPanelConfig);

    /* CUSTOM MARKER PANEL */
    this.customMarkerPanelState$ = this.focusedImageViewerId$.pipe(
      switchMap((viewerId) => {
        return this.store.select(WorkbenchState.getCustomMarkerPanelStateIdFromViewerId).pipe(
          map((fn) => fn(viewerId)),
          distinctUntilChanged(),
          switchMap((stateId) =>
            this.store.select(WorkbenchState.getCustomMarkerPanelStateById).pipe(map((fn) => fn(stateId)))
          )
        );
      })
    );

    this.customMarkerPanelConfig$ = store.select(WorkbenchState.getCustomMarkerPanelConfig);

    /* PLOTTING PANEL */
    this.plottingPanelImageData$ = combineLatest(
      this.focusedViewerNormalizedImageData$,
      this.focusedViewerRawImageData$
    ).pipe(
      map(([normalizedImageData, rawImageData]) => {
        return rawImageData ? rawImageData : normalizedImageData;
      })
    );

    this.plottingPanelColorMode$ = combineLatest(
      this.focusedViewerNormalizedImageData$,
      this.focusedViewerRawImageData$
    ).pipe(
      map(([normalizedImageData, rawImageData]) => {
        return rawImageData ? "grayscale" : ("rgba" as "rgba" | "grayscale");
      })
    );

    this.plottingPanelState$ = this.focusedImageViewerId$.pipe(
      switchMap((viewerId) => {
        return this.store.select(WorkbenchState.getPlottingPanelStateIdFromViewerId).pipe(
          map((fn) => fn(viewerId)),
          distinctUntilChanged(),
          switchMap((stateId) => this.store.select(WorkbenchState.getPlottingPanelStateById).pipe(map((fn) => fn(stateId))))
        );
      })
    );

    this.plottingPanelConfig$ = this.store.select(WorkbenchState.getPlottingPanelConfig);

    /* SONIFICATION PANEL */
    this.sonificationPanelState$ = this.focusedImageViewerId$.pipe(
      switchMap((viewerId) => {
        return this.store.select(WorkbenchState.getSonificationPanelStateIdFromViewerId).pipe(
          map((fn) => fn(viewerId)),
          distinctUntilChanged(),
          switchMap((stateId) =>
            this.store.select(WorkbenchState.getSonificationPanelStateById).pipe(map((fn) => fn(stateId)))
          )
        );
      })
    );

    /* PHOTOMETRY PANEL */
    this.photometryPanelConfig$ = this.store.select(WorkbenchState.getPhotometryPanelConfig);

    this.photometryPanelState$ = this.focusedImageViewerId$.pipe(
      switchMap((viewerId) => {
        return this.store.select(WorkbenchState.getPhotometryPanelStateIdFromViewerId).pipe(
          map((fn) => fn(viewerId)),
          distinctUntilChanged(),
          switchMap((stateId) =>
            this.store.select(WorkbenchState.getPhotometryPanelStateById).pipe(map((fn) => fn(stateId)))
          )
        );
      })
    );

    this.photometryPanelSources$ = combineLatest(
      this.store.select(SourcesState.getSources),
      this.photometryPanelConfig$.pipe(
        map((config) => config.coordMode),
        distinctUntilChanged()
      ),
      this.photometryPanelConfig$.pipe(
        map((config) => config.showSourcesFromAllFiles),
        distinctUntilChanged()
      ),
      this.focusedViewerHduId$,
      this.focusedViewerHeader$
    ).pipe(
      filter(([sources, coordMode, showSourcesFromAllFiles, hduId, header]) => header != null),
      map(([sources, coordMode, showSourcesFromAllFiles, hduId, header]) => {
        if (!header) return [];
        if (!header.wcs || !header.wcs.isValid()) coordMode = "pixel";
        return sources.filter((source) => {
          if (coordMode != source.posType) return false;
          if (source.hduId == hduId) return true;
          if (!showSourcesFromAllFiles) return false;
          let coord = getSourceCoordinates(header, source);
          if (coord == null) return false;
          return true;
        });
      })
    );

    /* PIXEL OPS PANEL */
    this.pixelOpsPanelConfig$ = this.store.select(WorkbenchState.getPixelOpsPanelConfig);

    /* ALIGNING PANEL */
    this.aligningPanelConfig$ = this.store.select(WorkbenchState.getAligningPanelConfig);

    /* STACKING PANEL */
    this.stackingPanelConfig$ = this.store.select(WorkbenchState.getStackingPanelConfig);

    /* WCS CALIBRATION PANEL */
    this.wcsCalibrationPanelState$ = this.store.select(WorkbenchState.getWcsCalibrationPanelState);
    this.wcsCalibrationSettings$ = this.store.select(WorkbenchState.getWcsCalibrationSettings);
    let wcsCalibrationActiveJobRow$ = combineLatest([
      this.store.select(JobsState.getEntities),
      this.wcsCalibrationPanelState$.pipe(
        map(state => state ? state.activeJobId : null),
        distinctUntilChanged(),
      )
    ]).pipe(
      map(([jobEntities, activeJobId]) => {
        if(!activeJobId) return null;
        return jobEntities[activeJobId];
      })
    )

    this.wcsCalibrationActiveJob$ = wcsCalibrationActiveJobRow$.pipe(
      map(value => value ? value.job as WcsCalibrationJob : null)
    )

    this.wcsCalibrationActiveJobResult$ = wcsCalibrationActiveJobRow$.pipe(
      map(value => value ? value.result as WcsCalibrationJobResult : null)
    )

    this.viewerSyncEnabled$ = store.select(WorkbenchState.getViewerSyncEnabled);
    this.viewerSyncMode$ = store.select(WorkbenchState.getViewerSyncMode);
    this.normalizationSyncEnabled$ = store.select(WorkbenchState.getNormalizationSyncEnabled);

    this.fullScreenPanel$ = this.store.select(WorkbenchState.getFullScreenPanel);
    this.inFullScreenMode$ = this.store.select(WorkbenchState.getInFullScreenMode);
    this.queryParamSub = this.activeRoute.queryParams.subscribe((p) => {
      let tool = WorkbenchTool.VIEWER;
      if (p.tool && Object.values(WorkbenchTool).includes(p.tool)) {
        tool = p.tool;
      }

      this.store.dispatch(new SetActiveTool(tool));
    });

    let visibleViewerIds$: Observable<string[]> = this.store.select(WorkbenchState.getVisibleViewerIds).pipe(
      distinctUntilChanged((x, y) => {
        return x.length == y.length && x.every((value, index) => value == y[index]);
      })
    );

    this.transformationSyncSub = this.focusedViewerId$
      .pipe(
        filter((focusedViewerId) => focusedViewerId != null),
        switchMap((focusedViewerId) => {
          // let targetViewerIds = visibleViewerIds.filter((id) => id != focusedViewerId);

          let refHeader$ = this.store.select(WorkbenchState.getFirstImageHeaderIdFromViewerId).pipe(
            map((fn) => fn(focusedViewerId)),
            distinctUntilChanged(),
            switchMap((headerId) => this.store.select(DataFilesState.getHeaderById).pipe(map((fn) => fn(headerId)))),
            distinctUntilChanged()
            // tap(v => console.log("REF HEADER CHANGED"))
          );

          let refImageTransform$ = this.store.select(WorkbenchState.getImageTransformIdFromViewerId).pipe(
            map((fn) => fn(focusedViewerId)),
            distinctUntilChanged(),
            switchMap((transformId) =>
              this.store.select(DataFilesState.getTransformById).pipe(map((fn) => fn(transformId)))
            ),
            distinctUntilChanged()
            // tap(v => console.log("REF IMAGE TRANSFORM CHANGED"))
          );

          let refViewportTransform$ = this.store.select(WorkbenchState.getViewportTransformIdFromViewerId).pipe(
            map((fn) => fn(focusedViewerId)),
            distinctUntilChanged(),
            switchMap((transformId) =>
              this.store.select(DataFilesState.getTransformById).pipe(map((fn) => fn(transformId)))
            ),
            distinctUntilChanged()
            // tap(v => console.log("REF VIEWPORT TRANSFORM CHANGED"))
          );

          let ref$ = combineLatest(refImageTransform$, refViewportTransform$).pipe(withLatestFrom(refHeader$), skip(1));

          // detect changes to target file headers so that transforms which use WCS can be resynced once the headers load
          // let targetHeaders$ = combineLatest(
          //   targetViewerIds.map((viewerId) =>
          //     this.store.select(WorkbenchState.getHeaderIdFromViewerId).pipe(
          //       map((fn) => fn(viewerId)),
          //       distinctUntilChanged(),
          //       // tap(v => console.log("TARGET HEADER ID CHANGED: ", v)),
          //       switchMap((headerId) =>
          //         this.store.select(DataFilesState.getHeaderById).pipe(
          //           map((fn) => fn(headerId)),
          //           distinctUntilChanged()
          //         )
          //       )
          //       // tap(v => console.log("TARGET HEADER CHANGED: ", v))
          //     )
          //   )
          // );

          return combineLatest(this.viewerSyncEnabled$, this.viewerSyncMode$, visibleViewerIds$, ref$)
            .pipe
            // tap(v => console.log("SYNC EVENT"))
            ();
        })
        // auditTime(10),
      )
      .subscribe(
        ([viewerSyncEnabled, viewerSyncMode, visibleViewerIds, [[refImageTransform, refViewportTransform], refHeader]]) => {
          if (!viewerSyncEnabled || !refHeader || !refHeader.loaded || !refImageTransform || !refViewportTransform) {
            return;
          }

          // console.log("HERE!!!!!!!!!: ", viewerSyncEnabled, viewerSyncMode, refHeader, refImageTransform, refViewportTransform)
          this.store.dispatch(new SyncViewerTransformations(refHeader.id, refImageTransform.id, refViewportTransform.id));
        }
      );

    this.normalizationSyncSub = this.focusedViewerId$
      .pipe(
        filter((focusedViewerId) => focusedViewerId != null),
        switchMap((focusedViewerId) => {
          // let targetViewerIds = visibleViewerIds.filter((id) => id != focusedViewerId);
          let refImageHdu$ = this.store.select(WorkbenchState.getViewerById).pipe(
            map((fn) => fn(focusedViewerId)),
            map((viewer) => (viewer ? viewer.hduId : null)),
            distinctUntilChanged(),
            switchMap((hduId) =>
              this.store.select(DataFilesState.getHduById).pipe(
                map((fn) => fn(hduId)),
                map((hdu) => (hdu && hdu.hduType != HduType.IMAGE ? null : (hdu as ImageHdu)))
              )
            ),
            distinctUntilChanged()
          );

          let refNormalizer$ = refImageHdu$.pipe(
            map((hdu) => (hdu ? hdu.normalizer : null)),
            distinctUntilChanged(),
            skip(1)
          );

          return combineLatest(this.normalizationSyncEnabled$, visibleViewerIds$, refNormalizer$).pipe();
        })
        // auditTime(10),
      )
      .subscribe(([normalizationSyncEnabled, visibleViewerIds, refNormalizer]) => {
        if (!normalizationSyncEnabled || !refNormalizer) {
          return;
        }

        this.store.dispatch(new SyncViewerNormalizations(refNormalizer));
      });

    this.plottingPanelSyncSub = this.focusedViewerId$
      .pipe(
        filter((focusedViewerId) => focusedViewerId != null),
        switchMap((focusedViewerId) => {
          let refPlottingPanelState$ = this.store.select(WorkbenchState.getPlottingPanelStateIdFromViewerId).pipe(
            map((fn) => fn(focusedViewerId)),
            distinctUntilChanged(),
            switchMap((plottingPanelStateId) =>
              this.store.select(WorkbenchState.getPlottingPanelStateById).pipe(map((fn) => fn(plottingPanelStateId)))
            ),
            distinctUntilChanged()
          );

          return combineLatest(
            this.store.select(WorkbenchState.getPlottingPanelConfig).pipe(
              map((config) => config.plotterSyncEnabled),
              distinctUntilChanged()
            ),
            visibleViewerIds$,
            refPlottingPanelState$
          ).pipe();
        })
        // auditTime(10),
      )
      .subscribe(([plottingSyncEnabled, visibleViewerIds, refPlottingPanelState]) => {
        if (!plottingSyncEnabled || !refPlottingPanelState) {
          return;
        }

        let viewerEntities = this.store.selectSnapshot(WorkbenchState.getViewerEntities);
        let workbenchFileStates = this.store.selectSnapshot(WorkbenchState.getFileStateEntities);
        let workbenchHduStates = this.store.selectSnapshot(WorkbenchState.getHduStateEntities);
        let targetPlottingPanelStateIds = [];
        visibleViewerIds.forEach((viewerId) => {
          let viewer = viewerEntities[viewerId];
          if (viewer.hduId) {
            let workbenchHduState = workbenchHduStates[viewer.hduId];
            if (
              workbenchHduState &&
              workbenchHduState.hduType == HduType.IMAGE &&
              (workbenchHduState as WorkbenchImageHduState).plottingPanelStateId
            ) {
              targetPlottingPanelStateIds.push((workbenchHduState as WorkbenchImageHduState).plottingPanelStateId);
            }
          } else {
            let workbenchFileState = workbenchFileStates[viewer.fileId];
            if (workbenchFileState && workbenchFileState.plottingPanelStateId) {
              targetPlottingPanelStateIds.push(workbenchFileState.plottingPanelStateId);
            }
          }
        });

        if (targetPlottingPanelStateIds.length == 0) {
          return;
        }

        targetPlottingPanelStateIds = targetPlottingPanelStateIds.filter((id) => id != refPlottingPanelState.id);

        this.store.dispatch(new SyncPlottingPanelStates(refPlottingPanelState.id, targetPlottingPanelStateIds));
      });

    this.registerHotKeys();
  }

  ngOnInit() {
    setTimeout(() => {
      this.store.dispatch([new LoadLibrary(), new LoadCatalogs(), new LoadFieldCals(), new LoadDataProviders()]);
    });
  }

  ngOnDestroy() {
    this.hotKeys.forEach((hotKey) => this._hotkeysService.remove(hotKey));
    // this.fileLoaderSub.unsubscribe();
    this.queryParamSub.unsubscribe();
    this.transformationSyncSub.unsubscribe();
    this.normalizationSyncSub.unsubscribe();
    this.plottingPanelSyncSub.unsubscribe();

    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  registerHotKeys() {
    this.hotKeys.push(
      new Hotkey(
        "d",
        (event: KeyboardEvent): boolean => {
          this.store.dispatch(new SetShowConfig(true));
          this.store.dispatch(
            new Navigate([], { tool: WorkbenchTool.VIEWER }, { relativeTo: this.activeRoute, queryParamsHandling: "merge" })
          );
          return false; // Prevent bubbling
        },
        undefined,
        "Display Settings"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "i",
        (event: KeyboardEvent): boolean => {
          this.store.dispatch(new SetShowConfig(true));
          this.store.dispatch(
            new Navigate([], { tool: WorkbenchTool.INFO }, { relativeTo: this.activeRoute, queryParamsHandling: "merge" })
          );
          return false; // Prevent bubbling
        },
        undefined,
        "File Info"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "m",
        (event: KeyboardEvent): boolean => {
          this.store.dispatch(new SetShowConfig(true));
          this.store.dispatch(new SetActiveTool(WorkbenchTool.CUSTOM_MARKER));
          return false; // Prevent bubbling
        },
        undefined,
        "Markers"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "P",
        (event: KeyboardEvent): boolean => {
          this.store.dispatch(new SetShowConfig(true));
          this.store.dispatch(new SetActiveTool(WorkbenchTool.PLOTTER));
          return false; // Prevent bubbling
        },
        undefined,
        "Plotter"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "s",
        (event: KeyboardEvent): boolean => {
          this.store.dispatch(new SetShowConfig(true));
          this.store.dispatch(new SetActiveTool(WorkbenchTool.SONIFIER));
          return false; // Prevent bubbling
        },
        undefined,
        "Sonifier"
      )
    );

    // this.hotKeys.push(new Hotkey('f', (event: KeyboardEvent): boolean => {
    //   this.store.dispatch(new SetShowConfig(true));
    //   this.store.dispatch(new Navigate([this.FIELD_CAL_ROUTE]);
    //   return false; // Prevent bubbling
    // }, undefined, 'Field Calibration'));

    this.hotKeys.push(
      new Hotkey(
        "p",
        (event: KeyboardEvent): boolean => {
          this.store.dispatch(new SetShowConfig(true));
          this.store.dispatch(new SetActiveTool(WorkbenchTool.PHOTOMETRY));
          return false; // Prevent bubbling
        },
        undefined,
        "Photometry"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "/",
        (event: KeyboardEvent): boolean => {
          this.store.dispatch(new SetShowConfig(true));
          this.store.dispatch(new SetActiveTool(WorkbenchTool.IMAGE_CALC));
          return false; // Prevent bubbling
        },
        undefined,
        "Image Arithmetic"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "a",
        (event: KeyboardEvent): boolean => {
          this.store.dispatch(new SetShowConfig(true));
          this.store.dispatch(new SetActiveTool(WorkbenchTool.ALIGNER));
          return false; // Prevent bubbling
        },
        undefined,
        "Aligning"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "S",
        (event: KeyboardEvent): boolean => {
          this.store.dispatch(new SetShowConfig(true));
          this.store.dispatch(new SetActiveTool(WorkbenchTool.STACKER));
          return false; // Prevent bubbling
        },
        undefined,
        "Stacking"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "esc",
        (event: KeyboardEvent): boolean => {
          this.store.dispatch(new SetFullScreen(false));
          return false; // Prevent bubbling
        },
        undefined,
        "Reset workbench views"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "1",
        (event: KeyboardEvent): boolean => {
          this.store.dispatch(new SetFullScreen(true));
          this.store.dispatch(new SetFullScreenPanel("file"));
          this.store.dispatch(new ShowSidebar());
          return false; // Prevent bubbling
        },
        undefined,
        "Show workbench file panel"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "2",
        (event: KeyboardEvent): boolean => {
          this.store.dispatch(new SetFullScreen(true));
          this.store.dispatch(new SetFullScreenPanel("viewer"));
          return false; // Prevent bubbling
        },
        undefined,
        "Show workbench file panel"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "3",
        (event: KeyboardEvent): boolean => {
          this.store.dispatch(new SetFullScreen(true));
          this.store.dispatch(new SetFullScreenPanel("tool"));
          this.store.dispatch(new SetShowConfig(true));
          return false; // Prevent bubbling
        },
        undefined,
        "Show workbench file panel"
      )
    );

    this.hotKeys.forEach((hotKey) => this._hotkeysService.add(hotKey));
  }

  getViewerLabel(viewer: Viewer, index: number) {
    let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
    let fileEntities = this.store.selectSnapshot(DataFilesState.getFileEntities);

    let file = fileEntities[viewer.fileId];

    if (file) return file.name;
    return `Viewer ${index}`;
  }

  onFileInfoPanelConfigChange($event) {
    this.store.dispatch(new UpdateFileInfoPanelConfig($event));
  }

  onPlottingPanelConfigChange($event) {
    this.store.dispatch(new UpdatePlottingPanelConfig($event));
  }

  onCustomMarkerPanelConfigChange($event) {
    this.store.dispatch(new UpdateCustomMarkerPanelConfig($event));
  }

  onCustomMarkerChange($event: { id: string; changes: Partial<Marker> }) {
    let viewer = this.store.selectSnapshot(WorkbenchState.getFocusedImageViewer);
    if (!viewer) return;
    let customMarkerPanelStateId = this.store.selectSnapshot(WorkbenchState.getCustomMarkerPanelStateIdFromViewerId)(
      viewer.id
    );
    this.store.dispatch(new UpdateCustomMarker(customMarkerPanelStateId, $event.id, $event.changes));
  }

  onCustomMarkerDelete($event: Marker[]) {
    let viewer = this.store.selectSnapshot(WorkbenchState.getFocusedImageViewer);
    if (!viewer) return;
    let customMarkerPanelStateId = this.store.selectSnapshot(WorkbenchState.getCustomMarkerPanelStateIdFromViewerId)(
      viewer.id
    );
    this.store.dispatch(new RemoveCustomMarkers(customMarkerPanelStateId, $event));
  }

  selectCustomMarkers(fileId: string, customMarkers: Marker[]) {
    this.store.dispatch(new SelectCustomMarkers(fileId, customMarkers));
  }

  deselectCustomMarkers(fileId: string, customMarkers: Marker[]) {
    this.store.dispatch(new DeselectCustomMarkers(fileId, customMarkers));
  }

  onPhotometryPanelConfigChange($event) {
    this.store.dispatch(new UpdatePhotometryPanelConfig($event));
  }

  onPhotometrySettingsChange($event) {
    this.store.dispatch(new UpdatePhotometrySettings($event));
  }

  onSourceExtractionSettingsChange($event) {
    this.store.dispatch(new UpdateSourceExtractionSettings($event));
  }

  onWcsCalibrationSettingsChange($event) {
    this.store.dispatch(new UpdateWcsCalibrationSettings($event));
  }

  onWcsCalibrationSelectedHduIdsChange(selectedHduIds: string[]) {
    this.store.dispatch(new UpdateWcsCalibrationPanelState({selectedHduIds: selectedHduIds}))
  }


  /* image viewer mouse event handlers */
  onImageClick($event: ViewerPanelCanvasMouseEvent) {
    let viewer = this.store.selectSnapshot(WorkbenchState.getViewerEntities)[$event.viewerId] as ImageViewer;
    if (!viewer || viewer.type != "image") {
      return;
    }
    let activeTool = this.store.selectSnapshot(WorkbenchState.getActiveTool);
    let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
    let fileEntities = this.store.selectSnapshot(DataFilesState.getFileEntities);
    let targetFile = fileEntities[viewer.fileId];
    let headerSelector = this.store.selectSnapshot(WorkbenchState.getFirstImageHeaderIdFromViewerId);
    let headerId = headerSelector(viewer.id);
    let targetHeader = this.store.selectSnapshot(DataFilesState.getHeaderEntities)[headerId];

    let hduStateEntities = this.store.selectSnapshot(WorkbenchState.getHduStateEntities);
    let fileStateEntities = this.store.selectSnapshot(WorkbenchState.getFileStateEntities);
    let imageDataEntities = this.store.selectSnapshot(DataFilesState.getImageDataEntities);

    switch (activeTool) {
      case WorkbenchTool.CUSTOM_MARKER: {
        let customMarkerPanelStateId = this.store.selectSnapshot(WorkbenchState.getCustomMarkerPanelStateIdFromViewerId)(
          viewer.id
        );
        let rawImageDataId = this.store.selectSnapshot(WorkbenchState.getRawImageDataIdFromViewerId)(viewer.id);
        let normalizedImageDataId = this.store.selectSnapshot(WorkbenchState.getNormalizedImageDataIdFromViewerId)(
          viewer.id
        );
        let imageDataId = rawImageDataId ? rawImageDataId : normalizedImageDataId;
        let targetCustomMarkerPanelState = this.store.selectSnapshot(WorkbenchState.getCustomMarkerPanelStateEntities)[
          customMarkerPanelStateId
        ];
        let targetImageData = this.store.selectSnapshot(DataFilesState.getImageDataEntities)[imageDataId];

        let settings = this.store.selectSnapshot(WorkbenchState.getCustomMarkerPanelConfig);
        let centroidSettings = this.store.selectSnapshot(WorkbenchState.getCentroidSettings);
        let selectedCustomMarkers = Object.values(targetCustomMarkerPanelState.markerEntities).filter(
          (marker) => marker.selected
        );
        if ($event.hitImage) {
          if (selectedCustomMarkers.length == 0 || $event.mouseEvent.altKey) {
            let x = $event.imageX;
            let y = $event.imageY;
            if (settings.centroidClicks) {
              let result: { x: number; y: number };
              if (settings.usePlanetCentroiding) {
                result = centroidDisk(targetImageData, x, y, centroidSettings.diskCentroiderSettings);
              } else {
                result = centroidPsf(targetImageData, x, y, centroidSettings.psfCentroiderSettings);
              }
              x = result.x;
              y = result.y;
            }

            let customMarker: CircleMarker = {
              type: MarkerType.CIRCLE,
              label: null,
              x: x,
              y: y,
              radius: 10,
              labelGap: 8,
              labelTheta: 0,
            };

            this.store.dispatch(new AddCustomMarkers(customMarkerPanelStateId, [customMarker]));
          } else {
            this.store.dispatch(new SetCustomMarkerSelection(customMarkerPanelStateId, []));
          }
        }
        break;
      }
      case WorkbenchTool.PLOTTER: {
        let plottingPanelStateId = this.store.selectSnapshot(WorkbenchState.getPlottingPanelStateIdFromViewerId)(viewer.id);
        let rawImageDataId = this.store.selectSnapshot(WorkbenchState.getRawImageDataIdFromViewerId)(viewer.id);
        let normalizedImageDataId = this.store.selectSnapshot(WorkbenchState.getNormalizedImageDataIdFromViewerId)(
          viewer.id
        );
        let imageDataId = rawImageDataId ? rawImageDataId : normalizedImageDataId;
        let targetImageData = this.store.selectSnapshot(DataFilesState.getImageDataEntities)[imageDataId];
        let plotterPageSettings = this.store.selectSnapshot(WorkbenchState.getPlottingPanelConfig);
        if ($event.hitImage) {
          let x = $event.imageX;
          let y = $event.imageY;
          if (plotterPageSettings && plotterPageSettings.centroidClicks) {
            let result;
            if (plotterPageSettings.planetCentroiding) {
              result = centroidDisk(targetImageData, x, y);
            } else {
              result = centroidPsf(targetImageData, x, y);
            }

            x = result.x;
            y = result.y;
          }

          let primaryCoord = x;
          let secondaryCoord = y;
          let posType = PosType.PIXEL;
          if (targetHeader.wcs && targetHeader.wcs.isValid()) {
            let wcs = targetHeader.wcs;
            let raDec = wcs.pixToWorld([primaryCoord, secondaryCoord]);
            primaryCoord = raDec[0];
            secondaryCoord = raDec[1];
            posType = PosType.SKY;
          }

          this.store.dispatch(
            new StartLine(plottingPanelStateId, {
              primaryCoord: primaryCoord,
              secondaryCoord: secondaryCoord,
              posType: posType,
            })
          );
        }
        break;
      }
      case WorkbenchTool.PHOTOMETRY: {
        let rawImageDataId = this.store.selectSnapshot(WorkbenchState.getRawImageDataIdFromViewerId)(viewer.id);
        if (!rawImageDataId || !viewer.hduId) return;
        let targetImageData = this.store.selectSnapshot(DataFilesState.getImageDataEntities)[rawImageDataId];
        let header = this.store.selectSnapshot(DataFilesState.getHeaderEntities)[headerId];

        let photometryPanelConfig = this.store.selectSnapshot(WorkbenchState.getPhotometryPanelConfig);
        let selectedSourceIds = photometryPanelConfig.selectedSourceIds;
        let centroidClicks = photometryPanelConfig.centroidClicks;

        let centroidSettings = this.store.selectSnapshot(WorkbenchState.getCentroidSettings);

        if ($event.hitImage) {
          if (selectedSourceIds.length == 0 || $event.mouseEvent.altKey) {
            let primaryCoord = $event.imageX;
            let secondaryCoord = $event.imageY;
            let posType = PosType.PIXEL;
            if (centroidClicks) {
              let result = centroidPsf(
                targetImageData,
                primaryCoord,
                secondaryCoord,
                centroidSettings.psfCentroiderSettings
              );
              primaryCoord = result.x;
              secondaryCoord = result.y;
            }
            if (photometryPanelConfig.coordMode == "sky" && header.wcs.isValid()) {
              let wcs = header.wcs;
              let raDec = wcs.pixToWorld([primaryCoord, secondaryCoord]);
              primaryCoord = raDec[0];
              secondaryCoord = raDec[1];
              posType = PosType.SKY;
            }

            let centerEpoch = getCenterTime(header);

            let source: Source = {
              id: null,
              label: null,
              objectId: null,
              hduId: viewer.hduId,
              primaryCoord: primaryCoord,
              secondaryCoord: secondaryCoord,
              posType: posType,
              pm: null,
              pmPosAngle: null,
              pmEpoch: centerEpoch ? centerEpoch.toISOString() : null,
            };
            this.store.dispatch(new AddSources([source]));
          } else {
            this.store.dispatch(
              new UpdatePhotometryPanelConfig({
                selectedSourceIds: [],
              })
            );
          }
        }
        break;
      }
    }
  }

  onImageMove($event: ViewerPanelCanvasMouseEvent) {
    let viewer = this.store.selectSnapshot(WorkbenchState.getViewerEntities)[$event.viewerId] as ImageViewer;
    if (!viewer || viewer.type != "image") {
      return;
    }

    let activeTool = this.store.selectSnapshot(WorkbenchState.getActiveTool);
    let targetFile = this.store.selectSnapshot(DataFilesState.getFileEntities)[viewer.fileId];
    let targetHdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[viewer.hduId] as ImageHdu;
    let headerId = this.store.selectSnapshot(WorkbenchState.getFirstImageHeaderIdFromViewerId)(viewer.id);
    let targetHeader = this.store.selectSnapshot(DataFilesState.getHeaderEntities)[headerId];

    let hduStateEntities = this.store.selectSnapshot(WorkbenchState.getHduStateEntities);
    let fileStateEntities = this.store.selectSnapshot(WorkbenchState.getFileStateEntities);
    let imageDataEntities = this.store.selectSnapshot(DataFilesState.getImageDataEntities);

    switch (activeTool) {
      case WorkbenchTool.PLOTTER: {
        let plottingPanelStateId = this.store.selectSnapshot(WorkbenchState.getPlottingPanelStateIdFromViewerId)(viewer.id);
        let plottingPanelState = this.store.selectSnapshot(WorkbenchState.getPlottingPanelStateEntities)[
          plottingPanelStateId
        ];
        let measuring = plottingPanelState.measuring;
        if (measuring) {
          let primaryCoord = $event.imageX;
          let secondaryCoord = $event.imageY;
          let posType = PosType.PIXEL;
          if (targetHeader && targetHeader.wcs && targetHeader.wcs.isValid()) {
            let wcs = targetHeader.wcs;
            let raDec = wcs.pixToWorld([primaryCoord, secondaryCoord]);
            primaryCoord = raDec[0];
            secondaryCoord = raDec[1];
            posType = PosType.SKY;
          }
          this.store.dispatch(
            new UpdateLine(plottingPanelStateId, {
              primaryCoord: primaryCoord,
              secondaryCoord: secondaryCoord,
              posType: posType,
            })
          );
        }
        break;
      }
    }
  }

  onMarkerClick($event: ViewerPanelMarkerMouseEvent) {
    let viewer = this.store.selectSnapshot(WorkbenchState.getViewerEntities)[$event.viewerId] as ImageViewer;
    if (!viewer || viewer.type != "image") {
      return;
    }

    let activeTool = this.store.selectSnapshot(WorkbenchState.getActiveTool);
    let targetFile = this.store.selectSnapshot(DataFilesState.getFileEntities)[viewer.fileId];
    let targetHdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[viewer.hduId] as ImageHdu;
    let headerId = this.store.selectSnapshot(WorkbenchState.getFirstImageHeaderIdFromViewerId)(viewer.id);
    let targetHeader = this.store.selectSnapshot(DataFilesState.getHeaderEntities)[headerId];

    switch (activeTool) {
      case WorkbenchTool.CUSTOM_MARKER: {
        if ($event.mouseEvent.altKey) return;
        if (typeof $event.marker.id == "undefined") return;
        let customMarkerPanelStateId = this.store.selectSnapshot(WorkbenchState.getCustomMarkerPanelStateIdFromViewerId)(
          viewer.id
        );
        let customMarkerPanelState = this.store.selectSnapshot(WorkbenchState.getCustomMarkerPanelStateEntities)[
          customMarkerPanelStateId
        ];
        if (!customMarkerPanelState.markerIds.includes($event.marker.id)) return;
        let customMarker = customMarkerPanelState.markerEntities[$event.marker.id];
        if (!customMarker) return;
        let customMarkerSelected = customMarkerPanelState.markerEntities[$event.marker.id].selected;

        if ($event.mouseEvent.ctrlKey) {
          if (!customMarkerSelected) {
            // select the source
            this.selectCustomMarkers(customMarkerPanelStateId, [customMarker]);
          } else {
            // deselect the source
            this.deselectCustomMarkers(customMarkerPanelStateId, [customMarker]);
          }
        } else {
          this.store.dispatch(new SetCustomMarkerSelection(customMarkerPanelStateId, [customMarker]));
        }
        $event.mouseEvent.stopImmediatePropagation();
        $event.mouseEvent.preventDefault();
        break;
      }
      case WorkbenchTool.PHOTOMETRY: {
        if ($event.mouseEvent.altKey) return;
        let sources = this.store.selectSnapshot(SourcesState.getSources);
        let source = sources.find(
          (source) => $event.marker.data && $event.marker.data.source && source.id == $event.marker.data.source.id
        );
        if (!source) return;

        let photometryPanelConfig = this.store.selectSnapshot(WorkbenchState.getPhotometryPanelConfig);
        let sourceSelected = photometryPanelConfig.selectedSourceIds.includes(source.id);
        if ($event.mouseEvent.ctrlKey) {
          if (!sourceSelected) {
            // select the source
            this.store.dispatch(
              new UpdatePhotometryPanelConfig({
                selectedSourceIds: [...photometryPanelConfig.selectedSourceIds, source.id],
              })
            );
          } else {
            // deselect the source
            let selectedSourceIds = photometryPanelConfig.selectedSourceIds.filter((id) => id != source.id);
            this.store.dispatch(
              new UpdatePhotometryPanelConfig({
                selectedSourceIds: selectedSourceIds,
              })
            );
          }
        } else {
          this.store.dispatch(
            new UpdatePhotometryPanelConfig({
              selectedSourceIds: [source.id],
            })
          );
        }
        $event.mouseEvent.stopImmediatePropagation();
        $event.mouseEvent.preventDefault();
      }
    }
  }

  clearFileListFilter() {
    this.store.dispatch(new SetFileListFilter(""));
  }

  toggleFileListSelectAll($event: MatCheckboxChange) {
    if ($event.checked) {
      // selectall
      let filteredFiles = this.store.selectSnapshot(WorkbenchState.getFilteredFiles);
      this.store.dispatch(new SetFileSelection(filteredFiles.map((f) => f.id)));
    } else {
      // deselect all
      this.store.dispatch(new SetFileSelection([]));
    }
  }

  onFileListFocusedItemChange(item: { fileId: string; hduId: string }) {
    let fileEntities = this.store.selectSnapshot(DataFilesState.getFileEntities);
    let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
    let fileId = item.fileId;
    let hduId = item.hduId;
    if (!hduId) {
      let file = fileEntities[fileId];
      if (file && file.hduIds.length == 1) {
        //if a single-hdu file is selected,  automatically select the hdu
        hduId = file.hduIds[0];
      }
    }
    this.store.dispatch(new FocusFileListItem({ fileId: fileId, hduId: hduId }));
  }

  // onFileListItemClick(item: IFileListItemId) {
  //   this.store.dispatch(new SelectDataFileListItem(item));
  // }

  onFileListItemDoubleClick(item: { fileId: string; hduId: string }) {
    let focusedViewer = this.store.selectSnapshot(WorkbenchState.getFocusedViewer);
    if (focusedViewer) {
      this.store.dispatch(new KeepViewerOpen(focusedViewer.id));
    }
  }

  afterLibrarySync() {
    this.store.dispatch(new LoadLibrary());
    this.store.dispatch(new LoadDataProviders());

    let loadLibrarySuccess$ = this.actions$.pipe(ofActionCompleted(LoadLibrarySuccess));
    let loadLibraryFail$ = this.actions$.pipe(
      ofActionCompleted(LoadLibraryFail),
      map((v) => throwError("Unable to load library"))
    );

    let loadDataProvidersSuccess$ = this.actions$.pipe(ofActionCompleted(LoadDataProvidersSuccess));
    let loadDataProvidersFail$ = this.actions$.pipe(
      ofActionCompleted(LoadDataProvidersFail),
      map((v) => throwError("Unable to load data providers"))
    );

    return combineLatest([loadLibrarySuccess$, loadDataProvidersSuccess$]).pipe(
      takeUntil(merge(loadLibraryFail$, loadDataProvidersFail$).pipe()),
      take(1),
      map((v) => {
        return {
          dataProviderEntities: this.store.selectSnapshot(DataProvidersState.getDataProviderEntities),
          fileEntities: this.store.selectSnapshot(DataFilesState.getFileEntities),
        };
      })
    );
  }

  // onSaveFileBtnClick(fileId: string) {
  //   this.afterLibrarySync()
  //     .pipe(
  //       flatMap(({ dataProviderEntities, fileEntities }) => {
  //         let file = fileEntities[fileId];
  //         if (!file) return;
  //         return this.saveFile(fileId, file.dataProviderId, file.assetPath);
  //       })
  //     )
  //     .subscribe(
  //       () => {},
  //       (err) => {},
  //       () => this.store.dispatch(new LoadLibrary())
  //     );
  // }

  // onSaveAllFilesBtnClick() {
  //   this.afterLibrarySync()
  //     .pipe(
  //       flatMap(({ dataProviderEntities, fileEntities }) => {
  //         let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);

  //         //remove files which have not been modified
  //         let files = Object.values(fileEntities).filter((file) => {
  //           let hdus = file.hduIds.map((hduId) => hduEntities[hduId]);
  //           let hduModified = hdus.map((hdu) => hdu && hdu.modified).some((v) => v);

  //           let dataProvider = dataProviderEntities[file.dataProviderId];
  //           return hduModified || !dataProvider || dataProvider.readonly;
  //         });
  //         if (files.length == 0) {
  //           return of(null);
  //         }
  //         console.log("SAVE ALL CALLED: ", files);

  //         let recursiveSave = (index: number) => {
  //           console.log("RECURSIVE SAVE CALLED: ", index);
  //           if (index >= files.length) {
  //             return of(null);
  //           }
  //           let file = files[index];
  //           return this.saveFile(file.id, file.dataProviderId, file.assetPath).pipe(
  //             flatMap((v) => {
  //               if (!v) {
  //                 //save was canceled
  //                 return of(null);
  //               }

  //               console.log("SAVE FILE COMPLETED: ", v);
  //               return new Observable((subscriber) => {
  //                 setTimeout(() => {
  //                   subscriber.next(index + 1);
  //                   subscriber.complete();
  //                 }, 0);
  //               }).pipe(
  //                 flatMap((index) => {
  //                   return recursiveSave(index as number);
  //                 })
  //               );
  //             })
  //           );
  //         };

  //         return recursiveSave(0);
  //       })
  //     )
  //     .subscribe(
  //       () => {},
  //       (err) => {},
  //       () => this.store.dispatch(new LoadLibrary())
  //     );
  // }

  closeFiles(files: DataFile[]) {
    let config: FileDialogConfig = {
      files: files,
      mode: "close",
    };

    let dialogRef = this.dialog.open(SaveChangesDialogComponent, {
      width: "500px",
      data: config,
      disableClose: true,
    });

    return dialogRef.afterClosed();
  }

  onCloseFileBtnClick(fileId: string) {
    this.afterLibrarySync()
      .pipe(
        flatMap(({ dataProviderEntities, fileEntities }) => {
          return this.closeFiles([fileEntities[fileId]]);
        })
      )
      .subscribe(
        () => {},
        (err) => {},
        () => this.store.dispatch(new LoadLibrary())
      );
  }

  onCloseAllFileListItemsBtnClick() {
    this.afterLibrarySync()
      .pipe(
        flatMap(({ dataProviderEntities, fileEntities }) => {
          // let selectedFileIds = this.store.selectSnapshot(WorkbenchState.getSelectedFileIds);
          // let files = selectedFileIds.map(id => fileEntities[id])
          let files = this.store.selectSnapshot(WorkbenchState.getFilteredFiles);
          let dialogConfig: Partial<AlertDialogConfig> = {
            title: "Close Files",
            message: `Are you sure you want to close all files?`,
            buttons: [
              {
                color: null,
                value: true,
                label: "Close All",
              },
              {
                color: null,
                value: false,
                label: "Cancel",
              },
            ],
          };
          let dialogRef = this.dialog.open(AlertDialogComponent, {
            width: "400px",
            data: dialogConfig,
            disableClose: true,
          });

          return dialogRef.afterClosed().pipe(
            flatMap((result) => {
              if (!result) {
                return of(null);
              }
              return this.closeFiles(files);
            })
          );
        })
      )
      .subscribe(
        () => {},
        (err) => {},
        () => this.store.dispatch(new LoadLibrary())
      );
  }

  onCloseSelectedFileListItemsBtnClick() {
    this.afterLibrarySync()
      .pipe(
        flatMap(({ dataProviderEntities, fileEntities }) => {
          let selectedFileIds = this.store.selectSnapshot(WorkbenchState.getSelectedFileIds);
          let files = selectedFileIds.map((id) => fileEntities[id]);
          let dialogConfig: Partial<AlertDialogConfig> = {
            title: "Close Files",
            message: `Are you sure you want to close the selected files?`,
            buttons: [
              {
                color: null,
                value: true,
                label: "Close Selected Files",
              },
              {
                color: null,
                value: false,
                label: "Cancel",
              },
            ],
          };
          let dialogRef = this.dialog.open(AlertDialogComponent, {
            width: "400px",
            data: dialogConfig,
            disableClose: true,
          });

          return dialogRef.afterClosed().pipe(
            flatMap((result) => {
              if (!result) {
                return of(null);
              }
              return this.closeFiles(files);
            })
          );
        })
      )
      .subscribe(
        () => {},
        (err) => {},
        () => this.store.dispatch(new LoadLibrary())
      );
  }

  saveFiles(files: DataFile[]) {
    let config: FileDialogConfig = {
      files: files,
      mode: "save",
    };

    let dialogRef = this.dialog.open(SaveChangesDialogComponent, {
      width: "500px",
      data: config,
      disableClose: true,
    });

    return dialogRef.afterClosed();
  }

  onSaveFileBtnClick(fileId: string) {
    this.afterLibrarySync()
      .pipe(
        flatMap(({ dataProviderEntities, fileEntities }) => {
          return this.saveFiles([fileEntities[fileId]]);
        })
      )
      .subscribe(
        () => {},
        (err) => {},
        () => this.store.dispatch(new LoadLibrary())
      );
  }

  onSaveAllFileListItemsBtnClick() {
    this.afterLibrarySync()
      .pipe(
        flatMap(({ dataProviderEntities, fileEntities }) => {
          // let selectedFileIds = this.store.selectSnapshot(WorkbenchState.getSelectedFileIds);
          // let files = selectedFileIds.map(id => fileEntities[id])
          let files = this.store.selectSnapshot(WorkbenchState.getFilteredFiles);
          let dialogConfig: Partial<AlertDialogConfig> = {
            title: "Save Files",
            message: `Are you sure you want to save all files?`,
            buttons: [
              {
                color: null,
                value: true,
                label: "Save All",
              },
              {
                color: null,
                value: false,
                label: "Cancel",
              },
            ],
          };
          let dialogRef = this.dialog.open(AlertDialogComponent, {
            width: "400px",
            data: dialogConfig,
            disableClose: true,
          });

          return dialogRef.afterClosed().pipe(
            flatMap((result) => {
              if (!result) {
                return of(null);
              }
              return this.saveFiles(files);
            })
          );
        })
      )
      .subscribe(
        () => {},
        (err) => {},
        () => this.store.dispatch(new LoadLibrary())
      );
  }

  onSaveSelectedFileListItemsBtnClick() {
    this.afterLibrarySync()
      .pipe(
        flatMap(({ dataProviderEntities, fileEntities }) => {
          let selectedFileIds = this.store.selectSnapshot(WorkbenchState.getSelectedFileIds);
          let files = selectedFileIds.map((id) => fileEntities[id]);
          let dialogConfig: Partial<AlertDialogConfig> = {
            title: "Save Files",
            message: `Are you sure you want to save the selected files?`,
            buttons: [
              {
                color: null,
                value: true,
                label: "Save Selected Files",
              },
              {
                color: null,
                value: false,
                label: "Cancel",
              },
            ],
          };
          let dialogRef = this.dialog.open(AlertDialogComponent, {
            width: "400px",
            data: dialogConfig,
            disableClose: true,
          });

          return dialogRef.afterClosed().pipe(
            flatMap((result) => {
              if (!result) {
                return of(null);
              }
              return this.saveFiles(files);
            })
          );
        })
      )
      .subscribe(
        () => {},
        (err) => {},
        () => this.store.dispatch(new LoadLibrary())
      );
  }

  onDownloadSelectedFileListItemsBtnClick() {
    this.afterLibrarySync()
      .pipe(
        flatMap(({ dataProviderEntities, fileEntities }) => {
          let selectedFileIds = this.store.selectSnapshot(WorkbenchState.getSelectedFileIds);
          let files = selectedFileIds.map((id) => fileEntities[id]);

          let job: BatchDownloadJob = {
            type: JobType.BatchDownload,
            id: null,
            group_ids: files.map((file) => file.id),
          };

          let corrId = this.corrGen.next();
          let onCreateJobSuccess$ = this.actions$.pipe(
            ofActionDispatched(CreateJobSuccess),
            filter((action) => (action as CreateJobSuccess).correlationId == corrId),
            take(1),
            flatMap((action) => {
              let jobId = (action as CreateJobSuccess).job.id;
              let dialogConfig: JobProgressDialogConfig = {
                title: "Preparing download",
                message: `Please wait while we prepare the files for download.`,
                progressMode: "indeterminate",
                job$: this.store.select(JobsState.getJobById).pipe(map((fn) => fn(jobId).job)),
              };
              let dialogRef = this.dialog.open(JobProgressDialogComponent, {
                width: "400px",
                data: dialogConfig,
                disableClose: true,
              });

              return dialogRef.afterClosed().pipe(
                flatMap((result) => {
                  if (!result) {
                    return of(null);
                  }

                  return this.jobService.getJobResultFile(jobId, "download").pipe(
                    tap((data) => {
                      saveAs(data, files.length == 1 ? files[0].name : "afterglow-files.zip");
                    })
                  );
                })
              );
            })
          );

          let onCreateJobFail$ = this.actions$.pipe(
            ofActionDispatched(CreateJobFail),
            filter((action) => (action as CreateJobFail).correlationId == corrId),
            take(1)
          );

          this.store.dispatch(new CreateJob(job, 1000, corrId));

          return merge(onCreateJobSuccess$, onCreateJobFail$).pipe(take(1));
        })
      )
      .subscribe(
        () => {},
        (err) => {},
        () => {}
      );
  }

  getLongestCommonStartingSubstring(arr1: string[]) {
    let arr = arr1.concat().sort(),
      a1 = arr[0],
      a2 = arr[arr.length - 1],
      L = a1.length,
      i = 0;
    while (i < L && a1.charAt(i) === a2.charAt(i)) i++;
    return a1.substring(0, i);
  }

  onGroupSelectedFileListItemsBtnClick() {
    this.afterLibrarySync()
      .pipe(
        flatMap(({ dataProviderEntities, fileEntities }) => {
          let selectedFileIds = this.store.selectSnapshot(WorkbenchState.getSelectedFileIds);
          let files = selectedFileIds.map((id) => fileEntities[id]);
          let hduCount = 0;
          files.forEach((file) => (hduCount += file.hduIds.length));

          if (hduCount > 4) {
            let dialogConfig: Partial<AlertDialogConfig> = {
              title: "Error",
              message: `The number of channels within a file is currently limited to no more than four.  Please reduce he number of channels and try grouping again.`,
              buttons: [
                {
                  color: null,
                  value: false,
                  label: "Close",
                },
              ],
            };
            let dialogRef = this.dialog.open(AlertDialogComponent, {
              width: "400px",
              data: dialogConfig,
              disableClose: true,
            });

            return dialogRef.afterClosed();
          }

          let dialogConfig: Partial<AlertDialogConfig> = {
            title: "Group Files",
            message: `Are you sure you want to group the selected files into a single file with multiple channels?`,
            buttons: [
              {
                color: null,
                value: true,
                label: "Group Selected Files",
              },
              {
                color: null,
                value: false,
                label: "Cancel",
              },
            ],
          };
          let dialogRef = this.dialog.open(AlertDialogComponent, {
            width: "400px",
            data: dialogConfig,
            disableClose: true,
          });

          return dialogRef.afterClosed().pipe(
            take(1),
            flatMap((result) => {
              if (!result) {
                return of(null);
              }

              let newFilename = this.getLongestCommonStartingSubstring(files.map((file) => file.name))
                .replace(/_+$/, "")
                .trim();
              if (newFilename.length == 0) {
                newFilename = `${files[0].name} - group`;
              }
              let uuid = UUID.UUID();
              let reqs = [];
              files.forEach((file) => {
                file.hduIds.forEach((hduId) => {
                  reqs.push(
                    this.dataFileService.updateFile(hduId, {
                      group_id: uuid,
                      name: newFilename,
                      data_provider: null,
                      asset_path: null,
                      modified: true,
                    })
                  );
                });
              });

              return concat(...reqs);
            })
          );
        })
      )
      .subscribe(
        () => {},
        (err) => {
          throw err;
        },
        () => this.store.dispatch(new LoadLibrary())
      );
  }

  // onMultiFileSelect(files: Array<DataFile>) {
  //   if(!files) return;
  //   this.store.dispatch(new SetMultiFileSelection(files.map(f => f.id)));
  // }

  openFiles() {
    let dialogRef = this.dialog.open(OpenFileDialogComponent, {
      width: "80vw",
      maxWidth: "1200px",
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((assets) => {});
  }

  refresh() {
    this.store.dispatch(new LoadLibrary());
  }

  setSidebarView(value: SidebarView) {
    this.store.dispatch(new SetSidebarView(value));
  }

  setViewModeOption($event: MatButtonToggleChange) {
    this.store.dispatch(new SetViewMode($event.value));
  }

  onFocusedViewerIdChange($event: MatSelectChange) {
    this.store.dispatch(new SetFocusedViewer($event.value));
  }

  onClickWorkbenchNav(isActiveUrl: boolean) {
    if (isActiveUrl) {
      // toggle
      this.store.dispatch(new ToggleShowConfig());
    } else {
      // show
      this.store.dispatch(new SetShowConfig(true));
    }
  }

  onWorkbenchNavClick(currentTool: string, targetTool: string) {
    if (currentTool == targetTool) {
      // toggle
      this.store.dispatch(new ToggleShowConfig());
    } else {
      // show
      this.store.dispatch(new SetShowConfig(true));
    }
    this.store.dispatch(
      new Navigate([], { tool: targetTool }, { relativeTo: this.activeRoute, queryParamsHandling: "merge" })
    );
  }

  /* for data file selection list */
  trackByFn(index, item) {
    return item.id; // or item.id
  }

  getToolbarTooltip(isActive: boolean, base: string) {
    let showToolPanel = this.store.selectSnapshot(WorkbenchState.getShowConfig);
    return (showToolPanel && isActive ? "Hide " : "Show ") + base;
  }

  onViewerSyncEnabledChange($event) {
    this.store.dispatch(new SetViewerSyncEnabled($event.checked));
  }

  onViewerSyncModeChange($event: MatButtonToggleChange) {
    this.store.dispatch(new SetViewerSyncMode($event.value));
  }

  onNormalizationSyncEnabledChange($event) {
    this.store.dispatch(new SetNormalizationSyncEnabled($event.checked));
  }

  importFromSurvey(surveyDataProvider: DataProvider, header: Header) {
    let centerRaDec;
    let pixelScale;

    if (header.wcs && header.wcs.isValid() && this.useWcsCenter) {
      centerRaDec = header.wcs.pixToWorld([getWidth(header) / 2, getHeight(header) / 2]);
      pixelScale = header.wcs.getPixelScale() * 60;
    } else {
      let centerRa = getRaHours(header);
      let centerDec = getDecDegs(header);
      if (centerRa == undefined || centerDec == undefined) return;

      centerRaDec = [centerRa, centerDec];
      pixelScale = getDegsPerPixel(header) * 60;

      if (pixelScale == undefined) return;
    }

    let width = pixelScale * getWidth(header);
    let height = pixelScale * getHeight(header);

    this.store.dispatch(
      new ImportFromSurvey(surveyDataProvider.id, centerRaDec[0], centerRaDec[1], width, height, this.corrGen.next())
    );
  }

  // onUseWcsCenterChange($event: MatCheckboxChange) {
  //   this.useWcsCenter = $event.checked;
  // }

  onUseWcsCenterChange($event: MatRadioChange) {
    this.useWcsCenter = $event.value == "wcs";
  }

  splitViewerPanel(viewer: Viewer, direction: "up" | "down" | "left" | "right" = "right") {
    this.store.dispatch(new SplitViewerPanel(viewer.id, direction));
  }
}
