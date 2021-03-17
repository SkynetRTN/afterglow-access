import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import {
  Observable,
  combineLatest,
  merge,
  of,
  never,
  empty,
  throwError,
  Subject,
  concat,
  forkJoin,
} from 'rxjs';
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
} from 'rxjs/operators';

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
} from '../../data-files/models/data-file';
import { SidebarView } from '../models/sidebar-view';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from '../../../../node_modules/rxjs';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import {
  Store,
  Actions,
  ofActionCompleted,
  ofActionDispatched,
} from '@ngxs/store';
import { DataFilesState } from '../../data-files/data-files.state';
import { WorkbenchState } from '../workbench.state';
import {
  SetShowConfig,
  SetFullScreen,
  SetFullScreenPanel,
  ShowSidebar,
  LoadCatalogs,
  LoadFieldCals,
  SelectFile,
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
  SyncViewerTransformations,
  SetViewerSyncMode,
  SyncViewerNormalizations,
  SyncPlottingPanelStates,
  SetFileSelection,
  SetFileListFilter,
  ImportFromSurveyFail,
  ImportFromSurveySuccess,
  CloseViewer
} from '../workbench.actions';
import {
  LoadDataProviders,
  LoadDataProvidersSuccess,
  LoadDataProvidersFail
} from '../../data-providers/data-providers.actions';
import { ViewMode } from '../models/view-mode';
import { MatButtonToggleChange } from '@angular/material/button-toggle';
import { MatRadioChange } from '@angular/material/radio';
import { MatSelectChange } from '@angular/material/select';
import { Viewer, ImageViewer, TableViewer } from '../models/viewer';
import { DataProvider } from '../../data-providers/models/data-provider';
import { CorrelationIdGenerator } from '../../utils/correlated-action';
import { DataProvidersState } from '../../data-providers/data-providers.state';
import { Navigate } from '@ngxs/router-plugin';
import { WorkbenchImageHduState } from '../models/workbench-file-state';
import {
  WorkbenchTool,
  ViewerPanelContainer
} from '../models/workbench-state';
import { CustomMarker } from '../models/custom-marker';
import {
  ViewerPanelCanvasMouseEvent,
  ViewerPanelMarkerMouseEvent,
  ViewerPanelCanvasMouseDragEvent,
} from './workbench-viewer-layout/workbench-viewer-layout.component';
import { HduType } from '../../data-files/models/data-file-type';
import {
  LoadLibrary,
  LoadLibrarySuccess,
  LoadLibraryFail,
  InvalidateHeader,
  ZoomBy,
  CenterRegionInViewport,
  ZoomTo,
} from '../../data-files/data-files.actions';
import { WorkbenchDataFileListComponent } from './workbench-data-file-list/workbench-data-file-list.component';
import { OpenFileDialogComponent } from '../../data-providers/components/open-file-dialog/open-file-dialog.component';
import { AfterglowDataProviderService } from '../services/afterglow-data-providers';
import {
  SaveChangesDialogComponent,
  FileDialogConfig,
} from '../components/file-dialog/file-dialog.component';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { AfterglowDataFileService } from '../services/afterglow-data-files';
import { UUID } from 'angular2-uuid';
import { BatchDownloadJob } from '../../jobs/models/batch-download';
import { JobType } from '../../jobs/models/job-types';
import {
  CreateJob,
  CreateJobSuccess,
  CreateJobFail,
} from '../../jobs/jobs.actions';
import {
  JobProgressDialogConfig,
  JobProgressDialogComponent,
} from '../components/job-progress-dialog/job-progress-dialog.component';
import { JobsState } from '../../jobs/jobs.state';
import { JobService } from '../../jobs/services/jobs';
import {
  AlertDialogConfig,
  AlertDialogComponent,
} from '../../utils/alert-dialog/alert-dialog.component';
import { ShortcutInput, ShortcutEventOutput } from 'ng-keyboard-shortcuts';

// @ts-ignore
import { saveAs } from 'file-saver/dist/FileSaver';

@Component({
  selector: 'app-workbench',
  templateUrl: './workbench.component.html',
  styleUrls: ['./workbench.component.scss'],
})
export class WorkbenchComponent implements OnInit, OnDestroy, AfterViewInit {
  WorkbenchTool = WorkbenchTool;
  ViewMode = ViewMode;
  HduType = HduType;
  shortcuts: ShortcutInput[] = [];

  @ViewChild(WorkbenchDataFileListComponent)
  fileList: WorkbenchDataFileListComponent;

  destroy$: Subject<boolean> = new Subject<boolean>();

  layoutContainer$: Observable<ViewerPanelContainer>;
  inFullScreenMode$: Observable<boolean>;
  fullScreenPanel$: Observable<'file' | 'viewer' | 'tool'>;
  loadingFiles$: Observable<boolean>;
  showSidebar$: Observable<boolean>;
  sidebarView$: Observable<SidebarView>;
  allFiles$: Observable<DataFile[]>;

  fileFilter$: Observable<string>;
  fileFilterInput$ = new Subject<string>();
  files$: Observable<DataFile[]>;
  hduIds$: Observable<string[]>;
  hdus$: Observable<IHdu[]>;
  imageHdus$: Observable<ImageHdu[]>;
  imageHduIds$: Observable<string[]>;

  selectedFileIds$: Observable<string[]>;
  selectAllFilesChecked$: Observable<boolean>;
  selectAllFilesIndeterminate$: Observable<boolean>;

  viewer$: Observable<Viewer>;
  viewerId$: Observable<string>;
  canSplit$: Observable<boolean>;
  imageViewer$: Observable<ImageViewer>;
  imageViewerId$: Observable<string>;
  tableViewer$: Observable<TableViewer>;

  //viewer events
  imageMouseDownEvent: ViewerPanelCanvasMouseEvent;
  imageMouseUpEvent: ViewerPanelCanvasMouseEvent;
  imageMouseMoveEvent: ViewerPanelCanvasMouseEvent;
  imageClickEvent: ViewerPanelCanvasMouseEvent;
  imageDragStartEvent: ViewerPanelCanvasMouseDragEvent;
  imageDragEvent: ViewerPanelCanvasMouseDragEvent;
  imageDragEndEvent: ViewerPanelCanvasMouseDragEvent;
  markerClickEvent: ViewerPanelMarkerMouseEvent;

  
  
//dss import
header$: Observable<Header>;

  viewMode$: Observable<ViewMode>;

  selectedCustomMarkers$: Observable<CustomMarker[]>;
  viewers$: Observable<Viewer[]>;
  viewerSyncEnabled$: Observable<boolean>;
  viewerSyncMode$: Observable<'sky' | 'pixel'>;
  normalizationSyncEnabled$: Observable<boolean>;
  surveyDataProvider$: Observable<DataProvider>;
  surveyImportCorrId$: Observable<string>;
  dssImportLoading$: Observable<boolean>;
  activeTool$: Observable<WorkbenchTool>;
  showConfig$: Observable<boolean>;

  fileLoaderSub: Subscription;
  queryParamSub: Subscription;
  transformationSyncSub: Subscription;
  normalizationSyncSub: Subscription;
  plottingPanelSyncSub: Subscription;

  useWcsCenter: boolean = false;
  currentSidebarView = SidebarView.FILES;
  SidebarView = SidebarView;

  constructor(
    private actions$: Actions,
    private store: Store,
    private router: Router,
    public dialog: MatDialog,
    private corrGen: CorrelationIdGenerator,
    private activeRoute: ActivatedRoute,
    private dataProviderService: AfterglowDataProviderService,
    private dataFileService: AfterglowDataFileService,
    private jobService: JobService
  ) {
    this.activeTool$ = this.store.select(WorkbenchState.getActiveTool);
    this.sidebarView$ = this.store.select(WorkbenchState.getSidebarView);
    this.showConfig$ = this.store.select(WorkbenchState.getShowConfig);
    this.showSidebar$ = this.store.select(WorkbenchState.getShowSidebar);
    this.loadingFiles$ = this.store.select(DataFilesState.getLoading);
    this.viewMode$ = this.store.select(WorkbenchState.getViewMode);
    this.fullScreenPanel$ = this.store.select(WorkbenchState.getFullScreenPanel);
    this.inFullScreenMode$ = this.store.select(WorkbenchState.getInFullScreenMode);
    this.viewerSyncEnabled$ = store.select(WorkbenchState.getViewerSyncEnabled);
    this.viewerSyncMode$ = store.select(WorkbenchState.getViewerSyncMode);
    this.normalizationSyncEnabled$ = store.select(WorkbenchState.getNormalizationSyncEnabled);


    this.allFiles$ = this.store
      .select(DataFilesState.getFiles)
      .pipe(map((files) => files.sort((a, b) => a.name.localeCompare(b.name))));

    //file filtering
    this.fileFilter$ = this.store.select(WorkbenchState.getFileListFilter);

    this.fileFilterInput$
      .pipe(takeUntil(this.destroy$), debounceTime(100))
      .subscribe((value) => {
        this.store.dispatch(new SetFileListFilter(value));
      });

    this.files$ = this.store.select(WorkbenchState.getFilteredFiles);

    this.hduIds$ = this.store
      .select(WorkbenchState.getFilteredHduIds)
      .pipe(
        distinctUntilChanged(
          (a, b) =>
            a &&
            b &&
            a.length == b.length &&
            a.every((value, index) => b[index] == value)
        )
      );

    this.hdus$ = this.hduIds$.pipe(
      switchMap((hduIds) => combineLatest(hduIds.map(id => this.store.select(DataFilesState.getHduById).pipe(
        map(fn => fn(id))
      ))))
    );

    this.imageHdus$ = this.hdus$.pipe(
      map((hdus) =>
        !hdus
          ? null
          : (hdus.filter((hdu) => hdu.hduType == HduType.IMAGE) as ImageHdu[])
      )
    );

    this.imageHduIds$ = this.imageHdus$.pipe(
      map((hdus) => hdus.map(hdu => hdu.id))
    );

    //file selection
    this.selectedFileIds$ = this.store.select(
      WorkbenchState.getSelectedFilteredFileIds
    );

    this.selectAllFilesChecked$ = combineLatest(
      this.files$,
      this.selectedFileIds$
    ).pipe(
      map(([filteredFiles, selectedFileIds]) => {
        return (
          filteredFiles.length != 0 &&
          selectedFileIds.length == filteredFiles.length
        );
      })
    );

    this.selectAllFilesIndeterminate$ = combineLatest(
      this.files$,
      this.selectedFileIds$
    ).pipe(
      map(([filteredFiles, selectedFileIds]) => {
        return (
          selectedFileIds.length != 0 &&
          selectedFileIds.length != filteredFiles.length
        );
      })
    );

    // viewers
    this.layoutContainer$ = this.store.select(WorkbenchState.getRootViewerPanelContainer);
    this.viewers$ = this.store.select(WorkbenchState.getViewers);
    this.viewer$ = this.store.select(WorkbenchState.getFocusedViewer);
    this.viewerId$ = this.store.select(WorkbenchState.getFocusedViewerId);

    this.canSplit$ = this.store
      .select(WorkbenchState.getViewers)
      .pipe(map((viewers) => viewers && viewers.length > 1));

    this.imageViewer$ = this.store.select(WorkbenchState.getFocusedImageViewer);

    this.imageViewerId$ = this.imageViewer$.pipe(
      map((imageViewer) => (imageViewer ? imageViewer.id : null)),
      distinctUntilChanged()
    );

    this.tableViewer$ = this.store.select(WorkbenchState.getFocusedTableViewer);

    //DSS Import
    //TODO Move to separate component
        
    let hduId$ = this.viewer$.pipe(
      map((viewer) => viewer?.hduId),
      distinctUntilChanged()
    );
    let hdu$ = hduId$.pipe(
      switchMap((hduId) =>
        this.store.select(DataFilesState.getHduById).pipe(
          map((fn) => fn(hduId))
        )
      )
    );
    let headerId$ = hdu$.pipe(
      map(hdu => hdu?.headerId || null),
      distinctUntilChanged()
    )
    this.header$ = headerId$.pipe(
      switchMap(headerId => this.store.select(DataFilesState.getHeaderById).pipe(
        map(fn => fn(headerId))
      ))
    )
    this.dssImportLoading$ = store.select(WorkbenchState.getDssImportLoading);
    this.surveyDataProvider$ = this.store
      .select(DataProvidersState.getDataProviders)
      .pipe(
        map((dataProviders) =>
          dataProviders.find((dp) => dp.displayName == 'Imaging Surveys')
        )
      );


    this.queryParamSub = this.activeRoute.queryParams.subscribe((p) => {
      let tool = WorkbenchTool.VIEWER;
      if (p.tool && Object.values(WorkbenchTool).includes(p.tool)) {
        tool = p.tool;
      }

      this.store.dispatch(new SetActiveTool(tool));
    });

    let visibleViewerIds$: Observable<string[]> = this.store
      .select(WorkbenchState.getVisibleViewerIds)
      .pipe(
        distinctUntilChanged((x, y) => {
          return (
            x.length == y.length && x.every((value, index) => value == y[index])
          );
        })
      );

    this.transformationSyncSub = this.viewerId$
      .pipe(
        filter((focusedViewerId) => focusedViewerId != null),
        switchMap((focusedViewerId) => {
          // let targetViewerIds = visibleViewerIds.filter((id) => id != focusedViewerId);

          let refHeader$ = this.store
            .select(WorkbenchState.getFirstImageHeaderIdFromViewerId)
            .pipe(
              map((fn) => fn(focusedViewerId)),
              distinctUntilChanged(),
              switchMap((headerId) =>
                this.store
                  .select(DataFilesState.getHeaderById)
                  .pipe(map((fn) => fn(headerId)))
              ),
              distinctUntilChanged()
              // tap(v => console.log("REF HEADER CHANGED"))
            );

          let refImageTransform$ = this.store
            .select(WorkbenchState.getImageTransformIdFromViewerId)
            .pipe(
              map((fn) => fn(focusedViewerId)),
              distinctUntilChanged(),
              switchMap((transformId) =>
                this.store
                  .select(DataFilesState.getTransformById)
                  .pipe(map((fn) => fn(transformId)))
              ),
              distinctUntilChanged()
              // tap(v => console.log("REF IMAGE TRANSFORM CHANGED"))
            );

          let refViewportTransform$ = this.store
            .select(WorkbenchState.getViewportTransformIdFromViewerId)
            .pipe(
              map((fn) => fn(focusedViewerId)),
              distinctUntilChanged(),
              switchMap((transformId) =>
                this.store
                  .select(DataFilesState.getTransformById)
                  .pipe(map((fn) => fn(transformId)))
              ),
              distinctUntilChanged()
              // tap(v => console.log("REF VIEWPORT TRANSFORM CHANGED"))
            );

          let refImageData$ = this.store
            .select(WorkbenchState.getRawImageDataIdFromViewerId)
            .pipe(
              map((fn) => fn(focusedViewerId)),
              distinctUntilChanged(),
              switchMap((imageDataId) =>
                this.store
                  .select(DataFilesState.getImageDataById)
                  .pipe(map((fn) => fn(imageDataId)))
              ),
              distinctUntilChanged()
            );

          let ref$ = combineLatest(
            refImageTransform$,
            refViewportTransform$,
            refImageData$
          ).pipe(withLatestFrom(refHeader$), skip(1));

          return combineLatest(
            this.viewerSyncEnabled$,
            this.viewerSyncMode$,
            visibleViewerIds$,
            ref$
          )
        })
      )
      .subscribe(
        ([
          viewerSyncEnabled,
          viewerSyncMode,
          visibleViewerIds,
          [[refImageTransform, refViewportTransform, refImageData], refHeader],
        ]) => {
          if (
            !viewerSyncEnabled ||
            !refHeader ||
            !refHeader.loaded ||
            !refImageTransform ||
            !refViewportTransform ||
            !refImageData
          ) {
            return;
          }
          this.store.dispatch(
            new SyncViewerTransformations(
              refHeader.id,
              refImageTransform.id,
              refViewportTransform.id,
              refImageData.id
            )
          );
        }
      );

    this.normalizationSyncSub = this.viewerId$
      .pipe(
        filter((focusedViewerId) => focusedViewerId != null),
        switchMap((focusedViewerId) => {
          // let targetViewerIds = visibleViewerIds.filter((id) => id != focusedViewerId);
          let refImageHdu$ = this.store
            .select(WorkbenchState.getViewerById)
            .pipe(
              map((fn) => fn(focusedViewerId)),
              map((viewer) => (viewer ? viewer.hduId : null)),
              distinctUntilChanged(),
              switchMap((hduId) =>
                this.store.select(DataFilesState.getHduById).pipe(
                  map((fn) => fn(hduId)),
                  map((hdu) =>
                    hdu && hdu.hduType != HduType.IMAGE
                      ? null
                      : (hdu as ImageHdu)
                  )
                )
              ),
              distinctUntilChanged()
            );

          let refNormalizer$ = refImageHdu$.pipe(
            map((hdu) => (hdu ? hdu.normalizer : null)),
            distinctUntilChanged(),
            skip(1)
          );

          return combineLatest(
            this.normalizationSyncEnabled$,
            visibleViewerIds$,
            refNormalizer$
          ).pipe();
        })
        // auditTime(10),
      )
      .subscribe(
        ([normalizationSyncEnabled, visibleViewerIds, refNormalizer]) => {
          if (!normalizationSyncEnabled || !refNormalizer) {
            return;
          }

          this.store.dispatch(new SyncViewerNormalizations(refNormalizer));
        }
      );

    this.plottingPanelSyncSub = this.viewerId$
      .pipe(
        filter((focusedViewerId) => focusedViewerId != null),
        switchMap((focusedViewerId) => {
          let refPlottingPanelState$ = this.store
            .select(WorkbenchState.getPlottingPanelStateIdFromViewerId)
            .pipe(
              map((fn) => fn(focusedViewerId)),
              distinctUntilChanged(),
              switchMap((plottingPanelStateId) =>
                this.store
                  .select(WorkbenchState.getPlottingPanelStateById)
                  .pipe(map((fn) => fn(plottingPanelStateId)))
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
      .subscribe(
        ([plottingSyncEnabled, visibleViewerIds, refPlottingPanelState]) => {
          if (!plottingSyncEnabled || !refPlottingPanelState) {
            return;
          }

          let viewerEntities = this.store.selectSnapshot(
            WorkbenchState.getViewerEntities
          );
          let workbenchFileStates = this.store.selectSnapshot(
            WorkbenchState.getFileStateEntities
          );
          let workbenchHduStates = this.store.selectSnapshot(
            WorkbenchState.getHduStateEntities
          );
          let targetPlottingPanelStateIds: string[] = [];
          visibleViewerIds.forEach((viewerId) => {
            let viewer = viewerEntities[viewerId];
            if (viewer.hduId) {
              let workbenchHduState = workbenchHduStates[viewer.hduId];
              if (
                workbenchHduState &&
                workbenchHduState.hduType == HduType.IMAGE &&
                (workbenchHduState as WorkbenchImageHduState)
                  .plottingPanelStateId
              ) {
                targetPlottingPanelStateIds.push(
                  (workbenchHduState as WorkbenchImageHduState)
                    .plottingPanelStateId
                );
              }
            } else {
              let workbenchFileState = workbenchFileStates[viewer.fileId];
              if (
                workbenchFileState &&
                workbenchFileState.plottingPanelStateId
              ) {
                targetPlottingPanelStateIds.push(
                  workbenchFileState.plottingPanelStateId
                );
              }
            }
          });

          if (targetPlottingPanelStateIds.length == 0) {
            return;
          }

          targetPlottingPanelStateIds = targetPlottingPanelStateIds.filter(
            (id) => id != refPlottingPanelState.id
          );

          this.store.dispatch(
            new SyncPlottingPanelStates(
              refPlottingPanelState.id,
              targetPlottingPanelStateIds
            )
          );
        }
      );
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
    // this.hotKeys.forEach((hotKey) => this._hotkeysService.remove(hotKey));
    // this.fileLoaderSub.unsubscribe();
    this.queryParamSub.unsubscribe();
    this.transformationSyncSub.unsubscribe();
    this.normalizationSyncSub.unsubscribe();
    this.plottingPanelSyncSub.unsubscribe();

    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  ngAfterViewInit() {
    this.shortcuts.push({
      key: 'F',
      label: 'Open File Manager',
      command: (e) => this.openFiles(),
      preventDefault: true,
    });

    this.shortcuts.push({
      key: 'd',
      label: 'Show Display Tool',
      command: (e) => {
        this.store.dispatch(new SetShowConfig(true));
        this.store.dispatch(
          new Navigate(
            [],
            { tool: WorkbenchTool.VIEWER },
            { relativeTo: this.activeRoute, queryParamsHandling: 'merge' }
          )
        );
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: 'i',
      label: 'Show File Info Tool',
      command: (e) => {
        this.store.dispatch(new SetShowConfig(true));
        this.store.dispatch(
          new Navigate(
            [],
            { tool: WorkbenchTool.INFO },
            { relativeTo: this.activeRoute, queryParamsHandling: 'merge' }
          )
        );
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: 'm',
      label: 'Show Custom Marker Tool',
      command: (e) => {
        this.store.dispatch(new SetShowConfig(true));
        this.store.dispatch(
          new Navigate(
            [],
            { tool: WorkbenchTool.CUSTOM_MARKER },
            { relativeTo: this.activeRoute, queryParamsHandling: 'merge' }
          )
        );
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: 'P',
      label: 'Show Plotter Tool',
      command: (e) => {
        this.store.dispatch(new SetShowConfig(true));
        this.store.dispatch(
          new Navigate(
            [],
            { tool: WorkbenchTool.PLOTTER },
            { relativeTo: this.activeRoute, queryParamsHandling: 'merge' }
          )
        );
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: 's',
      label: 'Show Sonifier Tool',
      command: (e) => {
        this.store.dispatch(new SetShowConfig(true));
        this.store.dispatch(
          new Navigate(
            [],
            { tool: WorkbenchTool.SONIFIER },
            { relativeTo: this.activeRoute, queryParamsHandling: 'merge' }
          )
        );
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: 'p',
      label: 'Show Photometry Tool',
      command: (e) => {
        this.store.dispatch(new SetShowConfig(true));
        this.store.dispatch(
          new Navigate(
            [],
            { tool: WorkbenchTool.PHOTOMETRY },
            { relativeTo: this.activeRoute, queryParamsHandling: 'merge' }
          )
        );
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: '*',
      label: 'Show Image Arithmetic Tool',
      command: (e) => {
        this.store.dispatch(new SetShowConfig(true));
        this.store.dispatch(
          new Navigate(
            [],
            { tool: WorkbenchTool.IMAGE_CALC },
            { relativeTo: this.activeRoute, queryParamsHandling: 'merge' }
          )
        );
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: 'w',
      label: 'Show WCS Calibration Tool',
      command: (e) => {
        this.store.dispatch(new SetShowConfig(true));
        this.store.dispatch(
          new Navigate(
            [],
            { tool: WorkbenchTool.WCS_CALIBRATION },
            { relativeTo: this.activeRoute, queryParamsHandling: 'merge' }
          )
        );
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: 'a',
      label: 'Show Aligner Tool',
      command: (e) => {
        this.store.dispatch(new SetShowConfig(true));
        this.store.dispatch(
          new Navigate(
            [],
            { tool: WorkbenchTool.ALIGNER },
            { relativeTo: this.activeRoute, queryParamsHandling: 'merge' }
          )
        );
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: 'S',
      label: 'Show Stacker Tool',
      command: (e) => {
        this.store.dispatch(new SetShowConfig(true));
        this.store.dispatch(
          new Navigate(
            [],
            { tool: WorkbenchTool.STACKER },
            { relativeTo: this.activeRoute, queryParamsHandling: 'merge' }
          )
        );
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: ['esc', 'W'],
      label: 'Exit Expanded Panel View',
      command: (e) => {
        this.store.dispatch(new SetFullScreen(false));
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: ',',
      label: 'Expand File Panel',
      command: (e) => {
        this.store.dispatch(new SetFullScreen(true));
        this.store.dispatch(new SetFullScreenPanel('file'));
        this.store.dispatch(new ShowSidebar());
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: '.',
      label: 'Expand Viewer Panel',
      command: (e) => {
        this.store.dispatch(new SetFullScreen(true));
        this.store.dispatch(new SetFullScreenPanel('viewer'));
        this.store.dispatch(new ShowSidebar());
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: '/',
      label: 'Expand Tool Panel',
      command: (e) => {
        this.store.dispatch(new SetFullScreen(true));
        this.store.dispatch(new SetFullScreenPanel('tool'));
        this.store.dispatch(new ShowSidebar());
      },
      preventDefault: true,
    });

    let handleZoomKey = (cmd: 'in' | 'out' | 'reset' | 'fit') => {
      let viewer = this.store.selectSnapshot(WorkbenchState.getFocusedViewer);
      if (!viewer || !viewer.viewportSize || !viewer.hduId) return;
      let hdu = this.store.selectSnapshot(DataFilesState.getHduById)(
        viewer.hduId
      );
      if (!hdu || hdu.hduType != HduType.IMAGE) return;
      let imageHdu = hdu as ImageHdu;
      let imageDataId = imageHdu.imageDataId;
      let imageData = this.store.selectSnapshot(
        DataFilesState.getImageDataById
      )(imageDataId);
      let imageTransformId = imageHdu.imageTransformId;
      let viewportTransformId = imageHdu.viewportTransformId;
      switch (cmd) {
        case 'in': {
          this.store.dispatch(
            new ZoomBy(
              imageDataId,
              imageTransformId,
              viewportTransformId,
              viewer.viewportSize,
              1.0 / 0.75,
              null
            )
          );
          break;
        }
        case 'out': {
          this.store.dispatch(
            new ZoomBy(
              imageDataId,
              imageTransformId,
              viewportTransformId,
              viewer.viewportSize,
              0.75,
              null
            )
          );
          break;
        }
        case 'reset': {
          this.store.dispatch(
            new ZoomTo(
              imageDataId,
              imageTransformId,
              viewportTransformId,
              viewer.viewportSize,
              1.0,
              null
            )
          );
          break;
        }
        case 'fit': {
          this.store.dispatch(
            new CenterRegionInViewport(
              imageDataId,
              imageTransformId,
              viewportTransformId,
              viewer.viewportSize,
              {
                x: 1,
                y: 1,
                width: imageData.width,
                height: imageData.height,
              }
            )
          );
          break;
        }
      }
    };

    this.shortcuts.push({
      key: '=',
      label: 'Zoom in',
      command: (e) => handleZoomKey('in'),
      preventDefault: true,
    });

    this.shortcuts.push({
      key: '-',
      label: 'Zoom Out',
      command: (e) => handleZoomKey('out'),
      preventDefault: true,
    });

    this.shortcuts.push({
      key: 'r',
      label: 'Reset Zoom',
      command: (e) => handleZoomKey('reset'),
      preventDefault: true,
    });

    this.shortcuts.push({
      key: 'z',
      label: 'Zoom to Fit',
      command: (e) => handleZoomKey('fit'),
      preventDefault: true,
    });
  }

  getActiveToolName(activeTool: string) {
    switch (activeTool) {
      case WorkbenchTool.VIEWER: {
        return 'Display Settings';
      }
      case WorkbenchTool.INFO: {
        return 'File Info';
      }
      case WorkbenchTool.CUSTOM_MARKER: {
        return 'Custom Marker';
      }
      case WorkbenchTool.PLOTTER: {
        return 'Plotter';
      }
      case WorkbenchTool.SONIFIER: {
        return 'Sonifier';
      }
      case WorkbenchTool.PHOTOMETRY: {
        return 'Photometry';
      }
      case WorkbenchTool.IMAGE_CALC: {
        return 'Image Calculator';
      }
      case WorkbenchTool.WCS_CALIBRATION: {
        return 'WCS Calibration';
      }
      case WorkbenchTool.ALIGNER: {
        return 'Aligner';
      }
      case WorkbenchTool.STACKER: {
        return 'Aligner';
      }
      default: {
        return 'Unknown Tool';
      }
    }
  }

  getViewerLabel(viewer: Viewer, index: number) {
    let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
    let fileEntities = this.store.selectSnapshot(
      DataFilesState.getFileEntities
    );

    let file = fileEntities[viewer.fileId];

    if (file) return file.name;
    return `Viewer ${index}`;
  }

  onImageMouseDown($event: ViewerPanelCanvasMouseEvent) {
    this.imageMouseDownEvent = $event;
  }

  onImageMouseUp($event: ViewerPanelCanvasMouseEvent) {
    this.imageMouseUpEvent = $event;
  }

  /* image viewer mouse event handlers */
  onImageClick($event: ViewerPanelCanvasMouseEvent) {
    this.imageClickEvent = $event;

    let viewer = this.store.selectSnapshot(WorkbenchState.getViewerEntities)[
      $event.viewerId
    ] as ImageViewer;
    if (!viewer || viewer.type != 'image') {
      return;
    }
    let activeTool = this.store.selectSnapshot(WorkbenchState.getActiveTool);
    let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
    let fileEntities = this.store.selectSnapshot(
      DataFilesState.getFileEntities
    );
    let targetFile = fileEntities[viewer.fileId];
    let headerSelector = this.store.selectSnapshot(
      WorkbenchState.getFirstImageHeaderIdFromViewerId
    );
    let headerId = headerSelector(viewer.id);
    let targetHeader = this.store.selectSnapshot(
      DataFilesState.getHeaderEntities
    )[headerId];

    let hduStateEntities = this.store.selectSnapshot(
      WorkbenchState.getHduStateEntities
    );
    let fileStateEntities = this.store.selectSnapshot(
      WorkbenchState.getFileStateEntities
    );
    let imageDataEntities = this.store.selectSnapshot(
      DataFilesState.getImageDataEntities
    );

    switch (activeTool) {
      case WorkbenchTool.CUSTOM_MARKER: {

        break;
      }
      case WorkbenchTool.PLOTTER: {

        break;
      }
      case WorkbenchTool.PHOTOMETRY: {

        break;
      }
    }
  }

  onImageMouseMove($event: ViewerPanelCanvasMouseEvent) {
    this.imageMouseMoveEvent = $event;
    let viewer = this.store.selectSnapshot(WorkbenchState.getViewerEntities)[
      $event.viewerId
    ] as ImageViewer;
    if (!viewer || viewer.type != 'image') {
      return;
    }

    let activeTool = this.store.selectSnapshot(WorkbenchState.getActiveTool);
    let targetFile = this.store.selectSnapshot(DataFilesState.getFileEntities)[
      viewer.fileId
    ];
    let targetHdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[
      viewer.hduId
    ] as ImageHdu;
    let headerId = this.store.selectSnapshot(
      WorkbenchState.getFirstImageHeaderIdFromViewerId
    )(viewer.id);
    let targetHeader = this.store.selectSnapshot(
      DataFilesState.getHeaderEntities
    )[headerId];

    let hduStateEntities = this.store.selectSnapshot(
      WorkbenchState.getHduStateEntities
    );
    let fileStateEntities = this.store.selectSnapshot(
      WorkbenchState.getFileStateEntities
    );
    let imageDataEntities = this.store.selectSnapshot(
      DataFilesState.getImageDataEntities
    );

    switch (activeTool) {
      case WorkbenchTool.PLOTTER: {

        break;
      }
    }
  }

  onImageMouseDragStart($event: ViewerPanelCanvasMouseDragEvent) {
    this.imageDragStartEvent = $event;
    let viewer = this.store.selectSnapshot(WorkbenchState.getViewerEntities)[
      $event.viewerId
    ] as ImageViewer;
    if (!viewer || viewer.type != 'image') {
      return;
    }
    let activeTool = this.store.selectSnapshot(WorkbenchState.getActiveTool);
    let fileEntities = this.store.selectSnapshot(
      DataFilesState.getFileEntities
    );
    let headerSelector = this.store.selectSnapshot(
      WorkbenchState.getFirstImageHeaderIdFromViewerId
    );
    let headerId = headerSelector(viewer.id);
    let targetHeader = this.store.selectSnapshot(
      DataFilesState.getHeaderEntities
    )[headerId];
    switch (activeTool) {
      case WorkbenchTool.PHOTOMETRY: {

        break;
      }
    }
  }

  onImageMouseDrag($event: ViewerPanelCanvasMouseDragEvent) {
    this.imageDragEvent = $event;
    let viewer = this.store.selectSnapshot(WorkbenchState.getViewerEntities)[
      $event.viewerId
    ] as ImageViewer;
    if (!viewer || viewer.type != 'image') {
      return;
    }
    let activeTool = this.store.selectSnapshot(WorkbenchState.getActiveTool);
    let fileEntities = this.store.selectSnapshot(
      DataFilesState.getFileEntities
    );
    let headerSelector = this.store.selectSnapshot(
      WorkbenchState.getFirstImageHeaderIdFromViewerId
    );
    let headerId = headerSelector(viewer.id);
    let targetHeader = this.store.selectSnapshot(
      DataFilesState.getHeaderEntities
    )[headerId];
    switch (activeTool) {
      case WorkbenchTool.PHOTOMETRY: {

        break;
      }
    }
  }

  onImageMouseDragEnd($event: ViewerPanelCanvasMouseDragEvent) {
    this.imageDragEndEvent = $event;
    let viewer = this.store.selectSnapshot(WorkbenchState.getViewerEntities)[
      $event.viewerId
    ] as ImageViewer;
    if (!viewer || viewer.type != 'image') {
      return;
    }
    let activeTool = this.store.selectSnapshot(WorkbenchState.getActiveTool);
    let fileEntities = this.store.selectSnapshot(
      DataFilesState.getFileEntities
    );
    let headerSelector = this.store.selectSnapshot(
      WorkbenchState.getFirstImageHeaderIdFromViewerId
    );
    let headerId = headerSelector(viewer.id);
    let targetHeader = this.store.selectSnapshot(
      DataFilesState.getHeaderEntities
    )[headerId];
    switch (activeTool) {
      case WorkbenchTool.PHOTOMETRY: {

        break;
      }
    }
  }

  onMarkerClick($event: ViewerPanelMarkerMouseEvent) {
    this.markerClickEvent = $event;

    let viewer = this.store.selectSnapshot(WorkbenchState.getViewerEntities)[
      $event.viewerId
    ] as ImageViewer;
    if (!viewer || viewer.type != 'image') {
      return;
    }

    let activeTool = this.store.selectSnapshot(WorkbenchState.getActiveTool);
    let targetFile = this.store.selectSnapshot(DataFilesState.getFileEntities)[
      viewer.fileId
    ];
    let targetHdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[
      viewer.hduId
    ] as ImageHdu;
    let headerId = this.store.selectSnapshot(
      WorkbenchState.getFirstImageHeaderIdFromViewerId
    )(viewer.id);
    let targetHeader = this.store.selectSnapshot(
      DataFilesState.getHeaderEntities
    )[headerId];

    switch (activeTool) {
      case WorkbenchTool.CUSTOM_MARKER: {

        break;
      }
      case WorkbenchTool.PHOTOMETRY: {

      }
    }
  }

  clearFileListFilter() {
    this.store.dispatch(new SetFileListFilter(''));
  }

  handleSelectAllFilesChange(value: boolean) {
    if (value) {
      // selectall
      let filteredFiles = this.store.selectSnapshot(
        WorkbenchState.getFilteredFiles
      );
      this.store.dispatch(new SetFileSelection(filteredFiles.map((f) => f.id)));
    } else {
      // deselect all
      this.store.dispatch(new SetFileSelection([]));
    }
  }

  // onFileListItemClick(item: IFileListItemId) {
  //   this.store.dispatch(new SelectDataFileListItem(item));
  // }

  afterLibrarySync() {
    this.store.dispatch(new LoadLibrary());
    this.store.dispatch(new LoadDataProviders());

    let loadLibrarySuccess$ = this.actions$.pipe(
      ofActionCompleted(LoadLibrarySuccess)
    );
    let loadLibraryFail$ = this.actions$.pipe(
      ofActionCompleted(LoadLibraryFail),
      map((v) => throwError('Unable to load library'))
    );

    let loadDataProvidersSuccess$ = this.actions$.pipe(
      ofActionCompleted(LoadDataProvidersSuccess)
    );
    let loadDataProvidersFail$ = this.actions$.pipe(
      ofActionCompleted(LoadDataProvidersFail),
      map((v) => throwError('Unable to load data providers'))
    );

    return combineLatest([loadLibrarySuccess$, loadDataProvidersSuccess$]).pipe(
      takeUntil(merge(loadLibraryFail$, loadDataProvidersFail$).pipe()),
      take(1),
      map((v) => {
        return {
          dataProviderEntities: this.store.selectSnapshot(
            DataProvidersState.getDataProviderEntities
          ),
          fileEntities: this.store.selectSnapshot(
            DataFilesState.getFileEntities
          ),
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
      mode: 'close',
    };

    let dialogRef = this.dialog.open(SaveChangesDialogComponent, {
      width: '500px',
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
        () => { },
        (err) => { },
        () => this.store.dispatch(new LoadLibrary())
      );
  }

  onCloseAllFileListItemsBtnClick() {
    this.afterLibrarySync()
      .pipe(
        flatMap(({ dataProviderEntities, fileEntities }) => {
          // let selectedFileIds = this.store.selectSnapshot(WorkbenchState.getSelectedFileIds);
          // let files = selectedFileIds.map(id => fileEntities[id])
          let files = this.store.selectSnapshot(
            WorkbenchState.getFilteredFiles
          );
          let dialogConfig: Partial<AlertDialogConfig> = {
            title: 'Close Files',
            message: `Are you sure you want to close all files?`,
            buttons: [
              {
                color: null,
                value: true,
                label: 'Close All',
              },
              {
                color: null,
                value: false,
                label: 'Cancel',
              },
            ],
          };
          let dialogRef = this.dialog.open(AlertDialogComponent, {
            width: '400px',
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
        () => { },
        (err) => { },
        () => this.store.dispatch(new LoadLibrary())
      );
  }

  onCloseSelectedFileListItemsBtnClick() {
    this.afterLibrarySync()
      .pipe(
        flatMap(({ dataProviderEntities, fileEntities }) => {
          let selectedFileIds = this.store.selectSnapshot(
            WorkbenchState.getSelectedFilteredFileIds
          );
          let files = selectedFileIds.map((id) => fileEntities[id]);
          let dialogConfig: Partial<AlertDialogConfig> = {
            title: 'Close Files',
            message: `Are you sure you want to close the selected files?`,
            buttons: [
              {
                color: null,
                value: true,
                label: 'Close Selected Files',
              },
              {
                color: null,
                value: false,
                label: 'Cancel',
              },
            ],
          };
          let dialogRef = this.dialog.open(AlertDialogComponent, {
            width: '400px',
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
        () => { },
        (err) => { },
        () => this.store.dispatch(new LoadLibrary())
      );
  }

  saveFiles(files: DataFile[]) {
    let config: FileDialogConfig = {
      files: files,
      mode: 'save',
    };

    let dialogRef = this.dialog.open(SaveChangesDialogComponent, {
      width: '500px',
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
        () => { },
        (err) => { },
        () => this.store.dispatch(new LoadLibrary())
      );
  }

  onSaveAllFileListItemsBtnClick() {
    this.afterLibrarySync()
      .pipe(
        flatMap(({ dataProviderEntities, fileEntities }) => {
          // let selectedFileIds = this.store.selectSnapshot(WorkbenchState.getSelectedFileIds);
          // let files = selectedFileIds.map(id => fileEntities[id])
          let files = this.store.selectSnapshot(
            WorkbenchState.getFilteredFiles
          );
          let dialogConfig: Partial<AlertDialogConfig> = {
            title: 'Save Files',
            message: `Are you sure you want to save all files?`,
            buttons: [
              {
                color: null,
                value: true,
                label: 'Save All',
              },
              {
                color: null,
                value: false,
                label: 'Cancel',
              },
            ],
          };
          let dialogRef = this.dialog.open(AlertDialogComponent, {
            width: '400px',
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
        () => { },
        (err) => { },
        () => this.store.dispatch(new LoadLibrary())
      );
  }

  onSaveSelectedFileListItemsBtnClick() {
    this.afterLibrarySync()
      .pipe(
        flatMap(({ dataProviderEntities, fileEntities }) => {
          let selectedFileIds = this.store.selectSnapshot(
            WorkbenchState.getSelectedFilteredFileIds
          );
          let files = selectedFileIds.map((id) => fileEntities[id]);
          let dialogConfig: Partial<AlertDialogConfig> = {
            title: 'Save Files',
            message: `Are you sure you want to save the selected files?`,
            buttons: [
              {
                color: null,
                value: true,
                label: 'Save Selected Files',
              },
              {
                color: null,
                value: false,
                label: 'Cancel',
              },
            ],
          };
          let dialogRef = this.dialog.open(AlertDialogComponent, {
            width: '400px',
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
        () => { },
        (err) => { },
        () => this.store.dispatch(new LoadLibrary())
      );
  }

  onDownloadSelectedFileListItemsBtnClick() {
    this.afterLibrarySync()
      .pipe(
        flatMap(({ dataProviderEntities, fileEntities }) => {
          let selectedFileIds = this.store.selectSnapshot(
            WorkbenchState.getSelectedFilteredFileIds
          );
          let files = selectedFileIds.map((id) => fileEntities[id]);

          let job: BatchDownloadJob = {
            type: JobType.BatchDownload,
            id: null,
            groupNames: files.map((file) => file.id),
            state: null,
            result: null,
          };

          let corrId = this.corrGen.next();
          let onCreateJobSuccess$ = this.actions$.pipe(
            ofActionDispatched(CreateJobSuccess),
            filter(
              (action) => (action as CreateJobSuccess).correlationId == corrId
            ),
            take(1),
            flatMap((action) => {
              let jobId = (action as CreateJobSuccess).job.id;
              let dialogConfig: JobProgressDialogConfig = {
                title: 'Preparing download',
                message: `Please wait while we prepare the files for download.`,
                progressMode: 'indeterminate',
                job$: this.store
                  .select(JobsState.getJobById)
                  .pipe(map((fn) => fn(jobId))),
              };
              let dialogRef = this.dialog.open(JobProgressDialogComponent, {
                width: '400px',
                data: dialogConfig,
                disableClose: true,
              });

              return dialogRef.afterClosed().pipe(
                flatMap((result) => {
                  if (!result) {
                    return of(null);
                  }

                  return this.jobService
                    .getJobResultFile(jobId, 'download')
                    .pipe(
                      tap((data) => {
                        saveAs(
                          data,
                          files.length == 1
                            ? files[0].name
                            : 'afterglow-files.zip'
                        );
                      })
                    );
                })
              );
            })
          );

          let onCreateJobFail$ = this.actions$.pipe(
            ofActionDispatched(CreateJobFail),
            filter(
              (action) => (action as CreateJobFail).correlationId == corrId
            ),
            take(1)
          );

          this.store.dispatch(new CreateJob(job, 1000, corrId));

          return merge(onCreateJobSuccess$, onCreateJobFail$).pipe(take(1));
        })
      )
      .subscribe(
        () => { },
        (err) => { },
        () => { }
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

  onSplitSelectedFileListItemsBtnClick() {
    this.afterLibrarySync()
      .pipe(
        flatMap(({ dataProviderEntities, fileEntities }) => {
          let selectedFileIds = this.store.selectSnapshot(
            WorkbenchState.getSelectedFilteredFileIds
          );
          let files = selectedFileIds
            .map((id) => fileEntities[id])
            .filter((file) => file.hduIds.length > 1);
          if (files.length == 0) {
            let dialogConfig: Partial<AlertDialogConfig> = {
              title: 'Error',
              message: `None of the selected files contain multiple HDUs.`,
              buttons: [
                {
                  color: null,
                  value: false,
                  label: 'Close',
                },
              ],
            };
            let dialogRef = this.dialog.open(AlertDialogComponent, {
              width: '400px',
              data: dialogConfig,
              disableClose: true,
            });

            return dialogRef.afterClosed();
          }

          let dialogConfig: Partial<AlertDialogConfig> = {
            title: 'Split Files',
            message: `Are you sure you want to split the HDUs within each selected file into separate single-HDU files?`,
            buttons: [
              {
                color: null,
                value: true,
                label: 'Split Selected Files',
              },
              {
                color: null,
                value: false,
                label: 'Cancel',
              },
            ],
          };
          let dialogRef = this.dialog.open(AlertDialogComponent, {
            width: '400px',
            data: dialogConfig,
            disableClose: true,
          });

          return dialogRef.afterClosed().pipe(
            take(1),
            flatMap((result) => {
              if (!result) {
                return of(null);
              }
              let viewers = this.store.selectSnapshot(
                WorkbenchState.getViewers
              );
              let reqs: Observable<any>[] = [];
              files.forEach((file) => {
                file.hduIds.forEach((hduId, index) => {
                  let hdu = this.store.selectSnapshot(
                    DataFilesState.getHduEntities
                  )[hduId];
                  let uuid = UUID.UUID();
                  let newFilename = file.name + '_' + index;
                  viewers
                    .filter(
                      (viewer) =>
                        viewer.hduId == hduId || viewer.fileId == hdu.fileId
                    )
                    .forEach((viewer) =>
                      this.store.dispatch(new CloseViewer(viewer.id))
                    );
                  this.store.dispatch(new InvalidateHeader(hduId));
                  reqs.push(
                    this.dataFileService.updateFile(hduId, {
                      groupName: uuid,
                      name:
                        hdu && hdu.name ? hdu.name : `${file.name}_${index}`,
                      dataProvider: null,
                      assetPath: null,
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
        () => { },
        (err) => {
          throw err;
        },
        () => this.store.dispatch(new LoadLibrary())
      );
  }

  onGroupSelectedFileListItemsBtnClick() {
    this.afterLibrarySync()
      .pipe(
        flatMap(({ dataProviderEntities, fileEntities }) => {
          let selectedFileIds = this.store.selectSnapshot(
            WorkbenchState.getSelectedFilteredFileIds
          );
          let files = selectedFileIds.map((id) => fileEntities[id]);
          let hduCount = 0;
          files.forEach((file) => (hduCount += file.hduIds.length));

          if (hduCount > 5) {
            let dialogConfig: Partial<AlertDialogConfig> = {
              title: 'Error',
              message: `The number of channels within a file is currently limited to no more than five.  Please reduce he number of channels and try grouping again.`,
              buttons: [
                {
                  color: null,
                  value: false,
                  label: 'Close',
                },
              ],
            };
            let dialogRef = this.dialog.open(AlertDialogComponent, {
              width: '400px',
              data: dialogConfig,
              disableClose: true,
            });

            return dialogRef.afterClosed();
          }

          let dialogConfig: Partial<AlertDialogConfig> = {
            title: 'Group Files',
            message: `Are you sure you want to group the selected files into a single file with multiple channels?`,
            buttons: [
              {
                color: null,
                value: true,
                label: 'Group Selected Files',
              },
              {
                color: null,
                value: false,
                label: 'Cancel',
              },
            ],
          };
          let dialogRef = this.dialog.open(AlertDialogComponent, {
            width: '400px',
            data: dialogConfig,
            disableClose: true,
          });

          return dialogRef.afterClosed().pipe(
            take(1),
            flatMap((result) => {
              if (!result) {
                return of(null);
              }

              let newFilename = this.getLongestCommonStartingSubstring(
                files.map((file) => file.name)
              )
                .replace(/_+$/, '')
                .trim();
              if (newFilename.length == 0) {
                newFilename = `${files[0].name} - group`;
              }

              let viewers = this.store.selectSnapshot(
                WorkbenchState.getViewers
              );
              let uuid = UUID.UUID();
              let reqs: Observable<any>[] = [];
              files.forEach((file) => {
                file.hduIds.forEach((hduId) => {
                  let hdu = this.store.selectSnapshot(
                    DataFilesState.getHduEntities
                  )[hduId];
                  viewers
                    .filter(
                      (viewer) =>
                        viewer.hduId == hduId || viewer.fileId == hdu.fileId
                    )
                    .forEach((viewer) =>
                      this.store.dispatch(new CloseViewer(viewer.id))
                    );
                  this.store.dispatch(new InvalidateHeader(hduId));
                  reqs.push(
                    this.dataFileService.updateFile(hduId, {
                      groupName: uuid,
                      name: newFilename,
                      dataProvider: null,
                      assetPath: null,
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
        () => { },
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
      width: '80vw',
      maxWidth: '1200px',
    });

    dialogRef.afterClosed().subscribe((assets) => { });
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
        { relativeTo: this.activeRoute, queryParamsHandling: 'merge' }
      )
    );
  }

  getToolbarTooltip(isActive: boolean, base: string) {
    let showToolPanel = this.store.selectSnapshot(WorkbenchState.getShowConfig);
    return (showToolPanel && isActive ? 'Hide ' : 'Show ') + base;
  }

  onViewerSyncEnabledChange($event: MatCheckboxChange) {
    this.store.dispatch(new SetViewerSyncEnabled($event.checked));
  }

  onViewerSyncModeChange($event: MatButtonToggleChange) {
    this.store.dispatch(new SetViewerSyncMode($event.value));
  }

  onNormalizationSyncEnabledChange($event: MatCheckboxChange) {
    this.store.dispatch(new SetNormalizationSyncEnabled($event.checked));
  }

  importFromSurvey(surveyDataProvider: DataProvider) {
    let centerRaDec;
    let pixelScale;

    let focusedViewer = this.store.selectSnapshot(
      WorkbenchState.getFocusedViewer
    );
    if (!focusedViewer) return;

    let hduId = focusedViewer.hduId;
    if (!hduId) {
      hduId = this.store.selectSnapshot(DataFilesState.getFileEntities)[
        focusedViewer.fileId
      ].hduIds[0];
    }

    if (!hduId) return;
    let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[hduId];
    let header = this.store.selectSnapshot(DataFilesState.getHeaderEntities)[
      hdu.headerId
    ];

    if (header.wcs && header.wcs.isValid() && this.useWcsCenter) {
      centerRaDec = header.wcs.pixToWorld([
        getWidth(header) / 2,
        getHeight(header) / 2,
      ]);
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
    if (!focusedViewer.keepOpen) {
      this.store.dispatch(new KeepViewerOpen(focusedViewer.id));
    }

    let correlationId = this.corrGen.next();

    let importFromSurveyFail$ = this.actions$.pipe(
      ofActionDispatched(ImportFromSurveyFail),
      filter<ImportFromSurveyFail>(
        (action) => action.correlationId == correlationId
      ),
      take(1),
      flatMap((v) => {
        let dialogConfig: Partial<AlertDialogConfig> = {
          title: 'Error',
          message: `An unexpected error occurred when importing the survey image.  Please try again later.`,
          buttons: [
            {
              color: null,
              value: false,
              label: 'Close',
            },
          ],
        };
        let dialogRef = this.dialog.open(AlertDialogComponent, {
          width: '400px',
          data: dialogConfig,
          disableClose: true,
        });

        return dialogRef.afterClosed();
      })
    );

    this.actions$
      .pipe(
        takeUntil(importFromSurveyFail$),
        ofActionDispatched(ImportFromSurveySuccess),
        filter<ImportFromSurveySuccess>(
          (action) => action.correlationId == correlationId
        ),
        take(1),
        flatMap((action) => {
          let surveyFileId = action.fileId;
          this.store.dispatch(new LoadLibrary());

          let loadLibraryFail$ = this.actions$.pipe(
            ofActionDispatched(LoadLibraryFail),
            take(1)
          );

          return this.actions$.pipe(
            ofActionDispatched(LoadLibrarySuccess),
            takeUntil(loadLibraryFail$),
            take(1),
            map((action) => surveyFileId)
          );
        })
      )
      .subscribe(
        (surveyFileId) => {
          let hduEntities = this.store.selectSnapshot(
            DataFilesState.getHduEntities
          );
          if (surveyFileId && surveyFileId in hduEntities) {
            let hdu = hduEntities[surveyFileId];
            this.store.dispatch(new SelectFile(hdu.fileId, hdu.id, true));
          }
        },
        (err) => { },
        () => { }
      );

    this.store.dispatch(
      new ImportFromSurvey(
        surveyDataProvider.id,
        centerRaDec[0],
        centerRaDec[1],
        width,
        height,
        correlationId
      )
    );
  }

  // onUseWcsCenterChange($event: MatCheckboxChange) {
  //   this.useWcsCenter = $event.checked;
  // }

  onUseWcsCenterChange($event: MatRadioChange) {
    this.useWcsCenter = $event.value == 'wcs';
  }

  splitViewerPanel(
    viewer: Viewer,
    direction: 'up' | 'down' | 'left' | 'right' = 'right'
  ) {
    this.store.dispatch(new SplitViewerPanel(viewer.id, direction));
  }
}
