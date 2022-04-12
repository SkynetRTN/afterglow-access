import {
  State,
  Action,
  Selector,
  StateContext,
  Store,
  Actions,
  ofActionDispatched,
  ofActionSuccessful,
  ofActionErrored,
  ofActionCompleted,
  ofActionCanceled,
  createSelector,
  ofAction,
} from '@ngxs/store';
import { tap, catchError, filter, take, takeUntil, flatMap, map, startWith, debounceTime, delay } from 'rxjs/operators';
import { Point, Matrix, Rectangle } from 'paper';
import { combineLatest, merge, Observable, of } from 'rxjs';
import {
  WorkbenchStateModel,
  WorkbenchTool,
  ViewerPanel,
  ViewerPanelContainer,
  WcsCalibrationSettings,
  ViewerLayoutItem,
  KernelFilter,
  SIZE_KERNELS,
  SIGMA_KERNELS,
} from './models/workbench-state';
import { ViewMode } from './models/view-mode';
import { SidebarView } from './models/sidebar-view';
import {
  LoadLibrarySuccess,
  LoadLibrary,
  LoadHdu,
  CloseHduSuccess,
  CloseDataFile,
  CenterRegionInViewport,
  LoadHduHeaderSuccess,
  CloseDataFileSuccess,
  UpdateTransform,
  UpdateNormalizer,
  InvalidateRawImageTiles,
  LoadHduHeader,
  InvalidateHeader,
  UpdateHduHeader,
  InvalidateNormalizedImageTiles,
  UpdateNormalizerSuccess,
  UpdateColorMap,
} from '../data-files/data-files.actions';
import {
  SelectFile,
  RemoveViewerLayoutItem,
  SetFocusedViewer,
  SetViewerData as SetViewerFile,
  SyncPlottingPanelStates,
  SetViewerSyncEnabled,
  LoadCatalogs,
  LoadCatalogsSuccess,
  LoadCatalogsFail,
  LoadFieldCals,
  LoadFieldCalsSuccess,
  LoadFieldCalsFail,
  CreateFieldCal,
  CreateFieldCalSuccess,
  CreateFieldCalFail,
  UpdateFieldCal,
  UpdateFieldCalSuccess,
  UpdateFieldCalFail,
  AddFieldCalSourcesFromCatalog,
  CreatePixelOpsJob,
  CreateAdvPixelOpsJob,
  CreateAlignmentJob,
  CreateStackingJob,
  ImportFromSurvey,
  ImportFromSurveySuccess,
  SetViewMode,
  ToggleFullScreen,
  SetFullScreen,
  SetFullScreenPanel,
  SetSidebarView,
  ShowSidebar,
  HideSidebar,
  SetNormalizationSyncEnabled,
  SetShowConfig,
  ToggleShowConfig,
  SetActiveTool,
  UpdateCentroidSettings,
  UpdatePlottingPanelConfig,
  UpdatePhotometrySettings,
  UpdateSourceExtractionSettings,
  SetSelectedCatalog,
  SetSelectedFieldCal,
  CloseSidenav,
  OpenSidenav,
  UpdateCustomMarkerPanelConfig,
  UpdatePhotometryPanelConfig,
  ExtractSources,
  ExtractSourcesFail,
  SetViewerMarkers,
  UpdatePixelOpsPageSettings as UpdatePixelOpsPanelConfig,
  UpdateStackingPanelConfig,
  UpdateAligningPanelConfig,
  ClearViewerMarkers,
  CreateViewer,
  CloseViewer,
  KeepViewerOpen,
  SplitViewerPanel,
  UpdateFileInfoPanelConfig,
  MoveViewer,
  Initialize,
  UpdateCurrentViewportSize,
  AddRegionToHistory,
  UndoRegionSelection,
  RedoRegionSelection,
  UpdatePhotometryFileState,
  InitializeWorkbenchHduState,
  StartLine,
  UpdateLine,
  UpdatePlottingPanelState,
  UpdateSonifierFileState,
  ClearRegionHistory,
  SetProgressLine,
  SonificationRegionChanged,
  UpdateCustomMarker,
  AddCustomMarkers,
  RemoveCustomMarkers,
  SelectCustomMarkers,
  DeselectCustomMarkers,
  SetCustomMarkerSelection,
  AddPhotDatas,
  RemovePhotDatasByHduId,
  RemovePhotDatasBySourceId,
  Sonify,
  ClearSonification,
  SyncViewerTransformations,
  SetViewerSyncMode,
  SyncViewerNormalizations,
  ToggleFileSelection,
  SetFileSelection,
  SetFileListFilter,
  InitializeWorkbenchFileState,
  UpdateWcsCalibrationPanelState,
  UpdateWcsCalibrationSettings,
  CreateWcsCalibrationJob,
  ImportFromSurveyFail,
  UpdatePhotometrySourceSelectionRegion,
  EndPhotometrySourceSelectionRegion,
  SonificationCompleted,
  UpdateCustomMarkerSelectionRegion,
  EndCustomMarkerSelectionRegion,
  UpdateSettings,
  UpdateCalibrationSettings,
  InvalidateAutoCalByHduId,
  InvalidateAutoPhotByHduId,
  UpdateAutoPhotometry,
  UpdateAutoFieldCalibration,
  BatchPhotometerSources,
  SyncAfterglowHeaders,
} from './workbench.actions';
import {
  getWidth,
  getHeight,
  getSourceCoordinates,
  DataFile,
  ImageHdu,
  IHdu,
  Header,
  PixelType,
  hasOverlap,
  TableHdu,
  isImageHdu,
} from '../data-files/models/data-file';

import { AfterglowCatalogService } from './services/afterglow-catalogs';
import { AfterglowFieldCalService } from './services/afterglow-field-cals';
import { CorrelationIdGenerator } from '../utils/correlated-action';
import { CancelJob, CreateJob, CreateJobFail, CreateJobSuccess, UpdateJobState } from '../jobs/jobs.actions';
import { PixelOpsJob, PixelOpsJobResult } from '../jobs/models/pixel-ops';
import { JobType } from '../jobs/models/job-types';
import { AlignmentJob, AlignmentJobResult } from '../jobs/models/alignment';
import { WcsCalibrationJob, WcsCalibrationJobResult, WcsCalibrationJobSettings } from '../jobs/models/wcs_calibration';
import { StackingJob, StackingJobResult } from '../jobs/models/stacking';
import { ImportAssetsCompleted, ImportAssets } from '../data-providers/data-providers.actions';
import { ImmutableContext } from '@ngxs-labs/immer-adapter';
import { PosType, Source } from './models/source';
import { MarkerType, LineMarker, RectangleMarker, CircleMarker } from './models/marker';
import { SonificationPanelState, SonifierRegionMode } from './models/sonifier-file-state';
import { SourcesState, SourcesStateModel } from './sources.state';
import {
  SourceExtractionJobSettings,
  SourceExtractionJob,
  SourceExtractionJobResult,
} from '../jobs/models/source-extraction';
import { JobsState } from '../jobs/jobs.state';
import { AddSources, RemoveSources } from './sources.actions';
import { PhotometryJob, PhotometryJobSettings, PhotometryJobResult, PhotometryData } from '../jobs/models/photometry';
import { Astrometry } from '../jobs/models/astrometry';
import { SourceId } from '../jobs/models/source-id';
import { PhotData } from './models/source-phot-data';
import { IViewer, ImageViewer, TableViewer, ViewerType, Viewer } from './models/viewer';
import { ResetState } from '../auth/auth.actions';
import {
  WorkbenchImageHduState,
  WorkbenchTableHduState,
  WorkbenchFileState,
  IWorkbenchState,
  WorkbenchStateType,
} from './models/workbench-file-state';
import { DataFilesState, DataFilesStateModel } from '../data-files/data-files.state';
import { HduType } from '../data-files/models/data-file-type';
import {
  getViewportRegion,
  Transform,
  getImageToViewportTransform,
  appendTransform,
  matrixToTransform,
} from '../data-files/models/transformation';
import { SonificationJob, SonificationJobResult, SonificationJobSettings } from '../jobs/models/sonification';
import { IImageData } from '../data-files/models/image-data';
import { MatDialog } from '@angular/material/dialog';
import { AlertDialogConfig, AlertDialogComponent } from '../utils/alert-dialog/alert-dialog.component';
import { wildcardToRegExp } from '../utils/regex';
import { Normalization } from '../data-files/models/normalization';
import { PixelNormalizer } from '../data-files/models/pixel-normalizer';
import { getLongestCommonStartingSubstring, isNotEmpty } from '../utils/utils';
import { Injectable } from '@angular/core';
import * as deepEqual from 'fast-deep-equal';
import { CustomMarkerPanelState } from './models/marker-file-state';
import { PlottingPanelState } from './models/plotter-file-state';
import { PhotometryPanelState } from './models/photometry-file-state';
import { GlobalSettings, defaults as defaultGlobalSettings, toPhotometryJobSettings, toSourceExtractionJobSettings, toFieldCalibration } from './models/global-settings';
import { getCoreApiUrl } from '../afterglow-config';
import { AfterglowConfigService } from '../afterglow-config.service';
import { FieldCalibrationJob, FieldCalibrationJobResult } from '../jobs/models/field-calibration';
import { parseDms } from '../utils/skynet-astro';
import { HeaderEntry } from '../data-files/models/header-entry';
import { AfterglowHeaderKey } from '../data-files/models/afterglow-header-key';
import { I } from '@angular/cdk/keycodes';
import { AfterglowDataFileService } from './services/afterglow-data-files';

const workbenchStateDefaults: WorkbenchStateModel = {
  version: 'b079125e-48ae-4fbe-bdd7-cad5796a8614',
  showSideNav: false,
  inFullScreenMode: false,
  fullScreenPanel: 'file',
  activeTool: WorkbenchTool.VIEWER,
  viewMode: ViewMode.SPLIT_VERTICAL,
  nextViewerIdSeed: 0,
  nextViewerPanelIdSeed: 0,
  nextViewerPanelContainerIdSeed: 0,
  rootViewerPanelContainerId: 'ROOT_CONTAINER',
  viewerIds: [],
  viewers: {},
  viewerLayoutItemIds: ['ROOT_CONTAINER'],
  viewerLayoutItems: {
    ROOT_CONTAINER: {
      id: 'ROOT_CONTAINER',
      type: 'container',
      direction: 'row',
      itemIds: [],
    } as ViewerPanelContainer,
  },
  selectedFileIds: [],
  fileListFilter: '',
  focusedViewerPanelId: '',
  viewerSyncEnabled: false,
  viewerSyncMode: 'sky',
  normalizationSyncEnabled: false,
  sidebarView: SidebarView.FILES,
  showSidebar: true,
  showConfig: true,
  settings: { ...defaultGlobalSettings },
  fileInfoPanelConfig: {
    showRawHeader: false,
    useSystemTime: false,
  },
  customMarkerPanelConfig: {
    centroidClicks: false,
    usePlanetCentroiding: false,
  },
  plottingPanelConfig: {
    interpolatePixels: false,
    centroidClicks: false,
    planetCentroiding: false,
    plotterSyncEnabled: false,
    plotMode: '1D',
  },
  photometryPanelConfig: {
    showSourceLabels: false,
    showSourceMarkers: true,
    showSourceApertures: true,
    centroidClicks: true,
    showSourcesFromAllFiles: true,
    selectedSourceIds: [],
    coordMode: 'sky',
    batchPhotFormData: {
      selectedHduIds: [],
    },
    batchInProgress: false,
    batchPhotJobId: '',
    batchCalJobId: '',
  },
  pixelOpsPanelConfig: {
    currentPixelOpsJobId: '',
    showCurrentPixelOpsJobState: true,
    pixelOpsFormData: {
      operand: '+',
      mode: 'image',
      selectedHduIds: [],
      auxHduId: '',
      auxHduIds: [],
      primaryHduIds: [],
      scalarValue: 1,
      inPlace: false,
      opString: '',
      kernelFilter: KernelFilter.MEDIAN_FILTER,
      kernelSize: 3,
      kernelSigma: 3
    },
  },
  aligningPanelConfig: {
    alignFormData: {
      selectedHduIds: [],
      refHduId: '',
      mode: 'astrometric',
      crop: true,
    },
    currentAlignmentJobId: '',
  },
  stackingPanelConfig: {
    stackFormData: {
      selectedHduIds: [],
      mode: 'average',
      scaling: 'none',
      rejection: 'none',
      percentile: 50,
      low: 0,
      high: 0,
    },
    currentStackingJobId: '',
  },
  wcsCalibrationPanelState: {
    selectedHduIds: [],
    activeJobId: '',
  },
  wcsCalibrationSettings: {
    minScale: 0.1,
    maxScale: 10,
    radius: 1,
    maxSources: 100,
  },
  catalogs: [],
  selectedCatalogId: '',
  fieldCals: [],
  selectedFieldCalId: '',
  addFieldCalSourcesFromCatalogJobId: '',
  creatingAddFieldCalSourcesFromCatalogJob: false,
  addFieldCalSourcesFromCatalogFieldCalId: '',
  dssImportLoading: false,

  fileIdToWorkbenchStateIdMap: {},
  hduIdToWorkbenchStateIdMap: {},
  nextWorkbenchStateId: 0,
  workbenchStateIds: [],
  workbenchStateEntities: {},
  nextCustomMarkerPanelStateId: 0,
  customMarkerPanelStateIds: [],
  customMarkerPanelStateEntities: {},
  nextPlottingPanelStateId: 0,
  plottingPanelStateEntities: {},
  plottingPanelStateIds: [],
  nextSonificationPanelStateId: 0,
  sonificationPanelStateEntities: {},
  sonificationPanelStateIds: [],
  nextPhotometryPanelStateId: 0,
  photometryPanelStateEntities: {},
  photometryPanelStateIds: [],
  nextMarkerId: 0,
};

@State<WorkbenchStateModel>({
  name: 'workbench',
  defaults: workbenchStateDefaults,
})
@Injectable()
export class WorkbenchState {
  protected viewerIdPrefix = 'VWR';

  constructor(
    private store: Store,
    private afterglowCatalogService: AfterglowCatalogService,
    private afterglowFieldCalService: AfterglowFieldCalService,
    private correlationIdGenerator: CorrelationIdGenerator,
    private actions$: Actions,
    private dialog: MatDialog,
    private config: AfterglowConfigService,
    private dataFileService: AfterglowDataFileService
  ) { }

  /** Root Selectors */
  @Selector()
  public static getState(state: WorkbenchStateModel) {
    return state;
  }

  @Selector()
  public static getFullScreenPanel(state: WorkbenchStateModel) {
    return state.fullScreenPanel;
  }

  @Selector()
  public static getInFullScreenMode(state: WorkbenchStateModel) {
    return state.inFullScreenMode;
  }

  @Selector()
  public static getFileListFilter(state: WorkbenchStateModel) {
    return state.fileListFilter;
  }

  @Selector()
  public static getSelectedFileIds(state: WorkbenchStateModel) {
    return state.selectedFileIds;
  }

  @Selector()
  public static getRootViewerPanelContainerId(state: WorkbenchStateModel) {
    return state.rootViewerPanelContainerId;
  }

  @Selector()
  public static getShowConfig(state: WorkbenchStateModel) {
    return state.showConfig;
  }

  @Selector()
  public static getShowSourceLabels(state: WorkbenchStateModel) {
    return state.photometryPanelConfig.showSourceLabels;
  }

  @Selector()
  public static getViewerSyncEnabled(state: WorkbenchStateModel) {
    return state.viewerSyncEnabled;
  }

  @Selector()
  public static getViewerSyncMode(state: WorkbenchStateModel) {
    return state.viewerSyncMode;
  }

  @Selector()
  public static getNormalizationSyncEnabled(state: WorkbenchStateModel) {
    return state.normalizationSyncEnabled;
  }

  @Selector()
  public static getDssImportLoading(state: WorkbenchStateModel) {
    return state.dssImportLoading;
  }

  @Selector()
  public static getCatalogs(state: WorkbenchStateModel) {
    return state.catalogs;
  }

  @Selector()
  public static getViewMode(state: WorkbenchStateModel) {
    return state.viewMode;
  }

  @Selector()
  public static getActiveTool(state: WorkbenchStateModel) {
    return state.activeTool;
  }

  @Selector()
  public static getShowSidebar(state: WorkbenchStateModel) {
    return state.showSidebar;
  }

  @Selector()
  public static getSidebarView(state: WorkbenchStateModel) {
    return state.sidebarView;
  }

  @Selector()
  public static getSettings(state: WorkbenchStateModel) {
    return state.settings;
  }

  @Selector([WorkbenchState.getSettings])
  public static getPhotometrySettings(settings: GlobalSettings) {
    return settings.photometry;
  }

  @Selector()
  public static getCalibrationSettings(state: WorkbenchStateModel) {
    return state.settings.calibration;
  }

  @Selector()
  public static getSourceExtractionSettings(state: WorkbenchStateModel) {
    return state.settings.sourceExtraction;
  }

  @Selector()
  public static getCentroidSettings(state: WorkbenchStateModel) {
    return state.settings.centroid;
  }

  @Selector()
  public static getCustomMarkerPanelConfig(state: WorkbenchStateModel) {
    return state.customMarkerPanelConfig;
  }

  @Selector()
  public static getFileInfoPanelConfig(state: WorkbenchStateModel) {
    return state.fileInfoPanelConfig;
  }

  @Selector()
  public static getPlottingPanelConfig(state: WorkbenchStateModel) {
    return state.plottingPanelConfig;
  }

  @Selector()
  public static getPhotometryPanelConfig(state: WorkbenchStateModel) {
    return state.photometryPanelConfig;
  }

  @Selector()
  public static getAligningPanelConfig(state: WorkbenchStateModel) {
    return state.aligningPanelConfig;
  }

  @Selector()
  public static getStackingPanelConfig(state: WorkbenchStateModel) {
    return state.stackingPanelConfig;
  }

  @Selector()
  public static getPixelOpsPanelConfig(state: WorkbenchStateModel) {
    return state.pixelOpsPanelConfig;
  }

  @Selector()
  public static getPhotometrySelectedSourceIds(state: WorkbenchStateModel) {
    return state.photometryPanelConfig.selectedSourceIds;
  }

  @Selector()
  public static getPhotometryCoordMode(state: WorkbenchStateModel) {
    return state.photometryPanelConfig.coordMode;
  }

  @Selector()
  public static getPhotometryShowSourcesFromAllFiles(state: WorkbenchStateModel) {
    return state.photometryPanelConfig.showSourcesFromAllFiles;
  }

  @Selector()
  public static getPhotometryShowSourceLabels(state: WorkbenchStateModel) {
    return state.photometryPanelConfig.showSourceLabels;
  }

  @Selector()
  public static getWcsCalibrationPanelState(state: WorkbenchStateModel) {
    return state.wcsCalibrationPanelState;
  }

  @Selector()
  public static getWcsCalibrationSettings(state: WorkbenchStateModel) {
    return state.wcsCalibrationSettings;
  }

  @Selector([WorkbenchState.getViewers])
  public static canSplit(viewers: Viewer[]) {
    return viewers && viewers.length > 1;
  }

  /** Entity Selectors
   *  TODO Reduce boilerplate code by using createSelector
   */

  @Selector()
  public static getViewerIds(state: WorkbenchStateModel) {
    return state.viewerIds;
  }

  @Selector()
  public static getViewerEntities(state: WorkbenchStateModel) {
    return state.viewers;
  }

  @Selector()
  public static getViewers(state: WorkbenchStateModel) {
    return Object.values(state.viewers);
  }

  public static getViewerById(id: string) {
    return createSelector([WorkbenchState.getViewerEntities], (viewerEntities: { [id: string]: Viewer }) => {
      return viewerEntities[id] || null;
    });
  }

  @Selector()
  public static getViewerLayoutItemIds(state: WorkbenchStateModel) {
    return state.viewerLayoutItemIds;
  }

  @Selector()
  public static getViewerLayoutItemEntities(state: WorkbenchStateModel) {
    return state.viewerLayoutItems;
  }

  @Selector()
  public static getViewerLayoutItems(state: WorkbenchStateModel) {
    return Object.values(state.viewerLayoutItems);
  }

  @Selector()
  public static getFileIdToWorkbenchStateIdMap(state: WorkbenchStateModel) {
    return state.fileIdToWorkbenchStateIdMap;
  }

  @Selector()
  public static getHduIdToWorkbenchStateIdMap(state: WorkbenchStateModel) {
    return state.hduIdToWorkbenchStateIdMap;
  }

  @Selector()
  public static getWorkbenchStateEntities(state: WorkbenchStateModel) {
    return state.workbenchStateEntities;
  }

  @Selector()
  public static getWorkbenchStateIds(state: WorkbenchStateModel) {
    return state.workbenchStateIds;
  }

  @Selector()
  public static getWorkbenchStates(state: WorkbenchStateModel) {
    return Object.values(state.workbenchStateEntities);
  }

  @Selector()
  public static getWorkbenchStateById(state: WorkbenchStateModel) {
    return (stateId: string) => {
      return state.workbenchStateEntities[stateId] || null;
    };
  }

  @Selector()
  public static getCustomMarkerPanelStateEntities(state: WorkbenchStateModel) {
    return state.customMarkerPanelStateEntities;
  }

  @Selector()
  public static getCustomMarkerPanelStateIds(state: WorkbenchStateModel) {
    return state.customMarkerPanelStateIds;
  }

  @Selector()
  public static getCustomMarkerPanelStates(state: WorkbenchStateModel) {
    return Object.values(state.customMarkerPanelStateEntities);
  }

  @Selector([WorkbenchState.getCustomMarkerPanelStateEntities])
  public static getCustomMarkerPanelStateById(entities: { [id: string]: CustomMarkerPanelState }) {
    return (customMarkerPanelStateId: string) => {
      return entities[customMarkerPanelStateId];
    };
  }

  @Selector()
  public static getPlottingPanelStateEntities(state: WorkbenchStateModel) {
    return state.plottingPanelStateEntities;
  }

  @Selector()
  public static getPlottingPanelStateIds(state: WorkbenchStateModel) {
    return state.plottingPanelStateIds;
  }

  @Selector()
  public static getPlottingPanelStates(state: WorkbenchStateModel) {
    return Object.values(state.plottingPanelStateEntities);
  }

  @Selector([WorkbenchState.getPlottingPanelStateEntities])
  public static getPlottingPanelStateById(entities: { [id: string]: PlottingPanelState }) {
    return (plottingPanelStateId: string) => {
      return entities[plottingPanelStateId];
    };
  }

  @Selector()
  public static getSonificationPanelStateEntities(state: WorkbenchStateModel) {
    return state.sonificationPanelStateEntities;
  }

  @Selector()
  public static getSonificationPanelStateIds(state: WorkbenchStateModel) {
    return state.sonificationPanelStateIds;
  }

  @Selector()
  public static getSonificationPanelStates(state: WorkbenchStateModel) {
    return Object.values(state.sonificationPanelStateEntities);
  }

  static getSonificationPanelStateIdByHduId(hduId: string) {
    return createSelector(
      [WorkbenchState.getHduIdToWorkbenchStateIdMap, WorkbenchState.getWorkbenchStateEntities],
      (
        hduIdToWorkbenchStateId: { [id: string]: string },
        workbenchStateEntities: { [id: string]: IWorkbenchState }
      ) => {
        return (workbenchStateEntities[hduIdToWorkbenchStateId[hduId]] as WorkbenchImageHduState)?.sonificationPanelStateId || null;
      }
    );
  }

  static getSonificationPanelStateByHduId(hduId: string) {
    return createSelector(
      [WorkbenchState.getSonificationPanelStateIdByHduId(hduId), WorkbenchState.getSonificationPanelStateEntities],
      (
        stateId: string,
        sonificationStateEntities: { [id: string]: SonificationPanelState }
      ) => {
        return sonificationStateEntities[stateId] || null;
      }
    );
  }

  @Selector([WorkbenchState.getSonificationPanelStateEntities])
  public static getSonificationPanelStateById(entities: { [id: string]: SonificationPanelState }) {
    return (sonificationPanelStateId: string) => {
      return entities[sonificationPanelStateId];
    };
  }

  @Selector()
  public static getPhotometryPanelStateEntities(state: WorkbenchStateModel) {
    return state.photometryPanelStateEntities;
  }

  @Selector()
  public static getPhotometryPanelStateIds(state: WorkbenchStateModel) {
    return state.photometryPanelStateIds;
  }

  @Selector()
  public static getPhotometryPanelStates(state: WorkbenchStateModel) {
    return Object.values(state.photometryPanelStateEntities);
  }

  @Selector([WorkbenchState.getPhotometryPanelStateEntities])
  public static getPhotometryPanelStateById(entities: { [id: string]: PhotometryPanelState }) {
    return (photometryPanelStateId: string) => {
      return entities[photometryPanelStateId];
    };
  }

  /** File Filtering and Selection
   *
   */

  @Selector([DataFilesState.getFiles, WorkbenchState.getFileListFilter])
  public static getFilteredFiles(files: DataFile[], fileListFilter: string) {
    if (!files || files.length == 0) return [];
    if (!fileListFilter) return files;
    let f = fileListFilter;
    let regex = wildcardToRegExp('*' + fileListFilter.toLowerCase() + '*');
    return files
      .filter((file) => file.name.toLowerCase().match(regex))
      .sort((a, b) => {
        if (a.name < b.name) {
          return -1;
        }
        if (a.name > b.name) {
          return 1;
        }
        return 0;
      });
  }

  @Selector([WorkbenchState.getFilteredFiles])
  public static getFilteredFileIds(files: DataFile[]) {
    return files.map((file) => file.id);
  }

  @Selector([WorkbenchState.getFilteredFiles])
  public static getFilteredHduIds(files: DataFile[]) {
    let result: string[] = [];
    return files.reduce((hduIds, file, index) => hduIds.concat(file.hduIds), result);
  }

  @Selector([WorkbenchState.getFilteredFiles, WorkbenchState.getSelectedFileIds])
  public static getSelectedFilteredFileIds(filteredFiles: DataFile[], selectedFileIds: string[]) {
    let filteredFileIds = filteredFiles.map((f) => f.id);
    return selectedFileIds.filter((id) => filteredFileIds.includes(id));
  }

  public static getFileSelected(id: string) {
    return createSelector([WorkbenchState.getSelectedFileIds], (selectedFileIds: string[]) => {
      return selectedFileIds.includes(id);
    });
  }

  @Selector([WorkbenchState.getFilteredFiles, WorkbenchState.getSelectedFileIds])
  public static getSelectAllFilesCheckboxState(filteredFiles: DataFile[], selectedFileIds: string[]) {
    return filteredFiles.length != 0 && selectedFileIds.length == filteredFiles.length;
  }

  @Selector([WorkbenchState.getFilteredFiles, WorkbenchState.getSelectedFileIds])
  public static getSelectAllFilesCheckboxIndeterminate(filteredFiles: DataFile[], selectedFileIds: string[]) {
    return selectedFileIds.length != 0 && selectedFileIds.length != filteredFiles.length;
  }

  /** Viewer/Panel Layout
   *
   */

  @Selector([WorkbenchState.getViewerLayoutItems])
  public static getViewerPanels(viewerLayoutItems: ViewerLayoutItem[]) {
    return viewerLayoutItems.filter((item) => item.type == 'panel') as ViewerPanel[];
  }

  @Selector([WorkbenchState.getViewerPanels])
  public static getViewerPanelIds(viewerPanels: ViewerPanel[]) {
    return viewerPanels.map((panel) => panel.id);
  }

  @Selector([WorkbenchState.getViewerPanelIds, WorkbenchState.getViewerLayoutItemEntities])
  public static getViewerPanelEntities(
    viewerPanelIds: string[],
    viewerLayoutItemEntities: { [id: string]: ViewerLayoutItem }
  ) {
    return viewerPanelIds.reduce((obj, key) => {
      return {
        ...obj,
        [key]: viewerLayoutItemEntities[key] as ViewerPanel,
      };
    }, {} as { [id: string]: ViewerPanel });
  }

  @Selector([WorkbenchState.getViewerLayoutItems])
  public static getViewerPanelContainers(viewerLayoutItems: ViewerLayoutItem[]) {
    return viewerLayoutItems.filter((item) => item.type == 'container') as ViewerPanelContainer[];
  }

  @Selector([WorkbenchState.getViewerPanelContainers])
  public static getViewerPanelContainerIds(viewerPanelContainers: ViewerPanelContainer[]) {
    return viewerPanelContainers.map((panel) => panel.id);
  }

  @Selector([WorkbenchState.getViewerPanelContainerIds, WorkbenchState.getViewerLayoutItemEntities])
  public static getViewerPanelContainerEntities(
    viewerPanelContainerIds: string[],
    viewerLayoutItemEntities: { [id: string]: ViewerLayoutItem }
  ) {
    return viewerPanelContainerIds.reduce((obj, key) => {
      return {
        ...obj,
        [key]: viewerLayoutItemEntities[key] as ViewerPanelContainer,
      };
    }, {} as { [id: string]: ViewerPanelContainer });
  }

  @Selector([WorkbenchState.getRootViewerPanelContainerId, WorkbenchState.getViewerLayoutItemEntities])
  public static getRootViewerPanelContainer(
    rootViewerPanelContainerId: string,
    viewerLayoutItemEntities: { [id: string]: ViewerLayoutItem }
  ) {
    return viewerLayoutItemEntities[rootViewerPanelContainerId] as ViewerPanelContainer;
  }

  @Selector()
  public static getFocusedViewerPanelId(state: WorkbenchStateModel) {
    return state.focusedViewerPanelId;
  }

  /** Workbench State */

  static getWorkbenchStateByHduId(hduId: string) {
    return createSelector(
      [WorkbenchState.getHduIdToWorkbenchStateIdMap, WorkbenchState.getWorkbenchStateEntities],
      (
        hduIdToWorkbenchStateId: { [id: string]: string },
        workbenchStateEntities: { [id: string]: IWorkbenchState }
      ) => {
        return workbenchStateEntities[hduIdToWorkbenchStateId[hduId]] || null;
      }
    );
  }

  static getWorkbenchStateByFileId(fileId: string) {
    return createSelector(
      [WorkbenchState.getFileIdToWorkbenchStateIdMap, WorkbenchState.getWorkbenchStateEntities],
      (
        fileIdToWorkbenchStateId: { [id: string]: string },
        workbenchStateEntities: { [id: string]: IWorkbenchState }
      ) => {
        return workbenchStateEntities[fileIdToWorkbenchStateId[fileId]] || null;
      }
    );
  }

  /** Viewer
   *
   */
  @Selector([WorkbenchState.getViewerPanelIds, WorkbenchState.getViewerLayoutItemEntities])
  public static getVisibleViewerIds(
    viewerPanelIds: string[],
    viewerLayoutItemEntities: { [id: string]: ViewerLayoutItem }
  ) {
    return viewerPanelIds
      .map((panelId) => (viewerLayoutItemEntities[panelId] as ViewerPanel).selectedViewerId)
      .filter((id) => id !== null);
  }

  public static getViewportSizeByViewerId(viewerId: string) {
    return createSelector([WorkbenchState.getViewerById(viewerId)], (viewer: Viewer) => {
      return viewer?.viewportSize;
    });
  }

  public static getFileByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getViewerById(viewerId), DataFilesState.getFileEntities],
      (viewer: Viewer, fileEntities: { [id: string]: DataFile }) => {
        return fileEntities[viewer?.fileId] || null;
      }
    );
  }

  public static getFileHdusByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getFileByViewerId(viewerId), DataFilesState.getHduEntities],
      (file: DataFile, hduEntities: { [id: string]: IHdu }) => {
        if (!file || !file.hduIds) return [];
        return file.hduIds.map((hduId) => hduEntities[hduId]).sort((a, b) => (a?.order > b?.order ? 1 : -1));
      }
    );
  }

  public static getHduByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getViewerById(viewerId), DataFilesState.getHduEntities],
      (viewer: Viewer, hduEntities: { [id: string]: IHdu }) => {
        return hduEntities[viewer?.hduId] || null;
      }
    );
  }

  public static getImageHduByViewerId(viewerId: string) {
    return createSelector([WorkbenchState.getHduByViewerId(viewerId)], (hdu: IHdu) => {
      return hdu?.type == HduType.IMAGE ? (hdu as ImageHdu) : null;
    });
  }

  public static getTableHduByViewerId(viewerId: string) {
    return createSelector([WorkbenchState.getHduByViewerId(viewerId)], (hdu: IHdu) => {
      return hdu?.type == HduType.TABLE ? (hdu as TableHdu) : null;
    });
  }

  public static getHduHeaderByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getHduByViewerId(viewerId), DataFilesState.getHeaderEntities],
      (hdu: IHdu, headerEntities: { [id: string]: Header }) => {
        return headerEntities[hdu?.headerId] || null;
      }
    );
  }

  public static getFileHeaderByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getFileHdusByViewerId(viewerId), DataFilesState.getHeaderEntities],
      (hdus: IHdu[], headerEntities: { [id: string]: Header }) => {
        return !hdus || hdus.length == 0 ? null : headerEntities[hdus[0]?.headerId];
      }
    );
  }

  public static getFileImageHeaderByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getFileHdusByViewerId(viewerId), DataFilesState.getHeaderEntities],
      (hdus: IHdu[], headerEntities: { [id: string]: Header }) => {
        hdus = hdus.filter((hdu) => hdu.type == HduType.IMAGE) as ImageHdu[];
        return !hdus || hdus.length == 0 ? null : headerEntities[hdus[0]?.headerId];
      }
    );
  }

  public static getFileTableHeaderByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getFileHdusByViewerId(viewerId), DataFilesState.getHeaderEntities],
      (hdus: IHdu[], headerEntities: { [id: string]: Header }) => {
        hdus = hdus.filter((hdu) => hdu.type == HduType.TABLE) as ImageHdu[];
        return !hdus || hdus.length == 0 ? null : headerEntities[hdus[0]?.headerId];
      }
    );
  }

  public static getHeaderByViewerId(viewerId: string) {
    return createSelector(
      [
        WorkbenchState.getViewerById(viewerId),
        WorkbenchState.getHduHeaderByViewerId(viewerId),
        WorkbenchState.getFileHeaderByViewerId,
      ],
      (viewer: Viewer, hduHeader: Header, fileHeader: Header) => {
        return viewer?.hduId ? hduHeader : fileHeader;
      }
    );
  }

  public static getRawImageDataByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getImageHduByViewerId(viewerId), DataFilesState.getImageDataEntities],
      (imageHdu: ImageHdu, imageDataEntities: { [id: string]: IImageData<PixelType> }) => {
        return imageDataEntities[imageHdu?.rawImageDataId] || null;
      }
    );
  }

  public static getHduNormalizedImageDataByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getImageHduByViewerId(viewerId), DataFilesState.getImageDataEntities],
      (imageHdu: ImageHdu, imageDataEntities: { [id: string]: IImageData<PixelType> }) => {
        return (imageDataEntities[imageHdu?.rgbaImageDataId] as IImageData<Uint32Array>) || null;
      }
    );
  }

  public static getFileNormalizedImageDataByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getFileByViewerId(viewerId), DataFilesState.getImageDataEntities],
      (file: DataFile, imageDataEntities: { [id: string]: IImageData<PixelType> }) => {
        return (imageDataEntities[file?.rgbaImageDataId] as IImageData<Uint32Array>) || null;
      }
    );
  }

  public static getNormalizedImageDataByViewerId(viewerId: string) {
    return createSelector(
      [
        WorkbenchState.getViewerById(viewerId),
        WorkbenchState.getHduNormalizedImageDataByViewerId(viewerId),
        WorkbenchState.getFileNormalizedImageDataByViewerId(viewerId),
      ],
      (viewer: Viewer, hduImageData: IImageData<PixelType>, fileImageData: IImageData<PixelType>) => {
        return (viewer?.hduId ? hduImageData : fileImageData) as IImageData<Uint32Array>;
      }
    );
  }

  public static getHduImageTransformByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getImageHduByViewerId(viewerId), DataFilesState.getTransformEntities],
      (imageHdu: ImageHdu, transformEntities: { [id: string]: Transform }) => {
        return transformEntities[imageHdu?.imageTransformId] || null;
      }
    );
  }

  public static getHduViewportTransformByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getImageHduByViewerId(viewerId), DataFilesState.getTransformEntities],
      (imageHdu: ImageHdu, transformEntities: { [id: string]: Transform }) => {
        return transformEntities[imageHdu?.viewportTransformId] || null;
      }
    );
  }

  public static getHduImageToViewportTransformByViewerId(viewerId: string) {
    return createSelector(
      [
        WorkbenchState.getHduImageTransformByViewerId(viewerId),
        WorkbenchState.getHduViewportTransformByViewerId(viewerId),
      ],
      (imageTransform: Transform, viewportTransform: Transform) => {
        return imageTransform && viewportTransform
          ? getImageToViewportTransform(viewportTransform, imageTransform)
          : null;
      }
    );
  }

  public static getFileImageTransformByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getFileByViewerId(viewerId), DataFilesState.getTransformEntities],
      (file: DataFile, transformEntities: { [id: string]: Transform }) => {
        return transformEntities[file?.imageTransformId] || null;
      }
    );
  }

  public static getFileViewportTransformByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getFileByViewerId(viewerId), DataFilesState.getTransformEntities],
      (file: DataFile, transformEntities: { [id: string]: Transform }) => {
        return transformEntities[file?.viewportTransformId] || null;
      }
    );
  }

  public static getFileImageToViewportTransformByViewerId(viewerId: string) {
    return createSelector(
      [
        WorkbenchState.getFileImageTransformByViewerId(viewerId),
        WorkbenchState.getFileViewportTransformByViewerId(viewerId),
      ],
      (imageTransform: Transform, viewportTransform: Transform) => {
        return imageTransform && viewportTransform
          ? getImageToViewportTransform(viewportTransform, imageTransform)
          : null;
      }
    );
  }

  public static getImageTransformByViewerId(viewerId: string) {
    return createSelector(
      [
        WorkbenchState.getViewerById(viewerId),
        WorkbenchState.getFileImageTransformByViewerId(viewerId),
        WorkbenchState.getHduImageTransformByViewerId(viewerId),
      ],
      (viewer: Viewer, fileImageTransform: Transform, hduImageTransform: Transform) => {
        return viewer?.hduId ? hduImageTransform : fileImageTransform;
      }
    );
  }

  public static getViewportTransformByViewerId(viewerId: string) {
    return createSelector(
      [
        WorkbenchState.getViewerById(viewerId),
        WorkbenchState.getFileViewportTransformByViewerId(viewerId),
        WorkbenchState.getHduViewportTransformByViewerId(viewerId),
      ],
      (viewer: Viewer, fileViewportTransform: Transform, hduViewportTransform: Transform) => {
        return viewer?.hduId ? hduViewportTransform : fileViewportTransform;
      }
    );
  }

  public static getImageToViewportTransformByViewerId(viewerId: string) {
    return createSelector(
      [
        WorkbenchState.getViewerById(viewerId),
        WorkbenchState.getFileImageToViewportTransformByViewerId(viewerId),
        WorkbenchState.getHduImageToViewportTransformByViewerId(viewerId),
      ],
      (viewer: Viewer, fileImageToViewportTransform: Transform, hduImageToViewportTransform: Transform) => {
        return viewer?.hduId ? hduImageToViewportTransform : fileImageToViewportTransform;
      }
    );
  }

  static getWorkbenchStateIdByViewerId(viewerId: string) {
    return createSelector(
      [
        WorkbenchState.getViewerEntities,
        WorkbenchState.getHduIdToWorkbenchStateIdMap,
        WorkbenchState.getFileIdToWorkbenchStateIdMap,
      ],
      (
        viewerEntities: { [id: string]: Viewer },
        hduIdToWorkbenchStateId: { [id: string]: string },
        fileIdToWorkbenchStateId: { [id: string]: string }
      ) => {
        let viewer = viewerEntities[viewerId];
        if (!viewer) return null;
        return viewer.hduId ? hduIdToWorkbenchStateId[viewer.hduId] : fileIdToWorkbenchStateId[viewer.fileId];
      }
    );
  }

  static getWorkbenchStateByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getWorkbenchStateIdByViewerId(viewerId), WorkbenchState.getWorkbenchStateEntities],
      (workbenchStateId: string, workbenchStateEntities: { [id: string]: IWorkbenchState }) => {
        return workbenchStateEntities[workbenchStateId] || null;
      }
    );
  }

  static getCustomMarkerPanelStateByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getWorkbenchStateByViewerId(viewerId), WorkbenchState.getCustomMarkerPanelStateEntities],
      (workbenchState: IWorkbenchState, customMarkerPanelStateEntities: { [id: string]: CustomMarkerPanelState }) => {
        if ([WorkbenchStateType.FILE, WorkbenchStateType.IMAGE_HDU].includes(workbenchState?.type)) {
          let s = workbenchState as WorkbenchFileState | WorkbenchImageHduState;
          return customMarkerPanelStateEntities[s.customMarkerPanelStateId] || null;
        } else {
          return null;
        }
      }
    );
  }

  static getPlottingPanelStateByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getWorkbenchStateByViewerId(viewerId), WorkbenchState.getPlottingPanelStateEntities],
      (workbenchState: IWorkbenchState, plottingPanelStateEntities: { [id: string]: PlottingPanelState }) => {
        if ([WorkbenchStateType.FILE, WorkbenchStateType.IMAGE_HDU].includes(workbenchState?.type)) {
          let s = workbenchState as WorkbenchFileState | WorkbenchImageHduState;
          return plottingPanelStateEntities[s.plottingPanelStateId] || null;
        } else {
          return null;
        }
      }
    );
  }

  static getSonificationPanelStateByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getWorkbenchStateByViewerId(viewerId), WorkbenchState.getSonificationPanelStateEntities],
      (workbenchState: IWorkbenchState, sonificationPanelStateEntities: { [id: string]: SonificationPanelState }) => {
        if ([WorkbenchStateType.IMAGE_HDU].includes(workbenchState?.type)) {
          let s = workbenchState as WorkbenchImageHduState;
          let result = sonificationPanelStateEntities[s.sonificationPanelStateId];
          return sonificationPanelStateEntities[s.sonificationPanelStateId] || null;
        } else {
          return null;
        }
      }
    );
  }

  static getPhotometryPanelStateByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getWorkbenchStateByViewerId(viewerId), WorkbenchState.getPhotometryPanelStateEntities],
      (workbenchState: IWorkbenchState, photometryPanelStateEntities: { [id: string]: PhotometryPanelState }) => {
        if ([WorkbenchStateType.IMAGE_HDU].includes(workbenchState?.type)) {
          let s = workbenchState as WorkbenchImageHduState;
          return photometryPanelStateEntities[s.photometryPanelStateId] || null;
        } else {
          return null;
        }
      }
    );
  }

  /** Focused Viewer */

  @Selector([WorkbenchState.getFocusedViewerPanelId, WorkbenchState.getViewerPanelEntities])
  public static getFocusedViewerId(focusedViewerPanelId: string, viewerPanelEntities: { [id: string]: ViewerPanel }) {
    return viewerPanelEntities[focusedViewerPanelId]
      ? viewerPanelEntities[focusedViewerPanelId].selectedViewerId
      : null;
  }

  @Selector([WorkbenchState.getFocusedViewerId, WorkbenchState.getViewerEntities])
  public static getFocusedViewer(focusedViewerId: string, viewerEntities: { [id: string]: Viewer }) {
    return viewerEntities[focusedViewerId] || null;
  }

  @Selector([WorkbenchState.getFocusedViewer])
  public static getFocusedImageViewer(focusedViewer: IViewer) {
    if (!focusedViewer || focusedViewer.type != ViewerType.IMAGE) return null;
    return focusedViewer as ImageViewer;
  }

  @Selector([WorkbenchState.getFocusedImageViewer])
  public static getFocusedImageViewerId(imageViewer: ImageViewer) {
    return imageViewer?.id;
  }

  @Selector([WorkbenchState.getFocusedViewer])
  public static getFocusedTableViewer(focusedViewer: IViewer) {
    if (!focusedViewer || focusedViewer.type != ViewerType.TABLE) return null;
    return focusedViewer as TableViewer;
  }

  @Selector([WorkbenchState.getFocusedTableViewer])
  public static getFocusedTableViewerId(tableViewer: TableViewer) {
    return tableViewer?.id;
  }

  @Selector([WorkbenchState.getFocusedViewer])
  public static getFocusedViewerFileId(focusedViewer: Viewer) {
    return focusedViewer?.fileId;
  }

  @Selector([WorkbenchState.getFocusedViewerFileId, DataFilesState.getFileEntities])
  public static getFocusedViewerFile(fileId: string, fileEntities: { [id: string]: DataFile }) {
    return fileEntities[fileId] || null;
  }

  @Selector([WorkbenchState.getFocusedViewer])
  public static getFocusedViewerHduId(focusedViewer: Viewer) {
    return focusedViewer?.hduId;
  }

  @Selector([WorkbenchState.getFocusedViewerHduId, DataFilesState.getHduEntities])
  public static getFocusedViewerHdu(hduId: string, hduEntities: { [id: string]: IHdu }) {
    return hduEntities[hduId] || null;
  }

  @Selector([WorkbenchState.getFocusedViewerHdu])
  public static getFocusedViewerImageHdu(focusedViewerHdu: IHdu) {
    if (!focusedViewerHdu || focusedViewerHdu.type != HduType.IMAGE) {
      return null;
    }
    return focusedViewerHdu as ImageHdu;
  }

  @Selector([WorkbenchState.getFocusedViewer])
  public static getFocusedViewerViewportSize(focusedViewer: IViewer) {
    if (!focusedViewer) return null;
    return focusedViewer.viewportSize;
  }

  @Action(Initialize)
  @ImmutableContext()
  public initialize({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { }: Initialize) {
    let state = getState();
    let dataFileEntities = this.store.selectSnapshot(DataFilesState.getFileEntities);
    let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);

    //load visible HDUs which were pulled from local storage
    let viewerEntities = state.viewers;
    let viewers = Object.values(this.store.selectSnapshot(WorkbenchState.getViewerPanelEntities))
      .map((panel) => panel.selectedViewerId)
      .filter((viewerId) => viewerId in viewerEntities)
      .map((viewerId) => viewerEntities[viewerId]);

    let hdus: IHdu[] = [];
    viewers.forEach((viewer) => {
      if (viewer.hduId) {
        if (viewer.hduId in hduEntities) {
          hdus.push(hduEntities[viewer.hduId]);
        }
      } else if (viewer.fileId && viewer.fileId in dataFileEntities) {
        hdus.push(...dataFileEntities[viewer.fileId].hduIds.map((hduId) => hduEntities[hduId]));
      }
    });

    let actions: Array<LoadHdu> = [];
    let headerEntities = this.store.selectSnapshot(DataFilesState.getHeaderEntities);
    hdus.forEach((hdu) => {
      let header = headerEntities[hdu.headerId];
      if (!header || (header.loaded && header.isValid) || header.loading) return;

      actions.push(new LoadHdu(hdu.id));
    });

    this.store.dispatch(actions);
  }

  @Action(ResetState)
  @ImmutableContext()
  public resetState({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { }: ResetState) {
    setState((state: WorkbenchStateModel) => {
      return workbenchStateDefaults;
    });
  }

  @Action(ToggleFullScreen)
  @ImmutableContext()
  public toggleFullScreen({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { }: ToggleFullScreen) {
    setState((state: WorkbenchStateModel) => {
      state.inFullScreenMode = !state.inFullScreenMode;
      return state;
    });
  }

  @Action(SetFullScreen)
  @ImmutableContext()
  public setFullScreen({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { value }: SetFullScreen) {
    setState((state: WorkbenchStateModel) => {
      state.inFullScreenMode = value;
      return state;
    });
  }

  @Action(SetFullScreenPanel)
  @ImmutableContext()
  public setFullScreenPanel(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { panel }: SetFullScreenPanel
  ) {
    setState((state: WorkbenchStateModel) => {
      state.fullScreenPanel = panel;
      return state;
    });
  }

  @Action(SetSidebarView)
  @ImmutableContext()
  public setSidebarView(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { sidebarView }: SetSidebarView
  ) {
    setState((state: WorkbenchStateModel) => {
      let showSidebar = true;
      if (sidebarView == state.sidebarView) {
        showSidebar = !state.showSidebar;
      }
      state.sidebarView = sidebarView;
      state.showSidebar = showSidebar;
      return state;
    });
  }

  @Action(ShowSidebar)
  @ImmutableContext()
  public showSidebar({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { }: ShowSidebar) {
    setState((state: WorkbenchStateModel) => {
      state.showSidebar = true;
      return state;
    });
  }

  @Action(HideSidebar)
  @ImmutableContext()
  public hideSidebar({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { }: HideSidebar) {
    setState((state: WorkbenchStateModel) => {
      state.showSidebar = false;
      return state;
    });
  }

  @Action(SetFocusedViewer)
  @ImmutableContext()
  public setFocusedViewer(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { viewerId }: SetFocusedViewer
  ) {
    let state = getState();
    let fileEntities = this.store.selectSnapshot(DataFilesState.getFileEntities);
    let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
    let panel = Object.values(state.viewerLayoutItems).find((p) => {
      return p.type == 'panel' && (p as ViewerPanel).viewerIds.includes(viewerId);
    }) as ViewerPanel;
    if (!panel) {
      return null;
    }
    let viewer = state.viewers[viewerId];
    if (!viewer) {
      return null;
    }

    let refViewer = this.store.selectSnapshot(WorkbenchState.getFocusedViewer);
    let refImageTransform: Transform;
    let refViewportTransform: Transform;
    let refHeader: Header;
    let refNormalization: PixelNormalizer;
    let refImageDataId: string;

    if (refViewer) {
      refViewportTransform = this.store.selectSnapshot(WorkbenchState.getViewportTransformByViewerId(refViewer.id));
      refImageTransform = this.store.selectSnapshot(WorkbenchState.getImageTransformByViewerId(refViewer.id));
      refHeader = this.store.selectSnapshot(WorkbenchState.getHeaderByViewerId(refViewer.id));
      refImageDataId = this.store.selectSnapshot(WorkbenchState.getRawImageDataByViewerId(refViewer.id))?.id;

      if (refViewer.hduId) {
        let refHdu = hduEntities[refViewer.hduId] as ImageHdu;
        if (refHdu.type == HduType.IMAGE) {
          refNormalization = refHdu.normalizer;
        }
      }
    }

    setState((state: WorkbenchStateModel) => {
      state.focusedViewerPanelId = panel.id;
      (state.viewerLayoutItems[panel.id] as ViewerPanel).selectedViewerId = viewer.id;
      return state;
    });

    function onLoadComplete(store: Store) {
      //normalization
      if (refHeader && refImageTransform && refViewportTransform) {
        // ensure that the new file/hdu is synced to what was previously in the viewer
        if (state.viewerSyncEnabled) {
          store.dispatch(
            new SyncViewerTransformations(refHeader.id, refImageTransform.id, refViewportTransform.id, refImageDataId, refViewer)
          );
        }
      }

      if (refNormalization && state.normalizationSyncEnabled) {
        store.dispatch(new SyncViewerNormalizations(refNormalization));
      }
      return dispatch([]);
    }

    let hduIds = viewer.hduId ? [viewer.hduId] : fileEntities[viewer.fileId].hduIds;
    let actions = hduIds.map((hduId) => new LoadHdu(hduId));

    if (actions.length == 0) {
      return onLoadComplete(this.store);
    }

    return dispatch(actions).pipe(
      take(1),
      flatMap((action) => onLoadComplete(this.store))
    );
  }

  @Action(CreateViewer)
  @ImmutableContext()
  public createViewer(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { viewer, panelId }: CreateViewer
  ) {
    setState((state: WorkbenchStateModel) => {
      let id = this.viewerIdPrefix + state.nextViewerIdSeed++;
      state.viewers[id] = {
        ...viewer,
        id: id,
      };
      state.viewerIds.push(id);

      if (
        panelId == null ||
        !state.viewerLayoutItemIds.includes(panelId) ||
        state.viewerLayoutItems[panelId].type != 'panel'
      ) {
        //if a valid panel ID was not provided
        let panelIds = state.viewerLayoutItemIds.filter((id) => state.viewerLayoutItems[id].type == 'panel');
        if (panelIds.length == 0) {
          //if no panels exist, create a new panel
          panelId = `PANEL_${state.nextViewerPanelIdSeed++}`;
          state.viewerLayoutItemIds.push(panelId);
          state.viewerLayoutItems[panelId] = {
            id: panelId,
            type: 'panel',
            selectedViewerId: '',
            viewerIds: [],
          } as ViewerPanel;

          //add panel to layout
          let rootContainer = state.viewerLayoutItems[state.rootViewerPanelContainerId] as ViewerPanelContainer;
          rootContainer.itemIds.push(panelId);
        } else {
          // use currently focused panel
          if (!state.focusedViewerPanelId) {
            state.focusedViewerPanelId = panelIds[0];
          }
          panelId = state.viewerLayoutItems[state.focusedViewerPanelId].id;
        }
      }

      if (state.viewerLayoutItemIds.includes(panelId)) {
        let panel = state.viewerLayoutItems[panelId] as ViewerPanel;
        panel.viewerIds.push(id);
        // if the new viewer is selected before the viewer's file is set
        // the SetViewerFile action will not be successful at syncing plotting, normalization, and transformations
        // panel.selectedViewerId = id;
      }
      if (viewer.fileId || viewer.hduId) {
        dispatch(new SetFocusedViewer(id));
      }

      return state;
    });
  }

  @Action(RemoveViewerLayoutItem)
  @ImmutableContext()
  public removeViewerLayoutItem(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { viewerLayoutItemId }: RemoveViewerLayoutItem
  ) {
    setState((state: WorkbenchStateModel) => {
      let containers = state.viewerLayoutItemIds
        .filter((itemId) => state.viewerLayoutItems[itemId].type == 'container')
        .map((panelId) => state.viewerLayoutItems[panelId] as ViewerPanelContainer);

      let panels = state.viewerLayoutItemIds
        .filter((itemId) => state.viewerLayoutItems[itemId].type == 'panel')
        .map((panelId) => state.viewerLayoutItems[panelId] as ViewerPanelContainer);

      if (viewerLayoutItemId in state.viewerLayoutItems) {
        // if valid viewer layout item id
        if (state.viewerLayoutItems[viewerLayoutItemId].type == 'container') {
          // container
          if (viewerLayoutItemId == state.rootViewerPanelContainerId) {
            //can't remove root
            return state;
          }

          // TODO: handle non-empty containers
        } else {
          // panel
          //TODO: handle panels with viewers

          if (state.focusedViewerPanelId == viewerLayoutItemId) {
            let nextPanel = panels.find((panel) => panel.id != viewerLayoutItemId);
            state.focusedViewerPanelId = nextPanel ? nextPanel.id : '';
          }
        }

        let parentContainer = containers.find((container) => container.itemIds.includes(viewerLayoutItemId));

        if (parentContainer) {
          // remove from parent container
          parentContainer.itemIds = parentContainer.itemIds.filter((id) => id != viewerLayoutItemId);

          if (parentContainer.id != state.rootViewerPanelContainerId && parentContainer.itemIds.length == 1) {
            // container is no longer necessary, merge up
            let parentContainerId = parentContainer.id;
            let parentParentContainer = containers.find((container) => container.itemIds.includes(parentContainerId));

            if (parentParentContainer) {
              let index = parentParentContainer.itemIds.indexOf(parentContainer.id);
              parentParentContainer.itemIds[index] = parentContainer.itemIds[0];

              this.store.dispatch(new RemoveViewerLayoutItem(parentContainer.id));
            }
          }
        }

        //remove item
        state.viewerLayoutItemIds = state.viewerLayoutItemIds.filter((id) => id != viewerLayoutItemId);
        delete state.viewerLayoutItems[viewerLayoutItemId];
      }

      return state;
    });
  }

  @Action(CloseViewer)
  @ImmutableContext()
  public closeViewer({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { viewerId }: CloseViewer) {
    setState((state: WorkbenchStateModel) => {
      state.viewerIds = state.viewerIds.filter((id) => id != viewerId);
      if (viewerId in state.viewers) {
        delete state.viewers[viewerId];
      }

      let panels = state.viewerLayoutItemIds
        .filter((itemId) => state.viewerLayoutItems[itemId].type == 'panel')
        .map((panelId) => state.viewerLayoutItems[panelId] as ViewerPanel);

      let parentPanel = panels.find((panel) => panel.viewerIds.includes(viewerId));

      if (parentPanel) {
        let index = parentPanel.viewerIds.indexOf(viewerId);
        if (index > -1) {
          parentPanel.viewerIds.splice(index, 1);
          if (parentPanel.selectedViewerId == viewerId) {
            if (parentPanel.viewerIds.length != 0) {
              parentPanel.selectedViewerId =
                parentPanel.viewerIds[Math.max(0, Math.min(parentPanel.viewerIds.length - 1, index))];
            } else {
              parentPanel.selectedViewerId = '';
              this.store.dispatch(new RemoveViewerLayoutItem(parentPanel.id));
            }
          }
        }
      }

      return state;
    });
  }

  @Action(KeepViewerOpen)
  @ImmutableContext()
  public keepViewerOpen(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { viewerId }: KeepViewerOpen
  ) {
    setState((state: WorkbenchStateModel) => {
      if (viewerId in state.viewers) state.viewers[viewerId].keepOpen = true;
      return state;
    });
  }

  @Action(SplitViewerPanel)
  @ImmutableContext()
  public splitViewerPanel(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { viewerId, direction }: SplitViewerPanel
  ) {
    setState((state: WorkbenchStateModel) => {
      let viewer = state.viewers[viewerId];
      if (viewer) viewer.keepOpen = true;
      //find panel
      let panels = state.viewerLayoutItemIds
        .filter((itemId) => state.viewerLayoutItems[itemId].type == 'panel')
        .map((panelId) => state.viewerLayoutItems[panelId] as ViewerPanel);

      let containers = state.viewerLayoutItemIds
        .filter((itemId) => state.viewerLayoutItems[itemId].type == 'container')
        .map((panelId) => state.viewerLayoutItems[panelId] as ViewerPanelContainer);

      let sourcePanel = panels.find((panel) => panel.viewerIds.includes(viewerId));

      if (sourcePanel) {
        if (sourcePanel.viewerIds.length == 1) {
          // cannot split a panel which only has one viewer
          return state;
        }

        let sourcePanelId = sourcePanel.id;

        let sourceContainer = containers.find((container) => container.itemIds.includes(sourcePanelId));

        if (sourceContainer) {
          let sourceContainerId = sourceContainer.id;

          //create new panel
          let nextPanelId = `PANEL_${state.nextViewerPanelIdSeed++}`;
          state.viewerLayoutItems[nextPanelId] = {
            id: nextPanelId,
            type: 'panel',
            selectedViewerId: viewerId,
            viewerIds: [viewerId],
          } as ViewerPanel;

          state.viewerLayoutItemIds.push(nextPanelId);

          //remove viewer from source panel
          sourcePanel.viewerIds = sourcePanel.viewerIds.filter((id) => id != viewerId);
          sourcePanel.selectedViewerId = sourcePanel.viewerIds[0];
          let sourcePanelIndex = sourceContainer.itemIds.indexOf(sourcePanelId);

          if (
            (sourceContainer.direction == 'column' && ['up', 'down'].includes(direction)) ||
            (sourceContainer.direction == 'row' && ['left', 'right'].includes(direction))
          ) {
            //add panel to parent container if same direction is requested
            sourceContainer.itemIds.splice(
              ['up', 'left'].includes(direction) ? sourcePanelIndex : sourcePanelIndex + 1,
              0,
              nextPanelId
            );
          } else {
            //create new container to wrap source panel and new panel
            let nextContainerId = `CONTAINER_${state.nextViewerPanelContainerIdSeed++}`;
            state.viewerLayoutItems[nextContainerId] = {
              id: nextContainerId,
              type: 'container',
              direction: ['up', 'down'].includes(direction) ? 'column' : 'row',
              itemIds: [sourcePanel.id],
            } as ViewerPanelContainer;

            (state.viewerLayoutItems[nextContainerId] as ViewerPanelContainer).itemIds.splice(
              ['up', 'left'].includes(direction) ? 0 : 1,
              0,
              nextPanelId
            );

            state.viewerLayoutItemIds.push(nextContainerId);

            //add wrapper container to source container
            sourceContainer.itemIds[sourcePanelIndex] = nextContainerId;
          }

          state.focusedViewerPanelId = nextPanelId;
        }
      }

      return state;
    });
  }

  @Action(MoveViewer)
  @ImmutableContext()
  public moveViewer(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { viewerId, sourcePanelId, targetPanelId, targetIndex }: MoveViewer
  ) {
    setState((state: WorkbenchStateModel) => {
      //find panel
      let panelEntities = state.viewerLayoutItems;
      let viewerEntities = state.viewers;

      let sourcePanel = { ...(panelEntities[sourcePanelId] as ViewerPanel) };
      let sourceViewerIndex = sourcePanel.viewerIds.indexOf(viewerId);
      let targetPanel = { ...(panelEntities[targetPanelId] as ViewerPanel) };
      let viewer = viewerEntities[viewerId];

      if (targetPanel) {
        targetPanel.viewerIds.splice(targetIndex, 0, viewerId);
        targetPanel.selectedViewerId = viewerId;

        if (sourcePanelId == targetPanel.id) {
          sourceViewerIndex += targetIndex > sourceViewerIndex ? 0 : 1;
        }
        sourcePanel.viewerIds.splice(sourceViewerIndex, 1);

        if (sourcePanel.viewerIds.length == 0) {
          this.store.dispatch(new RemoveViewerLayoutItem(sourcePanel.id));
        } else if (sourcePanel.id != targetPanel.id) {
          sourcePanel.selectedViewerId =
            sourcePanel.viewerIds[Math.max(0, Math.min(sourcePanel.viewerIds.length - 1, sourceViewerIndex - 1))];

          let sourceSelectedViewer = viewerEntities[sourcePanel.selectedViewerId];
          //force load of newly focused viewer
          dispatch(new SetViewerFile(sourceSelectedViewer.id, sourceSelectedViewer.fileId, sourceSelectedViewer.hduId));
        }
      }
      panelEntities[targetPanelId] = targetPanel;
      panelEntities[sourcePanelId] = sourcePanel;
      return state;
    });
  }

  @Action(UpdateCurrentViewportSize)
  @ImmutableContext()
  public updateCurrentViewportSize(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { viewerId, viewportSize }: UpdateCurrentViewportSize
  ) {
    setState((state: WorkbenchStateModel) => {
      let viewer = state.viewers[viewerId];
      if (
        !viewer.viewportSize ||
        viewer.viewportSize.width != viewportSize.width ||
        viewer.viewportSize.height != viewportSize.height
      ) {
        state.viewers[viewerId].viewportSize = {
          ...viewportSize,
        };
      }

      return state;
    });
  }

  @Action(SetViewMode)
  @ImmutableContext()
  public setViewMode({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { viewMode }: SetViewMode) {
    setState((state: WorkbenchStateModel) => {
      // let primaryViewerId = WorkbenchState.getViewers(state)[0].viewerId;
      // let secondaryViewerId = WorkbenchState.getViewers(state)[1].viewerId;
      // let activeViewerId = state.activeViewerId;
      // if (viewMode == ViewMode.SINGLE) state.activeViewerId = primaryViewerId;
      state.viewMode = viewMode;
      // state.viewers[secondaryViewerId].hidden = viewMode == ViewMode.SINGLE;
      return state;
    });
  }

  // @Action(SetViewerMarkers)
  // @ImmutableContext()
  // public setViewerMarkers(
  //   { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
  //   { viewerId, markers }: SetViewerMarkers
  // ) {
  //   setState((state: WorkbenchStateModel) => {
  //     if (viewerId in state.viewers) {
  //       state.viewers[viewerId].markers = markers;
  //     }
  //     return state;
  //   });
  // }

  // @Action(ClearViewerMarkers)
  // @ImmutableContext()
  // public clearViewerMarkers(
  //   { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
  //   {}: ClearViewerMarkers
  // ) {
  //   setState((state: WorkbenchStateModel) => {
  //     state.viewerIds.forEach(
  //       (viewerId) => (state.viewers[viewerId].markers = [])
  //     );
  //     return state;
  //   });
  // }

  @Action(SetViewerFile)
  @ImmutableContext()
  public setViewerFile(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { viewerId, fileId, hduId }: SetViewerFile
  ) {
    let state = getState();
    let refViewer = state.viewers[viewerId];
    let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
    let headerEntities = this.store.selectSnapshot(DataFilesState.getHeaderEntities);
    let fileEntities = this.store.selectSnapshot(DataFilesState.getFileEntities);

    if (!refViewer) return null;

    let refViewportTransform = this.store.selectSnapshot(WorkbenchState.getViewportTransformByViewerId(refViewer.id));
    let refImageTransform = this.store.selectSnapshot(WorkbenchState.getImageTransformByViewerId(refViewer.id));
    let refHeader = this.store.selectSnapshot(WorkbenchState.getHeaderByViewerId(refViewer.id));
    let refImageData = this.store.selectSnapshot(WorkbenchState.getRawImageDataByViewerId(refViewer.id));

    let refNormalization: PixelNormalizer;
    if (refViewer.hduId) {
      let refHdu = hduEntities[refViewer.hduId] as ImageHdu;
      if (refHdu.type == HduType.IMAGE) {
        refNormalization = refHdu.normalizer;
      }
    }

    setState((state: WorkbenchStateModel) => {
      //for a more responsive feel, set the panel's selected viewer before loading
      let panel = Object.values(state.viewerLayoutItems).find(
        (item) => item.type == 'panel' && (item as ViewerPanel).viewerIds.includes(viewerId)
      ) as ViewerPanel;
      if (panel) {
        state.focusedViewerPanelId = panel.id;
        panel.selectedViewerId = viewerId;
      }
      return state;
    });

    setState((state: WorkbenchStateModel) => {
      let viewer = state.viewers[viewerId];
      viewer.fileId = fileId;
      viewer.hduId = hduId;
      return state;
    });

    function onLoadComplete(store: Store) {
      //normalization
      if (refHeader && refImageTransform && refViewportTransform && refImageData) {
        // ensure that the new file/hdu is synced to what was previously in the viewer
        if (state.viewerSyncEnabled) {
          store.dispatch(
            new SyncViewerTransformations(refHeader.id, refImageTransform.id, refViewportTransform.id, refImageData.id, refViewer)
          );
        }

        if (refNormalization && state.normalizationSyncEnabled) {
          store.dispatch(new SyncViewerNormalizations(refNormalization));
        }
      }

      return dispatch([]);
    }

    let hduIds = hduId ? [hduId] : fileEntities[fileId].hduIds;
    let actions = hduIds.map((hduId) => new LoadHdu(hduId));

    let cancel$ = this.actions$.pipe(
      ofActionDispatched(SetViewerFile),
      filter<SetViewerFile>(
        (action) => action.viewerId == viewerId && (action.fileId != fileId || action.hduId != hduId)
      )
    );

    return dispatch(actions).pipe(
      takeUntil(cancel$),
      take(1),
      flatMap((action) => onLoadComplete(this.store))
    );
  }

  @Action(SetViewerSyncEnabled)
  @ImmutableContext()
  public setViewerSyncEnabled(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { value }: SetViewerSyncEnabled
  ) {
    setState((state: WorkbenchStateModel) => {
      state.viewerSyncEnabled = value;
      return state;
    });
  }

  @Action(SetViewerSyncMode)
  @ImmutableContext()
  public setViewerSyncMode(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { value }: SetViewerSyncMode
  ) {
    setState((state: WorkbenchStateModel) => {
      state.viewerSyncMode = value;
      return state;
    });
  }

  @Action(SetNormalizationSyncEnabled)
  @ImmutableContext()
  public setNormalizationSyncEnabled(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { value }: SetNormalizationSyncEnabled
  ) {
    setState((state: WorkbenchStateModel) => {
      state.normalizationSyncEnabled = value;
      return state;
    });

    let state = getState();
    let focusedViewer = this.store.selectSnapshot(WorkbenchState.getFocusedViewer);
    let dataFiles = this.store.selectSnapshot(DataFilesState.getHduEntities);

    return dispatch([]);
  }

  @Action(SetShowConfig)
  @ImmutableContext()
  public setShowConfig(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { showConfig }: SetShowConfig
  ) {
    setState((state: WorkbenchStateModel) => {
      state.showConfig = showConfig;
      return state;
    });
  }

  @Action(ToggleShowConfig)
  @ImmutableContext()
  public toggleShowConfig({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { }: ToggleShowConfig) {
    setState((state: WorkbenchStateModel) => {
      state.showConfig = !state.showConfig;
      return state;
    });
  }

  @Action(SetActiveTool)
  @ImmutableContext()
  public setActiveTool({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { tool }: SetActiveTool) {
    setState((state: WorkbenchStateModel) => {
      state.activeTool = tool;
      return state;
    });
  }

  @Action(UpdateSettings)
  @ImmutableContext()
  public updateSettings(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { changes }: UpdateSettings
  ) {
    setState((state: WorkbenchStateModel) => {
      state.settings = {
        ...state.settings,
        ...changes,
      }
      return state;
    });

    //side-effects
    let actions: any[] = [];
    // clear all auto-cal jobs to trigger recalibration of photometry
    actions.push(new InvalidateAutoPhotByHduId())
    actions.push(new InvalidateAutoCalByHduId())
    return dispatch(actions);
  }

  @Action(UpdateCentroidSettings)
  @ImmutableContext()
  public updateCentroidSettings(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { changes }: UpdateCentroidSettings
  ) {
    setState((state: WorkbenchStateModel) => {
      state.settings.centroid = {
        ...state.settings.centroid,
        ...changes,
      };
      return state;
    });
  }

  @Action(UpdatePhotometrySettings)
  @ImmutableContext()
  public updatePhotometrySettings(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { changes }: UpdatePhotometrySettings
  ) {
    setState((state: WorkbenchStateModel) => {
      state.settings.photometry = {
        ...state.settings.photometry,
        ...changes,
      }
      return state;
    });

    //side-effects
    let actions: any[] = [];
    // clear all auto-cal jobs to trigger recalibration of photometry
    actions.push(new InvalidateAutoPhotByHduId())
    actions.push(new InvalidateAutoCalByHduId())
    return dispatch(actions);
  }

  @Action(UpdateSourceExtractionSettings)
  @ImmutableContext()
  public updateSourceExtractionSettings(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { changes }: UpdateSourceExtractionSettings
  ) {
    setState((state: WorkbenchStateModel) => {
      state.settings.sourceExtraction = {
        ...state.settings.sourceExtraction,
        ...changes,
      };
      return state;
    });

    //side-effects
    let actions: any[] = [];
    // clear all auto-cal jobs to trigger recalibration of photometry
    actions.push(new InvalidateAutoCalByHduId())
    return dispatch(actions);
  }

  @Action(UpdateCalibrationSettings)
  @ImmutableContext()
  public updateCalibrationSettings(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { changes }: UpdateCalibrationSettings
  ) {
    setState((state: WorkbenchStateModel) => {
      state.settings.calibration = {
        ...state.settings.calibration,
        ...changes,
      }
      return state;
    });

    //side-effects
    let actions: any[] = [];
    // clear all auto-cal jobs to trigger recalibration of photometry
    actions.push(new InvalidateAutoCalByHduId())
    return dispatch(actions);

  }

  @Action(UpdateCustomMarkerPanelConfig)
  @ImmutableContext()
  public updateCustomMarkerPanelConfig(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { changes }: UpdateCustomMarkerPanelConfig
  ) {
    setState((state: WorkbenchStateModel) => {
      state.customMarkerPanelConfig = {
        ...state.customMarkerPanelConfig,
        ...changes,
      };
      return state;
    });
  }

  @Action(UpdateFileInfoPanelConfig)
  @ImmutableContext()
  public updateFileInfoPanelConfig(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { changes }: UpdateFileInfoPanelConfig
  ) {
    setState((state: WorkbenchStateModel) => {
      state.fileInfoPanelConfig = {
        ...state.fileInfoPanelConfig,
        ...changes,
      };
      return state;
    });
  }

  @Action(UpdatePlottingPanelConfig)
  @ImmutableContext()
  public updatePlottingPanelConfig(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { changes }: UpdatePlottingPanelConfig
  ) {
    setState((state: WorkbenchStateModel) => {
      state.plottingPanelConfig = {
        ...state.plottingPanelConfig,
        ...changes,
      };
      return state;
    });
  }

  @Action(UpdatePhotometryPanelConfig)
  @ImmutableContext()
  public updatePhotometryPanelConfig(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { changes }: UpdatePhotometryPanelConfig
  ) {
    setState((state: WorkbenchStateModel) => {
      if (changes.batchPhotFormData) {
        changes.batchPhotFormData = {
          ...state.photometryPanelConfig.batchPhotFormData,
          ...changes.batchPhotFormData,
        };
      }
      state.photometryPanelConfig = {
        ...state.photometryPanelConfig,
        ...changes,
      };
      return state;
    });
  }

  @Action(UpdatePixelOpsPanelConfig)
  @ImmutableContext()
  public updatePixelOpsPanelConfig(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { changes }: UpdatePixelOpsPanelConfig
  ) {
    setState((state: WorkbenchStateModel) => {
      if (changes.pixelOpsFormData) {
        changes.pixelOpsFormData = {
          ...state.pixelOpsPanelConfig.pixelOpsFormData,
          ...changes.pixelOpsFormData,
        };
      }
      state.pixelOpsPanelConfig = {
        ...state.pixelOpsPanelConfig,
        ...changes,
      };
      return state;
    });
  }

  @Action(UpdateAligningPanelConfig)
  @ImmutableContext()
  public updateAligningPanelConfig(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { changes }: UpdateAligningPanelConfig
  ) {
    setState((state: WorkbenchStateModel) => {
      if (changes.alignFormData) {
        changes.alignFormData = {
          ...state.aligningPanelConfig.alignFormData,
          ...changes.alignFormData,
        };
      }

      state.aligningPanelConfig = {
        ...state.aligningPanelConfig,
        ...changes,
      };

      state.aligningPanelConfig.currentAlignmentJobId = '';

      return state;
    });
  }

  @Action(UpdateStackingPanelConfig)
  @ImmutableContext()
  public updateStackingPanelConfig(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { changes }: UpdateStackingPanelConfig
  ) {
    setState((state: WorkbenchStateModel) => {
      if (changes.stackFormData) {
        changes.stackFormData = {
          ...state.stackingPanelConfig.stackFormData,
          ...changes.stackFormData,
        };
      }

      state.stackingPanelConfig = {
        ...state.stackingPanelConfig,
        ...changes,
      };

      state.stackingPanelConfig.currentStackingJobId = '';

      return state;
    });
  }

  @Action(UpdateWcsCalibrationPanelState)
  @ImmutableContext()
  public updateWcsCalibrationPanelState(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { changes }: UpdateWcsCalibrationPanelState
  ) {
    setState((state: WorkbenchStateModel) => {
      state.wcsCalibrationPanelState = {
        ...state.wcsCalibrationPanelState,
        ...changes,
      };

      return state;
    });
  }

  @Action(UpdateWcsCalibrationSettings)
  @ImmutableContext()
  public updateWcsCalibrationSettings(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { changes }: UpdateWcsCalibrationSettings
  ) {
    setState((state: WorkbenchStateModel) => {
      state.wcsCalibrationSettings = {
        ...state.wcsCalibrationSettings,
        ...changes,
      };

      return state;
    });
  }

  @Action(SetSelectedCatalog)
  @ImmutableContext()
  public setSelectedCatalog(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { catalogId }: SetSelectedCatalog
  ) {
    setState((state: WorkbenchStateModel) => {
      state.selectedCatalogId = catalogId;
      return state;
    });
  }

  @Action(SetSelectedFieldCal)
  @ImmutableContext()
  public setSelectedFieldCal(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { fieldCalId }: SetSelectedFieldCal
  ) {
    setState((state: WorkbenchStateModel) => {
      state.selectedFieldCalId = fieldCalId;
      return state;
    });
  }

  @Action(CloseSidenav)
  @ImmutableContext()
  public closeSideNav({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { }: CloseSidenav) {
    setState((state: WorkbenchStateModel) => {
      state.showSideNav = false;
      return state;
    });
  }

  @Action(OpenSidenav)
  @ImmutableContext()
  public openSideNav({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { }: OpenSidenav) {
    setState((state: WorkbenchStateModel) => {
      state.showSideNav = true;
      return state;
    });
  }

  @Action(LoadLibrarySuccess)
  @ImmutableContext()
  public loadLibrarySuccess(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hdus, correlationId }: LoadLibrarySuccess
  ) {
    let state = getState();
    let newHduIds = hdus.map((hdu) => hdu.id).filter((id) => !(id in state.hduIdToWorkbenchStateIdMap));
    dispatch(newHduIds.map((hduId) => new InitializeWorkbenchHduState(hduId)));

    let newFileIds = hdus.map((hdu) => hdu.fileId).filter((id) => !(id in state.fileIdToWorkbenchStateIdMap));
    newFileIds = [...new Set(newFileIds)];
    dispatch(newFileIds.map((fileId) => new InitializeWorkbenchFileState(fileId)));

    //TODO: remove workbench file states for files which no longer exist

    //when hdus are merged or split,  viewers may need to be updated with the new file ID
    let fileEntities = this.store.selectSnapshot(DataFilesState.getFileEntities);
    state.viewerIds.forEach((viewerId) => {
      let viewer = state.viewers[viewerId];
      if (viewer.fileId && fileEntities[viewer.fileId]) {
        return;
      }
      dispatch(new CloseViewer(viewerId));
    });
    // setState((state: WorkbenchStateModel) => {
    //   let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities)
    //   state.aligningPanelConfig.alignFormData.selectedHduIds = state.aligningPanelConfig.alignFormData.selectedHduIds.filter(hduId => hduId in hduEntities)
    //   state.stackingPanelConfig.stackFormData.selectedHduIds = state.stackingPanelConfig.stackFormData.selectedHduIds.filter(hduId => hduId in hduEntities)
    //   return state;
    // });

    // let focusedViewer = this.store.selectSnapshot(WorkbenchState.getFocusedViewer);

    // if (
    //   !focusedViewer || //no viewers have focus
    //   (!focusedViewer.hduId && !focusedViewer.fileId) //focused viewer has no assigned file
    // ) {
    //   if (hdus[0]) {
    //     dispatch(
    //       new SelectDataFileListItem({
    //         fileId: hdus[0].fileId,
    //         hduId: hdus[0].id,
    //       })
    //     );
    //   }
    // }
  }

  @Action(CloseDataFile)
  @ImmutableContext()
  public removeDataFile(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { fileId }: CloseDataFile
  ) {
    let dataFiles = this.store.selectSnapshot(DataFilesState.getFileEntities);
    if (fileId in dataFiles) {
      let file = dataFiles[fileId];
      let state = getState();
      state.viewerIds.forEach((viewerId) => {
        let viewer = state.viewers[viewerId];
        if (viewer.fileId == file.id || file.hduIds.includes(viewer.hduId)) {
          this.store.dispatch(new CloseViewer(viewerId));
        }
      });
    }

    setState((state: WorkbenchStateModel) => {
      state.selectedFileIds = state.selectedFileIds.filter((id) => id != fileId);
      return state;
    });

    // let focusedFileId = this.store.selectSnapshot(
    //   WorkbenchState.getFocusedFileId
    // );
    // if (focusedFileId == fileId) {
    //   let dataFiles = this.store.selectSnapshot(DataFilesState.getDataFiles);
    //   let index = dataFiles.map((f) => f.id).indexOf(fileId);
    //   if (index != -1 && dataFiles.length != 1) {
    //     this.actions$
    //       .pipe(
    //         ofActionCompleted(RemoveDataFile),
    //         take(1),
    //         filter((a) => a.result.successful)
    //       )
    //       .subscribe(() => {
    //         dataFiles = this.store.selectSnapshot(DataFilesState.getDataFiles);
    //         let nextFile =
    //           dataFiles[Math.max(0, Math.min(dataFiles.length - 1, index))];
    //         if (nextFile) dispatch(new SelectDataFile(nextFile.id));
    //       });
    //   }
    // }
  }

  @Action(CloseHduSuccess)
  @ImmutableContext()
  public removeDataFileSuccess(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduId }: CloseHduSuccess
  ) {
    setState((state: WorkbenchStateModel) => {
      state.aligningPanelConfig.alignFormData.selectedHduIds = state.aligningPanelConfig.alignFormData.selectedHduIds.filter(
        (id) => id != hduId
      );
      state.pixelOpsPanelConfig.pixelOpsFormData.primaryHduIds = state.pixelOpsPanelConfig.pixelOpsFormData.primaryHduIds.filter(
        (id) => id != hduId
      );
      state.pixelOpsPanelConfig.pixelOpsFormData.auxHduIds = state.pixelOpsPanelConfig.pixelOpsFormData.auxHduIds.filter(
        (id) => id != hduId
      );
      state.pixelOpsPanelConfig.pixelOpsFormData.auxHduId =
        state.pixelOpsPanelConfig.pixelOpsFormData.auxHduId == hduId
          ? ''
          : state.pixelOpsPanelConfig.pixelOpsFormData.auxHduId;
      return state;
    });
  }

  @Action(SetFileListFilter)
  @ImmutableContext()
  public setFileListFilter(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { value }: SetFileListFilter
  ) {
    setState((state: WorkbenchStateModel) => {
      state.fileListFilter = value;
      return state;
    });
  }

  @Action(ToggleFileSelection)
  @ImmutableContext()
  public toggleFileSelection(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { id }: ToggleFileSelection
  ) {
    setState((state: WorkbenchStateModel) => {
      if (state.selectedFileIds.includes(id)) {
        state.selectedFileIds = state.selectedFileIds.filter((fileId) => id != fileId);
      } else {
        state.selectedFileIds.push(id);
      }
      return state;
    });
  }

  @Action(SetFileSelection)
  @ImmutableContext()
  public setFileSelection(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { ids }: SetFileSelection
  ) {
    setState((state: WorkbenchStateModel) => {
      state.selectedFileIds = ids;
      return state;
    });
  }

  @Action(SelectFile)
  @ImmutableContext()
  public selectFile(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { fileId, hduId, keepOpen }: SelectFile
  ) {
    let state = getState();
    let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
    let fileEntities = this.store.selectSnapshot(DataFilesState.getFileEntities);

    let file = fileEntities[fileId];
    let hdu = hduId ? hduEntities[hduId] : null;

    let viewers = Object.values(state.viewers);

    //check if file is already open
    let targetViewer = viewers.find((viewer) => viewer.fileId == fileId && viewer.hduId == hduId);
    if (targetViewer) {
      dispatch(new SetFocusedViewer(targetViewer.id));
      if (keepOpen && !targetViewer.keepOpen) {
        dispatch(new KeepViewerOpen(targetViewer.id));
      }
      return;
    }

    //check if existing viewer is available
    // if no HDU is specified,  use an image viewer for composite image data
    let focusedPanel: ViewerPanel = state.viewerLayoutItems[state.focusedViewerPanelId] as ViewerPanel;
    let targetViewerType = !hdu || hdu.type == HduType.IMAGE ? ViewerType.IMAGE : ViewerType.TABLE;
    targetViewer = viewers.find(
      (viewer) =>
        !viewer.keepOpen &&
        viewer.type == targetViewerType &&
        (!focusedPanel || focusedPanel.viewerIds.includes(viewer.id))
    );
    if (targetViewer) {
      //temporary viewer exists
      dispatch(new SetViewerFile(targetViewer.id, file.id, hdu ? hdu.id : ''));
      if (keepOpen) {
        dispatch(new KeepViewerOpen(targetViewer.id));
      }
      return;
    }

    let viewerBase = {
      id: '',
      fileId: file.id,
      hduId: hdu ? hdu.id : '',
      keepOpen: keepOpen,
      viewportSize: {
        width: 0,
        height: 0,
      },
    };

    if (targetViewerType == ViewerType.IMAGE) {
      let headerId: string = '';
      let imageDataId: string = '';
      if (hdu) {
        headerId = hdu.headerId;
        imageDataId = (hdu as ImageHdu).rgbaImageDataId;
      } else {
        imageDataId = file.rgbaImageDataId;

        //use header from first image hdu
        let firstImageHduId = file.hduIds.find((hduId) => hduEntities[hduId].type == HduType.IMAGE);
        if (firstImageHduId) {
          headerId = hduEntities[firstImageHduId].headerId;
        }
      }

      let imageViewer: ImageViewer = {
        ...viewerBase,
        type: ViewerType.IMAGE,
        panEnabled: true,
        zoomEnabled: true,
      };
      dispatch(new CreateViewer(imageViewer, state.focusedViewerPanelId));
      return;
    } else {
      let tableViewer: TableViewer = {
        ...viewerBase,
        type: ViewerType.TABLE,
      };
      dispatch(new CreateViewer(tableViewer, state.focusedViewerPanelId));
      return;
    }
  }

  @Action([StartLine, UpdateLine, UpdatePlottingPanelState])
  @ImmutableContext()
  public onPlotterChange(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { plottingPanelStateId }: StartLine | UpdateLine | UpdatePlottingPanelState
  ) {
    let state = getState();
    let focusedViewer = this.store.selectSnapshot(WorkbenchState.getFocusedViewer);
    let dataFiles = this.store.selectSnapshot(DataFilesState.getHduEntities);
    return;
  }

  @Action(SyncPlottingPanelStates)
  @ImmutableContext()
  public syncFilePlotters(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { referenceId, ids }: SyncPlottingPanelStates
  ) {
    let state = getState();

    let referenceState = this.store.selectSnapshot(WorkbenchState.getPlottingPanelStateEntities)[referenceId];
    if (!referenceState) return;

    ids.forEach((id) => {
      if (referenceId == id) return;
      dispatch(
        new UpdatePlottingPanelState(id, {
          ...referenceState,
        })
      );
    });
  }

  @Action(SonificationRegionChanged)
  @ImmutableContext()
  public sonificationRegionChanged(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduId }: SonificationRegionChanged
  ) {
    let state = getState();
    let workbenchState = state.workbenchStateEntities[state.hduIdToWorkbenchStateIdMap[hduId]];
    if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_HDU) return;
    let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[hduId] as ImageHdu;
    let hduState = workbenchState as WorkbenchImageHduState;
    let sonifierState = state.sonificationPanelStateEntities[hduState.sonificationPanelStateId];

    if (sonifierState.regionMode == SonifierRegionMode.CUSTOM && sonifierState.viewportSync) {
      //find viewer which contains file
      let viewer = this.store.selectSnapshot(WorkbenchState.getViewers).find((viewer) => viewer.hduId == hduId);
      if (viewer && viewer.viewportSize && viewer.viewportSize.width != 0 && viewer.viewportSize.height != 0 && sonifierState.regionHistoryIndex !== null) {
        let region = sonifierState.regionHistory[sonifierState.regionHistoryIndex];
        dispatch(
          new CenterRegionInViewport(
            hdu.rawImageDataId,
            hdu.imageTransformId,
            hdu.viewportTransformId,
            viewer.viewportSize,
            region
          )
        );
      }
    }
  }

  @Action(LoadCatalogs)
  @ImmutableContext()
  public loadCatalogs({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { }: LoadCatalogs) {
    return this.afterglowCatalogService.getCatalogs().pipe(
      tap((catalogs) => {
        setState((state: WorkbenchStateModel) => {
          state.catalogs = catalogs;
          state.selectedCatalogId = catalogs.length != 0 ? catalogs[0].name : '';
          return state;
        });
      }),
      flatMap((catalogs) => {
        return dispatch(new LoadCatalogsSuccess(catalogs));
      }),
      catchError((err) => {
        return dispatch(new LoadCatalogsFail(err));
      })
    );
  }

  @Action(LoadFieldCals)
  @ImmutableContext()
  public loadFieldCals({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { }: LoadFieldCals) {
    return this.afterglowFieldCalService.getFieldCals().pipe(
      tap((fieldCals) => {
        setState((state: WorkbenchStateModel) => {
          state.fieldCals = fieldCals;
          state.selectedFieldCalId = state.selectedFieldCalId
            ? fieldCals.length == 0
              ? ''
              : fieldCals[0].id
            : state.selectedFieldCalId;
          return state;
        });
      }),
      flatMap((fieldCals) => {
        return dispatch(new LoadFieldCalsSuccess(fieldCals));
      }),
      catchError((err) => {
        return dispatch(new LoadFieldCalsFail(err));
      })
    );
  }

  @Action(CreateFieldCal)
  @ImmutableContext()
  public createFieldCal(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { fieldCal }: CreateFieldCal
  ) {
    return this.afterglowFieldCalService.createFieldCal(fieldCal).pipe(
      tap((fieldCal) => {
        setState((state: WorkbenchStateModel) => {
          state.selectedFieldCalId = fieldCal.id;
          return state;
        });
      }),
      flatMap((fieldCal) => {
        return dispatch([new CreateFieldCalSuccess(fieldCal), new LoadFieldCals()]);
      }),
      catchError((err) => {
        return dispatch(new CreateFieldCalFail(err));
      })
    );
  }

  @Action(UpdateFieldCal)
  @ImmutableContext()
  public updateFieldCal(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { fieldCal }: UpdateFieldCal
  ) {
    return this.afterglowFieldCalService.updateFieldCal(fieldCal).pipe(
      tap((fieldCal) => { }),
      flatMap((fieldCal) => {
        return dispatch([new UpdateFieldCalSuccess(fieldCal), new LoadFieldCals()]);
      }),
      catchError((err) => {
        return dispatch(new UpdateFieldCalFail(err));
      })
    );
  }

  @Action(AddFieldCalSourcesFromCatalog)
  @ImmutableContext()
  public addFieldCalSourcesFromCatalog(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { fieldCalId, catalogQueryJob }: AddFieldCalSourcesFromCatalog
  ) {
    // let correlationId = this.correlationIdGenerator.next();
    // let createJobAction = new CreateJob(catalogQueryJob, 1000, correlationId)
    // let { jobCreated$, jobUpdated$, jobCompleted$ } = JobActionHandler.getJobStreams(correlationId, this.actions$);
    // return merge(
    //   dispatch(createJobAction),
    //   jobCompleted$.pipe(
    //     tap(jobCompleted => {
    //       let result = jobCompleted.result as CatalogQueryJobResult;
    //       setState((state: WorkbenchStateModel) => {
    //         let fieldCal = state.fieldCals.find(c => c.id == fieldCalId);
    //         if (fieldCal) {
    //           fieldCal.catalogSources = fieldCal.catalogSources.concat(result.data);
    //         }
    //         return state;
    //       });
    //     })
    //   )
    // );
  }

  @Action(CreatePixelOpsJob)
  @ImmutableContext()
  public createPixelOpsJob({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { }: CreatePixelOpsJob) {
    let state = getState();
    let hdus = this.store.selectSnapshot(DataFilesState.getHdus);
    let dataFiles = this.store.selectSnapshot(DataFilesState.getFileEntities);
    let data = state.pixelOpsPanelConfig.pixelOpsFormData;
    let imageHdus = [...data.selectedHduIds, ...data.primaryHduIds].map((id) => hdus.find((f) => f.id == id)).filter(isNotEmpty);
    let auxFileIds: string[] = [];
    let op;
    if (data.mode == 'scalar') {
      op = `img ${data.operand} ${data.scalarValue}`;
    } else if (data.mode == 'image') {
      op = `img ${data.operand} aux_img`;
      auxFileIds.push(data.auxHduId);
    } else if (data.mode == 'kernel') {
      op = `${data.kernelFilter}(img`;
      if (SIZE_KERNELS.includes(data.kernelFilter)) {
        op += `, ${data.kernelSize}`
      }
      if (SIGMA_KERNELS.includes(data.kernelFilter)) {
        op += `, ${data.kernelSigma}`
      }
      op += ')'
    } else {
      return;
    }

    let job: PixelOpsJob = {
      type: JobType.PixelOps,
      id: null,
      fileIds: imageHdus
        .sort((a, b) => {
          return dataFiles[a.fileId].name < dataFiles[b.fileId].name
            ? -1
            : dataFiles[a.fileId].name > dataFiles[b.fileId].name
              ? 1
              : 0;
        })
        .map((f) => f.id),
      auxFileIds: auxFileIds,
      op: op,
      inplace: data.inPlace,
      state: null,
      result: null,
    };

    let correlationId = this.correlationIdGenerator.next();
    dispatch(new CreateJob(job, 1000, correlationId));

    let jobCompleted$ = this.actions$.pipe(
      ofActionCompleted(CreateJob),
      filter((a) => a.action.correlationId == correlationId)
    );

    let jobCanceled$ = this.actions$.pipe(
      ofActionCanceled(CreateJob),
      filter((a) => a.action.correlationId == correlationId)
    );

    let jobErrored$ = this.actions$.pipe(
      ofActionErrored(CreateJob),
      filter((a) => a.action.correlationId == correlationId)
    );

    let jobSuccessful$ = this.actions$.pipe(
      ofActionSuccessful(CreateJob),
      filter<CreateJob>((a) => a.correlationId == correlationId),
      takeUntil(merge(jobCanceled$, jobErrored$)),
      take(1),
      tap((a) => {
        let result = this.store.selectSnapshot(JobsState.getJobResultById(a.job.id)) as PixelOpsJobResult;
        if (result.errors.length != 0) {
          console.error('Errors encountered during pixel ops job: ', result.errors);
        }
        if (result.warnings.length != 0) {
          console.error('Warnings encountered during pixel ops job: ', result.warnings);
        }

        let actions: any[] = [];
        if ((job as PixelOpsJob).inplace) {
          let hduIds = result.fileIds.map((id) => id.toString());
          hduIds.forEach((hduId) => actions.push(new InvalidateRawImageTiles(hduId)));
          hduIds.forEach((hduId) => actions.push(new InvalidateHeader(hduId)));
        }

        actions.push(new LoadLibrary());
        return dispatch(actions);
      })
    );

    let jobUpdated$ = this.actions$.pipe(
      ofActionSuccessful(UpdateJobState),
      filter<CreateJob>((a) => a.correlationId == correlationId),
      takeUntil(jobCompleted$),
      tap((a) => {
        let job = this.store.selectSnapshot(JobsState.getJobEntities)[a.job.id];
        setState((state: WorkbenchStateModel) => {
          state.pixelOpsPanelConfig.currentPixelOpsJobId = job.id;
          return state;
        });
      })
    );

    return merge(jobSuccessful$, jobUpdated$);
  }

  @Action(CreateAdvPixelOpsJob)
  @ImmutableContext()
  public createAdvPixelOpsJob(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { }: CreateAdvPixelOpsJob
  ) {
    let state = getState();
    let hdus = this.store.selectSnapshot(DataFilesState.getHdus);
    let dataFiles = this.store.selectSnapshot(DataFilesState.getFileEntities);
    let data = state.pixelOpsPanelConfig.pixelOpsFormData;
    let imageHdus = [...data.selectedHduIds, ...data.primaryHduIds].map((id) => hdus.find((f) => f.id == id)).filter(isNotEmpty);
    let auxImageFiles = data.auxHduIds.map((id) => hdus.find((f) => f.id == id)).filter(isNotEmpty);
    let job: PixelOpsJob = {
      type: JobType.PixelOps,
      id: null,
      fileIds: imageHdus
        .sort((a, b) =>
          dataFiles[a.fileId].name < dataFiles[b.fileId].name
            ? -1
            : dataFiles[a.fileId].name > dataFiles[b.fileId].name
              ? 1
              : 0
        )
        .map((f) => f.id),
      auxFileIds: auxImageFiles
        .sort((a, b) =>
          dataFiles[a.fileId].name < dataFiles[b.fileId].name
            ? -1
            : dataFiles[a.fileId].name > dataFiles[b.fileId].name
              ? 1
              : 0
        )
        .map((f) => f.id),
      op: data.opString,
      inplace: data.inPlace,
      state: null,
      result: null,
    };

    let correlationId = this.correlationIdGenerator.next();
    dispatch(new CreateJob(job, 1000, correlationId));

    let jobCompleted$ = this.actions$.pipe(
      ofActionCompleted(CreateJob),
      filter((a) => a.action.correlationId == correlationId)
    );

    let jobCanceled$ = this.actions$.pipe(
      ofActionCanceled(CreateJob),
      filter((a) => a.action.correlationId == correlationId)
    );

    let jobErrored$ = this.actions$.pipe(
      ofActionErrored(CreateJob),
      filter((a) => a.action.correlationId == correlationId)
    );

    let jobSuccessful$ = this.actions$.pipe(
      ofActionSuccessful(CreateJob),
      filter<CreateJob>((a) => a.correlationId == correlationId),
      takeUntil(merge(jobCanceled$, jobErrored$)),
      take(1),
      tap((a) => {
        let result = this.store.selectSnapshot(JobsState.getJobResultById(a.job.id)) as PixelOpsJobResult;
        if (result.errors.length != 0) {
          console.error('Errors encountered during pixel ops: ', result.errors);
        }
        if (result.warnings.length != 0) {
          console.error('Warnings encountered during pixel ops: ', result.warnings);
        }

        let actions: any[] = [];
        if ((job as PixelOpsJob).inplace) {
          let hduIds = result.fileIds.map((id) => id.toString());
          hduIds.forEach((hduId) => actions.push(new InvalidateRawImageTiles(hduId)));
          hduIds.forEach((hduId) => actions.push(new InvalidateHeader(hduId)));
        }

        actions.push(new LoadLibrary());

        return dispatch(actions);
      })
    );

    let jobUpdated$ = this.actions$.pipe(
      ofActionSuccessful(UpdateJobState),
      filter<CreateJob>((a) => a.correlationId == correlationId),
      takeUntil(jobCompleted$),
      tap((a) => {
        let job = this.store.selectSnapshot(JobsState.getJobEntities)[a.job.id];
        setState((state: WorkbenchStateModel) => {
          state.pixelOpsPanelConfig.currentPixelOpsJobId = job.id;
          return state;
        });
      })
    );

    return merge(jobSuccessful$, jobUpdated$);
  }

  @Action(CreateAlignmentJob)
  @ImmutableContext()
  public createAlignmentJob(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduIds }: CreateAlignmentJob
  ) {
    let state = getState();
    let data = state.aligningPanelConfig.alignFormData;
    let hdus = this.store.selectSnapshot(DataFilesState.getHdus);
    let dataFiles = this.store.selectSnapshot(DataFilesState.getFileEntities);
    let imageHdus = hduIds.map((id) => hdus.find((f) => f.id == id)).filter(isNotEmpty);
    let job: AlignmentJob = {
      type: JobType.Alignment,
      id: null,
      fileIds: imageHdus
        .sort((a, b) =>
          dataFiles[a.fileId].name < dataFiles[b.fileId].name
            ? -1
            : dataFiles[a.fileId].name > dataFiles[b.fileId].name
              ? 1
              : 0
        )
        .map((f) => f.id),
      inplace: true,
      crop: data.crop,
      settings: {
        refImage: parseInt(data.refHduId),
        wcsGridPoints: 100,
        prefilter: false,
      },
      state: null,
      result: null,
    };

    let correlationId = this.correlationIdGenerator.next();
    dispatch(new CreateJob(job, 1000, correlationId));

    let jobCompleted$ = this.actions$.pipe(
      ofActionCompleted(CreateJob),
      filter((a) => a.action.correlationId == correlationId)
    );

    let jobCanceled$ = this.actions$.pipe(
      ofActionCanceled(CreateJob),
      filter((a) => a.action.correlationId == correlationId)
    );

    let jobErrored$ = this.actions$.pipe(
      ofActionErrored(CreateJob),
      filter((a) => a.action.correlationId == correlationId)
    );

    let jobSuccessful$ = this.actions$.pipe(
      ofActionSuccessful(CreateJob),
      filter<CreateJob>((a) => a.correlationId == correlationId),
      takeUntil(merge(jobCanceled$, jobErrored$)),
      take(1),
      tap((a) => {
        let result = this.store.selectSnapshot(JobsState.getJobResultById(a.job.id)) as AlignmentJobResult;
        if (result.errors.length != 0) {
          console.error('Errors encountered during aligning: ', result.errors);
        }
        if (result.warnings.length != 0) {
          console.error('Warnings encountered during aligning: ', result.warnings);
        }

        let hduIds = result.fileIds.map((id) => id.toString());
        let actions: any[] = [];
        if ((job as AlignmentJob).inplace) {
          hduIds.forEach((hduId) => actions.push(new InvalidateRawImageTiles(hduId)));
          hduIds.forEach((hduId) => actions.push(new InvalidateHeader(hduId)));
        }

        actions.push(new LoadLibrary());

        return dispatch(actions);
      })
    );

    let jobUpdated$ = this.actions$.pipe(
      ofActionSuccessful(UpdateJobState),
      filter<CreateJob>((a) => a.correlationId == correlationId),
      takeUntil(jobCompleted$),
      tap((a) => {
        let job = this.store.selectSnapshot(JobsState.getJobEntities)[a.job.id];
        setState((state: WorkbenchStateModel) => {
          state.aligningPanelConfig.currentAlignmentJobId = job.id;
          return state;
        });
      })
    );

    return merge(jobSuccessful$, jobUpdated$);
  }

  @Action(CreateStackingJob)
  @ImmutableContext()
  public createStackingJob(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduIds }: CreateStackingJob
  ) {
    let state = getState();
    let data = state.stackingPanelConfig.stackFormData;
    let hdus = this.store.selectSnapshot(DataFilesState.getHdus);

    let dataFiles = this.store.selectSnapshot(DataFilesState.getFileEntities);
    let imageHdus = hduIds.map((id) => hdus.find((f) => f.id == id)).filter(isNotEmpty);
    let existingFileNames = hdus.map(hdu => hdu.name)
    let stackedName = getLongestCommonStartingSubstring(imageHdus.map(hdu => hdu.name)).replace(/_+$/, '').trim();

    if (stackedName) {
      stackedName = `${stackedName}_stack`
      let base = stackedName
      let iter = 0
      while (existingFileNames.includes(`${stackedName}.fits`)) {
        stackedName = `${base}_${iter}`
        iter += 1;
      }
    }



    let job: StackingJob = {
      type: JobType.Stacking,
      id: null,
      fileIds: imageHdus
        .sort((a, b) =>
          dataFiles[a.fileId].name < dataFiles[b.fileId].name
            ? -1
            : dataFiles[a.fileId].name > dataFiles[b.fileId].name
              ? 1
              : 0
        )
        .map((f) => f.id),
      stackingSettings: {
        mode: data.mode,
        scaling: data.scaling == 'none' ? null : data.scaling,
        rejection: data.rejection == 'none' ? null : data.rejection,
        percentile: data.percentile,
        lo: data.low,
        hi: data.high,
      },
      state: null,
      result: null,
    };

    let correlationId = this.correlationIdGenerator.next();
    dispatch(new CreateJob(job, 1000, correlationId));

    let jobCompleted$ = this.actions$.pipe(
      ofActionCompleted(CreateJob),
      filter((a) => a.action.correlationId == correlationId)
    );

    let jobCanceled$ = this.actions$.pipe(
      ofActionCanceled(CreateJob),
      filter((a) => a.action.correlationId == correlationId)
    );

    let jobErrored$ = this.actions$.pipe(
      ofActionErrored(CreateJob),
      filter((a) => a.action.correlationId == correlationId)
    );

    let jobSuccessful$ = this.actions$.pipe(
      ofActionSuccessful(CreateJob),
      filter<CreateJob>((a) => a.correlationId == correlationId),
      takeUntil(merge(jobCanceled$, jobErrored$)),
      take(1),
      flatMap((a) => {
        let result = this.store.selectSnapshot(JobsState.getJobResultById(a.job.id)) as StackingJobResult;
        if (result.errors.length != 0) {
          console.error('Errors encountered during stacking: ', result.errors);
        }
        if (result.warnings.length != 0) {
          console.error('Warnings encountered during stacking: ', result.warnings);
        }
        if (result.fileId && stackedName) {
          return this.dataFileService.updateFile(result.fileId, {
            groupName: `${stackedName}.fits`,
            name: `${stackedName}.fits`
          }).pipe(
            map(() => dispatch(new LoadLibrary()))
          )
        }
        return dispatch(new LoadLibrary())



      })
    );

    let jobUpdated$ = this.actions$.pipe(
      ofActionSuccessful(UpdateJobState),
      filter<CreateJob>((a) => a.correlationId == correlationId),
      takeUntil(jobCompleted$),
      tap((a) => {
        let job = this.store.selectSnapshot(JobsState.getJobEntities)[a.job.id];
        setState((state: WorkbenchStateModel) => {
          state.stackingPanelConfig.currentStackingJobId = job.id;
          return state;
        });
      })
    );

    return merge(jobSuccessful$, jobUpdated$);
  }

  @Action(CreateWcsCalibrationJob)
  @ImmutableContext()
  public createWcsCalibrationJob(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduIds }: CreateWcsCalibrationJob
  ) {
    setState((state: WorkbenchStateModel) => {
      state.wcsCalibrationPanelState.activeJobId = '';
      return state;
    });

    let state = getState();
    let wcsSettings = state.wcsCalibrationSettings;
    let raHours = typeof (wcsSettings.ra) == 'string' ? parseDms(wcsSettings.ra) : wcsSettings.ra;
    let decDegs = typeof (wcsSettings.dec) == 'string' ? parseDms(wcsSettings.dec) : wcsSettings.dec;
    let wcsCalibrationJobSettings: WcsCalibrationJobSettings = {
      raHours: raHours,
      decDegs: decDegs,
      radius: wcsSettings.radius,
      minScale: wcsSettings.minScale,
      maxScale: wcsSettings.maxScale,
      maxSources: wcsSettings.maxSources,
    };

    let sourceExtractionSettings = state.settings.sourceExtraction;
    let sourceExtractionJobSettings: SourceExtractionJobSettings = {
      threshold: sourceExtractionSettings.threshold,
      fwhm: sourceExtractionSettings.fwhm,
      deblend: sourceExtractionSettings.deblend,
      limit: sourceExtractionSettings.limit,
    };

    let job: WcsCalibrationJob = {
      id: null,
      type: JobType.WcsCalibration,
      fileIds: hduIds,
      inplace: true,
      settings: wcsCalibrationJobSettings,
      sourceExtractionSettings: sourceExtractionJobSettings,
      state: null,
      result: null,
    };

    let correlationId = this.correlationIdGenerator.next();
    let onCreateJobFail$ = this.actions$.pipe(
      ofActionDispatched(CreateJobFail),
      filter((action) => (action as CreateJobFail).correlationId == correlationId)
    );

    let onCreateJobSuccess$ = this.actions$.pipe(
      takeUntil(onCreateJobFail$),
      ofActionDispatched(CreateJobSuccess),
      filter((action) => (action as CreateJobSuccess).correlationId == correlationId),
      take(1),
      flatMap((action) => {
        setState((state: WorkbenchStateModel) => {
          state.wcsCalibrationPanelState.activeJobId = (action as CreateJobSuccess).job.id;
          return state;
        });

        return this.actions$.pipe(
          ofActionCompleted(CreateJob),
          filter((value) => (value.action as CreateJob).correlationId == correlationId),
          take(1),
          flatMap((value) => {
            let actions: any[] = [];
            let state = getState();
            if (value.result.successful) {
              let jobEntites = this.store.selectSnapshot(JobsState.getJobEntities);
              let job = jobEntites[state.wcsCalibrationPanelState.activeJobId] as WcsCalibrationJob;
              let result = job.result;
              if (result) {
                result.fileIds.forEach((hduId) => {
                  actions.push(new InvalidateHeader(hduId.toString()));
                });
                let message: string;
                let numFailed = hduIds.length - result.fileIds.length;
                if (numFailed != 0) {
                  message = `Failed to find solution for ${numFailed} image(s).`;
                } else {
                  message = `Successfully found solutions for all ${hduIds.length} files.`;
                }

                let dialogConfig: Partial<AlertDialogConfig> = {
                  title: 'WCS Calibration Completed',
                  message: message,
                  buttons: [
                    {
                      color: '',
                      value: false,
                      label: 'Close',
                    },
                  ],
                };
                let dialogRef = this.dialog.open(AlertDialogComponent, {
                  width: '600px',
                  data: dialogConfig,
                });
              }
            }

            return dispatch(actions);
          })
        );
      })
    );
    return merge(onCreateJobSuccess$, dispatch(new CreateJob(job, 1000, correlationId)));
  }

  @Action(ImportFromSurvey)
  @ImmutableContext()
  public importFromSurvey(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { surveyDataProviderId, raHours, decDegs, widthArcmins, heightArcmins, correlationId }: ImportFromSurvey
  ) {
    let importFromSurveyCorrId = this.correlationIdGenerator.next();
    setState((state: WorkbenchStateModel) => {
      state.dssImportLoading = true;
      return state;
    });
    let importCompleted$ = this.actions$.pipe(
      ofActionDispatched(ImportAssetsCompleted),
      filter<ImportAssetsCompleted>((action) => action.correlationId == importFromSurveyCorrId),
      take(1),
      flatMap((action) => {
        setState((state: WorkbenchStateModel) => {
          state.dssImportLoading = false;
          return state;
        });

        if (action.errors.length != 0) {
          return dispatch(new ImportFromSurveyFail(correlationId, action.errors.join(',')));
        }

        if (action.fileIds.length == 0) {
          return dispatch(new ImportFromSurveyFail(correlationId, 'A file ID was not returned by the server.'));
        }

        return dispatch([new LoadLibrary(), new ImportFromSurveySuccess(action.fileIds[0], correlationId)]);
      })
    );
    dispatch(
      new ImportAssets(
        [
          {
            name: '',
            dataProviderId: surveyDataProviderId,
            isDirectory: false,
            assetPath: `${raHours * 15},${decDegs}\\${widthArcmins},${heightArcmins}`,
            metadata: {},
          },
        ],
        importFromSurveyCorrId
      )
    );
    return importCompleted$;
  }

  /* Source Extraction */
  @Action(ExtractSources)
  @ImmutableContext()
  public extractSources(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduId, viewportSize, settings }: ExtractSources
  ) {

  }

  @Action(RemoveSources)
  @ImmutableContext()
  public removeSources(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { sourceIds }: RemoveSources
  ) {
    let state = getState();

    setState((state: WorkbenchStateModel) => {
      state.photometryPanelConfig.selectedSourceIds = state.photometryPanelConfig.selectedSourceIds.filter(
        (id) => !sourceIds.includes(id)
      );
      return state;
    });
  }

  @Action(UpdateAutoPhotometry)
  @ImmutableContext()
  public updateAutoPhotometry(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { viewerId }: UpdateAutoPhotometry
  ) {
    let state = getState();

    let imageHdu = this.store.selectSnapshot(WorkbenchState.getImageHduByViewerId(viewerId))
    if (!imageHdu) return;
    let hduId = imageHdu.id;

    let coordMode = state.photometryPanelConfig.coordMode;
    let showSourcesFromAllFiles = state.photometryPanelConfig.showSourcesFromAllFiles;
    let sources = this.store.selectSnapshot(SourcesState.getSources);


    let header = this.store.selectSnapshot(DataFilesState.getHeaderByHduId(hduId))
    let hdu = this.store.selectSnapshot(DataFilesState.getHduById(hduId))

    if (!hdu || !header) return;
    if (!header.wcs || !header.wcs.isValid()) coordMode = 'pixel';
    sources = sources.filter((source) => {
      if (coordMode != source.posType) return false;
      if (source.hduId == hduId) return true;
      if (!showSourcesFromAllFiles) return false;
      let coord = getSourceCoordinates(header, source);
      if (coord == null) return false;
      return true;
    });

    let workbenchState = this.store.selectSnapshot(WorkbenchState.getWorkbenchStateByHduId(hduId))
    if (!workbenchState) return;
    if (workbenchState.type == WorkbenchStateType.IMAGE_HDU) {
      let hduState = workbenchState as WorkbenchImageHduState;
      let photPanelStateId = hduState.photometryPanelStateId;

      let photometryJobSettings = toPhotometryJobSettings(state.settings);

      let job: PhotometryJob = {
        type: JobType.Photometry,
        settings: photometryJobSettings,
        id: null,
        fileIds: [hduId],
        sources: sources.map((source, index) => {
          let x = null;
          let y = null;
          let pmPixel = null;
          let pmPosAnglePixel = null;
          let raHours = null;
          let decDegs = null;
          let pmSky = null;
          let pmPosAngleSky = null;

          if (source.posType == PosType.PIXEL) {
            x = source.primaryCoord;
            y = source.secondaryCoord;
            pmPixel = source.pm;
            pmPosAnglePixel = source.pmPosAngle;
          } else {
            raHours = source.primaryCoord;
            decDegs = source.secondaryCoord;
            pmSky = source.pm;
            if (pmSky) pmSky /= 3600.0;
            pmPosAngleSky = source.pmPosAngle;
          }

          let s: Astrometry & SourceId = {
            id: source.id,
            pmEpoch: source.pmEpoch ? new Date(source.pmEpoch).toISOString() : null,
            x: x,
            y: y,
            pmPixel: pmPixel,
            pmPosAnglePixel: pmPosAnglePixel,
            raHours: raHours,
            decDegs: decDegs,
            pmSky: pmSky,
            pmPosAngleSky: pmPosAngleSky,
            fwhmX: null,
            fwhmY: null,
            theta: null,
          };
          return s;
        }),
        state: null,
        result: null,
      };

      let correlationId = this.correlationIdGenerator.next();
      dispatch(new CreateJob(job, 1000, correlationId))

      setState((state: WorkbenchStateModel) => {
        let photState = state.photometryPanelStateEntities[photPanelStateId];
        photState.autoPhotIsValid = true;
        photState.autoPhotJobId = null;
        return state;
      });

      let jobFinished$ = this.actions$.pipe(
        ofActionCompleted(CreateJob),
        filter((v) => v.action.correlationId == correlationId),
        take(1)
      );

      this.actions$.pipe(
        ofActionDispatched(CreateJobSuccess),
        filter<CreateJobSuccess>((a) => a.correlationId == correlationId),
        takeUntil(jobFinished$),
      ).subscribe(a => {
        console.log("AUTO PHOT JOB CREATED")
        let job = this.store.selectSnapshot(JobsState.getJobEntities)[a.job.id] as PhotometryJob;
        setState((state: WorkbenchStateModel) => {
          let photState = state.photometryPanelStateEntities[photPanelStateId];
          photState.autoPhotJobId = job.id
          return state;
        });
      })

      return jobFinished$;
    }

  }

  @Action(UpdateAutoFieldCalibration)
  @ImmutableContext()
  public updateAutoFieldCalibration(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { viewerId }: UpdateAutoFieldCalibration
  ) {
    let state = getState();

    let imageHdu = this.store.selectSnapshot(WorkbenchState.getImageHduByViewerId(viewerId))
    if (!imageHdu) return;
    let hduId = imageHdu.id;

    let coordMode = state.photometryPanelConfig.coordMode;
    let header = this.store.selectSnapshot(DataFilesState.getHeaderByHduId(hduId))
    let hdu = this.store.selectSnapshot(DataFilesState.getHduById(hduId))

    if (!hdu || !header) return;
    if (!header.wcs || !header.wcs.isValid()) coordMode = 'pixel';


    let workbenchState = this.store.selectSnapshot(WorkbenchState.getWorkbenchStateByHduId(hduId))
    if (!workbenchState) return;
    if (workbenchState.type == WorkbenchStateType.IMAGE_HDU) {
      let hduState = workbenchState as WorkbenchImageHduState;
      let photPanelStateId = hduState.photometryPanelStateId;

      let photometryJobSettings = toPhotometryJobSettings(state.settings);
      let sourceExtractionJobSettings = toSourceExtractionJobSettings(state.settings);
      let fieldCalibration = toFieldCalibration(state.settings);

      let job: FieldCalibrationJob = {
        type: JobType.FieldCalibration,
        id: null,
        photometrySettings: photometryJobSettings,
        sourceExtractionSettings: sourceExtractionJobSettings,
        fieldCal: fieldCalibration,
        fileIds: [hduId],
        state: null,
        result: null,
      };


      let correlationId = this.correlationIdGenerator.next();
      dispatch(new CreateJob(job, 1000, correlationId))

      setState((state: WorkbenchStateModel) => {
        let photState = state.photometryPanelStateEntities[photPanelStateId];
        photState.autoCalIsValid = true;
        photState.autoCalJobId = null;
        return state;
      });

      let jobFinished$ = this.actions$.pipe(
        ofActionCompleted(CreateJob),
        filter((v) => v.action.correlationId == correlationId),
        take(1)
      );

      this.actions$.pipe(
        ofActionDispatched(CreateJobSuccess),
        filter<CreateJobSuccess>((a) => a.correlationId == correlationId),
        takeUntil(jobFinished$),
      ).subscribe(a => {
        console.log("AUTO CAL JOB CREATED")
        let job = this.store.selectSnapshot(JobsState.getJobEntities)[a.job.id] as PhotometryJob;
        setState((state: WorkbenchStateModel) => {
          let photState = state.photometryPanelStateEntities[photPanelStateId];
          photState.autoCalJobId = job.id
          return state;
        });
      })

      return jobFinished$
    }

  }

  @Action(BatchPhotometerSources)
  @ImmutableContext()
  public batchPhotometerSources(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { }: BatchPhotometerSources
  ) {
    let state = getState();

    setState((state: WorkbenchStateModel) => {
      state.photometryPanelConfig.batchInProgress = true;
      state.photometryPanelConfig.batchCalJobId = null;
      state.photometryPanelConfig.batchPhotJobId = null;
      return state;
    });


    let sources = this.store.selectSnapshot(SourcesState.getSources);
    let photometryJobSettings = toPhotometryJobSettings(state.settings);
    let hduIds = state.photometryPanelConfig.batchPhotFormData.selectedHduIds;

    let photJob: PhotometryJob = {
      type: JobType.Photometry,
      settings: photometryJobSettings,
      id: null,
      fileIds: hduIds,
      sources: sources.map((source, index) => {
        let x = null;
        let y = null;
        let pmPixel = null;
        let pmPosAnglePixel = null;
        let raHours = null;
        let decDegs = null;
        let pmSky = null;
        let pmPosAngleSky = null;

        if (source.posType == PosType.PIXEL) {
          x = source.primaryCoord;
          y = source.secondaryCoord;
          pmPixel = source.pm;
          pmPosAnglePixel = source.pmPosAngle;
        } else {
          raHours = source.primaryCoord;
          decDegs = source.secondaryCoord;
          pmSky = source.pm;
          if (pmSky) pmSky /= 3600.0;
          pmPosAngleSky = source.pmPosAngle;
        }

        let s: Astrometry & SourceId = {
          id: source.id,
          pmEpoch: source.pmEpoch ? new Date(source.pmEpoch).toISOString() : null,
          x: x,
          y: y,
          pmPixel: pmPixel,
          pmPosAnglePixel: pmPosAnglePixel,
          raHours: raHours,
          decDegs: decDegs,
          pmSky: pmSky,
          pmPosAngleSky: pmPosAngleSky,
          fwhmX: null,
          fwhmY: null,
          theta: null,
        };
        return s;
      }),
      state: null,
      result: null,
    };

    let photJobCorrelationId = this.correlationIdGenerator.next();
    dispatch(new CreateJob(photJob, 1000, photJobCorrelationId))


    let photJobFinished$ = this.actions$.pipe(
      ofActionCompleted(CreateJob),
      filter((v) => v.action.correlationId == photJobCorrelationId),
      take(1)
    );

    this.actions$.pipe(
      ofActionDispatched(CreateJobSuccess),
      filter<CreateJobSuccess>((a) => a.correlationId == photJobCorrelationId),
      takeUntil(photJobFinished$),
    ).subscribe(a => {
      let job = this.store.selectSnapshot(JobsState.getJobEntities)[a.job.id] as PhotometryJob;
      setState((state: WorkbenchStateModel) => {
        state.photometryPanelConfig.batchPhotJobId = job.id;
        return state;
      });
    })

    let calJobFinished$ = of(null);

    if (state.settings.calibration.calibrationEnabled) {

      let sourceExtractionJobSettings = toSourceExtractionJobSettings(state.settings);
      let fieldCalibration = toFieldCalibration(state.settings);

      let calJob: FieldCalibrationJob = {
        type: JobType.FieldCalibration,
        id: null,
        photometrySettings: photometryJobSettings,
        sourceExtractionSettings: sourceExtractionJobSettings,
        fieldCal: fieldCalibration,
        fileIds: hduIds,
        state: null,
        result: null,
      };


      let calJobCorrelationId = this.correlationIdGenerator.next();
      dispatch(new CreateJob(calJob, 1000, calJobCorrelationId))

      calJobFinished$ = this.actions$.pipe(
        ofActionCompleted(CreateJob),
        filter((v) => v.action.correlationId == calJobCorrelationId),
        take(1)
      );

      this.actions$.pipe(
        ofActionDispatched(CreateJobSuccess),
        filter<CreateJobSuccess>((a) => a.correlationId == calJobCorrelationId),
        takeUntil(calJobFinished$),
      ).subscribe(a => {
        let job = this.store.selectSnapshot(JobsState.getJobEntities)[a.job.id] as FieldCalibrationJob;
        setState((state: WorkbenchStateModel) => {
          state.photometryPanelConfig.batchCalJobId = job.id;
          return state;
        });
      })
    }



    return combineLatest([photJobFinished$, calJobFinished$]).pipe(
      tap(() => {
        setState((state: WorkbenchStateModel) => {
          state.photometryPanelConfig.batchInProgress = false;
          return state;
        });
      })
    )




  }


  @Action(InitializeWorkbenchHduState)
  @ImmutableContext()
  public initializeWorkbenchHduState(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduId }: InitializeWorkbenchHduState
  ) {
    let actions: any[] = [];
    setState((state: WorkbenchStateModel) => {
      let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
      if (!(hduId in hduEntities)) return state;
      let hdu = hduEntities[hduId];
      let workbenchState: IWorkbenchState;
      let workbenchStateId = `WORKBENCH_STATE_${state.nextWorkbenchStateId++}`;
      state.hduIdToWorkbenchStateIdMap[hduId] = workbenchStateId;

      //initialize HDU states
      if (hdu.type == HduType.IMAGE) {
        let plottingPanelStateId = `PLOTTING_PANEL_${state.nextPlottingPanelStateId++}`;
        state.plottingPanelStateEntities[plottingPanelStateId] = {
          id: plottingPanelStateId,
          measuring: false,
          lineMeasureStart: null,
          lineMeasureEnd: null,
        };
        state.plottingPanelStateIds.push(plottingPanelStateId);

        let customMarkerPanelStateId = `CUSTOM_MARKER_PANEL_${state.nextCustomMarkerPanelStateId++}`;
        state.customMarkerPanelStateEntities[customMarkerPanelStateId] = {
          id: customMarkerPanelStateId,
          markerEntities: {},
          markerIds: [],
          markerSelectionRegion: null,
        };
        state.customMarkerPanelStateIds.push(customMarkerPanelStateId);

        let sonificationPanelStateId = `SONIFICATION_PANEL_${state.nextSonificationPanelStateId++}`;
        state.sonificationPanelStateEntities[sonificationPanelStateId] = {
          id: sonificationPanelStateId,
          regionHistory: [],
          regionHistoryIndex: null,
          regionHistoryInitialized: false,
          regionMode: SonifierRegionMode.CUSTOM,
          viewportSync: true,
          duration: 10,
          toneCount: 22,
          progressLine: null,
          sonificationLoading: null,
          sonificationJobId: '',
        };
        state.sonificationPanelStateIds.push(sonificationPanelStateId);

        let photometryPanelStateId = `PHOTOMETRY_PANEL_${state.nextPhotometryPanelStateId++}`;
        state.photometryPanelStateEntities[photometryPanelStateId] = {
          id: photometryPanelStateId,
          sourceExtractionJobId: '',
          sourcePhotometryData: {},
          markerSelectionRegion: null,
          autoPhotIsValid: false,
          autoPhotJobId: '',
          autoCalIsValid: false,
          autoCalJobId: '',
        };
        state.photometryPanelStateIds.push(photometryPanelStateId);

        let imageHduState: WorkbenchImageHduState = {
          id: workbenchStateId,
          type: WorkbenchStateType.IMAGE_HDU,
          plottingPanelStateId: plottingPanelStateId,
          customMarkerPanelStateId: customMarkerPanelStateId,
          sonificationPanelStateId: sonificationPanelStateId,
          photometryPanelStateId: photometryPanelStateId,
        };

        workbenchState = imageHduState;
        state.workbenchStateEntities[workbenchState.id] = workbenchState;
        state.workbenchStateIds.push(workbenchState.id);

        actions.push(new InitializeWorkbenchFileState(hdu.fileId));
      } else if (hdu.type == HduType.TABLE) {
        let tableHduState: WorkbenchTableHduState = {
          id: workbenchStateId,
          type: WorkbenchStateType.TABLE_HDU,
        };

        workbenchState = tableHduState;
        state.workbenchStateEntities[workbenchState.id] = workbenchState;
        state.workbenchStateIds.push(workbenchState.id);

        actions.push(new InitializeWorkbenchFileState(hdu.fileId));
      }

      return state;
    });

    return dispatch(actions);
  }

  @Action(InitializeWorkbenchFileState)
  @ImmutableContext()
  public initializeWorkbenchFileState(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { fileId }: InitializeWorkbenchFileState
  ) {
    setState((state: WorkbenchStateModel) => {
      let fileEntities = this.store.selectSnapshot(DataFilesState.getFileEntities);
      if (!(fileId in fileEntities)) return state;
      let file = fileEntities[fileId];
      let workbenchStateId = state.fileIdToWorkbenchStateIdMap[fileId];
      if (workbenchStateId && state.workbenchStateEntities[workbenchStateId]) return state;

      workbenchStateId = `WORKBENCH_STATE_${state.nextWorkbenchStateId++}`;
      state.fileIdToWorkbenchStateIdMap[fileId] = workbenchStateId;

      let plottingPanelStateId = `PLOTTING_PANEL_${state.nextPlottingPanelStateId++}`;
      state.plottingPanelStateEntities[plottingPanelStateId] = {
        id: plottingPanelStateId,
        measuring: false,
        lineMeasureStart: null,
        lineMeasureEnd: null,
      };
      state.plottingPanelStateIds.push(plottingPanelStateId);

      let customMarkerPanelStateId = `CUSTOM_MARKER_PANEL_${state.nextCustomMarkerPanelStateId++}`;
      state.customMarkerPanelStateEntities[customMarkerPanelStateId] = {
        id: customMarkerPanelStateId,
        markerEntities: {},
        markerIds: [],
        markerSelectionRegion: null,
      };
      state.customMarkerPanelStateIds.push(customMarkerPanelStateId);

      let fileState: WorkbenchFileState = {
        id: workbenchStateId,
        type: WorkbenchStateType.FILE,
        plottingPanelStateId: plottingPanelStateId,
        customMarkerPanelStateId: customMarkerPanelStateId,
      };

      state.workbenchStateEntities[workbenchStateId] = fileState;
      state.workbenchStateIds.push(fileState.id);

      return state;
    });
  }

  @Action(CloseDataFileSuccess)
  @ImmutableContext()
  public closeDataFileSuccess(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { fileId }: CloseDataFileSuccess
  ) {
    setState((state: WorkbenchStateModel) => {
      let workbenchStateId = state.fileIdToWorkbenchStateIdMap[fileId];
      if (workbenchStateId) {
        delete state.fileIdToWorkbenchStateIdMap[fileId];
      }
      if (workbenchStateId in state.workbenchStateEntities) {
        state.workbenchStateIds = state.workbenchStateIds.filter((id) => id != workbenchStateId);
        delete state.workbenchStateEntities[workbenchStateId];
      }
      return state;
    });
  }

  @Action(CloseHduSuccess)
  @ImmutableContext()
  public closeHduSuccess(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduId }: CloseHduSuccess
  ) {
    setState((state: WorkbenchStateModel) => {
      let workbenchStateId = state.hduIdToWorkbenchStateIdMap[hduId];
      if (workbenchStateId) {
        delete state.fileIdToWorkbenchStateIdMap[hduId];
      }
      if (workbenchStateId in state.workbenchStateEntities) {
        state.workbenchStateIds = state.workbenchStateIds.filter((id) => id != workbenchStateId);
        delete state.workbenchStateEntities[workbenchStateId];
      }

      state.aligningPanelConfig.alignFormData.selectedHduIds = state.aligningPanelConfig.alignFormData.selectedHduIds.filter(
        (id) => id != hduId
      );
      state.stackingPanelConfig.stackFormData.selectedHduIds = state.stackingPanelConfig.stackFormData.selectedHduIds.filter(
        (id) => id != hduId
      );

      state.photometryPanelConfig.batchPhotFormData.selectedHduIds = state.photometryPanelConfig.batchPhotFormData.selectedHduIds.filter(
        (id) => id != hduId
      );

      state.pixelOpsPanelConfig.pixelOpsFormData.selectedHduIds = state.pixelOpsPanelConfig.pixelOpsFormData.selectedHduIds.filter(
        (id) => id != hduId
      );

      state.pixelOpsPanelConfig.pixelOpsFormData.auxHduIds = state.pixelOpsPanelConfig.pixelOpsFormData.auxHduIds.filter(
        (id) => id != hduId
      );

      state.pixelOpsPanelConfig.pixelOpsFormData.primaryHduIds = state.pixelOpsPanelConfig.pixelOpsFormData.primaryHduIds.filter(
        (id) => id != hduId
      );

      if (state.pixelOpsPanelConfig.pixelOpsFormData.auxHduId == hduId) state.pixelOpsPanelConfig.pixelOpsFormData.auxHduId = null;

      state.wcsCalibrationPanelState.selectedHduIds = state.wcsCalibrationPanelState.selectedHduIds.filter(
        (id) => id != hduId
      );


      return state;
    });
  }

  @Action(LoadHduHeaderSuccess)
  @ImmutableContext()
  public loadDataFileHdrSuccess(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduId }: LoadHduHeaderSuccess
  ) {
    let state = getState();
    let workbenchState = state.workbenchStateEntities[state.hduIdToWorkbenchStateIdMap[hduId]];
    if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_HDU) return;
    let hduState = workbenchState as WorkbenchImageHduState;
    let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[hduId] as ImageHdu;
    let header = this.store.selectSnapshot(DataFilesState.getHeaderEntities)[hdu.headerId];

    let sonifierState = state.sonificationPanelStateEntities[hduState.sonificationPanelStateId];

    if (!sonifierState.regionHistoryInitialized) {
      dispatch(
        new AddRegionToHistory(hduId, {
          x: 0,
          y: 0,
          width: getWidth(header),
          height: getHeight(header),
        })
      );
    }
  }

  @Action(UpdateCustomMarkerSelectionRegion)
  @ImmutableContext()
  public updateCustomMarkerSelectionRegion(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { customMarkerPanelStateId, region }: UpdateCustomMarkerSelectionRegion
  ) {
    setState((state: WorkbenchStateModel) => {
      let markerState = state.customMarkerPanelStateEntities[customMarkerPanelStateId];
      if (!markerState) return state;

      markerState.markerSelectionRegion = {
        ...region,
      };
      return state;
    });
  }

  @Action(EndCustomMarkerSelectionRegion)
  @ImmutableContext()
  public endCustomMarkerSelectionRegion(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { customMarkerPanelStateId, mode }: EndCustomMarkerSelectionRegion
  ) {
    setState((state: WorkbenchStateModel) => {
      let markerState = state.customMarkerPanelStateEntities[customMarkerPanelStateId];
      if (!markerState) return state;

      let region = markerState.markerSelectionRegion;
      if (!region) return state;

      markerState.markerIds.forEach((id) => {
        let marker = markerState.markerEntities[id];
        if (marker.type != MarkerType.CIRCLE) return;
        let circleMarker = marker as CircleMarker;
        let x1 = Math.min(region!.x, region!.x + region!.width);
        let y1 = Math.min(region!.y, region!.y + region!.height);
        let x2 = x1 + Math.abs(region!.width);
        let y2 = y1 + Math.abs(region!.height);

        if (circleMarker.x >= x1 && circleMarker.x < x2 && circleMarker.y >= y1 && circleMarker.y < y2) {
          marker.selected = mode != 'remove';
        }
      });
      markerState.markerSelectionRegion = null;

      return state;
    });
  }

  @Action([AddRegionToHistory, UndoRegionSelection, RedoRegionSelection])
  @ImmutableContext()
  public regionHistoryChanged(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduId }: AddRegionToHistory | UndoRegionSelection | RedoRegionSelection
  ) {
    let state = getState();
    let workbenchState = state.workbenchStateEntities[state.hduIdToWorkbenchStateIdMap[hduId]];
    if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_HDU) return;
    let hduState = workbenchState as WorkbenchImageHduState;
    let sonificationPanelState = state.sonificationPanelStateEntities[hduState.sonificationPanelStateId];

    if (sonificationPanelState.regionMode == SonifierRegionMode.CUSTOM) {
      dispatch(new SonificationRegionChanged(hduId));
    }
  }

  @Action(UpdateSonifierFileState)
  @ImmutableContext()
  public updateSonifierFileState(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduId, changes }: UpdateSonifierFileState
  ) {
    setState((state: WorkbenchStateModel) => {
      let workbenchState = state.workbenchStateEntities[state.hduIdToWorkbenchStateIdMap[hduId]];
      if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_HDU) return state;
      let hduState = workbenchState as WorkbenchImageHduState;
      let sonificationPanelState = state.sonificationPanelStateEntities[hduState.sonificationPanelStateId];
      state.sonificationPanelStateEntities[hduState.sonificationPanelStateId] = {
        ...sonificationPanelState,
        ...changes,
      };

      dispatch(new SonificationRegionChanged(hduId));

      return state;
    });
  }

  @Action(AddRegionToHistory)
  @ImmutableContext()
  public addRegionToHistory(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduId, region }: AddRegionToHistory
  ) {
    setState((state: WorkbenchStateModel) => {
      let workbenchState = state.workbenchStateEntities[state.hduIdToWorkbenchStateIdMap[hduId]];
      if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_HDU) return state;
      let hduState = workbenchState as WorkbenchImageHduState;
      let sonificationPanelState = state.sonificationPanelStateEntities[hduState.sonificationPanelStateId];
      if (!sonificationPanelState.regionHistoryInitialized) {
        sonificationPanelState.regionHistoryIndex = 0;
        sonificationPanelState.regionHistory = [region];
        sonificationPanelState.regionHistoryInitialized = true;
      } else if (sonificationPanelState.regionHistoryIndex != null) {
        sonificationPanelState.regionHistory = [
          ...sonificationPanelState.regionHistory.slice(0, sonificationPanelState.regionHistoryIndex + 1),
          region,
        ];
        sonificationPanelState.regionHistoryIndex++;
      }
      return state;
    });
  }

  @Action(UndoRegionSelection)
  @ImmutableContext()
  public undoRegionSelection(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduId }: UndoRegionSelection
  ) {
    setState((state: WorkbenchStateModel) => {
      let workbenchState = state.workbenchStateEntities[state.hduIdToWorkbenchStateIdMap[hduId]];
      if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_HDU) return state;
      let hduState = workbenchState as WorkbenchImageHduState;
      let sonificationPanelState = state.sonificationPanelStateEntities[hduState.sonificationPanelStateId];
      if (
        !sonificationPanelState.regionHistoryInitialized ||
        sonificationPanelState.regionHistoryIndex == null ||
        sonificationPanelState.regionHistoryIndex == 0
      )
        return state;
      sonificationPanelState.regionHistoryIndex--;
      return state;
    });
  }

  @Action(RedoRegionSelection)
  @ImmutableContext()
  public redoRegionSelection(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduId }: RedoRegionSelection
  ) {
    setState((state: WorkbenchStateModel) => {
      let workbenchState = state.workbenchStateEntities[state.hduIdToWorkbenchStateIdMap[hduId]];
      if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_HDU) return state;
      let hduState = workbenchState as WorkbenchImageHduState;
      let sonificationPanelState = state.sonificationPanelStateEntities[hduState.sonificationPanelStateId];
      if (
        !sonificationPanelState.regionHistoryInitialized ||
        sonificationPanelState.regionHistoryIndex == null ||
        sonificationPanelState.regionHistoryIndex == sonificationPanelState.regionHistory.length - 1
      ) {
        return state;
      }
      sonificationPanelState.regionHistoryIndex++;
      return state;
    });
  }

  @Action(ClearRegionHistory)
  @ImmutableContext()
  public clearRegionHistory(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduId }: ClearRegionHistory
  ) {
    setState((state: WorkbenchStateModel) => {
      let workbenchState = state.workbenchStateEntities[state.hduIdToWorkbenchStateIdMap[hduId]];
      if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_HDU) return state;
      let hduState = workbenchState as WorkbenchImageHduState;
      let sonificationPanelState = state.sonificationPanelStateEntities[hduState.sonificationPanelStateId];
      if (
        !sonificationPanelState.regionHistoryInitialized ||
        sonificationPanelState.regionHistoryIndex == sonificationPanelState.regionHistory.length - 1
      )
        return state;
      sonificationPanelState.regionHistoryIndex = null;
      sonificationPanelState.regionHistory = [];
      sonificationPanelState.regionHistoryInitialized = false;
      return state;
    });
  }

  @Action(SetProgressLine)
  @ImmutableContext()
  public setProgressLine(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduId, line }: SetProgressLine
  ) {
    setState((state: WorkbenchStateModel) => {
      let workbenchState = state.workbenchStateEntities[state.hduIdToWorkbenchStateIdMap[hduId]];
      if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_HDU) return state;
      let hduState = workbenchState as WorkbenchImageHduState;
      let sonificationPanelState = state.sonificationPanelStateEntities[hduState.sonificationPanelStateId];
      sonificationPanelState.progressLine = line;
      return state;
    });
  }

  @Action(Sonify)
  @ImmutableContext()
  public sonify({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { hduId, region }: Sonify) {
    let getSonificationUrl = (jobId) => `${getCoreApiUrl(this.config)}/jobs/${jobId}/result/files/sonification`;

    let state = getState();
    let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
    let workbenchState = state.workbenchStateEntities[state.hduIdToWorkbenchStateIdMap[hduId]];
    if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_HDU) return;
    let hduState = workbenchState as WorkbenchImageHduState;
    let sonificationPanelStateId = hduState.sonificationPanelStateId;

    let sonificationPanelState = state.sonificationPanelStateEntities[sonificationPanelStateId];
    let settings = {
      x: Math.floor(region.x) + 1,
      y: Math.floor(region.y) + 1,
      width: Math.floor(region.width),
      height: Math.floor(region.height),
      numTones: Math.floor(sonificationPanelState.toneCount),
      tempo: Math.ceil(region.height / sonificationPanelState.duration),
      indexSounds: true,
    };

    //check whether new job should be created or if previous job result can be used
    if (sonificationPanelState.sonificationJobId) {
      let job = this.store.selectSnapshot(JobsState.getJobEntities)[
        sonificationPanelState.sonificationJobId
      ] as SonificationJob;

      if (job && job.result && job.result.errors.length == 0 && job.fileId === hduId) {
        let jobSettings: SonificationJobSettings = {
          x: job.settings.x,
          y: job.settings.y,
          width: job.settings.width,
          height: job.settings.height,
          numTones: job.settings.numTones,
          tempo: job.settings.tempo,
          indexSounds: job.settings.indexSounds,
        };
        if (deepEqual(jobSettings, settings)) {
          return dispatch(new SonificationCompleted(hduId, getSonificationUrl(job.id), ''));
        }
      }
    }

    let job: SonificationJob = {
      id: null,
      fileId: hduId,
      type: JobType.Sonification,
      settings: settings,
      state: null,
      result: null,
    };

    let correlationId = this.correlationIdGenerator.next();
    dispatch(new CreateJob(job, 1000, correlationId));

    setState((state: WorkbenchStateModel) => {
      let sonificationPanelState = state.sonificationPanelStateEntities[sonificationPanelStateId];
      sonificationPanelState.sonificationLoading = true;
      return state;
    });

    let jobCompleted$ = this.actions$.pipe(
      ofActionCompleted(CreateJob),
      filter((v) => v.action.correlationId == correlationId),
      take(1)
    );

    let jobStatusUpdated$ = this.actions$.pipe(
      ofActionSuccessful(UpdateJobState),
      filter<UpdateJobState>((a) => a.correlationId == correlationId),
      takeUntil(jobCompleted$),
      tap((a) => {
        // setState((state: WorkbenchStateModel) => {
        //   let sonificationPanelState = state.sonificationPanelStateEntities[hduState.sonificationPanelStateId];
        //   if (a.job.state) {
        //     sonificationPanelState.sonificationLoading = a.job.state.progress;
        //   }
        //   return state;
        // });
      })
    );

    return merge(
      jobStatusUpdated$,
      jobCompleted$.pipe(
        flatMap((a) => {
          let actions: any[] = [];
          let sonificationUrl = '';
          let error = 'Unexpected error occurred';
          if (a.result.successful) {
            job = (a.action as CreateJob).job as SonificationJob;
            let result = this.store.selectSnapshot(JobsState.getJobResultById(job.id)) as SonificationJobResult;

            if (result.errors.length == 0) {
              sonificationUrl = getSonificationUrl(job.id);
              error = '';
            } else {
              error = result.errors.map((e) => e.detail).join(', ');
            }
          }

          setState((state: WorkbenchStateModel) => {
            let sonificationPanelState = state.sonificationPanelStateEntities[sonificationPanelStateId];
            sonificationPanelState.sonificationLoading = false;
            sonificationPanelState.sonificationJobId = job.id;

            state.sonificationPanelStateEntities[sonificationPanelStateId] = {
              ...sonificationPanelState,
            };
            return state;
          });

          return dispatch(new SonificationCompleted(hduId, sonificationUrl, error));
        })
      )
    );
  }

  @Action(ClearSonification)
  @ImmutableContext()
  public clearSonification(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduId }: ClearSonification
  ) {
    let state = getState();
    let workbenchState = state.workbenchStateEntities[state.hduIdToWorkbenchStateIdMap[hduId]];
    if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_HDU) return;
    let hduState = workbenchState as WorkbenchImageHduState;

    setState((state: WorkbenchStateModel) => {
      let sonificationPanelState = state.sonificationPanelStateEntities[hduState.sonificationPanelStateId];
      sonificationPanelState.sonificationLoading = null;
      sonificationPanelState.sonificationJobId = '';
      return state;
    });
  }

  @Action(UpdatePhotometrySourceSelectionRegion)
  @ImmutableContext()
  public updatePhotometryMarkerRegionSelection(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduId, region }: UpdatePhotometrySourceSelectionRegion
  ) {
    setState((state: WorkbenchStateModel) => {
      let workbenchState = state.workbenchStateEntities[state.hduIdToWorkbenchStateIdMap[hduId]];
      if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_HDU) return state;
      let hduState = workbenchState as WorkbenchImageHduState;
      let photPanelStateId = hduState.photometryPanelStateId;
      let photState = state.photometryPanelStateEntities[photPanelStateId];
      photState.markerSelectionRegion = {
        ...region,
      };
      return state;
    });
  }

  @Action(EndPhotometrySourceSelectionRegion)
  @ImmutableContext()
  public endPhotometryMarkerRegionSelection(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduId, mode }: EndPhotometrySourceSelectionRegion
  ) {
    setState((state: WorkbenchStateModel) => {
      let workbenchState = state.workbenchStateEntities[state.hduIdToWorkbenchStateIdMap[hduId]];
      if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_HDU) return state;
      let hduState = workbenchState as WorkbenchImageHduState;
      let photPanelStateId = hduState.photometryPanelStateId;
      let photState = state.photometryPanelStateEntities[photPanelStateId];

      let region = photState.markerSelectionRegion;
      let header = this.store.selectSnapshot(DataFilesState.getHeaderByHduId(hduId));
      if (!header || !region) return state;

      let sourceIds = this.store
        .selectSnapshot(SourcesState.getSources)
        .filter((source) => {
          let coord = getSourceCoordinates(header!, source);
          let x1 = Math.min(region!.x, region!.x + region!.width);
          let y1 = Math.min(region!.y, region!.y + region!.height);
          let x2 = x1 + Math.abs(region!.width);
          let y2 = y1 + Math.abs(region!.height);

          return coord && coord.x >= x1 && coord.x < x2 && coord.y >= y1 && coord.y < y2;
        })
        .map((source) => source.id);

      if (mode == 'remove') {
        state.photometryPanelConfig.selectedSourceIds = state.photometryPanelConfig.selectedSourceIds.filter(
          (id) => !sourceIds.includes(id)
        );
      } else {
        let filteredSourceIds = sourceIds.filter((id) => !state.photometryPanelConfig.selectedSourceIds.includes(id));
        state.photometryPanelConfig.selectedSourceIds = state.photometryPanelConfig.selectedSourceIds.concat(
          filteredSourceIds
        );
      }
      photState.markerSelectionRegion = null;

      return state;
    });
  }

  @Action(UpdatePhotometryFileState)
  @ImmutableContext()
  public updatePhotometryFileState(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduId, changes }: UpdatePhotometryFileState
  ) {
    setState((state: WorkbenchStateModel) => {
      let workbenchState = state.workbenchStateEntities[state.hduIdToWorkbenchStateIdMap[hduId]];
      if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_HDU) return state;
      let hduState = workbenchState as WorkbenchImageHduState;
      let photometryPanelState = state.photometryPanelStateEntities[hduState.photometryPanelStateId];
      state.photometryPanelStateEntities[hduState.photometryPanelStateId] = {
        ...photometryPanelState,
        ...changes,
      };
      return state;
    });
  }

  @Action(StartLine)
  @ImmutableContext()
  public startLine(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { plottingPanelStateId, point }: StartLine
  ) {
    let state = getState();
    if (!(plottingPanelStateId in state.plottingPanelStateEntities)) {
      return;
    }

    setState((state: WorkbenchStateModel) => {
      let plottingPanelState = state.plottingPanelStateEntities[plottingPanelStateId];

      if (!plottingPanelState.measuring) {
        plottingPanelState.lineMeasureStart = { ...point };
        plottingPanelState.lineMeasureEnd = { ...point };
      } else {
        plottingPanelState.lineMeasureEnd = { ...point };
      }
      plottingPanelState.measuring = !plottingPanelState.measuring;

      return state;
    });
  }

  @Action(UpdateLine)
  @ImmutableContext()
  public updateLine(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { plottingPanelStateId, point }: UpdateLine
  ) {
    let state = getState();
    if (!(plottingPanelStateId in state.plottingPanelStateEntities)) {
      return;
    }

    setState((state: WorkbenchStateModel) => {
      let plottingPanelState = state.plottingPanelStateEntities[plottingPanelStateId];
      if (!plottingPanelState.measuring) return state;

      plottingPanelState.lineMeasureEnd = point;

      return state;
    });
  }

  @Action(UpdatePlottingPanelState)
  @ImmutableContext()
  public updatePlotterFileState(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { plottingPanelStateId, changes }: UpdatePlottingPanelState
  ) {
    let state = getState();
    if (!(plottingPanelStateId in state.plottingPanelStateEntities)) {
      return;
    }

    setState((state: WorkbenchStateModel) => {
      let plottingPanelState = state.plottingPanelStateEntities[plottingPanelStateId];

      state.plottingPanelStateEntities[plottingPanelStateId] = {
        ...plottingPanelState,
        ...changes,
        id: plottingPanelStateId,
      };
      return state;
    });
  }

  /*  Custom Markers */
  @Action(UpdateCustomMarker)
  @ImmutableContext()
  public updateCustomMarker(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { customMarkerPanelStateId, markerId, changes }: UpdateCustomMarker
  ) {
    setState((state: WorkbenchStateModel) => {
      let markerState = state.customMarkerPanelStateEntities[customMarkerPanelStateId];
      if (markerState.markerIds.includes(markerId)) {
        markerState.markerEntities[markerId] = {
          ...markerState.markerEntities[markerId],
          ...changes,
        };
      }
      return state;
    });
  }

  @Action(AddCustomMarkers)
  @ImmutableContext()
  public addCustomMarkers(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { customMarkerPanelStateId, markers }: AddCustomMarkers
  ) {
    setState((state: WorkbenchStateModel) => {
      let markerState = state.customMarkerPanelStateEntities[customMarkerPanelStateId];

      markers.forEach((marker) => {
        let nextSeed = state.nextMarkerId++;
        if (marker.label == null || marker.label == undefined) {
          // marker.marker.label = `M${nextSeed}`;
          marker.label = '';
        }
        let id = `CUSTOM_MARKER_${customMarkerPanelStateId}_${nextSeed.toString()}`;
        markerState.markerIds.push(id);
        markerState.markerEntities[id] = {
          ...marker,
          id: id,
        };
      });

      return state;
    });
  }

  @Action(RemoveCustomMarkers)
  @ImmutableContext()
  public removeCustomMarkers(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { customMarkerPanelStateId, markers }: RemoveCustomMarkers
  ) {
    setState((state: WorkbenchStateModel) => {
      let markerState = state.customMarkerPanelStateEntities[customMarkerPanelStateId];

      let idsToRemove = markers.map((m) => m.id);
      markerState.markerIds = markerState.markerIds.filter((id) => !idsToRemove.includes(id));
      markers.forEach((marker) => {
        if (marker.id && marker.id in markerState.markerEntities) delete markerState.markerEntities[marker.id];
      });

      return state;
    });
  }

  @Action(SelectCustomMarkers)
  @ImmutableContext()
  public selectCustomMarkers(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { customMarkerPanelStateId, markers }: SelectCustomMarkers
  ) {
    setState((state: WorkbenchStateModel) => {
      let markerState = state.customMarkerPanelStateEntities[customMarkerPanelStateId];

      markers.forEach((marker) => {
        if (marker.id && markerState.markerIds.includes(marker.id)) {
          markerState.markerEntities[marker.id].selected = true;
        }
      });
      return state;
    });
  }

  @Action(DeselectCustomMarkers)
  @ImmutableContext()
  public deselectCustomMarkers(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { customMarkerPanelStateId, markers }: DeselectCustomMarkers
  ) {
    setState((state: WorkbenchStateModel) => {
      let markerState = state.customMarkerPanelStateEntities[customMarkerPanelStateId];

      markers.forEach((marker) => {
        if (marker.id && markerState.markerIds.includes(marker.id)) {
          markerState.markerEntities[marker.id].selected = false;
        }
      });
      return state;
    });
  }

  @Action(SetCustomMarkerSelection)
  @ImmutableContext()
  public setCustomMarkerSelection(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { customMarkerPanelStateId, markers }: SetCustomMarkerSelection
  ) {
    setState((state: WorkbenchStateModel) => {
      let markerState = state.customMarkerPanelStateEntities[customMarkerPanelStateId];

      let selectedMarkerIds = markers.map((m) => m.id);
      markerState.markerIds.forEach((markerId) => {
        markerState.markerEntities[markerId].selected = selectedMarkerIds.includes(markerId);
      });
      return state;
    });
  }

  @Action(AddPhotDatas)
  @ImmutableContext()
  public addPhotDatas(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { photDatas }: AddPhotDatas
  ) {
    setState((state: WorkbenchStateModel) => {
      //Photometry data from the Core refers to hdu ids as file ids.
      photDatas.forEach((d) => {
        let workbenchState = state.workbenchStateEntities[state.hduIdToWorkbenchStateIdMap[d.fileId]];
        if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_HDU) return;
        let hduState = workbenchState as WorkbenchImageHduState;
        if (!d.id) {
          return;
        }
        let photometryPanelState = state.photometryPanelStateEntities[hduState.photometryPanelStateId];
        photometryPanelState.sourcePhotometryData[d.id] = d;
      });

      return state;
    });
  }

  @Action(RemovePhotDatasByHduId)
  @ImmutableContext()
  public removePhotDatasByHduId(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduId }: RemovePhotDatasByHduId
  ) {
    setState((state: WorkbenchStateModel) => {
      state.workbenchStateIds.forEach((stateId) => {
        if (hduId === null || hduId === stateId) {
          if (state.workbenchStateEntities[stateId].type != WorkbenchStateType.IMAGE_HDU) {
            return;
          }
          let hduState = state.workbenchStateEntities[stateId] as WorkbenchImageHduState;
          state.photometryPanelStateEntities[hduState.photometryPanelStateId].sourcePhotometryData = {};
        }

      });
      return state;
    });
  }

  @Action(RemovePhotDatasBySourceId)
  @ImmutableContext()
  public removePhotDatasBySourceId(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { sourceId }: RemovePhotDatasBySourceId
  ) {
    setState((state: WorkbenchStateModel) => {
      state.workbenchStateIds.forEach((stateId) => {
        if (state.workbenchStateEntities[stateId].type != WorkbenchStateType.IMAGE_HDU) {
          return;
        }
        let hduState = state.workbenchStateEntities[stateId] as WorkbenchImageHduState;
        let photometryPanelState = state.photometryPanelStateEntities[hduState.photometryPanelStateId];
        if (sourceId in photometryPanelState.sourcePhotometryData) {
          delete photometryPanelState.sourcePhotometryData[sourceId];
        }
      });
      return state;
    });
  }

  @Action(InvalidateAutoCalByHduId)
  @ImmutableContext()
  public resetAutoCalJobsByHduId(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduId }: RemovePhotDatasByHduId
  ) {
    setState((state: WorkbenchStateModel) => {
      let workbenchStateIds = state.workbenchStateIds;
      if (hduId) workbenchStateIds = [state.hduIdToWorkbenchStateIdMap[hduId]]
      workbenchStateIds.forEach((stateId) => {
        if (state.workbenchStateEntities[stateId].type != WorkbenchStateType.IMAGE_HDU) {
          return;
        }
        let hduState = state.workbenchStateEntities[stateId] as WorkbenchImageHduState;
        state.photometryPanelStateEntities[hduState.photometryPanelStateId].autoCalIsValid = false;
      });
      return state;
    });
  }

  @Action(InvalidateAutoPhotByHduId)
  @ImmutableContext()
  public resetAutoPhotJobsByHduId(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduId }: InvalidateAutoPhotByHduId
  ) {
    setState((state: WorkbenchStateModel) => {
      let workbenchStateIds = state.workbenchStateIds;
      if (hduId) workbenchStateIds = [state.hduIdToWorkbenchStateIdMap[hduId]]
      workbenchStateIds.forEach((stateId) => {
        if (state.workbenchStateEntities[stateId].type != WorkbenchStateType.IMAGE_HDU) {
          return;
        }
        let hduState = state.workbenchStateEntities[stateId] as WorkbenchImageHduState;
        state.photometryPanelStateEntities[hduState.photometryPanelStateId].autoPhotIsValid = false;
      });
      return state;
    });
  }

  @Action(SyncViewerTransformations)
  @ImmutableContext()
  public syncFileTransformations(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { refHeaderId, refImageTransformId, refViewportTransformId, refImageDataId, refViewer }: SyncViewerTransformations
  ) {
    let state = getState();
    let headerEntities = this.store.selectSnapshot(DataFilesState.getHeaderEntities);
    let transformEntities = this.store.selectSnapshot(DataFilesState.getTransformEntities);
    let imageDataEntities = this.store.selectSnapshot(DataFilesState.getImageDataEntities);
    let refHeader = headerEntities[refHeaderId];
    let refImageTransform = transformEntities[refImageTransformId];
    let refViewportTransform = transformEntities[refViewportTransformId];
    let refImageToViewportTransform = getImageToViewportTransform(refViewportTransform, refImageTransform);
    let refHduHasWcs = refHeader.wcs && refHeader.wcs.isValid();
    let refViewportSize = refViewer.viewportSize;

    let visibleViewers = this.store.selectSnapshot(WorkbenchState.getVisibleViewerIds).map((id) => state.viewers[id]);

    let actions: any[] = [];
    visibleViewers.forEach((viewer) => {
      let targetHeader = this.store.selectSnapshot(WorkbenchState.getHeaderByViewerId(viewer.id));
      let targetImageTransform = this.store.selectSnapshot(WorkbenchState.getImageTransformByViewerId(viewer.id));
      let targetViewportTransform = this.store.selectSnapshot(WorkbenchState.getViewportTransformByViewerId(viewer.id));

      if (!targetHeader || !targetHeader.loaded || !targetImageTransform || !targetViewportTransform) return;

      if (state.viewerSyncMode == 'sky') {
        let targetHasWcs = targetHeader.wcs && targetHeader.wcs.isValid();
        if (refHduHasWcs && targetHasWcs) {
          let referenceWcs = refHeader.wcs;
          let referenceWcsMat = new Matrix(
            referenceWcs.m11,
            referenceWcs.m21,
            referenceWcs.m12,
            referenceWcs.m22,
            0,
            0
          );
          let originWorld = referenceWcs.pixToWorld([0, 0]);
          let wcs = targetHeader.wcs;
          let originPixels = wcs.worldToPix(originWorld);
          let wcsMat = new Matrix(wcs.m11, wcs.m21, wcs.m12, wcs.m22, 0, 0);

          if (hasOverlap(refHeader, targetHeader)) {
            let srcToTargetMat = referenceWcsMat
              .inverted()
              .appended(wcsMat)
              .translate(-originPixels[0], -originPixels[1]);

            targetImageTransform = appendTransform(
              targetImageTransform.id,
              refImageTransform,
              matrixToTransform(targetImageTransform.id, srcToTargetMat)
            );
            targetViewportTransform = {
              ...refViewportTransform,
              id: targetViewportTransform.id,
              tx: refViewportTransform.tx + (viewer.viewportSize.width - refViewportSize.width) / 2,
              ty: refViewportTransform.ty + (viewer.viewportSize.height - refViewportSize.height) / 2,
            };
          }
        }
      } else {
        let targetImageData = this.store.selectSnapshot(WorkbenchState.getRawImageDataByViewerId(viewer.id));
        let refImageData = imageDataEntities[refImageDataId];

        if (refImageData && targetImageData) {
          targetViewportTransform = {
            ...refViewportTransform,
            id: targetViewportTransform.id,
          };
          targetImageTransform = {
            ...refImageTransform,
            id: targetImageTransform.id,
          };
        }
      }

      if (targetViewportTransform && targetImageTransform) {
        if (targetImageTransform.id != refImageTransformId) {
          actions.push(new UpdateTransform(targetImageTransform.id, targetImageTransform));
        }
        if (targetViewportTransform.id != refViewportTransformId) {
          actions.push(new UpdateTransform(targetViewportTransform.id, targetViewportTransform));
        }
      }
    });
    this.store.dispatch(actions);
  }

  @Action(SyncViewerNormalizations)
  @ImmutableContext()
  public syncViewerNormalizations(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { normalization }: SyncViewerNormalizations
  ) {
    let state = getState();
    let visibleViewers = this.store.selectSnapshot(WorkbenchState.getVisibleViewerIds).map((id) => state.viewers[id]);
    let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);

    let actions: any[] = [];
    visibleViewers.forEach((viewer) => {
      let hduId = viewer.hduId;
      if (!hduId) {
        return;
      }
      let hdu = hduEntities[hduId] as ImageHdu;
      if (hdu.type != HduType.IMAGE) {
        return;
      }

      // prevent infinite loop by checking values
      // TODO: refactor normalizations to separate entities with IDs
      if (
        normalization.peakPercentile == hdu.normalizer.peakPercentile &&
        normalization.backgroundPercentile == hdu.normalizer.backgroundPercentile
      ) {
        return;
      }

      actions.push(
        new UpdateNormalizer(hdu.id, {
          peakPercentile: normalization.peakPercentile,
          backgroundPercentile: normalization.backgroundPercentile,
        })
      );
    });

    return dispatch(actions);
  }


  @Action(InvalidateRawImageTiles)
  @ImmutableContext()
  public invalidateRawImageTiles(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduId }: InvalidateRawImageTiles
  ) {

    let actions: any[] = [];
    actions.push(new InvalidateAutoPhotByHduId(hduId))
    actions.push(new InvalidateAutoCalByHduId(hduId))
    return dispatch(actions);
  }



  @Action(AddSources)
  @ImmutableContext()
  public addSources(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { }: AddSources
  ) {

    let actions: any[] = [];
    actions.push(new RemovePhotDatasByHduId())
    return dispatch(actions);
  }

  @Action(UpdateNormalizerSuccess)
  @ImmutableContext()
  public updateNormalizerSuccess(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduId }: UpdateNormalizerSuccess
  ) {

    this.store.dispatch(new SyncAfterglowHeaders(hduId))
  }

  @Action([SyncAfterglowHeaders, UpdateColorMap])
  @ImmutableContext()
  public syncAfterglowHeaders(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    action: SyncAfterglowHeaders | UpdateColorMap
  ) {

    let hduId = action.hduId;

    let nextSyncRequest$ = this.actions$.pipe(
      ofActionDispatched(SyncAfterglowHeaders),
      filter<SyncAfterglowHeaders>((a) => a.hduId == hduId)
    )

    of(action).pipe(
      delay(1000),
      take(1),
      takeUntil(nextSyncRequest$),
    ).subscribe(() => {
      let hdu = this.store.selectSnapshot(DataFilesState.getHduById(hduId));
      if (!isImageHdu(hdu)) return;

      let hdus = [hdu];

      let file = this.store.selectSnapshot(DataFilesState.getFileById(hdu.fileId));
      if (file.syncLayerNormalizers) hdus = this.store.selectSnapshot(DataFilesState.getHdusByFileId(file.id)).filter(isImageHdu)

      hdus.forEach(hdu => {
        let entries: HeaderEntry[] = []
        let normalizer = hdu.normalizer;
        entries.push({ key: AfterglowHeaderKey.AG_NMODE, value: normalizer.mode, comment: 'AgA background/peak mode' })
        if (normalizer.backgroundPercentile !== undefined) entries.push({ key: AfterglowHeaderKey.AG_BKGP, value: normalizer.backgroundPercentile, comment: 'AgA background percentile' })
        if (normalizer.peakPercentile !== undefined) entries.push({ key: AfterglowHeaderKey.AG_PEAKP, value: normalizer.peakPercentile, comment: 'AgA peak percentile' })
        if (normalizer.backgroundLevel !== undefined) entries.push({ key: AfterglowHeaderKey.AG_BKGL, value: normalizer.backgroundLevel, comment: 'AgA background level' })
        if (normalizer.peakLevel !== undefined) entries.push({ key: AfterglowHeaderKey.AG_PEAKL, value: normalizer.peakLevel, comment: 'AgA peak level' })
        entries.push({ key: AfterglowHeaderKey.AG_CMAP, value: normalizer.colorMapName, comment: 'AgA color map' })
        entries.push({ key: AfterglowHeaderKey.AG_STRCH, value: normalizer.stretchMode, comment: 'AgA stretch mode' })
        entries.push({ key: AfterglowHeaderKey.AG_INVRT, value: normalizer.inverted, comment: 'AgA inverted' })
        entries.push({ key: AfterglowHeaderKey.AG_SCALE, value: normalizer.layerScale, comment: 'AgA layer scale' })
        entries.push({ key: AfterglowHeaderKey.AG_OFFSET, value: normalizer.layerOffset, comment: 'AgA layer offset' })

        if (entries.length != 0) {
          this.store.dispatch([new UpdateHduHeader(hdu.id, entries)]);
        }
      })

    })




  }
}

