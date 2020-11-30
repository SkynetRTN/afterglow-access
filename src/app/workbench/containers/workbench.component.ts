import { Component, OnInit, OnDestroy } from "@angular/core";
import { Observable, combineLatest, merge, of, never, empty } from "rxjs";
import { map, tap, filter, distinctUntilChanged, switchMap, withLatestFrom } from "rxjs/operators";

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
import { MatDialog } from "@angular/material/dialog";
import { Store, Actions } from "@ngxs/store";
import { DataFilesState } from "../../data-files/data-files.state";
import { WorkbenchState } from "../workbench.state";
import {
  SetShowConfig,
  SetFullScreen,
  SetFullScreenPanel,
  ShowSidebar,
  LoadCatalogs,
  LoadFieldCals,
  SelectDataFileListItem,
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
} from "../workbench.actions";
import { LoadDataProviders } from "../../data-providers/data-providers.actions";
import { ViewMode } from "../models/view-mode";
import { MatButtonToggleChange } from "@angular/material/button-toggle";
import { MatRadioChange } from "@angular/material/radio";
import { MatSelectChange } from "@angular/material/select";
import { Viewer, ImageViewer, TableViewer } from "../models/viewer";
import { DataProvider } from "../../data-providers/models/data-provider";
import { CorrelationIdGenerator } from "../../utils/correlated-action";
import { DataProvidersState } from "../../data-providers/data-providers.state";
import { ConfirmationDialogComponent } from "../components/confirmation-dialog/confirmation-dialog.component";
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
  SyncHduTransformations,
  SyncFileNormalizations,
} from "../../data-files/data-files.actions";
import { Transform, getImageToViewportTransform } from "../../data-files/models/transformation";
import { Normalization } from "../../data-files/models/normalization";
import { PixelNormalizer } from "../../data-files/models/pixel-normalizer";
import { IImageData } from "../../data-files/models/image-data";
import { Wcs } from "../../image-tools/wcs";
import { ISelectedFileListItem } from "./workbench-data-file-list/workbench-data-file-list.component";
import { view } from "paper";

@Component({
  selector: "app-workbench",
  templateUrl: "./workbench.component.html",
  styleUrls: ["./workbench.component.scss"],
})
export class WorkbenchComponent implements OnInit, OnDestroy {
  WorkbenchTool = WorkbenchTool;
  ViewMode = ViewMode;

  layoutContainer$: Observable<ViewerPanelContainer>;

  inFullScreenMode$: Observable<boolean>;
  fullScreenPanel$: Observable<"file" | "viewer" | "tool">;
  showSidebar$: Observable<boolean>;
  sidebarView$: Observable<SidebarView>;
  files$: Observable<DataFile[]>;
  fileEntities$: Observable<{ [id: string]: DataFile }>;
  hdus$: Observable<IHdu[]>;
  loadingFiles$: Observable<boolean>;

  viewMode$: Observable<ViewMode>;

  selectedCustomMarkers$: Observable<CustomMarker[]>;
  viewers$: Observable<Viewer[]>;
  viewerSyncEnabled$: Observable<boolean>;
  normalizationSyncEnabled$: Observable<boolean>;
  surveyDataProvider$: Observable<DataProvider>;
  surveyImportCorrId$: Observable<string>;
  dssImportLoading$: Observable<boolean>;
  activeTool$: Observable<WorkbenchTool>;
  showConfig$: Observable<boolean>;

  focusedViewer$: Observable<Viewer>;
  focusedViewerId$: Observable<string>;
  focusedImageViewer$: Observable<ImageViewer>;
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

  photometrySettings$: Observable<PhotometrySettings>;
  centroidSettings$: Observable<CentroidSettings>;
  sourceExtractionSettings$: Observable<SourceExtractionSettings>;

  focusedViewerFileSelectedWorkbenchHduId$: Observable<string>;
  focusedViewerFileSelectedWorkbenchHdu$: Observable<IHdu>;
  focusedViewerFileSelectedWorkbenchImageHduId$: Observable<string>;
  focusedViewerFileSelectedWorkbenchImageHdu$: Observable<ImageHdu>;

  selectedDataFileListItem$: Observable<ISelectedFileListItem>;

  fileLoaderSub: Subscription;
  queryParamSub: Subscription;
  markerOverlaySub: Subscription;
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
    private activeRoute: ActivatedRoute
  ) {
    this.files$ = this.store
      .select(DataFilesState.getFiles)
      .pipe(map((files) => files.sort((a, b) => a.name.localeCompare(b.name))));

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

    this.focusedImageViewer$ = this.store.select(WorkbenchState.getFocusedImageViewer);
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

    this.focusedViewerFileSelectedWorkbenchHduId$ = combineLatest([
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

    this.focusedViewerFileSelectedWorkbenchHdu$ = this.focusedViewerFileSelectedWorkbenchHduId$.pipe(
      switchMap((hduId) => this.store.select(DataFilesState.getHduById).pipe(map((fn) => fn(hduId))))
    );

    this.focusedViewerFileSelectedWorkbenchImageHduId$ = this.focusedViewerFileSelectedWorkbenchHdu$.pipe(
      map((hdu) => (!hdu || hdu.hduType != HduType.IMAGE ? null : hdu.id)),
      distinctUntilChanged()
    );

    this.focusedViewerFileSelectedWorkbenchImageHdu$ = this.focusedViewerFileSelectedWorkbenchImageHduId$.pipe(
      switchMap((hduId) => this.store.select(DataFilesState.getHduById).pipe(map((fn) => fn(hduId) as ImageHdu)))
    );

    this.focusedViewerRawImageData$ = this.focusedImageViewer$.pipe(
      switchMap((viewer) => {
        return this.store.select(DataFilesState.getImageDataById).pipe(map((fn) => fn(viewer.rawImageDataId)));
      }),
      distinctUntilChanged()
    );

    this.focusedViewerNormalizedImageData$ = this.focusedImageViewer$.pipe(
      switchMap((viewer) => {
        return this.store
          .select(DataFilesState.getImageDataById)
          .pipe(map((fn) => fn(viewer.normalizedImageDataId) as IImageData<Uint32Array>));
      }),
      distinctUntilChanged()
    );

    this.focusedViewerImageTransform$ = this.focusedImageViewer$.pipe(
      switchMap((viewer) => {
        return this.store.select(DataFilesState.getTransformById).pipe(map((fn) => fn(viewer.imageTransformId)));
      }),
      distinctUntilChanged()
    );

    this.focusedViewerViewportTransform$ = this.focusedImageViewer$.pipe(
      switchMap((viewer) => {
        return this.store.select(DataFilesState.getTransformById).pipe(map((fn) => fn(viewer.viewportTransformId)));
      }),
      distinctUntilChanged()
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

    this.focusedViewerHeader$ = this.focusedViewer$.pipe(
      switchMap((viewer) => {
        return this.store.select(DataFilesState.getHeaderById).pipe(map((fn) => fn(viewer.headerId)));
      }),
      distinctUntilChanged()
    );

    this.focusedViewerWcs$ = this.focusedViewerHeader$.pipe(
      map((header) => (header ? header.wcs : null)),
      distinctUntilChanged()
    );

    this.selectedDataFileListItem$ = this.focusedViewer$.pipe(
      distinctUntilChanged((a, b) => a.fileId == b.fileId && a.hduId == b.hduId),
      map((viewer) => {
        return { fileId: viewer.fileId, hduId: viewer.hduId };
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
    this.customMarkerPanelState$ = this.focusedImageViewer$.pipe(
      switchMap((viewer) => {
        return this.store
          .select(WorkbenchState.getCustomMarkerPanelStateById)
          .pipe(map((fn) => fn(viewer.customMarkerPanelStateId)));
      }),
      distinctUntilChanged()
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

    this.plottingPanelState$ = this.focusedImageViewer$.pipe(
      switchMap((viewer) => {
        return this.store
          .select(WorkbenchState.getPlottingPanelStateById)
          .pipe(map((fn) => fn(viewer.plottingPanelStateId)));
      }),
      distinctUntilChanged()
    );

    this.plottingPanelConfig$ = this.store.select(WorkbenchState.getPlottingPanelConfig);

    /* SONIFICATION PANEL */
    this.sonificationPanelState$ = this.focusedImageViewer$.pipe(
      switchMap((viewer) => {
        return this.store
          .select(WorkbenchState.getSonificationPanelStateById)
          .pipe(map((fn) => fn(viewer.sonificationPanelStateId)));
      }),
      distinctUntilChanged()
    );

    /* PHOTOMETRY PANEL */
    this.photometryPanelConfig$ = this.store.select(WorkbenchState.getPhotometryPanelConfig);

    this.photometryPanelState$ = this.focusedImageViewer$.pipe(
      switchMap((viewer) => {
        return this.store
          .select(WorkbenchState.getPhotometryPanelStateById)
          .pipe(map((fn) => fn(viewer.photometryPanelStateId)));
      }),
      distinctUntilChanged()
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

    this.viewerSyncEnabled$ = store.select(WorkbenchState.getViewerSyncEnabled);
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

    // this.transformationSyncSub = combineLatest(
    //   this.focusedViewerId$,
    //   this.store.select(WorkbenchState.getViewerSyncEnabled),
    //   visibleViewerIds$
    // )
    //   .pipe(
    //     filter(([focusedViewerId]) => focusedViewerId != null),
    //     switchMap(
    //       ([focusedViewerId, transformationSyncEnabled, visibleViewerIds]) => {
    //         if (!transformationSyncEnabled) return empty();

    //         let refFileId$ = this.store.select(WorkbenchState.getViewerById).pipe(
    //           map(fn => fn(focusedViewerId).fileId),
    //           distinctUntilChanged()
    //         )

    //         let refHduId$ = this.store.select(WorkbenchState.getViewerById).pipe(
    //           map(fn => fn(focusedViewerId).hduId),
    //           distinctUntilChanged()
    //         )

    //         let refTransform = combineLatest(refFileId$, refHduId$).pipe(
    //           switchMap(([fileId, hduId]) => {
    //             //if no hdu is assigned,  use transform from composite file
    //             let transformId =
    //           })
    //         )

    //         let referenceTransform$ = this.store.select(WorkbenchState.getSyncTransformationFromViewerId).pipe(
    //           map(fn => fn(focusedViewerId)),
    //           distinctUntilChanged()
    //         )

    //         let targetTransform$ = merge(...visibleViewerIds.map(viewerId => this.store.select(WorkbenchState.getSyncTransformationFromViewerId).pipe(
    //           map(fn => fn(focusedViewerId)),
    //           distinctUntilChanged()
    //         )))

    //         return combineLatest(targetTransform$, referenceTransform$).pipe(
    //           withLatestFrom(visibleViewerIds$),
    //           map(([[header, transformation], selectedViewerFileIds]) => {
    //             return {
    //               srcHduId: hduId,
    //               targetHduIds: selectedViewerFileIds
    //                 .map((v) => hduId)
    //                 .filter((v) => v != hduId),
    //             };
    //           })
    //         );
    //       }
    //     )
    //   )
    //   .subscribe((v) => {
    //     let hdus = this.store.selectSnapshot(DataFilesState.getHduEntities);
    //     if (!(v.srcHduId in hdus)) return;
    //     let hdu = hdus[v.srcHduId] as ImageHdu;
    //     if (hdu.header.loaded && v.targetHduIds.length != 0) {
    //       let targetHduIds = v.targetHduIds.filter(
    //         (fileId) => fileId in hdus && hdus[fileId].header.loaded
    //       );

    //       this.store.dispatch(
    //         new SyncHduTransformations(
    //           v.srcHduId,
    //           targetHduIds
    //         )
    //       );
    //     }
    //   });

    // this.normalizationSyncSub = combineLatest(
    //   this.focusedImageHduId$,
    //   this.store.select(WorkbenchState.getNormalizationSyncEnabled),
    //   visibleViewerIds$
    // )
    //   .pipe(
    //     filter(([hduId, normalizationSyncEnabled]) => hduId != null),
    //     switchMap(
    //       ([hduId, normalizationSyncEnabled, viewers]) => {
    //         if (!normalizationSyncEnabled) return empty();
    //         let header$ = merge(
    //           ...viewers.map((v) => {
    //             return this.store.select(DataFilesState.getHeader).pipe(
    //               // TODO: LAYER
    //               map((fn) => fn(v.hduId)),
    //               distinctUntilChanged()
    //             );
    //           })
    //         );

    //         let hist$ = merge(
    //           ...viewers.map((v) => {
    //             return this.store.select(DataFilesState.getHist).pipe(
    //               // TODO: LAYER
    //               map((fn) => fn(v.hduId)),
    //               distinctUntilChanged()
    //             );
    //           })
    //         );

    //         let normalization$ = this.store
    //           .select(DataFilesState.getNormalizer)
    //           .pipe(
    //             map((fn) => {
    //               return fn(hduId);
    //             }),
    //             distinctUntilChanged()
    //           );

    //         return combineLatest(header$, hist$, normalization$).pipe(
    //           filter(([header, hist, normalization]) => normalization !== null),
    //           withLatestFrom(visibleViewerIds$),
    //           map(([[header, normalization], viewers]) => {
    //             return {
    //               srcHduId: hduId,
    //               targetHduIds: viewers
    //                 .map((v) => v.hduId)
    //                 .filter((v) => v != hduId),
    //             };
    //           })
    //         );
    //       }
    //     )
    //   )
    //   .subscribe((v) => {
    //     let hdus = this.store.selectSnapshot(DataFilesState.getHduEntities);

    //     let hdu = hdus[v.srcHduId] as ImageHdu;
    //     if (hdu.header.loaded && v.targetHduIds.length != 0) {
    //       let targetHduIds = v.targetHduIds.filter(
    //         (fileId) =>
    //           fileId in hdus && (hdus[fileId] as ImageHdu).header.loaded
    //       );

    //       this.store.dispatch(
    //         new SyncFileNormalizations(
    //           v.srcHduId,
    //           targetHduIds
    //         )
    //       );
    //     }
    //   });

    // this.plottingPanelSyncSub = combineLatest(
    //   this.focusedImageHduId$,
    //   this.store.select(WorkbenchState.getPlottingPanelConfig).pipe(
    //     map((config) => config.plotterSyncEnabled),
    //     distinctUntilChanged()
    //   ),
    //   visibleViewerIds$
    // )
    //   .pipe(
    //     filter(([hduId, plottingPanelSyncEnabled]) => hduId != null),
    //     switchMap(
    //       ([hduId, plottingPanelSyncEnabled, selectedViewerFileIds]) => {
    //         if (!plottingPanelSyncEnabled) return empty();
    //         let header$ = merge(
    //           ...selectedViewerFileIds.map((v) => {
    //             return this.store.select(DataFilesState.getHeader).pipe(
    //               map((fn) => fn(v.hduId)),
    //               distinctUntilChanged()
    //             );
    //           })
    //         );

    //         let plottingPanelFileState$ = this.store
    //           .select(WorkbenchState.getPlottingPanelState)
    //           .pipe(
    //             map((fn) => {
    //               return fn(hduId);
    //             }),
    //             distinctUntilChanged()
    //           );

    //         return combineLatest(header$, plottingPanelFileState$).pipe(
    //           filter(
    //             ([header, plottingPanelFileState]) =>
    //               plottingPanelFileState !== null
    //           ),
    //           withLatestFrom(visibleViewerIds$),
    //           map(
    //             ([[header, plottingPanelFileState], viewers]) => {
    //               return {
    //                 srcHduId: hduId,
    //                 targetHduIds: viewers
    //                   .map((v) => v.hduId)
    //                   .filter((v) => v != hduId),
    //               };
    //             }
    //           )
    //         );
    //       }
    //     )
    //   )
    //   .subscribe((v) => {
    //     let hdus = this.store.selectSnapshot(DataFilesState.getHduEntities);
    //     let hduStates = this.store.selectSnapshot(WorkbenchState.getHduStateEntities)
    //     let hdu = hdus[v.srcHduId] as ImageHdu;
    //     if (hdu.header.loaded && v.targetHduIds.length != 0) {
    //       let targetHduIds = v.targetHduIds.filter(
    //         (hduId) => hduId in hdus && hdus[hduId].header.loaded
    //       );

    //       this.store.dispatch(
    //         new SyncPlottingPanelStates(
    //           (hduStates[v.srcHduId] as WorkbenchImageHduState).plottingPanelStateId,
    //           targetHduIds.map((id) => (hduStates[id] as WorkbenchImageHduState).plottingPanelStateId)
    //         )
    //       );
    //     }
    //   });

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
    this.markerOverlaySub.unsubscribe();
    // this.transformationSyncSub.unsubscribe();
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

  onSelectedHduIdChange($event: MatSelectChange) {
    let hduId = $event.value;
    this.store.dispatch(new SetSelectedHduId(this.store.selectSnapshot(DataFilesState.getHduEntities)[hduId].fileId, hduId));
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
    this.store.dispatch(new UpdateCustomMarker(viewer.customMarkerPanelStateId, $event.id, $event.changes));
  }

  onCustomMarkerDelete($event: Marker[]) {
    let viewer = this.store.selectSnapshot(WorkbenchState.getFocusedImageViewer);
    if (!viewer) return;
    this.store.dispatch(new RemoveCustomMarkers(viewer.customMarkerPanelStateId, $event));
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
    let targetHeader = this.store.selectSnapshot(DataFilesState.getHeaderEntities)[viewer.headerId];

    let hduStateEntities = this.store.selectSnapshot(WorkbenchState.getHduStateEntities);
    let fileStateEntities = this.store.selectSnapshot(WorkbenchState.getFileStateEntities);
    let imageDataEntities = this.store.selectSnapshot(DataFilesState.getImageDataEntities);

    switch (activeTool) {
      case WorkbenchTool.CUSTOM_MARKER: {
        let customMarkerPanelStateId = viewer.customMarkerPanelStateId;
        let imageDataId = viewer.rawImageDataId ? viewer.rawImageDataId : viewer.normalizedImageDataId;
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
        let plottingPanelStateId = viewer.plottingPanelStateId;
        let imageDataId = viewer.rawImageDataId ? viewer.rawImageDataId : viewer.normalizedImageDataId;
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
        if (!viewer.rawImageDataId || !viewer.hduId) return;
        let targetImageData = this.store.selectSnapshot(DataFilesState.getImageDataEntities)[viewer.rawImageDataId];
        let header = this.store.selectSnapshot(DataFilesState.getHeaderEntities)[viewer.headerId];

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
    let targetHeader = this.store.selectSnapshot(DataFilesState.getHeaderEntities)[viewer.headerId];

    let hduStateEntities = this.store.selectSnapshot(WorkbenchState.getHduStateEntities);
    let fileStateEntities = this.store.selectSnapshot(WorkbenchState.getFileStateEntities);
    let imageDataEntities = this.store.selectSnapshot(DataFilesState.getImageDataEntities);

    switch (activeTool) {
      case WorkbenchTool.PLOTTER: {
        let plottingPanelStateId = viewer.plottingPanelStateId;
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
    let targetHeader = this.store.selectSnapshot(DataFilesState.getHeaderEntities)[viewer.headerId];

    switch (activeTool) {
      case WorkbenchTool.CUSTOM_MARKER: {
        if ($event.mouseEvent.altKey) return;
        if (typeof $event.marker.id == "undefined") return;

        let customMarkerPanelState = this.store.selectSnapshot(WorkbenchState.getCustomMarkerPanelStateEntities)[
          viewer.customMarkerPanelStateId
        ];
        if (!customMarkerPanelState.markerIds.includes($event.marker.id)) return;
        let customMarker = customMarkerPanelState.markerEntities[$event.marker.id];
        if (!customMarker) return;
        let customMarkerSelected = customMarkerPanelState.markerEntities[$event.marker.id].selected;

        if ($event.mouseEvent.ctrlKey) {
          if (!customMarkerSelected) {
            // select the source
            this.selectCustomMarkers(viewer.customMarkerPanelStateId, [customMarker]);
          } else {
            // deselect the source
            this.deselectCustomMarkers(viewer.customMarkerPanelStateId, [customMarker]);
          }
        } else {
          this.store.dispatch(new SetCustomMarkerSelection(viewer.customMarkerPanelStateId, [customMarker]));
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

  onFileSelect($event: { item: ISelectedFileListItem; doubleClick: boolean }) {
    if (!$event.item) return;

    if (!$event.doubleClick) {
      this.store.dispatch(new SelectDataFileListItem($event.item));
    } else {
      let focusedViewer = this.store.selectSnapshot(WorkbenchState.getFocusedViewer);
      if (focusedViewer) {
        this.store.dispatch(new KeepViewerOpen(focusedViewer.id));
      }
    }
  }

  // onMultiFileSelect(files: Array<DataFile>) {
  //   if(!files) return;
  //   this.store.dispatch(new SetMultiFileSelection(files.map(f => f.id)));
  // }

  removeAllFiles() {
    let dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: "300px",
      data: {
        message: "Are you sure you want to delete all files from your library?",
        confirmationBtn: {
          color: "warn",
          label: "Delete All Files",
        },
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.store.dispatch(new CloseAllDataFiles());
      }
    });
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
