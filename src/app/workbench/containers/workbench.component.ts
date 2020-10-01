import { Component, OnInit, OnDestroy } from "@angular/core";
import { Observable, combineLatest, merge, of, never, empty } from "rxjs";
import {
  map,
  tap,
  filter,
  distinctUntilChanged,
  switchMap,
  withLatestFrom,
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
  DataLayer,
} from "../../data-files/models/data-file";
import { SidebarView } from "../models/sidebar-view";
import { Router, ActivatedRoute } from "@angular/router";
import { Subscription } from "../../../../node_modules/rxjs";
import {
  HotkeysService,
  Hotkey,
} from "../../../../node_modules/angular2-hotkeys";
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
  SelectDataFile,
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
  SyncFileTransformations,
  SyncFileNormalizations,
  SyncFilePlotters,
} from "../workbench.actions";
import {
  LoadLibrary,
  RemoveAllDataFiles,
  RemoveDataFile,
  LoadDataFile,
} from "../../data-files/data-files.actions";
import { LoadDataProviders } from "../../data-providers/data-providers.actions";
import { ViewMode } from "../models/view-mode";
import { MatButtonToggleChange } from "@angular/material/button-toggle";
import { MatRadioChange } from "@angular/material/radio";
import { MatSelectChange } from "@angular/material/select"
import { Viewer } from "../models/viewer";
import { DataProvider } from "../../data-providers/models/data-provider";
import { CorrelationIdGenerator } from "../../utils/correlated-action";
import { DataProvidersState } from "../../data-providers/data-providers.state";
import { ConfirmationDialogComponent } from "../components/confirmation-dialog/confirmation-dialog.component";
import { Navigate } from "@ngxs/router-plugin";
import { WorkbenchDataFileState, WorkbenchImageHduState } from "../models/workbench-file-state";
import {
  WorkbenchTool,
  PlottingPanelConfig,
  PhotometryPanelConfig,
  PixelOpsPanelConfig,
  AligningPanelConfig,
  StackingPanelConfig,
  ViewerPanelContainer,
} from "../models/workbench-state";
import { WorkbenchFileStates } from "../workbench-file-states.state";
import { CustomMarkerPanelConfig } from "../models/workbench-state";
import {
  Marker,
  MarkerType,
  CircleMarker,
  LineMarker,
  RectangleMarker,
  TeardropMarker,
} from "../models/marker";
import { centroidDisk, centroidPsf } from "../models/centroider";
import { PlottingPanelState } from "../models/plotter-file-state";
import { CustomMarker } from "../models/custom-marker";
import {
  SelectCustomMarkers,
  DeselectCustomMarkers,
  AddCustomMarkers,
  SetCustomMarkerSelection,
  UpdateCustomMarker,
  RemoveCustomMarkers,
  UpdateLine,
  StartLine,
} from "../workbench-file-states.actions";
import { CustomMarkerPanelState } from "../models/marker-file-state";
import { PosType, Source } from "../models/source";
import {
  SonifierRegionMode,
  SonificationPanelState,
} from "../models/sonifier-file-state";
import { Transformation } from "../models/transformation";
import { FileInfoPanelConfig } from "../models/file-info-panel";
import { Normalization } from "../models/normalization";
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
import { HduType } from '../../data-files/models/data-file-type';

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
  loadingFiles$: Observable<boolean>;
  focusedViewer$: Observable<Viewer>;
  focusedFile$: Observable<DataFile>;
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

  focusedDataFile$: Observable<DataFile>;
  focusedDataFileId$: Observable<[string, number]>;
  focusedDataFileTransformation$: Observable<Transformation>;
  focusedDataFileNormalization$: Observable<Normalization>;
  fileInfoPanelConfig$: Observable<FileInfoPanelConfig>;
  customMarkerPanelState$: Observable<CustomMarkerPanelState>;
  customMarkerPanelConfig$: Observable<CustomMarkerPanelConfig>;
  customMarkerPanelMarkers$: Observable<{ [viewerId: string]: Marker[] }>;
  plottingPanelState$: Observable<PlottingPanelState>;
  plottingPanelConfig$: Observable<PlottingPanelConfig>;
  plottingPanelMarkers$: Observable<{ [viewerId: string]: Marker[] }>;
  sonificationPanelState$: Observable<SonificationPanelState>;
  sonificationPanelMarkers$: Observable<{ [viewerId: string]: Marker[] }>;
  photometryPanelState$: Observable<PhotometryPanelState>;
  photometryPanelSources$: Observable<Source[]>;
  photometryPanelMarkers$: Observable<{ [viewerId: string]: Marker[] }>;
  photometryPanelConfig$: Observable<PhotometryPanelConfig>;
  pixelOpsPanelConfig$: Observable<PixelOpsPanelConfig>;
  aligningPanelConfig$: Observable<AligningPanelConfig>;
  stackingPanelConfig$: Observable<StackingPanelConfig>;
  photometrySettings$: Observable<PhotometrySettings>;
  centroidSettings$: Observable<CentroidSettings>;
  sourceExtractionSettings$: Observable<SourceExtractionSettings>;

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
      .select(DataFilesState.getDataFiles)
      .pipe(map((files) => files.sort((a, b) => a.name.localeCompare(b.name))));

    this.viewers$ = this.store.select(WorkbenchState.getViewers);

    let visibleFileHdus$ = this.store.select(WorkbenchState.getViewerPanelEntities).pipe(
      map((panelEntities) =>
        Object.values(panelEntities)
          .map((panel) => panel.selectedViewerId)
          .filter((id) => id !== null)
      ),
      distinctUntilChanged(
        (x, y) =>
          x.length == y.length && x.every((value, index) => value === y[index])
      ),
      switchMap((viewerIds) => {
        return combineLatest(
          ...viewerIds.map((viewerId) => {
            return combineLatest(
              of(viewerId),
              this.store.select(WorkbenchState.getViewerById).pipe(
                map((fn) => fn(viewerId).fileId),
                distinctUntilChanged()
              ),
              this.store.select(WorkbenchState.getViewerById).pipe(
                map((fn) => fn(viewerId).hduIndex),
                distinctUntilChanged()
              )
            );
          })
        );
      })
    );

    this.focusedViewer$ = this.store.select(WorkbenchState.getFocusedViewer);
    this.focusedFile$ = this.store.select(WorkbenchState.getFocusedDataFile);
    this.focusedDataFileId$ = store.select(WorkbenchState.getFocusedFileId);
    this.focusedDataFile$ = store.select(WorkbenchState.getFocusedDataFile);


    this.focusedDataFileTransformation$ = this.focusedDataFileId$.pipe(
      switchMap(([fileId, hduIndex]) => {
        if (!fileId) return of(null);
        return store
          .select(WorkbenchFileStates.getTransformation)
          .pipe(map((fn) => fn(fileId, hduIndex)));
      })
    );


    this.focusedDataFileNormalization$ = this.focusedDataFileId$.pipe(
      switchMap(([fileId, hduIndex]) => {
        if (!fileId) return of(null);
        return store
          .select(WorkbenchFileStates.getNormalization)
          .pipe(map((fn) => fn(fileId, hduIndex)));
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
      .pipe(
        map((dataProviders) =>
          dataProviders.find((dp) => dp.name == "Imaging Surveys")
        )
      );

    /* VIEWER */
    this.layoutContainer$ = this.store.select(
      WorkbenchState.getRootViewerPanelContainer
    );

    /* GLOBAL SETTINGS */
    this.centroidSettings$ = this.store.select(
      WorkbenchState.getCentroidSettings
    );
    this.photometrySettings$ = this.store.select(
      WorkbenchState.getPhotometrySettings
    );
    this.sourceExtractionSettings$ = this.store.select(
      WorkbenchState.getSourceExtractionSettings
    );

    /* DISPLAY PANEL */

    /* FILE INFO PANEL */
    this.fileInfoPanelConfig$ = store.select(
      WorkbenchState.getFileInfoPanelConfig
    );

    /* CUSTOM MARKER PANEL */
    this.customMarkerPanelState$ = this.focusedDataFileId$.pipe(
      switchMap(([fileId, hduIndex]) => {
        if (!fileId) return of(null);
        return store
          .select(WorkbenchFileStates.getCustomMarkerPanelState)
          .pipe(map((fn) => fn(fileId, hduIndex)));
      })
    );

    this.customMarkerPanelConfig$ = store.select(
      WorkbenchState.getCustomMarkerPanelConfig
    );

    this.customMarkerPanelMarkers$ = combineLatest(
      this.activeTool$,
      visibleFileHdus$
    ).pipe(
      switchMap(([activeTool, selectedViewerFileIds]) => {
        return combineLatest(
          ...selectedViewerFileIds.map(({ viewerId, fileId }) => {
            if (activeTool != WorkbenchTool.CUSTOM_MARKER || !fileId) {
              return of({
                viewerId: viewerId,
                markers: [],
              });
            }

            return this.store
              .select(WorkbenchFileStates.getCustomMarkerPanelState)
              .pipe(
                map((fn) => {
                  return fn(fileId, 0);
                }),
                distinctUntilChanged(),
                map((markerFileState) => {
                  return {
                    viewerId: viewerId,
                    markers: Object.values(markerFileState.entities),
                  };
                })
              );
          })
        ).pipe(
          map((v) =>
            v.reduce((obj, key) => {
              return {
                ...obj,
                [key.viewerId]: key.markers,
              };
            }, {})
          )
        );
      })
    );

    /* PLOTTING PANEL */
    this.plottingPanelState$ = this.focusedDataFileId$.pipe(
      switchMap(([fileId, hduIndex]) => {
        if (!fileId) return of(null);
        return this.store
          .select(WorkbenchFileStates.getPlottingPanelState)
          .pipe(map((fn) => fn(fileId, hduIndex)));
      })
    );

    this.plottingPanelConfig$ = this.store.select(
      WorkbenchState.getPlottingPanelConfig
    );

    this.plottingPanelMarkers$ = combineLatest(
      this.activeTool$,
      visibleFileHdus$
    ).pipe(
      switchMap(([activeTool, selectedViewerFileIds]) => {
        return combineLatest(
          ...selectedViewerFileIds.map(({ viewerId, fileId }) => {
            if (activeTool != WorkbenchTool.PLOTTER || !fileId) {
              return of({ viewerId: viewerId, markers: [] });
            }
            // TODO: LAYER
            let header$ = this.store.select(DataFilesState.getHeader).pipe(
              map((fn) => fn(fileId, 0)),
              distinctUntilChanged()
            );

            let plottingState$ = this.store
              .select(WorkbenchFileStates.getPlottingPanelState)
              .pipe(
                map((fn) => {
                  return fn(fileId, 0);
                }),
                distinctUntilChanged()
              );

            return combineLatest(
              header$,
              plottingState$,
              this.store.select(WorkbenchState.getPlottingPanelConfig)
            ).pipe(
              map(([header, plottingState, config]) => {
                let file = this.store.selectSnapshot(
                  DataFilesState.getEntities
                )[fileId];
                if (!file || !header) {
                  return { viewerId: viewerId, markers: [] };
                }

                let lineMeasureStart = plottingState.lineMeasureStart;
                let lineMeasureEnd = plottingState.lineMeasureEnd;
                if (!lineMeasureStart || !lineMeasureEnd) {
                  return { viewerId: viewerId, markers: [] };
                }

                let startPrimaryCoord = lineMeasureStart.primaryCoord;
                let startSecondaryCoord = lineMeasureStart.secondaryCoord;
                let startPosType = lineMeasureStart.posType;
                let endPrimaryCoord = lineMeasureEnd.primaryCoord;
                let endSecondaryCoord = lineMeasureEnd.secondaryCoord;
                let endPosType = lineMeasureEnd.posType;

                let x1 = startPrimaryCoord;
                let y1 = startSecondaryCoord;
                let x2 = endPrimaryCoord;
                let y2 = endSecondaryCoord;

                // TODO: LAYER
                let layer = file.hdus[0] as ImageHdu;
                if (startPosType == PosType.SKY || endPosType == PosType.SKY) {
                  if (!layer.headerLoaded || !layer.wcs.isValid()) {
                    return { viewerId: viewerId, markers: [] };
                  }
                  let wcs = layer.wcs;
                  if (startPosType == PosType.SKY) {
                    let xy = wcs.worldToPix([
                      startPrimaryCoord,
                      startSecondaryCoord,
                    ]);
                    x1 = Math.max(Math.min(xy[0], getWidth(layer)), 0);
                    y1 = Math.max(Math.min(xy[1], getHeight(layer)), 0);
                  }

                  if (endPosType == PosType.SKY) {
                    let xy = wcs.worldToPix([
                      endPrimaryCoord,
                      endSecondaryCoord,
                    ]);
                    x2 = Math.max(Math.min(xy[0], getWidth(layer)), 0);
                    y2 = Math.max(Math.min(xy[1], getHeight(layer)), 0);
                  }
                }

                let markers: Marker[] = [];
                if (config.plotterMode == "1D") {
                  markers = [
                    {
                      id: `PLOTTING_MARKER_${fileId}`,
                      type: MarkerType.LINE,
                      x1: x1,
                      y1: y1,
                      x2: x2,
                      y2: y2,
                    } as LineMarker,
                  ];
                } else {
                  markers = [
                    {
                      id: `PLOTTING_MARKER_${fileId}`,
                      type: MarkerType.RECTANGLE,
                      x: Math.min(x1, x2),
                      y: Math.min(y1, y2),
                      width: Math.abs(x2 - x1),
                      height: Math.abs(y2 - y1),
                    } as RectangleMarker,
                  ];
                }
                return { viewerId: viewerId, markers: markers };
              })
            );
          })
        ).pipe(
          map((v) =>
            v.reduce((obj, key) => {
              return {
                ...obj,
                [key.viewerId]: key.markers,
              };
            }, {})
          )
        );
      })
    );

    /* SONIFICATION PANEL */
    this.sonificationPanelState$ = this.focusedDataFileId$.pipe(
      switchMap(([fileId, hduIndex]) => {
        if (!fileId) return of(null);
        return this.store
          .select(WorkbenchFileStates.getSonificationPanelState)
          .pipe(map((fn) => fn(fileId, hduIndex)));
      })
    );

    this.sonificationPanelMarkers$ = combineLatest(
      this.activeTool$,
      visibleFileHdus$
    ).pipe(
      switchMap(([activeTool, selectedViewerFileIds]) => {
        return combineLatest(
          ...selectedViewerFileIds.map(({ viewerId, fileId }) => {
            if (activeTool != WorkbenchTool.SONIFIER || !fileId) {
              return of({ viewerId: viewerId, markers: [] });
            }
            return this.store
              .select(WorkbenchFileStates.getSonificationPanelState)
              .pipe(
                map((fn) => {
                  return fn(fileId, 0);
                }),
                distinctUntilChanged(),
                map((sonificationState) => {
                  let region =
                    sonificationState.regionHistory[
                    sonificationState.regionHistoryIndex
                    ];
                  let regionMode = sonificationState.regionMode;
                  let progressLine = sonificationState.progressLine;
                  let markers: Array<RectangleMarker | LineMarker> = [];
                  if (region && regionMode == SonifierRegionMode.CUSTOM)
                    markers.push({
                      id: `SONIFICATION_REGION_${fileId}`,
                      type: MarkerType.RECTANGLE,
                      ...region,
                    } as RectangleMarker);
                  if (progressLine)
                    markers.push({
                      id: `SONIFICATION_PROGRESS_${fileId}`,
                      type: MarkerType.LINE,
                      ...progressLine,
                    } as LineMarker);
                  return { viewerId: viewerId, markers: markers };
                })
              );
          })
        ).pipe(
          map((v) =>
            v.reduce((obj, key) => {
              return {
                ...obj,
                [key.viewerId]: key.markers,
              };
            }, {})
          )
        );
      })
    );

    /* PHOTOMETRY PANEL */

    this.photometryPanelState$ = this.focusedDataFileId$.pipe(
      switchMap(([fileId, hduIndex]) => {
        if (!fileId) return of(null);
        return this.store
          .select(WorkbenchFileStates.getPhotometryPanelState)
          .pipe(
            map((fn) => fn(fileId, hduIndex)),
            distinctUntilChanged()
          );
      })
    );

    this.photometryPanelSources$ = this.focusedDataFileId$.pipe(
      switchMap(([fileId, hduIndex]) => {
        if (!fileId) return of(null);
        return combineLatest(
          store.select(SourcesState.getSources),
          store.select(WorkbenchState.getPhotometryPanelConfig).pipe(
            map((config) => config.coordMode),
            distinctUntilChanged()
          ),
          store.select(WorkbenchState.getPhotometryPanelConfig).pipe(
            map((config) => config.showSourcesFromAllFiles),
            distinctUntilChanged()
          ),
          // TODO: LAYER
          this.store.select(DataFilesState.getHeader).pipe(
            map((fn) => fn(fileId, hduIndex)),
            distinctUntilChanged()
          )
        ).pipe(
          filter(
            ([sources, coordMode, showSourcesFromAllFiles, header]) =>
              header != null
          ),
          map(([sources, coordMode, showSourcesFromAllFiles, header]) => {
            let file = this.store.selectSnapshot(DataFilesState.getEntities)[
              fileId
            ];
            if (!file || !header) return [];

            // TODO: LAYER
            let layer = file.hdus[hduIndex] as ImageHdu;
            if (!layer.wcs || !layer.wcs.isValid()) coordMode = "pixel";
            return sources.filter((source) => {
              if (coordMode != source.posType) return false;
              if (source.fileId == file.id) return true;
              if (!showSourcesFromAllFiles) return false;
              let coord = getSourceCoordinates(layer, source);
              if (coord == null) return false;
              return true;
            });
          })
        );
      })
    );

    this.photometryPanelConfig$ = this.store.select(
      WorkbenchState.getPhotometryPanelConfig
    );

    this.photometryPanelMarkers$ = combineLatest(
      this.activeTool$,
      visibleFileHdus$
    ).pipe(
      switchMap(([activeTool, selectedViewerFileIds]) => {
        return combineLatest(
          ...selectedViewerFileIds.map(({ viewerId, fileId }) => {
            if (activeTool != WorkbenchTool.PHOTOMETRY || !fileId) {
              return of({ viewerId: viewerId, markers: [] });
            }

            // TODO: LAYER
            return combineLatest(
              this.store
                .select(DataFilesState.getHeader)
                .pipe(map((fn) => fn(fileId, 0))),
              this.store.select(WorkbenchState.getPhotometryPanelConfig),
              this.store.select(SourcesState.getSources)
            ).pipe(
              map(([header, config, sources]) => {
                let file = this.store.selectSnapshot(
                  DataFilesState.getEntities
                )[fileId];
                if (!file || !header) {
                  return { viewerId: viewerId, markers: [] };
                }

                let selectedSourceIds = config.selectedSourceIds;
                let coordMode = config.coordMode;
                let showSourcesFromAllFiles = config.showSourcesFromAllFiles;
                let showSourceLabels = config.showSourceLabels;

                let markers: Array<CircleMarker | TeardropMarker> = [];
                let mode = coordMode;

                // TODO: LAYER
                let layer = file.hdus[0] as ImageHdu;
                if (!layer.wcs.isValid()) mode = "pixel";

                sources.forEach((source) => {
                  if (source.fileId != fileId && !showSourcesFromAllFiles)
                    return;
                  if (source.posType != mode) return;
                  let selected = selectedSourceIds.includes(source.id);
                  let coord = getSourceCoordinates(layer, source);

                  if (coord == null) {
                    return false;
                  }

                  if (source.pm) {
                    markers.push({
                      id: `PHOTOMETRY_SOURCE_${file.id}_${source.id}`,
                      type: MarkerType.TEARDROP,
                      x: coord.x,
                      y: coord.y,
                      radius: 15,
                      labelGap: 14,
                      labelTheta: 0,
                      label: showSourceLabels ? source.label : "",
                      theta: coord.theta,
                      selected: selected,
                      data: { source: source },
                    } as TeardropMarker);
                  } else {
                    markers.push({
                      id: `PHOTOMETRY_SOURCE_${file.id}_${source.id}`,
                      type: MarkerType.CIRCLE,
                      x: coord.x,
                      y: coord.y,
                      radius: 15,
                      labelGap: 14,
                      labelTheta: 0,
                      label: showSourceLabels ? source.label : "",
                      selected: selected,
                      data: { source: source },
                    } as CircleMarker);
                  }
                });

                return { viewerId: viewerId, markers: markers };
              })
            );
          })
        ).pipe(
          map((v) =>
            v.reduce((obj, key) => {
              return {
                ...obj,
                [key.viewerId]: key.markers,
              };
            }, {})
          )
        );
      })
    );

    /* PIXEL OPS PANEL */
    this.pixelOpsPanelConfig$ = this.store.select(
      WorkbenchState.getPixelOpsPanelConfig
    );

    /* ALIGNING PANEL */
    this.aligningPanelConfig$ = this.store.select(
      WorkbenchState.getAligningPanelConfig
    );

    /* STACKING PANEL */
    this.stackingPanelConfig$ = this.store.select(
      WorkbenchState.getStackingPanelConfig
    );

    this.markerOverlaySub = combineLatest(
      this.customMarkerPanelMarkers$,
      this.plottingPanelMarkers$,
      this.sonificationPanelMarkers$,
      this.photometryPanelMarkers$
    )
      .pipe(withLatestFrom(visibleFileHdus$))
      .subscribe(
        ([
          [
            customMarkerPanelMarkers,
            plottingPanelMarkers,
            sonificationPanelMarkers,
            photometryPanelMarkers,
          ],
          selectedViewerFileIds,
        ]) => {
          selectedViewerFileIds.forEach(({ viewerId, fileId }) => {
            if (viewerId == null || fileId == null) return;
            let markers: Marker[] = [];
            let markerSources = [
              customMarkerPanelMarkers,
              plottingPanelMarkers,
              sonificationPanelMarkers,
              photometryPanelMarkers,
            ];
            markerSources.forEach((markerSource) => {
              if (viewerId in markerSource)
                markers = markers.concat(markerSource[viewerId]);
            });

            this.store.dispatch(new SetViewerMarkers(viewerId, markers));
          });
        }
      );

    // this.fileLoaderSub = visibleFileHdus$.subscribe((viewerFiles) => {
    //   let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
    //   viewerFiles.forEach(({ viewerId, fileId }) => {
    //     if (!(fileId in dataFiles)) return;

    //     let f = dataFiles[fileId];
    //     f.hdus.forEach(layer => {
    //       let load = !layer.headerLoaded && !layer.headerLoading;
    //       if (!load && layer.hduType == HduType.IMAGE) {
    //         let imageLayer = layer as ImageHdu;
    //         load = !imageLayer.histLoaded && !imageLayer.histLoading
    //       }

    //       if (load) {
    //         this.store.dispatch(new LoadDataFile(fileId));
    //       }
    //     });
    //   })
    // });

    this.viewerSyncEnabled$ = store.select(WorkbenchState.getViewerSyncEnabled);
    this.normalizationSyncEnabled$ = store.select(
      WorkbenchState.getNormalizationSyncEnabled
    );

    this.fullScreenPanel$ = this.store.select(
      WorkbenchState.getFullScreenPanel
    );
    this.inFullScreenMode$ = this.store.select(
      WorkbenchState.getInFullScreenMode
    );
    this.queryParamSub = this.activeRoute.queryParams.subscribe((p) => {
      let tool = WorkbenchTool.VIEWER;
      if (p.tool && Object.values(WorkbenchTool).includes(p.tool)) {
        tool = p.tool;
      }

      this.store.dispatch(new SetActiveTool(tool));
    });

    this.transformationSyncSub = combineLatest(
      this.focusedDataFileId$,
      this.store.select(WorkbenchState.getViewerSyncEnabled),
      visibleFileHdus$
    )
      .pipe(
        filter(
          ([[fileId, hduIndex], transformationSyncEnabled]) =>
            fileId != null
        ),
        switchMap(([[fileId, hduIndex], transformationSyncEnabled, selectedViewerFileIds]) => {
          if (!transformationSyncEnabled) return empty();
          let header$ = merge(
            ...selectedViewerFileIds.map(v => {
              return this.store.select(DataFilesState.getHeader).pipe(
                // TODO: LAYER
                map((fn) => fn(v.fileId, 0)),
                distinctUntilChanged()
              )
            })
          );

          let transformation$ = this.store
            .select(WorkbenchFileStates.getTransformation)
            .pipe(
              map((fn) => {
                return fn(fileId, hduIndex);
              }),
              distinctUntilChanged()
            );

          return combineLatest(header$, transformation$).pipe(
            withLatestFrom(visibleFileHdus$),
            map(([[header, transformation], selectedViewerFileIds]) => {
              return {
                srcFileId: fileId,
                targetFileIds: selectedViewerFileIds
                  .map((v) => v.fileId)
                  .filter((v) => v != fileId),
              };
            })
          );
        })
      )
      .subscribe((v) => {
        let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
        if (!(v.srcFileId in dataFiles)) return;
        // TODO: LAYER
        let layer = dataFiles[v.srcFileId].hdus[0] as ImageHdu;
        if (layer.headerLoaded && v.targetFileIds.length != 0) {
          let targetFileIds = v.targetFileIds.filter(fileId => fileId in dataFiles && dataFiles[fileId].hdus[0].headerLoaded)

          this.store.dispatch(
            new SyncFileTransformations(
              dataFiles[v.srcFileId],
              targetFileIds.map((id) => dataFiles[id]) // TODO: LAYER
            )
          );
        }
      });

    this.normalizationSyncSub = combineLatest(
      this.focusedDataFileId$,
      this.store.select(WorkbenchState.getNormalizationSyncEnabled),
      visibleFileHdus$
    )
      .pipe(
        filter(
          ([[fileId, hduIndex], normalizationSyncEnabled]) =>
            fileId != null
        ),
        switchMap(([[fileId, hduIndex], normalizationSyncEnabled, selectedViewerFileIds]) => {
          if (!normalizationSyncEnabled) return empty();
          let header$ = merge(
            ...selectedViewerFileIds.map(v => {
              return this.store.select(DataFilesState.getHeader).pipe(
                // TODO: LAYER
                map((fn) => fn(v.fileId, hduIndex)),
                distinctUntilChanged()
              )
            })
          );

          let hist$ = merge(
            ...selectedViewerFileIds.map(v => {
              return this.store.select(DataFilesState.getHist).pipe(
                // TODO: LAYER
                map((fn) => fn(v.fileId, hduIndex)),
                distinctUntilChanged()
              )
            })
          );

          let normalization$ = this.store
            .select(WorkbenchFileStates.getNormalization)
            .pipe(
              map((fn) => {
                return fn(fileId, hduIndex);
              }),
              distinctUntilChanged()
            );

          return combineLatest(header$, hist$, normalization$).pipe(
            filter(([header, hist, normalization]) => normalization !== null),
            withLatestFrom(visibleFileHdus$),
            map(([[header, normalization], selectedViewerFileIds]) => {
              return {
                srcFileId: fileId,
                targetFileIds: selectedViewerFileIds
                  .map((v) => v.fileId)
                  .filter((v) => v != fileId),
              };
            })
          );
        })
      )
      .subscribe((v) => {
        let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
        // TODO: LAYER
        let layer = dataFiles[v.srcFileId].hdus[0] as ImageHdu;
        if (layer.headerLoaded && v.targetFileIds.length != 0) {
          let targetFileIds = v.targetFileIds.filter(fileId => fileId in dataFiles && (dataFiles[fileId].hdus[0] as ImageHdu).headerLoaded)

          this.store.dispatch(
            new SyncFileNormalizations(
              dataFiles[v.srcFileId],
              targetFileIds.map((id) => dataFiles[id])
            )
          );
        }
      });

    this.plottingPanelSyncSub = combineLatest(
      this.focusedDataFileId$,
      this.store.select(WorkbenchState.getPlottingPanelConfig).pipe(
        map(config => config.plotterSyncEnabled),
        distinctUntilChanged()
      ),
      visibleFileHdus$
    )
      .pipe(
        filter(
          ([[fileId, hduIndex], plottingPanelSyncEnabled]) =>
            fileId != null
        ),
        switchMap(([[fileId, hduIndex], plottingPanelSyncEnabled, selectedViewerFileIds]) => {
          if (!plottingPanelSyncEnabled) return empty();
          let header$ = merge(
            ...selectedViewerFileIds.map(v => {
              return this.store.select(DataFilesState.getHeader).pipe(
                map((fn) => fn(v.fileId, hduIndex)),
                distinctUntilChanged()
              )
            })
          );

          let plottingPanelFileState$ = this.store
            .select(WorkbenchFileStates.getPlottingPanelState)
            .pipe(
              map((fn) => {
                return fn(fileId, hduIndex);
              }),
              distinctUntilChanged()
            );

          return combineLatest(header$, plottingPanelFileState$).pipe(
            filter(([header, plottingPanelFileState]) => plottingPanelFileState !== null),
            withLatestFrom(visibleFileHdus$),
            map(([[header, plottingPanelFileState], selectedViewerFileIds]) => {
              return {
                srcFileId: fileId,
                targetFileIds: selectedViewerFileIds
                  .map((v) => v.fileId)
                  .filter((v) => v != fileId),
              };
            })
          );
        })
      )
      .subscribe((v) => {
        let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
        // TODO: LAYER
        let layer = dataFiles[v.srcFileId].hdus[0] as ImageHdu;
        if (layer.headerLoaded && v.targetFileIds.length != 0) {
          let targetFileIds = v.targetFileIds.filter(fileId => fileId in dataFiles && dataFiles[fileId].hdus[0].headerLoaded)

          this.store.dispatch(
            new SyncFilePlotters(
              dataFiles[v.srcFileId],
              targetFileIds.map((id) => dataFiles[id])
            )
          );
        }
      });

    this.registerHotKeys();
  }


  ngOnInit() {
    setTimeout(() => {
      this.store.dispatch([
        new LoadLibrary(),
        new LoadCatalogs(),
        new LoadFieldCals(),
        new LoadDataProviders(),
      ]);
    });
  }

  ngOnDestroy() {
    this.hotKeys.forEach((hotKey) => this._hotkeysService.remove(hotKey));
    this.fileLoaderSub.unsubscribe();
    this.queryParamSub.unsubscribe();
    this.markerOverlaySub.unsubscribe();
    this.transformationSyncSub.unsubscribe();
  }

  registerHotKeys() {
    this.hotKeys.push(
      new Hotkey(
        "d",
        (event: KeyboardEvent): boolean => {
          this.store.dispatch(new SetShowConfig(true));
          this.store.dispatch(
            new Navigate(
              [],
              { tool: WorkbenchTool.VIEWER },
              { relativeTo: this.activeRoute, queryParamsHandling: "merge" }
            )
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
            new Navigate(
              [],
              { tool: WorkbenchTool.INFO },
              { relativeTo: this.activeRoute, queryParamsHandling: "merge" }
            )
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
    let fileEntities = this.store.selectSnapshot(DataFilesState.getEntities);
    if (fileEntities[viewer.fileId] && fileEntities[viewer.fileId].name)
      return fileEntities[viewer.fileId].name;
    return `Viewer ${index + 1}`;
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
    let activeImageFile = this.store.selectSnapshot(
      WorkbenchState.getFocusedDataFile
    );
    if (!activeImageFile) return;
    this.store.dispatch(
      new UpdateCustomMarker(activeImageFile.id, 0, $event.id, $event.changes)
    );
  }

  onCustomMarkerDelete($event: Marker[]) {
    let activeImageFile = this.store.selectSnapshot(
      WorkbenchState.getFocusedDataFile
    );
    if (!activeImageFile) return;
    this.store.dispatch(new RemoveCustomMarkers(activeImageFile.id, 0, $event));
  }

  selectCustomMarkers(fileId: string, customMarkers: Marker[]) {
    this.store.dispatch(new SelectCustomMarkers(fileId, 0, customMarkers));
  }

  deselectCustomMarkers(fileId: string, customMarkers: Marker[]) {
    this.store.dispatch(new DeselectCustomMarkers(fileId, 0, customMarkers));
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
    let activeTool = this.store.selectSnapshot(WorkbenchState.getActiveTool);
    switch (activeTool) {
      case WorkbenchTool.CUSTOM_MARKER: {
        let imageLayerState = this.store.selectSnapshot(
          WorkbenchFileStates.getEntities
        )[$event.targetFile.id].hduStates[0] as WorkbenchImageHduState;
        let settings = this.store.selectSnapshot(
          WorkbenchState.getCustomMarkerPanelConfig
        );
        let centroidSettings = this.store.selectSnapshot(
          WorkbenchState.getCentroidSettings
        );
        let selectedCustomMarkers = Object.values(
          imageLayerState.customMarkerPanelState.entities
        ).filter((marker) => marker.selected);
        if ($event.hitImage) {
          if (selectedCustomMarkers.length == 0 || $event.mouseEvent.altKey) {
            let x = $event.imageX;
            let y = $event.imageY;
            if (settings.centroidClicks) {
              let result: { x: number; y: number };
              if (settings.usePlanetCentroiding) {
                result = centroidDisk(
                  $event.targetFile.hdus[0] as ImageHdu,
                  x,
                  y,
                  centroidSettings.diskCentroiderSettings
                );
              } else {
                result = centroidPsf(
                  $event.targetFile.hdus[0] as ImageHdu,
                  x,
                  y,
                  centroidSettings.psfCentroiderSettings
                );
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

            this.store.dispatch(
              new AddCustomMarkers($event.targetFile.id, 0, [customMarker])
            );
          } else {
            this.store.dispatch(
              new SetCustomMarkerSelection($event.targetFile.id, 0, [])
            );
          }
        }
        break;
      }
      case WorkbenchTool.PLOTTER: {
        let imageFile = this.store.selectSnapshot(DataFilesState.getEntities)[
          $event.targetFile.id
        ];
        let imageLayer = imageFile.hdus[0] as ImageHdu;
        let plotterPageSettings = this.store.selectSnapshot(
          WorkbenchState.getPlottingPanelConfig
        );
        if ($event.hitImage && imageFile) {
          let x = $event.imageX;
          let y = $event.imageY;
          if (plotterPageSettings && plotterPageSettings.centroidClicks) {
            let result;
            if (plotterPageSettings.planetCentroiding) {
              result = centroidDisk(imageLayer, x, y);
            } else {
              result = centroidPsf(imageLayer, x, y);
            }

            x = result.x;
            y = result.y;
          }

          let primaryCoord = x;
          let secondaryCoord = y;
          let posType = PosType.PIXEL;
          if (imageLayer.wcs.isValid()) {
            let wcs = imageLayer.wcs;
            let raDec = wcs.pixToWorld([primaryCoord, secondaryCoord]);
            primaryCoord = raDec[0];
            secondaryCoord = raDec[1];
            posType = PosType.SKY;
          }

          this.store.dispatch(
            new StartLine($event.targetFile.id, 0, {
              primaryCoord: primaryCoord,
              secondaryCoord: secondaryCoord,
              posType: posType,
            })
          );
        }
        break;
      }
      case WorkbenchTool.PHOTOMETRY: {
        let photometryPanelConfig = this.store.selectSnapshot(
          WorkbenchState.getPhotometryPanelConfig
        );
        let selectedSourceIds = photometryPanelConfig.selectedSourceIds;
        let centroidClicks = photometryPanelConfig.centroidClicks;
        let activeImageFile = this.store.selectSnapshot(
          WorkbenchState.getFocusedDataFile
        );
        let activeImageFileLayer = activeImageFile.hdus[0] as ImageHdu;
        let centroidSettings = this.store.selectSnapshot(
          WorkbenchState.getCentroidSettings
        );

        if ($event.hitImage) {
          if (selectedSourceIds.length == 0 || $event.mouseEvent.altKey) {
            let primaryCoord = $event.imageX;
            let secondaryCoord = $event.imageY;
            let posType = PosType.PIXEL;
            let imageLayer = activeImageFile.hdus[0] as ImageHdu;
            if (centroidClicks) {
              let result = centroidPsf(
                imageLayer,
                primaryCoord,
                secondaryCoord,
                centroidSettings.psfCentroiderSettings
              );
              primaryCoord = result.x;
              secondaryCoord = result.y;
            }
            if (
              photometryPanelConfig.coordMode == "sky" &&
              activeImageFileLayer.wcs.isValid()
            ) {
              let wcs = activeImageFileLayer.wcs;
              let raDec = wcs.pixToWorld([primaryCoord, secondaryCoord]);
              primaryCoord = raDec[0];
              secondaryCoord = raDec[1];
              posType = PosType.SKY;
            }

            let centerEpoch = getCenterTime(activeImageFileLayer);

            let source: Source = {
              id: null,
              label: null,
              objectId: null,
              fileId: activeImageFile.id,
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
    let activeTool = this.store.selectSnapshot(WorkbenchState.getActiveTool);
    switch (activeTool) {
      case WorkbenchTool.PLOTTER: {
        let imageFile = this.store.selectSnapshot(DataFilesState.getEntities)[
          $event.targetFile.id
        ];
        let imageLayer = imageFile.hdus[0] as ImageHdu;
        let measuring = (this.store.selectSnapshot(
          WorkbenchFileStates.getEntities
        )[$event.targetFile.id].hduStates[0] as WorkbenchImageHduState).plottingPanelState.measuring;
        if (measuring) {
          let primaryCoord = $event.imageX;
          let secondaryCoord = $event.imageY;
          let posType = PosType.PIXEL;
          if (imageLayer.wcs.isValid()) {
            let wcs = imageLayer.wcs;
            let raDec = wcs.pixToWorld([primaryCoord, secondaryCoord]);
            primaryCoord = raDec[0];
            secondaryCoord = raDec[1];
            posType = PosType.SKY;
          }
          this.store.dispatch(
            new UpdateLine($event.targetFile.id, 0, {
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
    let activeTool = this.store.selectSnapshot(WorkbenchState.getActiveTool);
    switch (activeTool) {
      case WorkbenchTool.CUSTOM_MARKER: {
        if ($event.mouseEvent.altKey) return;

        if (typeof $event.marker.id == "undefined") return;

        let workbenchFileStates = this.store.selectSnapshot(
          WorkbenchFileStates.getEntities
        );
        let markerFileState =
          (workbenchFileStates[$event.targetFile.id].hduStates[0] as WorkbenchImageHduState).customMarkerPanelState;

        if (!markerFileState.ids.includes($event.marker.id)) return;

        let customMarker = markerFileState.entities[$event.marker.id];

        if (!customMarker) return;

        let customMarkerSelected =
          markerFileState.entities[$event.marker.id].selected;

        if ($event.mouseEvent.ctrlKey) {
          if (!customMarkerSelected) {
            // select the source
            this.selectCustomMarkers($event.targetFile.id, [customMarker]);
          } else {
            // deselect the source
            this.deselectCustomMarkers($event.targetFile.id, [customMarker]);
          }
        } else {
          this.store.dispatch(
            new SetCustomMarkerSelection($event.targetFile.id, 0, [customMarker])
          );
        }
        $event.mouseEvent.stopImmediatePropagation();
        $event.mouseEvent.preventDefault();
        break;
      }
      case WorkbenchTool.PHOTOMETRY: {
        if ($event.mouseEvent.altKey) return;
        let sources = this.store.selectSnapshot(SourcesState.getSources);
        let source = sources.find(
          (source) =>
            $event.marker.data &&
            $event.marker.data.source &&
            source.id == $event.marker.data.source.id
        );
        if (!source) return;

        let photometryPanelConfig = this.store.selectSnapshot(
          WorkbenchState.getPhotometryPanelConfig
        );
        let sourceSelected = photometryPanelConfig.selectedSourceIds.includes(
          source.id
        );
        if ($event.mouseEvent.ctrlKey) {
          if (!sourceSelected) {
            // select the source
            this.store.dispatch(
              new UpdatePhotometryPanelConfig({
                selectedSourceIds: [
                  ...photometryPanelConfig.selectedSourceIds,
                  source.id,
                ],
              })
            );
          } else {
            // deselect the source
            let selectedSourceIds = photometryPanelConfig.selectedSourceIds.filter(
              (id) => id != source.id
            );
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

  onFileSelect($event: { file: DataFile; doubleClick: boolean }) {
    if (!$event.file) return;

    if (!$event.doubleClick) {
      this.store.dispatch(new SelectDataFile($event.file.id));
    } else {
      let focusedViewer = this.store.selectSnapshot(
        WorkbenchState.getFocusedViewer
      );
      if (focusedViewer) {
        this.store.dispatch(new KeepViewerOpen(focusedViewer.viewerId));
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
        this.store.dispatch(new RemoveAllDataFiles());
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
      new Navigate(
        [],
        { tool: targetTool },
        { relativeTo: this.activeRoute, queryParamsHandling: "merge" }
      )
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

  importFromSurvey(surveyDataProvider: DataProvider, imageFile: DataFile) {
    let centerRaDec;
    let pixelScale;

    let imageLayer = imageFile.hdus[0] as ImageHdu;

    if (imageLayer.wcs && imageLayer.wcs.isValid() && this.useWcsCenter) {
      centerRaDec = imageLayer.wcs.pixToWorld([
        getWidth(imageLayer) / 2,
        getHeight(imageLayer) / 2,
      ]);
      pixelScale = imageLayer.wcs.getPixelScale() * 60;
    } else {
      let centerRa = getRaHours(imageLayer);
      let centerDec = getDecDegs(imageLayer);
      if (centerRa == undefined || centerDec == undefined) return;

      centerRaDec = [centerRa, centerDec];
      pixelScale = getDegsPerPixel(imageLayer) * 60;

      if (pixelScale == undefined) return;
    }

    let width = pixelScale * getWidth(imageLayer);
    let height = pixelScale * getHeight(imageLayer);

    this.store.dispatch(
      new ImportFromSurvey(
        surveyDataProvider.id,
        centerRaDec[0],
        centerRaDec[1],
        width,
        height,
        this.corrGen.next()
      )
    );
  }

  // onUseWcsCenterChange($event: MatCheckboxChange) {
  //   this.useWcsCenter = $event.checked;
  // }

  onUseWcsCenterChange($event: MatRadioChange) {
    this.useWcsCenter = $event.value == "wcs";
  }

  splitViewerPanel(
    viewer: Viewer,
    direction: "up" | "down" | "left" | "right" = "right"
  ) {
    this.store.dispatch(new SplitViewerPanel(viewer.viewerId, direction));
  }
}
