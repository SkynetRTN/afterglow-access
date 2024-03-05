import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { Observable, combineLatest, merge, of, never, empty, throwError, Subject, concat, forkJoin } from 'rxjs';
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
  mergeMap,
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
  ImageLayer,
  ILayer,
  PixelType,
} from '../../data-files/models/data-file';
import { SidebarView } from '../models/sidebar-view';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from '../../../../node_modules/rxjs';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Store, Actions, ofActionCompleted, ofActionDispatched, Select } from '@ngxs/store';
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
  SplitViewerPanel,
  KeepViewerOpen,
  SetActiveTool,
  SyncViewerTransformations,
  SetViewerSyncMode,
  SyncViewerNormalizations,
  SetFileSelection,
  SetFileListFilter,
  ImportFromSurveyFail,
  ImportFromSurveySuccess,
  CloseViewer,
  ToggleFileSelection,
} from '../workbench.actions';
import {
  LoadDataProviders,
  LoadDataProvidersSuccess,
  LoadDataProvidersFail,
} from '../../data-providers/data-providers.actions';
import { ViewMode } from '../models/view-mode';
import { MatButtonToggleChange } from '@angular/material/button-toggle';
import { MatRadioChange } from '@angular/material/radio';
import { MatSelectChange } from '@angular/material/select';
import { IViewer, ImageViewer, TableViewer, ViewerType } from '../models/viewer';
import { DataProvider } from '../../data-providers/models/data-provider';
import { CorrelationIdGenerator } from '../../utils/correlated-action';
import { DataProvidersState } from '../../data-providers/data-providers.state';
import { Navigate } from '@ngxs/router-plugin';
import { WorkbenchTool, ViewerPanelContainer } from '../models/workbench-state';
import { LayerType } from '../../data-files/models/data-file-type';
import {
  LoadLibrary,
  LoadLibrarySuccess,
  LoadLibraryFail,
  InvalidateHeader,
  ZoomBy,
  CenterRegionInViewport,
  ZoomTo,
} from '../../data-files/data-files.actions';
import { DataFileListComponent } from './data-file-list/data-file-list.component';
import { OpenFileDialogComponent } from '../../data-providers/components/open-file-dialog/open-file-dialog.component';
import { AfterglowDataProviderService } from '../services/afterglow-data-providers';
import { SaveChangesDialogComponent, FileDialogConfig } from '../components/file-dialog/file-dialog.component';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { AfterglowDataFileService } from '../services/afterglow-data-files';
import { UUID } from 'angular2-uuid';
import { BatchDownloadJob } from '../../jobs/models/batch-download';
import { JobType } from '../../jobs/models/job-types';
import {
  JobProgressDialogConfig,
  JobProgressDialogComponent,
} from '../components/job-progress-dialog/job-progress-dialog.component';
import { JobsState } from '../../jobs/jobs.state';
import { JobApiService } from '../../jobs/services/job-api.service';
import { AlertDialogConfig, AlertDialogComponent } from '../../utils/alert-dialog/alert-dialog.component';
import { ShortcutInput, ShortcutEventOutput } from 'ng-keyboard-shortcuts';

// @ts-ignore
import { saveAs } from 'file-saver/dist/FileSaver';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { getLongestCommonStartingSubstring } from 'src/app/utils/utils';
import { JobService } from 'src/app/jobs/services/job.service';
import { DecimalPipe } from '@angular/common';
import { PlottingState } from '../tools/plotting/plotting.state';
import { SyncPlottingPanelStates } from '../tools/plotting/plotting.actions';

@Component({
  selector: 'app-workbench',
  templateUrl: './workbench.component.html',
  styleUrls: ['./workbench.component.scss'],
})
export class WorkbenchComponent implements OnInit, OnDestroy, AfterViewInit {
  WorkbenchTool = WorkbenchTool;
  ViewMode = ViewMode;
  LayerType = LayerType;
  shortcuts: ShortcutInput[] = [];

  @ViewChild(DataFileListComponent)
  fileList: DataFileListComponent;

  destroy$ = new Subject<boolean>();

  @Select(WorkbenchState.getInFullScreenMode) inFullScreenMode$: Observable<boolean>;
  @Select(WorkbenchState.getFullScreenPanel) fullScreenPanel$: Observable<'file' | 'viewer' | 'tool'>;
  @Select(DataFilesState.getLoading) loadingFiles$: Observable<boolean>;
  @Select(WorkbenchState.getShowSidebar) showSidebar$: Observable<boolean>;
  @Select(WorkbenchState.getSidebarView) sidebarView$: Observable<SidebarView>;
  @Select(WorkbenchState.canSplit) canSplit$: Observable<boolean>;
  @Select(WorkbenchState.getActiveTool) activeTool$: Observable<WorkbenchTool>;
  @Select(WorkbenchState.getShowConfig) showConfig$: Observable<boolean>;
  currentSidebarView = SidebarView.FILES;
  SidebarView = SidebarView;

  @Select(DataFilesState.getFilesSorted) filesSorted$: Observable<DataFile[]>;
  @Select(WorkbenchState.getFileListFilter) fileFilter$: Observable<string>;

  @Select(WorkbenchState.getFilteredFiles) filteredFiles$: Observable<DataFile[]>;
  filteredLayerIds$: Observable<string[]>;
  filteredLayers$: Observable<ILayer[]>;
  filteredImageLayers$: Observable<ImageLayer[]>;
  filteredImageLayerIds$: Observable<string[]>;
  fileFilterInput$ = new Subject<string>();

  @Select(WorkbenchState.getSelectedFilteredFileIds) selectedFileIds$: Observable<string[]>;
  @Select(WorkbenchState.getSelectAllFilesCheckboxState) selectAllFilesCheckboxState$: Observable<boolean>;
  @Select(WorkbenchState.getSelectAllFilesCheckboxIndeterminate)
  selectAllFilesCheckboxIndeterminate$: Observable<boolean>;

  @Select(WorkbenchState.getRootViewerPanelContainer) layoutContainer$: Observable<ViewerPanelContainer>;
  @Select(WorkbenchState.getViewers) viewers$: Observable<IViewer[]>;
  @Select(WorkbenchState.getFocusedViewer) focusedViewer$: Observable<IViewer>;
  @Select(WorkbenchState.getFocusedViewerLayer) focusedViewerLayer$: Observable<ILayer>;
  @Select(WorkbenchState.getFocusedViewerId) focusedViewerId$: Observable<string>;
  @Select(WorkbenchState.getFocusedImageViewer) focusedImageViewer$: Observable<ImageViewer>;
  @Select(WorkbenchState.getFocusedImageViewerId) focusedImageViewerId$: Observable<string>;
  @Select(WorkbenchState.getFocusedTableViewer) focusedTableViewer$: Observable<TableViewer>;

  //global settings panel
  @Select(WorkbenchState.getViewerSyncEnabled) viewerSyncEnabled$: Observable<boolean>;
  @Select(WorkbenchState.getViewerSyncMode) viewerSyncMode$: Observable<'sky' | 'pixel'>;
  @Select(WorkbenchState.getNormalizationSyncEnabled) normalizationSyncEnabled$: Observable<boolean>;

  constructor(
    private actions$: Actions,
    private store: Store,
    private router: Router,
    public dialog: MatDialog,
    private corrGen: CorrelationIdGenerator,
    private activeRoute: ActivatedRoute,
    private dataProviderService: AfterglowDataProviderService,
    private dataFileService: AfterglowDataFileService,
    private jobService: JobService,
    private jobApiService: JobApiService,
    private decimalPipe: DecimalPipe
  ) {
    this.fileFilterInput$.pipe(takeUntil(this.destroy$), debounceTime(100)).subscribe((value) => {
      this.store.dispatch(new SetFileListFilter(value));
    });

    this.filteredLayerIds$ = this.store
      .select(WorkbenchState.getFilteredLayerIds)
      .pipe(
        distinctUntilChanged((a, b) => a && b && a.length == b.length && a.every((value, index) => b[index] == value))
      );

    this.filteredLayers$ = this.filteredLayerIds$.pipe(
      switchMap((layerIds) => this.store.select(DataFilesState.getLayersByIds(layerIds)))
    );

    this.filteredImageLayers$ = this.filteredLayers$.pipe(
      map((layers) => (!layers ? null : (layers.filter((layer) => layer.type == LayerType.IMAGE) as ImageLayer[])))
    );

    this.filteredImageLayerIds$ = this.filteredImageLayers$.pipe(map((layers) => layers.map((layer) => layer.id)));

    this.activeRoute.queryParams.pipe(takeUntil(this.destroy$)).subscribe((p) => {
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

    this.focusedViewerId$
      .pipe(
        takeUntil(this.destroy$),
        filter((focusedViewerId) => focusedViewerId != null),
        switchMap((focusedViewerId) => {
          // let targetViewerIds = visibleViewerIds.filter((id) => id != focusedViewerId);
          let refHeader$ = this.store.select(WorkbenchState.getImageHeaderByViewerId(focusedViewerId));
          let refImageTransform$ = this.store.select(WorkbenchState.getImageTransformByViewerId(focusedViewerId));
          let refViewportTransform$ = this.store.select(WorkbenchState.getViewportTransformByViewerId(focusedViewerId));
          let refImageData$ = this.store.select(WorkbenchState.getNormalizedImageDataByViewerId(focusedViewerId));
          let refViewer$ = this.store.select(WorkbenchState.getViewerById(focusedViewerId));

          let ref$ = combineLatest(refImageTransform$, refViewportTransform$, refImageData$, refViewer$).pipe(
            withLatestFrom(refHeader$),
            skip(1)
          );

          return combineLatest(this.viewerSyncEnabled$, this.viewerSyncMode$, visibleViewerIds$, ref$);
        })
      )
      .subscribe(
        ([
          viewerSyncEnabled,
          viewerSyncMode,
          visibleViewerIds,
          [[refImageTransform, refViewportTransform, refImageData, refViewer], refHeader],
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
            new SyncViewerTransformations(refHeader.id, refImageTransform.id, refViewportTransform.id, refImageData.id, refViewer)
          );
        }
      );

    this.focusedViewerId$
      .pipe(
        takeUntil(this.destroy$),
        filter((focusedViewerId) => focusedViewerId != null),
        switchMap((focusedViewerId) => {
          // let targetViewerIds = visibleViewerIds.filter((id) => id != focusedViewerId);
          let refImageLayer$ = this.store.select(WorkbenchState.getViewerById(focusedViewerId)).pipe(
            map((viewer) => (viewer ? viewer.layerId : null)),
            distinctUntilChanged(),
            switchMap((layerId) =>
              this.store
                .select(DataFilesState.getLayerById(layerId))
                .pipe(map((layer) => (layer && layer.type != LayerType.IMAGE ? null : (layer as ImageLayer))))
            ),
            distinctUntilChanged()
          );

          let refNormalizer$ = refImageLayer$.pipe(
            map((layer) => (layer ? layer.normalizer : null)),
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

    this.focusedViewerId$
      .pipe(
        takeUntil(this.destroy$),
        filter((focusedViewerId) => focusedViewerId != null),
        switchMap((focusedViewerId) => {
          let refPlottingPanelState$ = this.store.select(
            PlottingState.getViewerStateByViewerId(focusedViewerId)
          );

          return combineLatest(
            this.store.select(PlottingState.getConfig).pipe(map((config) => config.plotterSyncEnabled)),
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

        let targetPlottingPanelStateIds: string[] = [];
        visibleViewerIds.forEach((viewerId) => {
          let viewerStateId = this.store.selectSnapshot(PlottingState.getViewerStateIdByViewerId(viewerId));
          targetPlottingPanelStateIds.push(viewerStateId);
        });

        if (targetPlottingPanelStateIds.length == 0) {
          return;
        }

        targetPlottingPanelStateIds = targetPlottingPanelStateIds.filter((id) => id != refPlottingPanelState.id);

        this.store.dispatch(new SyncPlottingPanelStates(refPlottingPanelState.id, targetPlottingPanelStateIds));
      });
  }

  ngOnInit() {
    setTimeout(() => {
      this.store.dispatch([new LoadLibrary(), new LoadCatalogs(), new LoadFieldCals(), new LoadDataProviders()]);
    });
  }

  ngOnDestroy() {
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

    let handleFileNav = (direction: 'fwd' | 'rev') => {
      let filteredFiles = this.store.selectSnapshot(WorkbenchState.getFilteredFiles);
      let activeViewer = this.store.selectSnapshot(WorkbenchState.getFocusedViewer);
      if (!activeViewer || !activeViewer.fileId) return;
      let fileIndex = filteredFiles.findIndex(f => f.id == activeViewer.fileId);
      if (fileIndex == -1) return;
      let file = filteredFiles[fileIndex];

      if (activeViewer.layerId) {
        let layerIndex = file.layerIds.indexOf(activeViewer.layerId);
        if (layerIndex == -1) return;
        layerIndex = layerIndex + (direction == 'fwd' ? 1 : -1);
        if (layerIndex >= 0 && layerIndex < file.layerIds.length) {
          this.store.dispatch(new SelectFile(file.id, file.layerIds[layerIndex], false));
          return;
        }
        else if (layerIndex == -1 && file.layerIds.length > 1) {
          this.store.dispatch(new SelectFile(file.id, null, false));
        }
      }

      fileIndex = fileIndex + (direction == 'fwd' ? 1 : -1);
      if (fileIndex >= 0 && fileIndex < filteredFiles.length) {
        this.store.dispatch(new SelectFile(filteredFiles[fileIndex].id, filteredFiles[fileIndex].layerIds.length == 1 ? filteredFiles[fileIndex].layerIds[0] : null, false));
        return;
      }
    }

    this.shortcuts.push({
      key: 'shift + right',
      label: 'Next file',
      command: (e) => {
        handleFileNav('fwd')
      },
      preventDefault: true,
    });

    this.shortcuts.push({
      key: 'shift + left',
      label: 'Next file',
      command: (e) => {
        handleFileNav('rev')
      },
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
          new Navigate([], { tool: WorkbenchTool.INFO }, { relativeTo: this.activeRoute, queryParamsHandling: 'merge' })
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
            { tool: WorkbenchTool.PIXEL_OPS },
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
      if (!viewer || !viewer.viewportSize || !viewer.layerId) return;
      let layer = this.store.selectSnapshot(DataFilesState.getLayerById(viewer.layerId));
      if (!layer || layer.type != LayerType.IMAGE) return;
      let imageLayer = layer as ImageLayer;
      let imageDataId = imageLayer.rgbaImageDataId;
      let imageData = this.store.selectSnapshot(DataFilesState.getImageDataById(imageDataId));
      let imageTransformId = imageLayer.imageTransformId;
      let viewportTransformId = imageLayer.viewportTransformId;
      switch (cmd) {
        case 'in': {
          this.store.dispatch(
            new ZoomBy(imageDataId, imageTransformId, viewportTransformId, viewer.viewportSize, 1.0 / 0.75, null)
          );
          break;
        }
        case 'out': {
          this.store.dispatch(
            new ZoomBy(imageDataId, imageTransformId, viewportTransformId, viewer.viewportSize, 0.75, null)
          );
          break;
        }
        case 'reset': {
          this.store.dispatch(
            new ZoomTo(imageDataId, imageTransformId, viewportTransformId, viewer.viewportSize, 1.0, null)
          );
          break;
        }
        case 'fit': {
          this.store.dispatch(
            new CenterRegionInViewport(imageDataId, imageTransformId, viewportTransformId, viewer.viewportSize, {
              x: 1,
              y: 1,
              width: imageData.width,
              height: imageData.height,
            })
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
      case WorkbenchTool.PIXEL_OPS: {
        return 'Pixel Operations';
      }
      case WorkbenchTool.WCS_CALIBRATION: {
        return 'WCS Calibration';
      }
      case WorkbenchTool.ALIGNER: {
        return 'Aligner';
      }
      case WorkbenchTool.STACKER: {
        return 'Stacker';
      }
      default: {
        return 'Unknown Tool';
      }
    }
  }

  getViewerLabel(viewer: IViewer, index: number) {
    let layerEntities = this.store.selectSnapshot(DataFilesState.getLayerEntities);
    let fileEntities = this.store.selectSnapshot(DataFilesState.getFileEntities);

    let file = fileEntities[viewer.fileId];

    if (file) return file.name;
    return `Viewer ${index}`;
  }

  clearFileListFilter() {
    this.store.dispatch(new SetFileListFilter(''));
  }

  handleSelectAllFilesChange(value: boolean) {
    if (value) {
      // selectall
      let filteredFiles = this.store.selectSnapshot(WorkbenchState.getFilteredFiles);
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

    let loadLibrarySuccess$ = this.actions$.pipe(ofActionCompleted(LoadLibrarySuccess));
    let loadLibraryFail$ = this.actions$.pipe(
      ofActionCompleted(LoadLibraryFail),
      map((v) => throwError('Unable to load library'))
    );

    let loadDataProvidersSuccess$ = this.actions$.pipe(ofActionCompleted(LoadDataProvidersSuccess));
    let loadDataProvidersFail$ = this.actions$.pipe(
      ofActionCompleted(LoadDataProvidersFail),
      map((v) => throwError('Unable to load data providers'))
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
  //         let layerEntities = this.store.selectSnapshot(DataFilesState.getLayerEntities);

  //         //remove files which have not been modified
  //         let files = Object.values(fileEntities).filter((file) => {
  //           let layers = file.layerIds.map((layerId) => layerEntities[layerId]);
  //           let layerModified = layers.map((layer) => layer && layer.modified).some((v) => v);

  //           let dataProvider = dataProviderEntities[file.dataProviderId];
  //           return layerModified || !dataProvider || dataProvider.readonly;
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
          let files = this.store.selectSnapshot(WorkbenchState.getFilteredFiles);
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
          let selectedFileIds = this.store.selectSnapshot(WorkbenchState.getSelectedFilteredFileIds);
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
          let files = this.store.selectSnapshot(WorkbenchState.getFilteredFiles);
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
          let selectedFileIds = this.store.selectSnapshot(WorkbenchState.getSelectedFilteredFileIds);
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
    this.afterLibrarySync().pipe(
      flatMap(({ dataProviderEntities, fileEntities }) => {
        let selectedFileIds = this.store.selectSnapshot(WorkbenchState.getSelectedFilteredFileIds);
        let files = selectedFileIds.map((id) => fileEntities[id]);
        let filename = files[0].name;
        if (files.length > 1) {
          filename = getLongestCommonStartingSubstring(files.map((file) => file.name))
            .replace(/_+$/, '')
            .trim();
          if (filename.length == 0) {
            filename = 'afterglow-files'
          }


        }
        filename += '.zip'

        let job: BatchDownloadJob = {
          type: JobType.BatchDownload,
          id: null,
          groupNames: files.map((file) => file.id),
          state: null,
        };

        let job$ = this.jobService.createJob(job);
        let jobId: string;
        return job$.pipe(
          filter(job => !!job.id),
          take(1),
          flatMap(job => {
            jobId = job.id;
            let dialogConfig: JobProgressDialogConfig = {
              title: 'Preparing download',
              message: `Please wait while we prepare the files for download.`,
              progressMode: 'indeterminate',
              job$: job$,
            };
            let dialogRef = this.dialog.open(JobProgressDialogComponent, {
              width: '400px',
              data: dialogConfig,
              disableClose: true,
            });

            return dialogRef.afterClosed()
          }),
          flatMap(result => {
            if (!result) {
              //TODO cancel job
              return of(null);
            }

            return combineLatest([of(filename), this.jobApiService.getJobResultFile(jobId, 'download')]);
          })
        )
      })
    ).subscribe(
      result => {
        if (result) {
          let [filename, data] = result;
          saveAs(data, filename);
        }
      },
      error => {

      },
      () => {

      }
    )
  }

  onSplitSelectedFileListItemsBtnClick() {
    this.afterLibrarySync()
      .pipe(
        flatMap(({ dataProviderEntities, fileEntities }) => {
          let selectedFileIds = this.store.selectSnapshot(WorkbenchState.getSelectedFilteredFileIds);
          let files = selectedFileIds.map((id) => fileEntities[id]).filter((file) => file.layerIds.length > 1);
          if (files.length == 0) {
            let dialogConfig: Partial<AlertDialogConfig> = {
              title: 'Error',
              message: `None of the selected files contain multiple layers.`,
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
            message: `Are you sure you want to split the layers within each selected file into separate single-layer files?`,
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
              let viewers = this.store.selectSnapshot(WorkbenchState.getViewers);
              let reqs: Observable<any>[] = [];
              files.forEach((file) => {
                file.layerIds.forEach((layerId, index) => {
                  let layer = this.store.selectSnapshot(DataFilesState.getLayerEntities)[layerId];
                  let uuid = UUID.UUID();
                  let newFilename = file.name + '_' + index;
                  viewers
                    .filter((viewer) => viewer.layerId == layerId || viewer.fileId == layer.fileId)
                    .forEach((viewer) => this.store.dispatch(new CloseViewer(viewer.id)));
                  this.store.dispatch(new InvalidateHeader(layerId));
                  let name = layer && layer.name ? layer.name : `${file.name}_${index}`
                  reqs.push(
                    this.dataFileService.updateFile(layerId, {
                      groupName: name,
                      name: name,
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
          let selectedFileIds = this.store.selectSnapshot(WorkbenchState.getSelectedFilteredFileIds);
          let files = selectedFileIds.map((id) => fileEntities[id]);
          let layerCount = 0;
          files.forEach((file) => (layerCount += file.layerIds.length));

          if (layerCount > 10) {
            let dialogConfig: Partial<AlertDialogConfig> = {
              title: 'Error',
              message: `The number of layers within a file is currently limited to no more than ten.  Please reduce the number of layers and try grouping again.`,
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
            message: `Are you sure you want to group the selected files into a single file with multiple layers?`,
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

              let extensions = files.map((file) => file.name.slice((file.name.lastIndexOf(".") - 1 >>> 0) + 2)).filter(v => v.length != 0)
              let newFilenameBase = getLongestCommonStartingSubstring(files.map((file) => file.name))
                .replace(/_+$/, '')
                .trim();
              if (newFilenameBase.length == 0) {
                newFilenameBase = `${files[0].name} - group`;
              }

              newFilenameBase = newFilenameBase.replace(/[ ,\.-]+$/, "");
              let newFilenameExtension = '';
              if (extensions.length != 0) {
                newFilenameExtension = `.${extensions[0]}`
              }

              let newFilename = `${newFilenameBase}${newFilenameExtension}`
              let index = 1;
              while (this.store.selectSnapshot(DataFilesState.getFiles).find(file => file.name == newFilename)) {
                newFilename = `${newFilenameBase}-${this.decimalPipe.transform(index++, '3.0-0')}${newFilenameExtension}`
              }


              let path = files.map(f => f.assetPath).find(p => p && p.length != 0)
              if (path) {
                let pathItems = path.split('/')
                pathItems[pathItems.length - 1] = newFilename
                path = pathItems.join('/')
              }
              path = path || null;

              let dataProvider = files.map(f => f.dataProviderId).find(dp => dp !== null) || null


              let viewers = this.store.selectSnapshot(WorkbenchState.getViewers);
              let uuid = UUID.UUID();
              let reqs: Observable<any>[] = [];
              files.forEach((file, order) => {
                file.layerIds.forEach((layerId) => {
                  let layer = this.store.selectSnapshot(DataFilesState.getLayerEntities)[layerId];
                  viewers
                    .filter((viewer) => viewer.layerId == layerId || viewer.fileId == layer.fileId)
                    .forEach((viewer) => this.store.dispatch(new CloseViewer(viewer.id)));
                  this.store.dispatch(new InvalidateHeader(layerId));
                  this.store.dispatch(new SetFileSelection([]));
                  reqs.push(
                    this.dataFileService.updateFile(layerId, {
                      groupName: newFilename,
                      name: layer.name,
                      dataProvider: dataProvider,
                      assetPath: path,
                      modified: true,
                      groupOrder: order
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
      new Navigate([], { tool: targetTool }, { relativeTo: this.activeRoute, queryParamsHandling: 'merge' })
    );
  }

  getToolbarTooltip(isActive: boolean, base: string) {
    let showToolPanel = this.store.selectSnapshot(WorkbenchState.getShowConfig);
    return (showToolPanel && isActive ? 'Hide ' : 'Show ') + base;
  }

  onViewerSyncEnabledChange($event: MatSlideToggleChange) {
    this.store.dispatch(new SetViewerSyncEnabled($event.checked));
  }

  onViewerSyncModeChange($event: MatButtonToggleChange) {
    this.store.dispatch(new SetViewerSyncMode($event.value));
  }

  onNormalizationSyncEnabledChange($event: MatSlideToggleChange) {
    this.store.dispatch(new SetNormalizationSyncEnabled($event.checked));
  }

  splitViewerPanel(viewer: IViewer, direction: 'up' | 'down' | 'left' | 'right' = 'right') {
    this.store.dispatch(new SplitViewerPanel(viewer.id, direction));
  }

  handleFileFilterInputChange($event: Event) {
    this.fileFilterInput$.next(($event.target as HTMLInputElement).value);
  }
}
