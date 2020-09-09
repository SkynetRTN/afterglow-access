import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  OnDestroy,
} from "@angular/core";
import { Observable, combineLatest, merge, of } from "rxjs";
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
  ImageFile,
  getWidth,
  getHeight,
  getRaHours,
  getDecDegs,
  getDegsPerPixel,
  Header,
} from "../../../data-files/models/data-file";
import { SidebarView } from "../../models/sidebar-view";
import { Router, ActivatedRoute } from "@angular/router";
import { Subscription } from "../../../../../node_modules/rxjs";
import {
  HotkeysService,
  Hotkey,
} from "../../../../../node_modules/angular2-hotkeys";
import { MatDialog } from "@angular/material/dialog";
import {
  Store,
  Actions,
  ofActionCompleted,
  ofActionSuccessful,
} from "@ngxs/store";
import { DataFilesState } from "../../../data-files/data-files.state";
import { WorkbenchState } from "../../workbench.state";
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
  SetActiveViewer,
  SetViewerSyncEnabled,
  SetNormalizationSyncEnabled,
  ImportFromSurvey,
  UpdatePhotometryPageSettings,
  MoveToOtherView,
  KeepViewerOpen,
  SetActiveTool,
  SetViewerMarkers,
  UpdateCustomMarkerToolsetConfig,
  UpdatePlottingToolsetConfig,
} from "../../workbench.actions";
import {
  LoadLibrary,
  RemoveAllDataFiles,
  RemoveDataFile,
  LoadDataFile,
} from "../../../data-files/data-files.actions";
import { LoadDataProviders } from "../../../data-providers/data-providers.actions";
import { ViewMode } from "../../models/view-mode";
import {
  MatButtonToggleChange,
  MatCheckboxChange,
  MatRadioChange,
} from "@angular/material";
import { Viewer } from "../../models/viewer";
import { DataProvider } from "../../../data-providers/models/data-provider";
import { CorrelationIdGenerator } from "../../../utils/correlated-action";
import { DataProvidersState } from "../../../data-providers/data-providers.state";
import { ConfirmationDialogComponent } from "../../components/confirmation-dialog/confirmation-dialog.component";
import { Navigate } from "@ngxs/router-plugin";
import { WorkbenchFileState } from "../../models/workbench-file-state";
import { DataFileType } from "../../../data-files/models/data-file-type";
import {
  WorkbenchTool,
  PlottingToolsetConfig,
} from "../../models/workbench-state";
import { WorkbenchFileStates } from "../../workbench-file-states.state";
import { CustomMarkerToolsetConfig } from "../../models/workbench-state";
import {
  Marker,
  MarkerType,
  CircleMarker,
  LineMarker,
  RectangleMarker,
} from "../../models/marker";
import {
  ViewerGridCanvasMouseEvent,
  ViewerGridMarkerMouseEvent,
} from "./workbench-viewer-grid/workbench-viewer-grid.component";
import { centroidDisk, centroidPsf } from "../../models/centroider";
import { CustomMarker } from "../../models/custom-marker";
import {
  SelectCustomMarkers,
  DeselectCustomMarkers,
  AddCustomMarkers,
  SetCustomMarkerSelection,
  UpdateCustomMarker,
  RemoveCustomMarkers,
  UpdateLine,
  StartLine,
} from "../../workbench-file-states.actions";
import { CustomMarkerState } from "../../models/marker-file-state";
import { PosType } from "../../models/source";
import { PlottingPanelState } from "../../components/plotting-toolset/plotting-toolset.component";
import { CustomMarkerToolsetFileState } from "../../components/custom-marker-toolset/custom-marker-toolset.component";
import { DisplayToolsetFileState } from "../../components/display-toolset/display-toolset.component";
import {
  FileInfoToolsetConfig,
  FileInfoToolsetState,
} from "../../components/file-info-toolset/file-info-toolset.component";
import { SonifierRegionMode } from "../../models/sonifier-file-state";
import { SonificationToolsetState } from '../../components/sonification-toolset/sonification-toolset.component';

@Component({
  selector: "app-workbench",
  templateUrl: "./workbench.component.html",
  styleUrls: ["./workbench.component.scss"],
})
export class WorkbenchComponent implements OnInit, OnDestroy {
  WorkbenchTool = WorkbenchTool;
  ViewMode = ViewMode;

  inFullScreenMode$: Observable<boolean>;
  fullScreenPanel$: Observable<"file" | "viewer" | "tool">;
  showSidebar$: Observable<boolean>;
  sidebarView$: Observable<SidebarView>;
  files$: Observable<Array<DataFile>>;
  fileEntities$: Observable<{ [id: string]: DataFile }>;
  loadingFiles$: Observable<boolean>;
  selectedFile$: Observable<DataFile>;
  viewMode$: Observable<ViewMode>;
  primaryViewers$: Observable<Viewer[]>;
  secondaryViewers$: Observable<Viewer[]>;
  activeViewer$: Observable<Viewer>;
  activeViewerId$: Observable<string>;
  viewerFileIds$: Observable<string[]>;
  viewerImageFiles$: Observable<ImageFile[]>;
  viewerImageFileHeaders$: Observable<Header[]>;
  viewerImageFileStates$: Observable<WorkbenchFileState[]>;
  activeImageFile$: Observable<ImageFile>;
  activeImageFileState$: Observable<WorkbenchFileState>;
  selectedCustomMarkers$: Observable<CustomMarker[]>;
  viewers$: Observable<Viewer[]>;
  viewerSyncEnabled$: Observable<boolean>;
  normalizationSyncEnabled$: Observable<boolean>;
  surveyDataProvider$: Observable<DataProvider>;
  surveyImportCorrId$: Observable<string>;
  dssImportLoading$: Observable<boolean>;
  activeTool$: Observable<WorkbenchTool>;
  showConfig$: Observable<boolean>;

  fileInfoToolsetState$: Observable<FileInfoToolsetState>;
  fileInfoToolsetConfig: FileInfoToolsetConfig;
  displayToolsetFileState$: Observable<DisplayToolsetFileState>;
  customMarkerToolsetFileState$: Observable<CustomMarkerToolsetFileState>;
  customMarkerToolsetConfig$: Observable<CustomMarkerToolsetConfig>;
  customMarkerToolsetMarkers$: Observable<Array<Marker[]>>;
  plottingToolsetFileState$: Observable<PlottingPanelState>;
  plottingToolsetConfig$: Observable<PlottingToolsetConfig>;
  plottingToolsetMarkers$: Observable<Array<Marker[]>>;
  sonificationToolsetFileState$: Observable<SonificationToolsetState>;
  sonificationToolsetMarkers$: Observable<Array<Marker[]>>;

  fileLoaderSub: Subscription;
  queryParamSub: Subscription;
  markerOverlaySub: Subscription;

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
    this.fileEntities$ = this.store.select(DataFilesState.getEntities);
    this.files$ = this.store
      .select(DataFilesState.getDataFiles)
      .pipe(map((files) => files.sort((a, b) => a.name.localeCompare(b.name))));
    this.primaryViewers$ = this.store.select(WorkbenchState.getPrimaryViewers);
    this.activeTool$ = this.store.select(WorkbenchState.getActiveTool);
    this.secondaryViewers$ = this.store.select(
      WorkbenchState.getSecondaryViewers
    );
    this.selectedFile$ = this.store.select(WorkbenchState.getActiveImageFile);
    this.viewers$ = this.store.select(WorkbenchState.getViewers);
    this.sidebarView$ = this.store.select(WorkbenchState.getSidebarView);
    this.showConfig$ = this.store.select(WorkbenchState.getShowConfig);
    this.showSidebar$ = this.store.select(WorkbenchState.getShowSidebar);
    this.loadingFiles$ = this.store.select(DataFilesState.getLoading);
    this.viewMode$ = this.store.select(WorkbenchState.getViewMode);
    this.activeViewerId$ = this.store.select(WorkbenchState.getActiveViewerId);
    this.activeViewer$ = this.store.select(WorkbenchState.getActiveViewer);
    this.dssImportLoading$ = store.select(WorkbenchState.getDssImportLoading);
    this.surveyDataProvider$ = this.store
      .select(DataProvidersState.getDataProviders)
      .pipe(
        map((dataProviders) =>
          dataProviders.find((dp) => dp.name == "Imaging Surveys")
        )
      );

    this.activeImageFile$ = store.select(WorkbenchState.getActiveImageFile);

    this.activeImageFileState$ = store
      .select(WorkbenchState.getActiveImageFileState)
      .pipe(filter((fileState) => fileState !== null));

    this.viewerFileIds$ = this.store.select(WorkbenchState.getViewerIds).pipe(
      switchMap((viewerIds) => {
        return combineLatest(
          ...viewerIds.map((viewerId) => {
            return this.store.select(WorkbenchState.getViewerById).pipe(
              map((fn) => fn(viewerId).fileId),
              distinctUntilChanged()
            );
          })
        );
      })
    );

    this.viewerImageFiles$ = this.viewerFileIds$.pipe(
      switchMap((fileIds) => {
        return combineLatest(
          ...fileIds.map((fileId) => {
            return this.store.select(DataFilesState.getDataFileById).pipe(
              map((fn) => {
                if (
                  fileId == null ||
                  !fn(fileId) ||
                  fn(fileId).type != DataFileType.IMAGE
                )
                  return null;
                return fn(fileId) as ImageFile;
              }),
              distinctUntilChanged()
            );
          })
        );
      })
    );

    /* DISPLAY TOOLSET */
    this.displayToolsetFileState$ = this.activeImageFile$.pipe(
      switchMap((activeImageFile) => {
        if (!activeImageFile) return of(null);
        return combineLatest(
          this.store
            .select(DataFilesState.getDataFileById)
            .pipe(map((fn) => fn(activeImageFile.id))),
          this.store
            .select(WorkbenchFileStates.getNormalization)
            .pipe(map((fn) => fn(activeImageFile.id)))
        ).pipe(
          map(([dataFile, normalization]) => {
            return {
              file: dataFile as ImageFile,
              normalization: normalization,
            };
          })
        );
      })
    );

    /* FILE INFO TOOLSET */
    this.fileInfoToolsetState$ = this.activeImageFile$.pipe(
      map((imageFile) => {
        return {
          file: imageFile,
        };
      })
    );

    this.fileInfoToolsetConfig = {
      useSystemTime: true,
      showRawHeader: false,
    };

    /* CUSTOM MARKER TOOLSET */
    this.customMarkerToolsetFileState$ = this.activeImageFile$.pipe(
      switchMap((activeImageFile) => {
        if (!activeImageFile) return of(null);
        return combineLatest(
          this.store
            .select(DataFilesState.getDataFileById)
            .pipe(map((fn) => fn(activeImageFile.id))),
          this.store
            .select(WorkbenchFileStates.getCustomMarkerState)
            .pipe(map((fn) => fn(activeImageFile.id)))
        ).pipe(
          map(([dataFile, customMarkerState]) => {
            return {
              file: dataFile as ImageFile,
              markers: Object.values(customMarkerState.entities),
            };
          })
        );
      })
    );
    this.customMarkerToolsetConfig$ = store.select(
      WorkbenchState.getCustomMarkerToolsetConfig
    );
    this.customMarkerToolsetMarkers$ = combineLatest(
      this.activeTool$,
      this.viewerFileIds$
    ).pipe(
      switchMap(([activeTool, fileIds]) => {
        return combineLatest(
          ...fileIds.map((fileId) => {
            if (activeTool != WorkbenchTool.CUSTOM_MARKER) return of([]);
            return this.store
              .select(WorkbenchFileStates.getCustomMarkerState)
              .pipe(
                map((fn) => {
                  return fn(fileId);
                }),
                distinctUntilChanged(),
                map((markerFileState) =>
                  Object.values(markerFileState.entities)
                )
              );
          })
        );
      })
    );

    /* PLOTTING TOOLSET */
    this.plottingToolsetFileState$ = this.activeImageFile$.pipe(
      switchMap((activeImageFile) => {
        if (!activeImageFile) return of(null);
        return combineLatest(
          this.store
            .select(DataFilesState.getDataFileById)
            .pipe(map((fn) => fn(activeImageFile.id))),
          this.store
            .select(WorkbenchFileStates.getPlottingState)
            .pipe(map((fn) => fn(activeImageFile.id)))
        ).pipe(
          map(([dataFile, plottingState]) => {
            return {
              file: dataFile as ImageFile,
              measuring: plottingState.measuring,
              lineMeasureStart: plottingState.lineMeasureStart,
              lineMeasureEnd: plottingState.lineMeasureEnd,
            };
          })
        );
      })
    );

    this.plottingToolsetConfig$ = this.store.select(
      WorkbenchState.getPlottingToolsetConfig
    );

    this.plottingToolsetMarkers$ = combineLatest(
      this.activeTool$,
      this.viewerFileIds$
    ).pipe(
      switchMap(([activeTool, fileIds]) => {
        return combineLatest(
          ...fileIds.map((fileId) => {
            if (activeTool != WorkbenchTool.PLOTTER) return of([]);
            let plottingState$ = this.store
              .select(WorkbenchFileStates.getPlottingState)
              .pipe(
                map((fn) => {
                  return fn(fileId);
                }),
                distinctUntilChanged()
              );

            return combineLatest(
              plottingState$,
              this.store.select(WorkbenchState.getPlottingToolsetConfig)
            ).pipe(
              map(([plottingState, config]) => {
                let file = this.store.selectSnapshot(
                  DataFilesState.getEntities
                )[fileId];
                if (!file) {
                  return [];
                }

                let lineMeasureStart = plottingState.lineMeasureStart;
                let lineMeasureEnd = plottingState.lineMeasureEnd;
                if (!lineMeasureStart || !lineMeasureEnd) {
                  return [];
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

                if (startPosType == PosType.SKY || endPosType == PosType.SKY) {
                  if (!file.headerLoaded || !file.wcs.isValid()) {
                    return [];
                  }
                  let wcs = file.wcs;
                  if (startPosType == PosType.SKY) {
                    let xy = wcs.worldToPix([
                      startPrimaryCoord,
                      startSecondaryCoord,
                    ]);
                    x1 = Math.max(Math.min(xy[0], getWidth(file)), 0);
                    y1 = Math.max(Math.min(xy[1], getHeight(file)), 0);
                  }

                  if (endPosType == PosType.SKY) {
                    let xy = wcs.worldToPix([
                      endPrimaryCoord,
                      endSecondaryCoord,
                    ]);
                    x2 = Math.max(Math.min(xy[0], getWidth(file)), 0);
                    y2 = Math.max(Math.min(xy[1], getHeight(file)), 0);
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
                return markers;
              })
            );
          })
        );
      })
    );

    /* SONIFICATION TOOLSET */
    this.sonificationToolsetFileState$ = this.activeImageFile$.pipe(
      switchMap((activeImageFile) => {
        if (!activeImageFile) return of(null);
        return combineLatest(
          this.store
            .select(DataFilesState.getDataFileById)
            .pipe(map((fn) => fn(activeImageFile.id))),
          this.store
            .select(WorkbenchFileStates.getSonificationState)
            .pipe(map((fn) => fn(activeImageFile.id))),
            this.store
            .select(WorkbenchFileStates.getTransformation)
            .pipe(map((fn) => fn(activeImageFile.id)))
        ).pipe(
          map(([dataFile, sonificationState, transformation]) => {
            return {
              file: dataFile as ImageFile,
              transformation: transformation,
              sonificationUri: sonificationState.sonificationUri,
              regionHistoryInitialized: sonificationState.regionHistoryInitialized,
              regionHistory: sonificationState.regionHistory,
              regionHistoryIndex: sonificationState.regionHistoryIndex,
              regionMode: sonificationState.regionMode,
              viewportSync: sonificationState.viewportSync,
              duration: sonificationState.duration,
              toneCount: sonificationState.toneCount,
              progressLine: sonificationState.progressLine,
            } as SonificationToolsetState;
          })
        );
      })
    );

    this.sonificationToolsetMarkers$ = combineLatest(
      this.activeTool$,
      this.viewerFileIds$
    ).pipe(
      switchMap(([activeTool, fileIds]) => {
        return combineLatest(
          ...fileIds.map((fileId) => {
            if (activeTool != WorkbenchTool.SONIFIER) return of([]);
            return this.store
              .select(WorkbenchFileStates.getSonificationState)
              .pipe(
                map((fn) => {
                  return fn(fileId);
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
                      type: MarkerType.RECTANGLE,
                      ...region,
                    } as RectangleMarker);
                  if (progressLine)
                    markers.push({
                      type: MarkerType.LINE,
                      ...progressLine,
                    } as LineMarker);
                  return markers;
                })
              );
          })
        );
      })
    );

    this.markerOverlaySub = combineLatest(
      this.customMarkerToolsetMarkers$,
      this.plottingToolsetMarkers$,
      this.sonificationToolsetMarkers$
    )
      .pipe(withLatestFrom(this.viewers$))
      .subscribe(
        ([[imageFileCustomMarkers, plottingToolsetMarkers, sonificationToolsetMarkers], viewers]) => {
          viewers.forEach((viewer, index) => {
            this.store.dispatch(
              new SetViewerMarkers(
                viewer.viewerId,
                Object.values([
                  ...imageFileCustomMarkers[index],
                  ...plottingToolsetMarkers[index],
                  ...sonificationToolsetMarkers[index],
                ])
              )
            );
          });
        }
      );

    this.fileLoaderSub = this.viewerFileIds$.subscribe((ids) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      ids.forEach((id) => {
        let f = dataFiles[id];
        if (
          !f ||
          ((f.headerLoaded || f.headerLoading) &&
            (f.type != DataFileType.IMAGE ||
              (f as ImageFile).histLoaded ||
              (f as ImageFile).histLoading))
        )
          return;

        this.store.dispatch(new LoadDataFile(id));
      });
    });

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

  onPlottingToolsetConfigChange($event) {
    this.store.dispatch(new UpdatePlottingToolsetConfig($event));
  }

  onCustomMarkerToolsetConfigChange($event) {
    this.store.dispatch(new UpdateCustomMarkerToolsetConfig($event));
  }

  onCustomMarkerChange($event: { id: string; changes: Partial<Marker> }) {
    let activeImageFile = this.store.selectSnapshot(
      WorkbenchState.getActiveImageFile
    );
    if (!activeImageFile) return;
    this.store.dispatch(
      new UpdateCustomMarker(activeImageFile.id, $event.id, $event.changes)
    );
  }

  onCustomMarkerDelete($event: Marker[]) {
    let activeImageFile = this.store.selectSnapshot(
      WorkbenchState.getActiveImageFile
    );
    if (!activeImageFile) return;
    this.store.dispatch(new RemoveCustomMarkers(activeImageFile.id, $event));
  }

  selectCustomMarkers(fileId: string, customMarkers: Marker[]) {
    this.store.dispatch(new SelectCustomMarkers(fileId, customMarkers));
  }

  deselectCustomMarkers(fileId: string, customMarkers: Marker[]) {
    this.store.dispatch(new DeselectCustomMarkers(fileId, customMarkers));
  }

  /* image viewer mouse event handlers */
  onImageClick($event: ViewerGridCanvasMouseEvent) {
    let activeTool = this.store.selectSnapshot(WorkbenchState.getActiveTool);
    switch (activeTool) {
      case WorkbenchTool.CUSTOM_MARKER: {
        let imageFileState = this.store.selectSnapshot(
          WorkbenchFileStates.getEntities
        )[$event.targetFile.id];
        let settings = this.store.selectSnapshot(
          WorkbenchState.getCustomMarkerToolsetConfig
        );
        let centroidSettings = this.store.selectSnapshot(
          WorkbenchState.getCentroidSettings
        );
        let selectedCustomMarkers = Object.values(
          imageFileState.customMarkerState.entities
        ).filter((marker) => marker.selected);
        if ($event.hitImage) {
          if (selectedCustomMarkers.length == 0 || $event.mouseEvent.altKey) {
            let x = $event.imageX;
            let y = $event.imageY;
            if (settings.centroidClicks) {
              let result: { x: number; y: number };
              if (settings.usePlanetCentroiding) {
                result = centroidDisk(
                  $event.targetFile,
                  x,
                  y,
                  centroidSettings.diskCentroiderSettings
                );
              } else {
                result = centroidPsf(
                  $event.targetFile,
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
              new AddCustomMarkers($event.targetFile.id, [customMarker])
            );
          } else {
            this.store.dispatch(
              new SetCustomMarkerSelection($event.targetFile.id, [])
            );
          }
        }
        break;
      }
      case WorkbenchTool.PLOTTER: {
        let imageFile = this.store.selectSnapshot(DataFilesState.getEntities)[
          $event.targetFile.id
        ] as ImageFile;
        let plotterPageSettings = this.store.selectSnapshot(
          WorkbenchState.getPlottingToolsetConfig
        );
        if ($event.hitImage && imageFile) {
          let x = $event.imageX;
          let y = $event.imageY;
          if (plotterPageSettings && plotterPageSettings.centroidClicks) {
            let result;
            if (plotterPageSettings.planetCentroiding) {
              result = centroidDisk(imageFile, x, y);
            } else {
              result = centroidPsf(imageFile, x, y);
            }

            x = result.x;
            y = result.y;
          }

          let primaryCoord = x;
          let secondaryCoord = y;
          let posType = PosType.PIXEL;
          if (imageFile.wcs.isValid()) {
            let wcs = imageFile.wcs;
            let raDec = wcs.pixToWorld([primaryCoord, secondaryCoord]);
            primaryCoord = raDec[0];
            secondaryCoord = raDec[1];
            posType = PosType.SKY;
          }

          this.store.dispatch(
            new StartLine($event.targetFile.id, {
              primaryCoord: primaryCoord,
              secondaryCoord: secondaryCoord,
              posType: posType,
            })
          );
        }
      }
    }
  }

  onImageMove($event: ViewerGridCanvasMouseEvent) {
    let activeTool = this.store.selectSnapshot(WorkbenchState.getActiveTool);
    switch (activeTool) {
      case WorkbenchTool.PLOTTER: {
        let imageFile = this.store.selectSnapshot(DataFilesState.getEntities)[
          $event.targetFile.id
        ];
        let measuring = this.store.selectSnapshot(
          WorkbenchFileStates.getEntities
        )[$event.targetFile.id].plottingState.measuring;
        if (measuring) {
          let primaryCoord = $event.imageX;
          let secondaryCoord = $event.imageY;
          let posType = PosType.PIXEL;
          if (imageFile.wcs.isValid()) {
            let wcs = imageFile.wcs;
            let raDec = wcs.pixToWorld([primaryCoord, secondaryCoord]);
            primaryCoord = raDec[0];
            secondaryCoord = raDec[1];
            posType = PosType.SKY;
          }
          this.store.dispatch(
            new UpdateLine($event.targetFile.id, {
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

  onMarkerClick($event: ViewerGridMarkerMouseEvent) {
    let activeTool = this.store.selectSnapshot(WorkbenchState.getActiveTool);
    switch (activeTool) {
      case WorkbenchTool.CUSTOM_MARKER: {
        if ($event.mouseEvent.altKey) return;

        if (typeof $event.marker.id == "undefined") return;

        let workbenchFileStates = this.store.selectSnapshot(
          WorkbenchFileStates.getEntities
        );
        let markerFileState =
          workbenchFileStates[$event.targetFile.id].customMarkerState;

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
            new SetCustomMarkerSelection($event.targetFile.id, [customMarker])
          );
        }
        $event.mouseEvent.stopImmediatePropagation();
        $event.mouseEvent.preventDefault();
        break;
      }
    }
  }

  onFileSelect($event: { file: DataFile; doubleClick: boolean }) {
    if (!$event.file) return;

    if (!$event.doubleClick) {
      this.store.dispatch(new SelectDataFile($event.file.id));
    } else {
      this.store.dispatch(
        new KeepViewerOpen(
          this.store.selectSnapshot(WorkbenchState.getActiveViewerId)
        )
      );
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

  onActiveViewerIdChange(value: string) {
    this.store.dispatch(new SetActiveViewer(value));
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

  importFromSurvey(surveyDataProvider: DataProvider, imageFile: ImageFile) {
    let centerRaDec;
    let pixelScale;

    if (imageFile.wcs && imageFile.wcs.isValid() && this.useWcsCenter) {
      centerRaDec = imageFile.wcs.pixToWorld([
        getWidth(imageFile) / 2,
        getHeight(imageFile) / 2,
      ]);
      pixelScale = imageFile.wcs.getPixelScale() * 60;
    } else {
      let centerRa = getRaHours(imageFile);
      let centerDec = getDecDegs(imageFile);
      if (centerRa == undefined || centerDec == undefined) return;

      centerRaDec = [centerRa, centerDec];
      pixelScale = getDegsPerPixel(imageFile) * 60;

      if (pixelScale == undefined) return;
    }

    let width = pixelScale * getWidth(imageFile);
    let height = pixelScale * getHeight(imageFile);

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

  moveToOtherView(viewer: Viewer) {
    this.store.dispatch(new MoveToOtherView(viewer.viewerId));
  }
}
