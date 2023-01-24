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
  WcsCalibrationPanelConfig,
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
  LoadLayer,
  CloseLayerSuccess,
  CloseDataFile,
  CenterRegionInViewport,
  LoadLayerHeaderSuccess,
  CloseDataFileSuccess,
  UpdateTransform,
  UpdateNormalizer,
  InvalidateRawImageTiles,
  LoadLayerHeader,
  InvalidateHeader,
  UpdateLayerHeader,
  InvalidateNormalizedImageTiles,
  UpdateNormalizerSuccess,
  UpdateColorMap,
  UpdateColorMapSuccess,
  UpdateBlendModeSuccess,
  UpdateAlphaSuccess,
  UpdateVisibilitySuccess,
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
  InitializeWorkbenchLayerState,
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
  RemovePhotDatasByLayerId,
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
  UpdateWcsCalibrationFileState,
  UpdateWcsCalibrationPanelConfig,
  CreateWcsCalibrationJob,
  ImportFromSurveyFail,
  SonificationCompleted,
  UpdateCustomMarkerSelectionRegion,
  EndCustomMarkerSelectionRegion,
  UpdateSettings,
  UpdateCalibrationSettings,
  InvalidateAutoCalByLayerId,
  InvalidateAutoPhotByLayerId,
  UpdateAutoPhotometry,
  UpdateAutoFieldCalibration,
  BatchPhotometerSources,
  SyncAfterglowHeaders,
  UpdateSourcePanelConfig,
  EndSourceSelectionRegion,
  UpdateSourceSelectionRegion,
  UpdateWcsCalibrationExtractionOverlay,
  InvalidateWcsCalibrationExtractionOverlayByLayerId,
  UpdateAlignmentSettings,
} from './workbench.actions';
import {
  getWidth,
  getHeight,
  getSourceCoordinates,
  DataFile,
  ImageLayer,
  ILayer,
  Header,
  PixelType,
  hasOverlap,
  TableLayer,
  isImageLayer,
} from '../data-files/models/data-file';

import { AfterglowCatalogService } from './services/afterglow-catalogs';
import { AfterglowFieldCalService } from './services/afterglow-field-cals';
import { CorrelationIdGenerator } from '../utils/correlated-action';
import { isPixelOpsJob, PixelOpsJob, PixelOpsJobResult } from '../jobs/models/pixel-ops';
import { JobType } from '../jobs/models/job-types';
import { AlignmentJob, AlignmentJobResult, AlignmentMode, isAlignmentJob } from '../jobs/models/alignment';
import { isWcsCalibrationJob, isWcsCalibrationJobResult, WcsCalibrationJob, WcsCalibrationJobResult, WcsCalibrationJobSettings } from '../jobs/models/wcs_calibration';
import { isStackingJob, StackingJob, StackingJobResult } from '../jobs/models/stacking';
import { ImportAssetsCompleted, ImportAssets } from '../data-providers/data-providers.actions';
import { ImmutableContext } from '@ngxs-labs/immer-adapter';
import { PosType, Source, sourceToAstrometryData } from './models/source';
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
  WorkbenchImageLayerState,
  WorkbenchTableLayerState,
  WorkbenchFileState,
  IWorkbenchState,
  WorkbenchStateType,
} from './models/workbench-file-state';
import { DataFilesState, DataFilesStateModel } from '../data-files/data-files.state';
import { LayerType } from '../data-files/models/data-file-type';
import {
  getViewportRegion,
  Transform,
  getImageToViewportTransform,
  appendTransform,
  matrixToTransform,
} from '../data-files/models/transformation';
import { isSonificationJob, SonificationJob, SonificationJobResult, SonificationJobSettings } from '../jobs/models/sonification';
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
import { JobService } from '../jobs/services/job.service';
import { Job } from '../jobs/models/job';
import { SourcePanelState } from './models/source-file-state';
import { WcsCalibrationFileState } from './models/wcs-calibration-file-state';

const workbenchStateDefaults: WorkbenchStateModel = {
  version: '3b25de65-93d3-435a-ff7b-ab357809cc',
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
  sourcePanelConfig: {
    showSourceLabels: false,
    showSourceMarkers: true,
    centroidClicks: true,
    planetCentroiding: false,
    showSourcesFromAllFiles: false,
    selectedSourceIds: [],
    coordMode: 'sky',
  },
  plottingPanelConfig: {
    interpolatePixels: false,
    centroidClicks: false,
    planetCentroiding: false,
    plotterSyncEnabled: false,
    plotMode: '1D',
  },
  photometryPanelConfig: {
    showSourceApertures: true,
    batchPhotFormData: {
      selectedLayerIds: [],
    },
    batchCalibrationEnabled: false,
    batchPhotJobId: '',
    batchCalJobId: '',
    creatingBatchJobs: false,
    autoPhot: true
  },
  pixelOpsPanelConfig: {
    currentPixelOpsJobId: '',
    showCurrentPixelOpsJobState: true,
    pixelOpsFormData: {
      operand: '+',
      mode: 'image',
      selectedLayerIds: [],
      auxLayerId: '',
      auxLayerIds: [],
      primaryLayerIds: [],
      scalarValue: 1,
      inPlace: false,
      opString: '',
      kernelFilter: KernelFilter.MEDIAN_FILTER,
      kernelSize: 3,
      kernelSigma: 3
    },
  },
  aligningPanelConfig: {
    selectedLayerIds: [],
    mosaicMode: false,
    mosaicSearchRadius: 1,
    refLayerId: '',
    currentAlignmentJobId: '',
  },
  stackingPanelConfig: {
    stackFormData: {
      selectedLayerIds: [],
      propagateMask: false,
      mode: 'average',
      scaling: 'none',
      rejection: 'none',
      smartStacking: 'none',
      percentile: 50,
      low: 0,
      high: 0,
      equalizeAdditive: false,
      equalizeOrder: 0,
      equalizeMultiplicative: false,
      multiplicativePercentile: 99.9,
      equalizeGlobal: false,

    },
    currentStackingJobId: '',
  },
  wcsCalibrationPanelConfig: {
    selectedLayerIds: [],
    activeJobId: '',
    mode: 'platesolve',
    refLayerId: null,
    minScale: 0.1,
    maxScale: 10,
    radius: 1,
    maxSources: 100,
    showOverlay: false,
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
  layerIdToWorkbenchStateIdMap: {},
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
  nextSourcePanelStateId: 0,
  sourcePanelStateEntities: {},
  sourcePanelStateIds: [],
  nextWcsCalibrationPanelStateId: 0,
  wcsCalibrationPanelStateEntities: {},
  wcsCalibrationPanelStateIds: [],
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
    private dataFileService: AfterglowDataFileService,
    private jobService: JobService
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
    return state.sourcePanelConfig.showSourceLabels;
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


  @Selector([WorkbenchState.getSettings])
  public static getAlignmentSettings(settings: GlobalSettings) {
    return settings.alignment;
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
  public static getSourcePanelConfig(state: WorkbenchStateModel) {
    return state.sourcePanelConfig;
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
  public static getSourceCoordMode(state: WorkbenchStateModel) {
    return state.sourcePanelConfig.coordMode;
  }

  @Selector()
  public static getShowSourcesFromAllFiles(state: WorkbenchStateModel) {
    return state.sourcePanelConfig.showSourcesFromAllFiles;
  }

  @Selector()
  public static getWcsCalibrationPanelConfig(state: WorkbenchStateModel) {
    return state.wcsCalibrationPanelConfig;
  }

  @Selector()
  public static getWcsCalibrationPanelStateEntities(state: WorkbenchStateModel) {
    return state.wcsCalibrationPanelStateEntities;
  }

  @Selector()
  public static getWcsCalibrationPanelStateIds(state: WorkbenchStateModel) {
    return state.wcsCalibrationPanelStateIds;
  }

  @Selector()
  public static getWcsCalibrationPanelStates(state: WorkbenchStateModel) {
    return Object.values(state.wcsCalibrationPanelStateEntities);
  }

  @Selector([WorkbenchState.getPhotometryPanelStateEntities])
  public static getWcsCalibrationPanelStateById(entities: { [id: string]: PhotometryPanelState }) {
    return (wcsCalibrationPanelStateId: string) => {
      return entities[wcsCalibrationPanelStateId];
    };
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
  public static getLayerIdToWorkbenchStateIdMap(state: WorkbenchStateModel) {
    return state.layerIdToWorkbenchStateIdMap;
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

  static getSonificationPanelStateIdByLayerId(layerId: string) {
    return createSelector(
      [WorkbenchState.getLayerIdToWorkbenchStateIdMap, WorkbenchState.getWorkbenchStateEntities],
      (
        layerIdToWorkbenchStateId: { [id: string]: string },
        workbenchStateEntities: { [id: string]: IWorkbenchState }
      ) => {
        return (workbenchStateEntities[layerIdToWorkbenchStateId[layerId]] as WorkbenchImageLayerState)?.sonificationPanelStateId || null;
      }
    );
  }

  static getSonificationPanelStateByLayerId(layerId: string) {
    return createSelector(
      [WorkbenchState.getSonificationPanelStateIdByLayerId(layerId), WorkbenchState.getSonificationPanelStateEntities],
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


  /**
   * Sources
   */

  @Selector()
  public static getSourcePanelStateEntities(state: WorkbenchStateModel) {
    return state.sourcePanelStateEntities;
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
  public static getFilteredLayerIds(files: DataFile[]) {
    let result: string[] = [];
    return files.reduce((layerIds, file, index) => layerIds.concat(file.layerIds), result);
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

  static getWorkbenchStateByLayerId(layerId: string) {
    return createSelector(
      [WorkbenchState.getLayerIdToWorkbenchStateIdMap, WorkbenchState.getWorkbenchStateEntities],
      (
        layerIdToWorkbenchStateId: { [id: string]: string },
        workbenchStateEntities: { [id: string]: IWorkbenchState }
      ) => {
        return workbenchStateEntities[layerIdToWorkbenchStateId[layerId]] || null;
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

  public static getFileLayersByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getFileByViewerId(viewerId), DataFilesState.getLayerEntities],
      (file: DataFile, layerEntities: { [id: string]: ILayer }) => {
        if (!file || !file.layerIds) return [];
        return file.layerIds.map((layerId) => layerEntities[layerId]).sort((a, b) => (a?.order > b?.order ? 1 : -1));
      }
    );
  }

  public static getLayerByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getViewerById(viewerId), DataFilesState.getLayerEntities],
      (viewer: Viewer, layerEntities: { [id: string]: ILayer }) => {
        return layerEntities[viewer?.layerId] || null;
      }
    );
  }

  public static getImageLayerByViewerId(viewerId: string) {
    return createSelector([WorkbenchState.getLayerByViewerId(viewerId)], (layer: ILayer) => {
      return layer?.type == LayerType.IMAGE ? (layer as ImageLayer) : null;
    });
  }

  public static getTableLayerByViewerId(viewerId: string) {
    return createSelector([WorkbenchState.getLayerByViewerId(viewerId)], (layer: ILayer) => {
      return layer?.type == LayerType.TABLE ? (layer as TableLayer) : null;
    });
  }

  public static getLayerHeaderByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getLayerByViewerId(viewerId), DataFilesState.getHeaderEntities],
      (layer: ILayer, headerEntities: { [id: string]: Header }) => {
        return headerEntities[layer?.headerId] || null;
      }
    );
  }

  public static getFileHeaderByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getFileLayersByViewerId(viewerId), DataFilesState.getHeaderEntities],
      (layers: ILayer[], headerEntities: { [id: string]: Header }) => {
        return !layers || layers.length == 0 ? null : headerEntities[layers[0]?.headerId];
      }
    );
  }

  public static getFileImageHeaderByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getFileLayersByViewerId(viewerId), DataFilesState.getHeaderEntities],
      (layers: ILayer[], headerEntities: { [id: string]: Header }) => {
        if (!layers) return null;
        layers = layers.filter(isImageLayer).filter(layer => layer.visible);
        return layers.length == 0 ? null : headerEntities[layers[0]?.headerId];
      }
    );
  }

  public static getFileTableHeaderByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getFileLayersByViewerId(viewerId), DataFilesState.getHeaderEntities],
      (layers: ILayer[], headerEntities: { [id: string]: Header }) => {
        layers = layers.filter((layer) => layer.type == LayerType.TABLE) as ImageLayer[];
        return !layers || layers.length == 0 ? null : headerEntities[layers[0]?.headerId];
      }
    );
  }

  public static getHeaderByViewerId(viewerId: string) {
    return createSelector(
      [
        WorkbenchState.getViewerById(viewerId),
        WorkbenchState.getLayerHeaderByViewerId(viewerId),
        WorkbenchState.getFileHeaderByViewerId(viewerId),
      ],
      (viewer: Viewer, layerHeader: Header, fileHeader: Header) => {
        return viewer?.layerId ? layerHeader : fileHeader;
      }
    );
  }

  public static getImageHeaderByViewerId(viewerId: string) {
    return createSelector(
      [
        WorkbenchState.getViewerById(viewerId),
        WorkbenchState.getLayerHeaderByViewerId(viewerId),
        WorkbenchState.getFileImageHeaderByViewerId(viewerId),
      ],
      (viewer: Viewer, layerHeader: Header, fileHeader: Header) => {
        return viewer?.layerId ? layerHeader : fileHeader;
      }
    );
  }

  public static getRawImageDataByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getImageLayerByViewerId(viewerId), DataFilesState.getImageDataEntities],
      (imageLayer: ImageLayer, imageDataEntities: { [id: string]: IImageData<PixelType> }) => {
        return imageDataEntities[imageLayer?.rawImageDataId] || null;
      }
    );
  }

  public static getLayerNormalizedImageDataByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getImageLayerByViewerId(viewerId), DataFilesState.getImageDataEntities],
      (imageLayer: ImageLayer, imageDataEntities: { [id: string]: IImageData<PixelType> }) => {
        return (imageDataEntities[imageLayer?.rgbaImageDataId] as IImageData<Uint32Array>) || null;
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
        WorkbenchState.getLayerNormalizedImageDataByViewerId(viewerId),
        WorkbenchState.getFileNormalizedImageDataByViewerId(viewerId),
      ],
      (viewer: Viewer, layerImageData: IImageData<PixelType>, fileImageData: IImageData<PixelType>) => {
        return (viewer?.layerId ? layerImageData : fileImageData) as IImageData<Uint32Array>;
      }
    );
  }

  public static getLayerImageTransformByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getImageLayerByViewerId(viewerId), DataFilesState.getTransformEntities],
      (imageLayer: ImageLayer, transformEntities: { [id: string]: Transform }) => {
        return transformEntities[imageLayer?.imageTransformId] || null;
      }
    );
  }

  public static getLayerViewportTransformByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getImageLayerByViewerId(viewerId), DataFilesState.getTransformEntities],
      (imageLayer: ImageLayer, transformEntities: { [id: string]: Transform }) => {
        return transformEntities[imageLayer?.viewportTransformId] || null;
      }
    );
  }

  public static getLayerImageToViewportTransformByViewerId(viewerId: string) {
    return createSelector(
      [
        WorkbenchState.getLayerImageTransformByViewerId(viewerId),
        WorkbenchState.getLayerViewportTransformByViewerId(viewerId),
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
        WorkbenchState.getLayerImageTransformByViewerId(viewerId),
      ],
      (viewer: Viewer, fileImageTransform: Transform, layerImageTransform: Transform) => {
        return viewer?.layerId ? layerImageTransform : fileImageTransform;
      }
    );
  }

  public static getViewportTransformByViewerId(viewerId: string) {
    return createSelector(
      [
        WorkbenchState.getViewerById(viewerId),
        WorkbenchState.getFileViewportTransformByViewerId(viewerId),
        WorkbenchState.getLayerViewportTransformByViewerId(viewerId),
      ],
      (viewer: Viewer, fileViewportTransform: Transform, layerViewportTransform: Transform) => {
        return viewer?.layerId ? layerViewportTransform : fileViewportTransform;
      }
    );
  }

  public static getImageToViewportTransformByViewerId(viewerId: string) {
    return createSelector(
      [
        WorkbenchState.getViewerById(viewerId),
        WorkbenchState.getFileImageToViewportTransformByViewerId(viewerId),
        WorkbenchState.getLayerImageToViewportTransformByViewerId(viewerId),
      ],
      (viewer: Viewer, fileImageToViewportTransform: Transform, layerImageToViewportTransform: Transform) => {
        return viewer?.layerId ? layerImageToViewportTransform : fileImageToViewportTransform;
      }
    );
  }

  static getWorkbenchStateIdByViewerId(viewerId: string) {
    return createSelector(
      [
        WorkbenchState.getViewerEntities,
        WorkbenchState.getLayerIdToWorkbenchStateIdMap,
        WorkbenchState.getFileIdToWorkbenchStateIdMap,
      ],
      (
        viewerEntities: { [id: string]: Viewer },
        layerIdToWorkbenchStateId: { [id: string]: string },
        fileIdToWorkbenchStateId: { [id: string]: string }
      ) => {
        let viewer = viewerEntities[viewerId];
        if (!viewer) return null;
        return viewer.layerId ? layerIdToWorkbenchStateId[viewer.layerId] : fileIdToWorkbenchStateId[viewer.fileId];
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
        if ([WorkbenchStateType.FILE, WorkbenchStateType.IMAGE_LAYER].includes(workbenchState?.type)) {
          let s = workbenchState as WorkbenchFileState | WorkbenchImageLayerState;
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
        if ([WorkbenchStateType.FILE, WorkbenchStateType.IMAGE_LAYER].includes(workbenchState?.type)) {
          let s = workbenchState as WorkbenchFileState | WorkbenchImageLayerState;
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
        if ([WorkbenchStateType.IMAGE_LAYER].includes(workbenchState?.type)) {
          let s = workbenchState as WorkbenchImageLayerState;
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
        if ([WorkbenchStateType.IMAGE_LAYER].includes(workbenchState?.type)) {
          let s = workbenchState as WorkbenchImageLayerState;
          return photometryPanelStateEntities[s.photometryPanelStateId] || null;
        } else {
          return null;
        }
      }
    );
  }

  static getWcsCalibrationPanelStateByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getWorkbenchStateByViewerId(viewerId), WorkbenchState.getWcsCalibrationPanelStateEntities],
      (workbenchState: IWorkbenchState, wcsCalibrationPanelStateEntities: { [id: string]: WcsCalibrationFileState }) => {
        if ([WorkbenchStateType.IMAGE_LAYER].includes(workbenchState?.type)) {
          let s = workbenchState as WorkbenchImageLayerState;
          return wcsCalibrationPanelStateEntities[s.wcsCalibrationPanelStateId] || null;
        } else {
          return null;
        }
      }
    );
  }

  static getSourcePanelStateByViewerId(viewerId: string) {
    return createSelector(
      [WorkbenchState.getWorkbenchStateByViewerId(viewerId), WorkbenchState.getSourcePanelStateEntities],
      (workbenchState: IWorkbenchState, sourcePanelStateEntities: { [id: string]: SourcePanelState }) => {
        if ([WorkbenchStateType.IMAGE_LAYER].includes(workbenchState?.type)) {
          let s = workbenchState as WorkbenchImageLayerState;
          return sourcePanelStateEntities[s.sourcePanelStateId] || null;
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
  public static getFocusedViewerLayerId(focusedViewer: Viewer) {
    return focusedViewer?.layerId;
  }

  @Selector([WorkbenchState.getFocusedViewerLayerId, DataFilesState.getLayerEntities])
  public static getFocusedViewerLayer(layerId: string, layerEntities: { [id: string]: ILayer }) {
    return layerEntities[layerId] || null;
  }

  @Selector([WorkbenchState.getFocusedViewerLayer])
  public static getFocusedViewerImageLayer(focusedViewerLayer: ILayer) {
    if (!focusedViewerLayer || focusedViewerLayer.type != LayerType.IMAGE) {
      return null;
    }
    return focusedViewerLayer as ImageLayer;
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
    let layerEntities = this.store.selectSnapshot(DataFilesState.getLayerEntities);

    //load visible Layers which were pulled from local storage
    let viewerEntities = state.viewers;
    let viewers = Object.values(this.store.selectSnapshot(WorkbenchState.getViewerPanelEntities))
      .map((panel) => panel.selectedViewerId)
      .filter((viewerId) => viewerId in viewerEntities)
      .map((viewerId) => viewerEntities[viewerId]);

    let layers: ILayer[] = [];
    viewers.forEach((viewer) => {
      if (viewer.layerId) {
        if (viewer.layerId in layerEntities) {
          layers.push(layerEntities[viewer.layerId]);
        }
      } else if (viewer.fileId && viewer.fileId in dataFileEntities) {
        layers.push(...dataFileEntities[viewer.fileId].layerIds.map((layerId) => layerEntities[layerId]));
      }
    });

    let actions: Array<LoadLayer> = [];
    let headerEntities = this.store.selectSnapshot(DataFilesState.getHeaderEntities);
    layers.forEach((layer) => {
      let header = headerEntities[layer.headerId];
      if (!header || (header.loaded && header.isValid) || header.loading) return;

      actions.push(new LoadLayer(layer.id));
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
    let layerEntities = this.store.selectSnapshot(DataFilesState.getLayerEntities);
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
      refHeader = this.store.selectSnapshot(WorkbenchState.getImageHeaderByViewerId(refViewer.id));
      refImageDataId = this.store.selectSnapshot(WorkbenchState.getNormalizedImageDataByViewerId(refViewer.id))?.id;

      if (refViewer.layerId) {
        let refLayer = layerEntities[refViewer.layerId] as ImageLayer;
        if (refLayer.type == LayerType.IMAGE) {
          refNormalization = refLayer.normalizer;
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
        // ensure that the new file/layer is synced to what was previously in the viewer
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

    let layerIds = viewer.layerId ? [viewer.layerId] : fileEntities[viewer.fileId].layerIds;
    let actions = layerIds.map((layerId) => new LoadLayer(layerId));

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
      if (viewer.fileId || viewer.layerId) {
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
          dispatch(new SetViewerFile(sourceSelectedViewer.id, sourceSelectedViewer.fileId, sourceSelectedViewer.layerId));
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
    { viewerId, fileId, layerId: layerId }: SetViewerFile
  ) {
    let state = getState();
    let refViewer = state.viewers[viewerId];
    let layerEntities = this.store.selectSnapshot(DataFilesState.getLayerEntities);
    let headerEntities = this.store.selectSnapshot(DataFilesState.getHeaderEntities);
    let fileEntities = this.store.selectSnapshot(DataFilesState.getFileEntities);

    if (!refViewer) return null;

    let refViewportTransform = this.store.selectSnapshot(WorkbenchState.getViewportTransformByViewerId(refViewer.id));
    let refImageTransform = this.store.selectSnapshot(WorkbenchState.getImageTransformByViewerId(refViewer.id));
    let refHeader = this.store.selectSnapshot(WorkbenchState.getImageHeaderByViewerId(refViewer.id));
    let refImageData = this.store.selectSnapshot(WorkbenchState.getNormalizedImageDataByViewerId(refViewer.id));

    let refNormalization: PixelNormalizer;
    if (refViewer.layerId) {
      let refLayer = layerEntities[refViewer.layerId] as ImageLayer;
      if (refLayer.type == LayerType.IMAGE) {
        refNormalization = refLayer.normalizer;
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
      viewer.layerId = layerId;
      return state;
    });

    function onLoadComplete(store: Store) {
      //normalization
      if (refHeader && refImageTransform && refViewportTransform && refImageData) {
        // ensure that the new file/layer is synced to what was previously in the viewer
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

    let layerIds = layerId ? [layerId] : fileEntities[fileId].layerIds;
    let actions = layerIds.map((layerId) => new LoadLayer(layerId));

    let cancel$ = this.actions$.pipe(
      ofActionDispatched(SetViewerFile),
      filter<SetViewerFile>(
        (action) => action.viewerId == viewerId && (action.fileId != fileId || action.layerId != layerId)
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
    let dataFiles = this.store.selectSnapshot(DataFilesState.getLayerEntities);

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
    actions.push(new InvalidateAutoPhotByLayerId())
    actions.push(new InvalidateAutoCalByLayerId())
    actions.push(new InvalidateWcsCalibrationExtractionOverlayByLayerId())
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
    actions.push(new InvalidateAutoPhotByLayerId())
    actions.push(new InvalidateAutoCalByLayerId())
    return dispatch(actions);
  }

  @Action(UpdateAlignmentSettings)
  @ImmutableContext()
  public updateAlignmentSettings(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { changes }: UpdateAlignmentSettings
  ) {
    setState((state: WorkbenchStateModel) => {
      let o = state.settings.alignment;
      state.settings.alignment = {
        ...o,
        ...changes,
        wcsModeSettings: {
          ...o.wcsModeSettings,
          ...changes?.wcsModeSettings
        },
        sourceModeSettings: {
          ...o.sourceModeSettings,
          ...changes?.sourceModeSettings,
          autoModeSettings: {
            ...o.sourceModeSettings.autoModeSettings,
            ...changes?.sourceModeSettings?.autoModeSettings,
          },
          manualModeSettings: {
            ...o.sourceModeSettings.manualModeSettings,
            ...changes?.sourceModeSettings?.manualModeSettings,
          }
        },
        featureModeSettings: {
          ...state.settings.alignment.featureModeSettings,
          ...changes?.featureModeSettings,
        },
        pixelModeSettings: {
          ...o.pixelModeSettings,
          ...changes?.pixelModeSettings,
        },
      }
      return state;
    });

    // //side-effects
    // let actions: any[] = [];
    // // clear all auto-cal jobs to trigger recalibration of photometry
    // actions.push(new InvalidateAutoPhotByLayerId())
    // actions.push(new InvalidateAutoCalByLayerId())
    // return dispatch(actions);
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
    actions.push(new InvalidateAutoCalByLayerId());
    actions.push(new InvalidateWcsCalibrationExtractionOverlayByLayerId())
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
    actions.push(new InvalidateAutoCalByLayerId())
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

  @Action(UpdateSourcePanelConfig)
  @ImmutableContext()
  public updateSourcePanelConfig(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { changes }: UpdateSourcePanelConfig
  ) {
    setState((state: WorkbenchStateModel) => {
      state.sourcePanelConfig = {
        ...state.sourcePanelConfig,
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
      state.aligningPanelConfig = {
        ...state.aligningPanelConfig,
        ...changes,
      };

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


      return state;
    });
  }

  @Action(UpdateWcsCalibrationFileState)
  @ImmutableContext()
  public updateWcsCalibrationPanelState(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { layerId, changes }: UpdateWcsCalibrationFileState
  ) {
    setState((state: WorkbenchStateModel) => {
      let workbenchState = state.workbenchStateEntities[state.layerIdToWorkbenchStateIdMap[layerId]];
      if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_LAYER) return state;
      let layerState = workbenchState as WorkbenchImageLayerState;
      let wcsFileState = state.wcsCalibrationPanelStateEntities[layerState.wcsCalibrationPanelStateId];
      state.wcsCalibrationPanelStateEntities[layerState.wcsCalibrationPanelStateId] = {
        ...wcsFileState,
        ...changes,
      };
      return state;
    });
  }

  @Action(UpdateWcsCalibrationPanelConfig)
  @ImmutableContext()
  public updateWcsCalibrationSettings(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { changes }: UpdateWcsCalibrationPanelConfig
  ) {
    setState((state: WorkbenchStateModel) => {
      state.wcsCalibrationPanelConfig = {
        ...state.wcsCalibrationPanelConfig,
        ...changes,
      };

      return state;
    });
  }


  @Action(UpdateWcsCalibrationExtractionOverlay)
  @ImmutableContext()
  public updateWcsCalibrationExtractionOverlay(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { viewerId }: UpdateWcsCalibrationExtractionOverlay
  ) {
    let state = getState();

    let imageLayer = this.store.selectSnapshot(WorkbenchState.getImageLayerByViewerId(viewerId))
    if (!imageLayer) return;
    let layerId = imageLayer.id;

    let coordMode = state.sourcePanelConfig.coordMode;
    let showSourcesFromAllFiles = state.sourcePanelConfig.showSourcesFromAllFiles;

    let workbenchState = this.store.selectSnapshot(WorkbenchState.getWorkbenchStateByLayerId(layerId))
    if (!workbenchState) return;
    if (workbenchState.type == WorkbenchStateType.IMAGE_LAYER) {
      let layerState = workbenchState as WorkbenchImageLayerState;
      let wcsCalibrationPanelStateId = layerState.wcsCalibrationPanelStateId;

      let sourceExtractionSettings = toSourceExtractionJobSettings(state.settings);

      let job: SourceExtractionJob = {
        type: JobType.SourceExtraction,
        sourceExtractionSettings: sourceExtractionSettings,
        id: null,
        fileIds: [layerId],
        mergeSources: true,
        state: null,
      };

      setState((state: WorkbenchStateModel) => {
        let photState = state.wcsCalibrationPanelStateEntities[wcsCalibrationPanelStateId];
        photState.sourceExtractionOverlayIsValid = true;
        photState.sourceExtractionJobId = null;
        return state;
      });

      let job$ = this.jobService.createJob(job);
      return job$.pipe(
        tap(job => {
          if (job.id) {
            setState((state: WorkbenchStateModel) => {
              state.wcsCalibrationPanelStateEntities[wcsCalibrationPanelStateId].sourceExtractionJobId = job.id;
              return state;
            });
          }
          if (job.state.status == 'completed') {


          }
        })
      )
    }
  }

  @Action(InvalidateWcsCalibrationExtractionOverlayByLayerId)
  @ImmutableContext()
  public invalidateWcsCalibrationExtractionOverlayByLayerId(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { layerId: layerId }: InvalidateWcsCalibrationExtractionOverlayByLayerId
  ) {
    setState((state: WorkbenchStateModel) => {
      let workbenchStateIds = state.workbenchStateIds;
      if (layerId) workbenchStateIds = [state.layerIdToWorkbenchStateIdMap[layerId]]
      workbenchStateIds.forEach((stateId) => {
        if (state.workbenchStateEntities[stateId].type != WorkbenchStateType.IMAGE_LAYER) {
          return;
        }
        let layerState = state.workbenchStateEntities[stateId] as WorkbenchImageLayerState;
        state.wcsCalibrationPanelStateEntities[layerState.wcsCalibrationPanelStateId].sourceExtractionOverlayIsValid = false;
      });
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
    { layers, correlationId }: LoadLibrarySuccess
  ) {
    let state = getState();
    let newLayerIds = layers.map((layer) => layer.id).filter((id) => !(id in state.layerIdToWorkbenchStateIdMap));
    dispatch(newLayerIds.map((layerId) => new InitializeWorkbenchLayerState(layerId)));

    let newFileIds = layers.map((layer) => layer.fileId).filter((id) => !(id in state.fileIdToWorkbenchStateIdMap));
    newFileIds = [...new Set(newFileIds)];
    dispatch(newFileIds.map((fileId) => new InitializeWorkbenchFileState(fileId)));

    //TODO: remove workbench file states for files which no longer exist

    //when layers are merged or split,  viewers may need to be updated with the new file ID
    let fileEntities = this.store.selectSnapshot(DataFilesState.getFileEntities);
    state.viewerIds.forEach((viewerId) => {
      let viewer = state.viewers[viewerId];
      if (viewer.fileId && fileEntities[viewer.fileId]) {
        return;
      }
      dispatch(new CloseViewer(viewerId));
    });
    // setState((state: WorkbenchStateModel) => {
    //   let layerEntities = this.store.selectSnapshot(DataFilesState.getLayerEntities)
    //   state.aligningPanelConfig.alignFormData.selectedLayerIds = state.aligningPanelConfig.alignFormData.selectedLayerIds.filter(layerId => layerId in layerEntities)
    //   state.stackingPanelConfig.stackFormData.selectedLayerIds = state.stackingPanelConfig.stackFormData.selectedLayerIds.filter(layerId => layerId in layerEntities)
    //   return state;
    // });

    // let focusedViewer = this.store.selectSnapshot(WorkbenchState.getFocusedViewer);

    // if (
    //   !focusedViewer || //no viewers have focus
    //   (!focusedViewer.layerId && !focusedViewer.fileId) //focused viewer has no assigned file
    // ) {
    //   if (layers[0]) {
    //     dispatch(
    //       new SelectDataFileListItem({
    //         fileId: layers[0].fileId,
    //         layerId: layers[0].id,
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
        if (viewer.fileId == file.id || file.layerIds.includes(viewer.layerId)) {
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

  @Action(CloseLayerSuccess)
  @ImmutableContext()
  public removeDataFileSuccess(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { layerId: layerId }: CloseLayerSuccess
  ) {
    setState((state: WorkbenchStateModel) => {
      state.aligningPanelConfig.selectedLayerIds = state.aligningPanelConfig.selectedLayerIds.filter(
        (id) => id != layerId
      );
      state.pixelOpsPanelConfig.pixelOpsFormData.primaryLayerIds = state.pixelOpsPanelConfig.pixelOpsFormData.primaryLayerIds.filter(
        (id) => id != layerId
      );
      state.pixelOpsPanelConfig.pixelOpsFormData.auxLayerIds = state.pixelOpsPanelConfig.pixelOpsFormData.auxLayerIds.filter(
        (id) => id != layerId
      );
      state.pixelOpsPanelConfig.pixelOpsFormData.auxLayerId =
        state.pixelOpsPanelConfig.pixelOpsFormData.auxLayerId == layerId
          ? ''
          : state.pixelOpsPanelConfig.pixelOpsFormData.auxLayerId;
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
    { fileId, layerId: layerId, keepOpen }: SelectFile
  ) {
    let state = getState();
    let layerEntities = this.store.selectSnapshot(DataFilesState.getLayerEntities);
    let fileEntities = this.store.selectSnapshot(DataFilesState.getFileEntities);

    let file = fileEntities[fileId];
    let layer = layerId ? layerEntities[layerId] : null;

    let viewers = Object.values(state.viewers);

    //check if file is already open
    let targetViewer = viewers.find((viewer) => viewer.fileId == fileId && viewer.layerId == layerId);
    if (targetViewer) {
      dispatch(new SetFocusedViewer(targetViewer.id));
      if (keepOpen && !targetViewer.keepOpen) {
        dispatch(new KeepViewerOpen(targetViewer.id));
      }
      return;
    }

    //check if existing viewer is available
    // if no Layer is specified,  use an image viewer for composite image data
    let focusedPanel: ViewerPanel = state.viewerLayoutItems[state.focusedViewerPanelId] as ViewerPanel;
    let targetViewerType = !layer || layer.type == LayerType.IMAGE ? ViewerType.IMAGE : ViewerType.TABLE;
    targetViewer = viewers.find(
      (viewer) =>
        !viewer.keepOpen &&
        viewer.type == targetViewerType &&
        (!focusedPanel || focusedPanel.viewerIds.includes(viewer.id))
    );
    if (targetViewer) {
      //temporary viewer exists
      dispatch(new SetViewerFile(targetViewer.id, file.id, layer ? layer.id : ''));
      if (keepOpen) {
        dispatch(new KeepViewerOpen(targetViewer.id));
      }
      return;
    }

    let viewerBase = {
      id: '',
      fileId: file.id,
      layerId: layer ? layer.id : '',
      keepOpen: keepOpen,
      viewportSize: {
        width: 0,
        height: 0,
      },
    };

    if (targetViewerType == ViewerType.IMAGE) {
      let headerId: string = '';
      let imageDataId: string = '';
      if (layer) {
        headerId = layer.headerId;
        imageDataId = (layer as ImageLayer).rgbaImageDataId;
      } else {
        imageDataId = file.rgbaImageDataId;

        //use header from first image layer
        let firstImageLayerId = file.layerIds.find((layerId) => layerEntities[layerId].type == LayerType.IMAGE);
        if (firstImageLayerId) {
          headerId = layerEntities[firstImageLayerId].headerId;
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
    let dataFiles = this.store.selectSnapshot(DataFilesState.getLayerEntities);
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
    { layerId: layerId }: SonificationRegionChanged
  ) {
    let state = getState();
    let workbenchState = state.workbenchStateEntities[state.layerIdToWorkbenchStateIdMap[layerId]];
    if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_LAYER) return;
    let layer = this.store.selectSnapshot(DataFilesState.getLayerEntities)[layerId] as ImageLayer;
    let layerState = workbenchState as WorkbenchImageLayerState;
    let sonifierState = state.sonificationPanelStateEntities[layerState.sonificationPanelStateId];

    if (sonifierState.regionMode == SonifierRegionMode.CUSTOM && sonifierState.viewportSync) {
      //find viewer which contains file
      let viewer = this.store.selectSnapshot(WorkbenchState.getViewers).find((viewer) => viewer.layerId == layerId);
      if (viewer && viewer.viewportSize && viewer.viewportSize.width != 0 && viewer.viewportSize.height != 0 && sonifierState.regionHistoryIndex !== null) {
        let region = sonifierState.regionHistory[sonifierState.regionHistoryIndex];
        dispatch(
          new CenterRegionInViewport(
            layer.rawImageDataId,
            layer.imageTransformId,
            layer.viewportTransformId,
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
        catalogs.forEach(catalog => {
          if (!catalog.filterLookup) catalog.filterLookup = {};
          let red = (catalog.mags['R'] ? 'R' : catalog.filterLookup['R']) || '';
          if (red) catalog.filterLookup['Red'] = red;
          let green = (catalog.mags['V'] ? 'V' : catalog.filterLookup['V']) || '';
          if (green) catalog.filterLookup['Green'] = green;
          let blue = (catalog.mags['B'] ? 'B' : catalog.filterLookup['B']) || '';
          if (blue) catalog.filterLookup['Blue'] = blue;
          let lum = (catalog.mags['R'] ? 'R' : catalog.filterLookup['R']) || '';
          if (lum) catalog.filterLookup['Lum'] = lum;
        })

        setState((state: WorkbenchStateModel) => {
          state.catalogs = catalogs;
          let catalogNames = catalogs.map(catalog => catalog.name);
          state.selectedCatalogId = catalogs.length != 0 ? catalogs[0].name : '';

          //remove catalogs no longer available
          state.settings.calibration.selectedCatalogs = state.settings.calibration.selectedCatalogs.filter(name => catalogNames.includes(name));
          //remove catalogs no longer available
          state.settings.calibration.catalogOrder = state.settings.calibration.catalogOrder.filter(name => state.catalogs.find(c => c.name == name))
          //add new catalogs
          state.settings.calibration.catalogOrder = [...state.settings.calibration.catalogOrder, ...catalogNames.filter(name => !state.settings.calibration.catalogOrder.includes(name))]

          if (catalogs.length != 0 && state.settings.calibration.selectedCatalogs.length == 0) {
            let defaultCatalog = catalogs.find(c => c.name.includes('APASS')) || catalogs[0];
            state.settings.calibration.selectedCatalogs = [defaultCatalog.name];
          }
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
    let layers = this.store.selectSnapshot(DataFilesState.getLayers);
    let dataFiles = this.store.selectSnapshot(DataFilesState.getFileEntities);
    let data = state.pixelOpsPanelConfig.pixelOpsFormData;
    let imageLayers = [...data.selectedLayerIds, ...data.primaryLayerIds].map((id) => layers.find((f) => f.id == id)).filter(isNotEmpty);
    let auxFileIds: string[] = [];
    let op;
    if (data.mode == 'scalar') {
      op = `img ${data.operand} ${data.scalarValue}`;
    } else if (data.mode == 'image') {
      op = `img ${data.operand} aux_img`;
      auxFileIds.push(data.auxLayerId);
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
      fileIds: imageLayers
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
    };


    let job$ = this.jobService.createJob(job);
    return job$.pipe(
      tap(job => {
        if (job.id) {
          setState((state: WorkbenchStateModel) => {
            state.pixelOpsPanelConfig.currentPixelOpsJobId = job.id;
            return state;
          });
        }
        if (job.state.status == 'completed' && job.result) {
          let actions: any[] = [];
          if (!isPixelOpsJob(job)) return;
          let result = job.result;
          if (result.errors.length != 0) {
            console.error('Errors encountered during pixel ops job: ', result.errors);
          }
          if (result.warnings.length != 0) {
            console.error('Warnings encountered during pixel ops job: ', result.warnings);
          }


          if (job.inplace) {
            let layerIds = result.fileIds.map((id) => id.toString());
            layerIds.forEach((layerId) => actions.push(new InvalidateRawImageTiles(layerId)));
            layerIds.forEach((layerId) => actions.push(new InvalidateHeader(layerId)));
          }

          actions.push(new LoadLibrary());
          dispatch(actions);
        }
      })
    )
  }

  @Action(CreateAdvPixelOpsJob)
  @ImmutableContext()
  public createAdvPixelOpsJob(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { }: CreateAdvPixelOpsJob
  ) {
    let state = getState();
    let layers = this.store.selectSnapshot(DataFilesState.getLayers);
    let dataFiles = this.store.selectSnapshot(DataFilesState.getFileEntities);
    let data = state.pixelOpsPanelConfig.pixelOpsFormData;
    let imageLayers = [...data.selectedLayerIds, ...data.primaryLayerIds].map((id) => layers.find((f) => f.id == id)).filter(isNotEmpty);
    let auxImageFiles = data.auxLayerIds.map((id) => layers.find((f) => f.id == id)).filter(isNotEmpty);
    let job: PixelOpsJob = {
      type: JobType.PixelOps,
      id: null,
      fileIds: imageLayers
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
    };

    let job$ = this.jobService.createJob(job);
    return job$.pipe(
      tap(job => {
        if (job.id) {
          setState((state: WorkbenchStateModel) => {
            state.pixelOpsPanelConfig.currentPixelOpsJobId = job.id;
            return state;
          });
        }
        if (job.state.status == 'completed' && job.result) {
          let actions: any[] = [];
          if (!isPixelOpsJob(job)) return;
          let result = job.result;
          if (result.errors.length != 0) {
            console.error('Errors encountered during pixel ops: ', result.errors);
          }
          if (result.warnings.length != 0) {
            console.error('Warnings encountered during pixel ops: ', result.warnings);
          }


          if ((job as PixelOpsJob).inplace) {
            let layerIds = result.fileIds.map((id) => id.toString());
            layerIds.forEach((layerId) => actions.push(new InvalidateRawImageTiles(layerId)));
            layerIds.forEach((layerId) => actions.push(new InvalidateHeader(layerId)));
          }

          actions.push(new LoadLibrary());
          dispatch(actions);
        }
      })
    )
  }

  @Action(CreateAlignmentJob)
  @ImmutableContext()
  public createAlignmentJob(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { layerIds, crop, settings }: CreateAlignmentJob
  ) {
    let state = getState();
    let layers = this.store.selectSnapshot(DataFilesState.getLayers);
    let dataFiles = this.store.selectSnapshot(DataFilesState.getFileEntities);
    let imageLayers = layerIds.map((id) => layers.find((f) => f.id == id)).filter(isNotEmpty);
    let job: AlignmentJob = {
      type: JobType.Alignment,
      id: null,
      fileIds: imageLayers
        .sort((a, b) =>
          dataFiles[a.fileId].name < dataFiles[b.fileId].name
            ? -1
            : dataFiles[a.fileId].name > dataFiles[b.fileId].name
              ? 1
              : 0
        )
        .map((f) => f.id),
      inplace: true,
      crop: crop,
      settings: settings,
      state: null,
      result: null,
    };

    let job$ = this.jobService.createJob(job);

    job$.pipe(
      takeUntil(this.actions$.pipe(ofActionDispatched(CreateAlignmentJob))),
      take(1)
    ).subscribe(job => {
      if (job.id) {
        setState((state: WorkbenchStateModel) => {
          state.aligningPanelConfig.currentAlignmentJobId = job.id;
          return state;
        });
      }
    })

    job$.subscribe(job => {
      if (job.state.status == 'completed' && job.result) {
        let actions: any[] = [];
        if (!isAlignmentJob(job)) return;
        let result = job.result;
        if (result.errors.length != 0) {
          console.error('Errors encountered during aligning: ', result.errors);
        }
        if (result.warnings.length != 0) {
          console.error('Warnings encountered during aligning: ', result.warnings);
        }

        let layerIds = result.fileIds.map((id) => id.toString());
        if (settings.refImage) {
          layerIds.push(settings.refImage.toString())
        }


        if (job.inplace) {
          layerIds.forEach((layerId) => actions.push(new InvalidateRawImageTiles(layerId)));
          layerIds.forEach((layerId) => actions.push(new InvalidateHeader(layerId)));
        }

        actions.push(new LoadLibrary());
        dispatch(actions);
      }
    })


    return job$
  }

  @Action(CreateStackingJob)
  @ImmutableContext()
  public createStackingJob(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { layerIds, settings, outFilename }: CreateStackingJob
  ) {
    let job: StackingJob = {
      type: JobType.Stacking,
      id: null,
      fileIds: layerIds,
      stackingSettings: settings,
      state: null,
    };

    let job$ = this.jobService.createJob(job);

    job$.pipe(
      takeUntil(this.actions$.pipe(ofActionDispatched(CreateStackingJob))),
      take(1)
    ).subscribe(job => {
      if (job.id) {
        setState((state: WorkbenchStateModel) => {
          state.stackingPanelConfig.currentStackingJobId = job.id;
          return state;
        });
      }
    })

    job$.subscribe(job => {
      if (job.state.status == 'completed' && job.result) {
        if (!isStackingJob(job)) return;
        let result = job.result;
        if (result.errors.length != 0) {
          console.error('Errors encountered during stacking: ', result.errors);
        }
        if (result.warnings.length != 0) {
          console.error('Warnings encountered during stacking: ', result.warnings);
        }
        if (result.fileId) {
          dispatch(new LoadLibrary()).subscribe(() => {
            let layerEntities = this.store.selectSnapshot(DataFilesState.getLayerEntities)
            let existingFileNames = Object.values(layerEntities).map(layer => layer.name)
            let selectedFilenames = job.fileIds.map(id => layerEntities[id].name)
            let outFilename = getLongestCommonStartingSubstring(selectedFilenames).replace(/_+$/, '').trim();

            if (outFilename) {
              outFilename = `${outFilename}_stack`
              let base = outFilename
              let iter = 0
              while (existingFileNames.includes(`${outFilename}.fits`)) {
                outFilename = `${base}_${iter}`
                iter += 1;
              }
            }
            this.dataFileService.updateFile(result.fileId, {
              groupName: `${outFilename}.fits`,
              name: `${outFilename}.fits`
            }).pipe(
              flatMap(() => dispatch(new LoadLibrary()))
            ).subscribe()
          })

        }
      }
    })

    return job$
  }

  @Action(CreateWcsCalibrationJob)
  @ImmutableContext()
  public createWcsCalibrationJob(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { layerIds: layerIds }: CreateWcsCalibrationJob
  ) {
    setState((state: WorkbenchStateModel) => {
      state.wcsCalibrationPanelConfig.activeJobId = '';
      return state;
    });

    let state = getState();
    let wcsSettings = state.wcsCalibrationPanelConfig;
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
      fileIds: layerIds,
      inplace: true,
      settings: wcsCalibrationJobSettings,
      sourceExtractionSettings: sourceExtractionJobSettings,
      state: null,
    };

    let job$ = this.jobService.createJob(job);
    return job$.pipe(
      tap(job => {
        if (job.id) {
          setState((state: WorkbenchStateModel) => {
            state.wcsCalibrationPanelConfig.activeJobId = job.id;
            return state;
          });
        }
        if (job.state.status == 'completed' && job.result) {
          let actions: any[] = [];
          if (!isWcsCalibrationJob(job)) return;
          job.result.fileIds.forEach((layerId) => {
            actions.push(new InvalidateHeader(layerId.toString()));
          });
          let viewerIds = this.store.selectSnapshot(WorkbenchState.getVisibleViewerIds);
          viewerIds.forEach(viewerId => {
            let viewer = this.store.selectSnapshot(WorkbenchState.getViewerById(viewerId));
            if (viewer.layerId && job.result.fileIds.includes(viewer.layerId)) {
              actions.push(new LoadLayerHeader(viewer.layerId));
            }
          })
          let message: string;
          let numFailed = layerIds.length - job.result.fileIds.length;
          if (numFailed != 0) {
            message = `Failed to find solution for ${numFailed} image(s).`;
          } else {
            message = `Successfully found solutions for all ${layerIds.length} files.`;
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
          this.dialog.open(AlertDialogComponent, {
            width: '600px',
            data: dialogConfig,
          });

          dispatch(actions)

        }
      })
    )
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
    { layerId: layerId, viewportSize, settings }: ExtractSources
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
      state.sourcePanelConfig.selectedSourceIds = state.sourcePanelConfig.selectedSourceIds.filter(
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

    let imageLayer = this.store.selectSnapshot(WorkbenchState.getImageLayerByViewerId(viewerId))
    if (!imageLayer) return;
    let layerId = imageLayer.id;

    let coordMode = state.sourcePanelConfig.coordMode;
    let showSourcesFromAllFiles = state.sourcePanelConfig.showSourcesFromAllFiles;
    let sources = this.store.selectSnapshot(SourcesState.getSources);


    let header = this.store.selectSnapshot(DataFilesState.getHeaderByLayerId(layerId))
    let layer = this.store.selectSnapshot(DataFilesState.getLayerById(layerId))

    if (!layer || !header) return;
    if (!header.wcs || !header.wcs.isValid()) coordMode = 'pixel';
    sources = sources.filter((source) => {
      if (coordMode != source.posType) return false;
      if (source.layerId == layerId) return true;
      if (!showSourcesFromAllFiles) return false;
      let coord = getSourceCoordinates(header, source);
      if (coord == null) return false;
      return true;
    });

    let workbenchState = this.store.selectSnapshot(WorkbenchState.getWorkbenchStateByLayerId(layerId))
    if (!workbenchState) return;
    if (workbenchState.type == WorkbenchStateType.IMAGE_LAYER) {
      let layerState = workbenchState as WorkbenchImageLayerState;
      let photPanelStateId = layerState.photometryPanelStateId;

      let photometryJobSettings = toPhotometryJobSettings(state.settings);

      let job: PhotometryJob = {
        type: JobType.Photometry,
        settings: photometryJobSettings,
        id: null,
        fileIds: [layerId],
        sources: sources.map((source, index) => sourceToAstrometryData(source)),
        state: null,
      };

      setState((state: WorkbenchStateModel) => {
        let photState = state.photometryPanelStateEntities[photPanelStateId];
        photState.autoPhotIsValid = true;
        photState.autoPhotJobId = null;
        return state;
      });

      let job$ = this.jobService.createJob(job);
      return job$.pipe(
        tap(job => {
          if (job.id) {
            setState((state: WorkbenchStateModel) => {
              state.photometryPanelStateEntities[photPanelStateId].autoPhotJobId = job.id;
              return state;
            });
          }
          if (job.state.status == 'completed') {


          }
        })
      )
    }
  }

  @Action(UpdateAutoFieldCalibration)
  @ImmutableContext()
  public updateAutoFieldCalibration(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { viewerId }: UpdateAutoFieldCalibration
  ) {
    let state = getState();

    let imageLayer = this.store.selectSnapshot(WorkbenchState.getImageLayerByViewerId(viewerId))
    if (!imageLayer) return;
    let layerId = imageLayer.id;

    let coordMode = state.sourcePanelConfig.coordMode;
    let header = this.store.selectSnapshot(DataFilesState.getHeaderByLayerId(layerId))
    let layer = this.store.selectSnapshot(DataFilesState.getLayerById(layerId))

    if (!layer || !header) return;
    if (!header.wcs || !header.wcs.isValid()) coordMode = 'pixel';


    let workbenchState = this.store.selectSnapshot(WorkbenchState.getWorkbenchStateByLayerId(layerId))
    if (!workbenchState) return;
    if (workbenchState.type == WorkbenchStateType.IMAGE_LAYER) {
      let layerState = workbenchState as WorkbenchImageLayerState;
      let photPanelStateId = layerState.photometryPanelStateId;

      let photometryJobSettings = toPhotometryJobSettings(state.settings);
      let sourceExtractionJobSettings = toSourceExtractionJobSettings(state.settings);
      let catalogs = this.store.selectSnapshot(WorkbenchState.getCatalogs)
      let fieldCalibration = toFieldCalibration(state.settings, catalogs);

      let job: FieldCalibrationJob = {
        type: JobType.FieldCalibration,
        id: null,
        photometrySettings: photometryJobSettings,
        sourceExtractionSettings: sourceExtractionJobSettings,
        fieldCal: fieldCalibration,
        fileIds: [layerId],
        state: null,
      };

      setState((state: WorkbenchStateModel) => {
        let photState = state.photometryPanelStateEntities[photPanelStateId];
        photState.autoCalIsValid = true;
        photState.autoCalJobId = null;
        return state;
      });

      let job$ = this.jobService.createJob(job);
      return job$.pipe(
        tap(job => {
          if (job.id) {
            setState((state: WorkbenchStateModel) => {
              state.photometryPanelStateEntities[photPanelStateId].autoCalJobId = job.id;
              return state;
            });
          }
          if (job.state.status == 'completed') {
          }
        })
      )
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
      state.photometryPanelConfig.batchCalibrationEnabled = state.settings.calibration.calibrationEnabled;
      state.photometryPanelConfig.batchCalJobId = null;
      state.photometryPanelConfig.batchPhotJobId = null;
      state.photometryPanelConfig.creatingBatchJobs = true;
      return state;
    });

    let sources = this.store.selectSnapshot(SourcesState.getSources);
    let photometryJobSettings = toPhotometryJobSettings(state.settings);
    let layerIds = state.photometryPanelConfig.batchPhotFormData.selectedLayerIds;

    let photJob: PhotometryJob = {
      type: JobType.Photometry,
      settings: photometryJobSettings,
      id: null,
      fileIds: layerIds,
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
    };


    let photJob$ = this.jobService.createJob(photJob).pipe(
      tap(job => {
        if (job.id) {
          setState((state: WorkbenchStateModel) => {
            state.photometryPanelConfig.batchPhotJobId = job.id;
            state.photometryPanelConfig.creatingBatchJobs = false;
            return state;
          });
        }
        if (job.state.status == 'completed') {
        }
      })
    )

    let calJob$: Observable<Job> = of(null);

    if (state.settings.calibration.calibrationEnabled) {

      let sourceExtractionJobSettings = toSourceExtractionJobSettings(state.settings);
      let catalogs = this.store.selectSnapshot(WorkbenchState.getCatalogs)
      let fieldCalibration = toFieldCalibration(state.settings, catalogs);

      let calJob: FieldCalibrationJob = {
        type: JobType.FieldCalibration,
        id: null,
        photometrySettings: photometryJobSettings,
        sourceExtractionSettings: sourceExtractionJobSettings,
        fieldCal: fieldCalibration,
        fileIds: layerIds,
        state: null,
      };

      calJob$ = this.jobService.createJob(calJob).pipe(
        tap(job => {
          if (job.id) {
            setState((state: WorkbenchStateModel) => {
              state.photometryPanelConfig.batchCalJobId = job.id;
              state.photometryPanelConfig.creatingBatchJobs = false;
              return state;
            });
          }
          if (job.state.status == 'completed') {
          }
        })
      )
    }

    return combineLatest([photJob$, calJob$])




  }


  @Action(InitializeWorkbenchLayerState)
  @ImmutableContext()
  public initializeWorkbenchLayerState(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { layerId: layerId }: InitializeWorkbenchLayerState
  ) {
    let actions: any[] = [];
    setState((state: WorkbenchStateModel) => {
      let layerEntities = this.store.selectSnapshot(DataFilesState.getLayerEntities);
      if (!(layerId in layerEntities)) return state;
      let layer = layerEntities[layerId];
      let workbenchState: IWorkbenchState;
      let workbenchStateId = `WORKBENCH_STATE_${state.nextWorkbenchStateId++}`;
      state.layerIdToWorkbenchStateIdMap[layerId] = workbenchStateId;

      //initialize Layer states
      if (layer.type == LayerType.IMAGE) {
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
          autoPhotIsValid: false,
          autoPhotJobId: '',
          autoCalIsValid: false,
          autoCalJobId: '',
        };
        state.photometryPanelStateIds.push(photometryPanelStateId);

        let sourcePanelStateId = `SOURCE_PANEL_${state.nextSourcePanelStateId++}`;
        state.sourcePanelStateEntities[sourcePanelStateId] = {
          id: sourcePanelStateId,
          markerSelectionRegion: null,
        };
        state.sourcePanelStateIds.push(sourcePanelStateId);

        let wcsCalibrationPanelStateId = `WCS_CALIBRATION_${state.nextWcsCalibrationPanelStateId++}`;
        state.wcsCalibrationPanelStateEntities[wcsCalibrationPanelStateId] = {
          id: sourcePanelStateId,
          sourceExtractionJobId: null,
          sourceExtractionOverlayIsValid: false
        };
        state.wcsCalibrationPanelStateIds.push(wcsCalibrationPanelStateId);

        let imageLayerState: WorkbenchImageLayerState = {
          id: workbenchStateId,
          type: WorkbenchStateType.IMAGE_LAYER,
          plottingPanelStateId: plottingPanelStateId,
          customMarkerPanelStateId: customMarkerPanelStateId,
          sonificationPanelStateId: sonificationPanelStateId,
          photometryPanelStateId: photometryPanelStateId,
          sourcePanelStateId: sourcePanelStateId,
          wcsCalibrationPanelStateId: wcsCalibrationPanelStateId
        };

        workbenchState = imageLayerState;
        state.workbenchStateEntities[workbenchState.id] = workbenchState;
        state.workbenchStateIds.push(workbenchState.id);

        actions.push(new InitializeWorkbenchFileState(layer.fileId));
      } else if (layer.type == LayerType.TABLE) {
        let tableLayerState: WorkbenchTableLayerState = {
          id: workbenchStateId,
          type: WorkbenchStateType.TABLE_LAYER,
        };

        workbenchState = tableLayerState;
        state.workbenchStateEntities[workbenchState.id] = workbenchState;
        state.workbenchStateIds.push(workbenchState.id);

        actions.push(new InitializeWorkbenchFileState(layer.fileId));
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

  @Action(CloseLayerSuccess)
  @ImmutableContext()
  public closeLayerSuccess(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { layerId: layerId }: CloseLayerSuccess
  ) {
    setState((state: WorkbenchStateModel) => {
      let workbenchStateId = state.layerIdToWorkbenchStateIdMap[layerId];
      if (workbenchStateId) {
        delete state.fileIdToWorkbenchStateIdMap[layerId];
      }
      if (workbenchStateId in state.workbenchStateEntities) {
        state.workbenchStateIds = state.workbenchStateIds.filter((id) => id != workbenchStateId);
        delete state.workbenchStateEntities[workbenchStateId];
      }

      state.aligningPanelConfig.selectedLayerIds = state.aligningPanelConfig.selectedLayerIds.filter(
        (id) => id != layerId
      );
      state.stackingPanelConfig.stackFormData.selectedLayerIds = state.stackingPanelConfig.stackFormData.selectedLayerIds.filter(
        (id) => id != layerId
      );

      state.photometryPanelConfig.batchPhotFormData.selectedLayerIds = state.photometryPanelConfig.batchPhotFormData.selectedLayerIds.filter(
        (id) => id != layerId
      );

      state.pixelOpsPanelConfig.pixelOpsFormData.selectedLayerIds = state.pixelOpsPanelConfig.pixelOpsFormData.selectedLayerIds.filter(
        (id) => id != layerId
      );

      state.pixelOpsPanelConfig.pixelOpsFormData.auxLayerIds = state.pixelOpsPanelConfig.pixelOpsFormData.auxLayerIds.filter(
        (id) => id != layerId
      );

      state.pixelOpsPanelConfig.pixelOpsFormData.primaryLayerIds = state.pixelOpsPanelConfig.pixelOpsFormData.primaryLayerIds.filter(
        (id) => id != layerId
      );

      if (state.pixelOpsPanelConfig.pixelOpsFormData.auxLayerId == layerId) state.pixelOpsPanelConfig.pixelOpsFormData.auxLayerId = null;

      state.wcsCalibrationPanelConfig.selectedLayerIds = state.wcsCalibrationPanelConfig.selectedLayerIds.filter(
        (id) => id != layerId
      );


      return state;
    });
  }

  @Action(LoadLayerHeaderSuccess)
  @ImmutableContext()
  public loadDataFileHdrSuccess(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { layerId: layerId }: LoadLayerHeaderSuccess
  ) {
    let state = getState();
    let workbenchState = state.workbenchStateEntities[state.layerIdToWorkbenchStateIdMap[layerId]];
    if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_LAYER) return;
    let layerState = workbenchState as WorkbenchImageLayerState;
    let layer = this.store.selectSnapshot(DataFilesState.getLayerEntities)[layerId] as ImageLayer;
    let header = this.store.selectSnapshot(DataFilesState.getHeaderEntities)[layer.headerId];

    let sonifierState = state.sonificationPanelStateEntities[layerState.sonificationPanelStateId];

    if (!sonifierState.regionHistoryInitialized) {
      dispatch(
        new AddRegionToHistory(layerId, {
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
    { layerId: layerId }: AddRegionToHistory | UndoRegionSelection | RedoRegionSelection
  ) {
    let state = getState();
    let workbenchState = state.workbenchStateEntities[state.layerIdToWorkbenchStateIdMap[layerId]];
    if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_LAYER) return;
    let layerState = workbenchState as WorkbenchImageLayerState;
    let sonificationPanelState = state.sonificationPanelStateEntities[layerState.sonificationPanelStateId];

    if (sonificationPanelState.regionMode == SonifierRegionMode.CUSTOM) {
      dispatch(new SonificationRegionChanged(layerId));
    }
  }

  @Action(UpdateSonifierFileState)
  @ImmutableContext()
  public updateSonifierFileState(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { layerId: layerId, changes }: UpdateSonifierFileState
  ) {
    setState((state: WorkbenchStateModel) => {
      let workbenchState = state.workbenchStateEntities[state.layerIdToWorkbenchStateIdMap[layerId]];
      if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_LAYER) return state;
      let layerState = workbenchState as WorkbenchImageLayerState;
      let sonificationPanelState = state.sonificationPanelStateEntities[layerState.sonificationPanelStateId];
      state.sonificationPanelStateEntities[layerState.sonificationPanelStateId] = {
        ...sonificationPanelState,
        ...changes,
      };

      dispatch(new SonificationRegionChanged(layerId));

      return state;
    });
  }

  @Action(AddRegionToHistory)
  @ImmutableContext()
  public addRegionToHistory(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { layerId: layerId, region }: AddRegionToHistory
  ) {
    setState((state: WorkbenchStateModel) => {
      let workbenchState = state.workbenchStateEntities[state.layerIdToWorkbenchStateIdMap[layerId]];
      if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_LAYER) return state;
      let layerState = workbenchState as WorkbenchImageLayerState;
      let sonificationPanelState = state.sonificationPanelStateEntities[layerState.sonificationPanelStateId];
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
    { layerId: layerId }: UndoRegionSelection
  ) {
    setState((state: WorkbenchStateModel) => {
      let workbenchState = state.workbenchStateEntities[state.layerIdToWorkbenchStateIdMap[layerId]];
      if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_LAYER) return state;
      let layerState = workbenchState as WorkbenchImageLayerState;
      let sonificationPanelState = state.sonificationPanelStateEntities[layerState.sonificationPanelStateId];
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
    { layerId: layerId }: RedoRegionSelection
  ) {
    setState((state: WorkbenchStateModel) => {
      let workbenchState = state.workbenchStateEntities[state.layerIdToWorkbenchStateIdMap[layerId]];
      if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_LAYER) return state;
      let layerState = workbenchState as WorkbenchImageLayerState;
      let sonificationPanelState = state.sonificationPanelStateEntities[layerState.sonificationPanelStateId];
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
    { layerId: layerId }: ClearRegionHistory
  ) {
    setState((state: WorkbenchStateModel) => {
      let workbenchState = state.workbenchStateEntities[state.layerIdToWorkbenchStateIdMap[layerId]];
      if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_LAYER) return state;
      let layerState = workbenchState as WorkbenchImageLayerState;
      let sonificationPanelState = state.sonificationPanelStateEntities[layerState.sonificationPanelStateId];
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
    { layerId: layerId, line }: SetProgressLine
  ) {
    setState((state: WorkbenchStateModel) => {
      let workbenchState = state.workbenchStateEntities[state.layerIdToWorkbenchStateIdMap[layerId]];
      if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_LAYER) return state;
      let layerState = workbenchState as WorkbenchImageLayerState;
      let sonificationPanelState = state.sonificationPanelStateEntities[layerState.sonificationPanelStateId];
      sonificationPanelState.progressLine = line;
      return state;
    });
  }

  @Action(Sonify)
  @ImmutableContext()
  public sonify({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { layerId: layerId, region }: Sonify) {
    let getSonificationUrl = (jobId) => `${getCoreApiUrl(this.config)}/jobs/${jobId}/result/files/sonification`;

    let state = getState();
    let layerEntities = this.store.selectSnapshot(DataFilesState.getLayerEntities);
    let workbenchState = state.workbenchStateEntities[state.layerIdToWorkbenchStateIdMap[layerId]];
    if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_LAYER) return;
    let layerState = workbenchState as WorkbenchImageLayerState;
    let sonificationPanelStateId = layerState.sonificationPanelStateId;

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
      let job = this.store.selectSnapshot(JobsState.getJobById(sonificationPanelState.sonificationJobId))

      if (job && isSonificationJob(job) && job.result && job.result.errors.length == 0 && job.fileId === layerId) {
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
          return dispatch(new SonificationCompleted(layerId, getSonificationUrl(job.id), ''));
        }
      }
    }

    let job: SonificationJob = {
      id: null,
      fileId: layerId,
      type: JobType.Sonification,
      settings: settings,
      state: null
    };

    setState((state: WorkbenchStateModel) => {
      let sonificationPanelState = state.sonificationPanelStateEntities[sonificationPanelStateId];
      sonificationPanelState.sonificationLoading = true;
      return state;
    });

    let job$ = this.jobService.createJob(job);
    return job$.pipe(
      tap(job => {
        if (job.id) {
          setState((state: WorkbenchStateModel) => {
            state.aligningPanelConfig.currentAlignmentJobId = job.id;
            return state;
          });
        }
        if (job.state.status == 'completed' && job.result) {
          let sonificationUrl = '';
          let error = '';
          if (isSonificationJob(job)) {
            if (job.result.errors.length == 0) {
              sonificationUrl = getSonificationUrl(job.id);
              error = '';
            } else {
              error = job.result.errors.map((e) => e.detail).join(', ');
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
            dispatch(new SonificationCompleted(layerId, sonificationUrl, error));
          }
        }
      })
    )
  }

  @Action(ClearSonification)
  @ImmutableContext()
  public clearSonification(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { layerId: layerId }: ClearSonification
  ) {
    let state = getState();
    let workbenchState = state.workbenchStateEntities[state.layerIdToWorkbenchStateIdMap[layerId]];
    if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_LAYER) return;
    let layerState = workbenchState as WorkbenchImageLayerState;

    setState((state: WorkbenchStateModel) => {
      let sonificationPanelState = state.sonificationPanelStateEntities[layerState.sonificationPanelStateId];
      sonificationPanelState.sonificationLoading = null;
      sonificationPanelState.sonificationJobId = '';
      return state;
    });
  }

  @Action(UpdateSourceSelectionRegion)
  @ImmutableContext()
  public updateSourceRegionSelection(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { layerId: layerId, region }: UpdateSourceSelectionRegion
  ) {
    setState((state: WorkbenchStateModel) => {
      let workbenchState = state.workbenchStateEntities[state.layerIdToWorkbenchStateIdMap[layerId]];
      if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_LAYER) return state;
      let layerState = workbenchState as WorkbenchImageLayerState;
      let sourcePanelStateId = layerState.sourcePanelStateId;
      let sourceState = state.sourcePanelStateEntities[sourcePanelStateId];
      sourceState.markerSelectionRegion = {
        ...region,
      };
      return state;
    });
  }

  @Action(EndSourceSelectionRegion)
  @ImmutableContext()
  public endSourceRegionSelection(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { layerId: layerId, mode }: EndSourceSelectionRegion
  ) {
    setState((state: WorkbenchStateModel) => {
      let workbenchState = state.workbenchStateEntities[state.layerIdToWorkbenchStateIdMap[layerId]];
      if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_LAYER) return state;
      let layerState = workbenchState as WorkbenchImageLayerState;
      let sourcePanelStateId = layerState.sourcePanelStateId;
      let sourcesState = state.sourcePanelStateEntities[sourcePanelStateId];

      let region = sourcesState.markerSelectionRegion;
      let header = this.store.selectSnapshot(DataFilesState.getHeaderByLayerId(layerId));
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
        state.sourcePanelConfig.selectedSourceIds = state.sourcePanelConfig.selectedSourceIds.filter(
          (id) => !sourceIds.includes(id)
        );
      } else {
        let filteredSourceIds = sourceIds.filter((id) => !state.sourcePanelConfig.selectedSourceIds.includes(id));
        state.sourcePanelConfig.selectedSourceIds = state.sourcePanelConfig.selectedSourceIds.concat(
          filteredSourceIds
        );
      }
      sourcesState.markerSelectionRegion = null;

      return state;
    });
  }

  @Action(UpdatePhotometryFileState)
  @ImmutableContext()
  public updatePhotometryFileState(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { layerId: layerId, changes }: UpdatePhotometryFileState
  ) {
    setState((state: WorkbenchStateModel) => {
      let workbenchState = state.workbenchStateEntities[state.layerIdToWorkbenchStateIdMap[layerId]];
      if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_LAYER) return state;
      let layerState = workbenchState as WorkbenchImageLayerState;
      let photometryPanelState = state.photometryPanelStateEntities[layerState.photometryPanelStateId];
      state.photometryPanelStateEntities[layerState.photometryPanelStateId] = {
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
      //Photometry data from the Core refers to layer ids as file ids.
      photDatas.forEach((d) => {
        let workbenchState = state.workbenchStateEntities[state.layerIdToWorkbenchStateIdMap[d.fileId]];
        if (!workbenchState || workbenchState.type != WorkbenchStateType.IMAGE_LAYER) return;
        let layerState = workbenchState as WorkbenchImageLayerState;
        if (!d.id) {
          return;
        }
        let photometryPanelState = state.photometryPanelStateEntities[layerState.photometryPanelStateId];
        photometryPanelState.sourcePhotometryData[d.id] = d;
      });

      return state;
    });
  }

  @Action(RemovePhotDatasByLayerId)
  @ImmutableContext()
  public removePhotDatasByLayerId(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { layerId: layerId }: RemovePhotDatasByLayerId
  ) {
    setState((state: WorkbenchStateModel) => {
      state.workbenchStateIds.forEach((stateId) => {
        if (layerId === null || layerId === stateId) {
          if (state.workbenchStateEntities[stateId].type != WorkbenchStateType.IMAGE_LAYER) {
            return;
          }
          let layerState = state.workbenchStateEntities[stateId] as WorkbenchImageLayerState;
          state.photometryPanelStateEntities[layerState.photometryPanelStateId].sourcePhotometryData = {};
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
        if (state.workbenchStateEntities[stateId].type != WorkbenchStateType.IMAGE_LAYER) {
          return;
        }
        let layerState = state.workbenchStateEntities[stateId] as WorkbenchImageLayerState;
        let photometryPanelState = state.photometryPanelStateEntities[layerState.photometryPanelStateId];
        if (sourceId in photometryPanelState.sourcePhotometryData) {
          delete photometryPanelState.sourcePhotometryData[sourceId];
        }
      });
      return state;
    });
  }

  @Action(InvalidateAutoCalByLayerId)
  @ImmutableContext()
  public resetAutoCalJobsByLayerId(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { layerId: layerId }: RemovePhotDatasByLayerId
  ) {
    setState((state: WorkbenchStateModel) => {
      let workbenchStateIds = state.workbenchStateIds;
      if (layerId) workbenchStateIds = [state.layerIdToWorkbenchStateIdMap[layerId]]
      workbenchStateIds.forEach((stateId) => {
        if (state.workbenchStateEntities[stateId].type != WorkbenchStateType.IMAGE_LAYER) {
          return;
        }
        let layerState = state.workbenchStateEntities[stateId] as WorkbenchImageLayerState;
        state.photometryPanelStateEntities[layerState.photometryPanelStateId].autoCalIsValid = false;
      });
      return state;
    });
  }

  @Action(InvalidateAutoPhotByLayerId)
  @ImmutableContext()
  public resetAutoPhotJobsByLayerId(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { layerId: layerId }: InvalidateAutoPhotByLayerId
  ) {
    setState((state: WorkbenchStateModel) => {
      let workbenchStateIds = state.workbenchStateIds;
      if (layerId) workbenchStateIds = [state.layerIdToWorkbenchStateIdMap[layerId]]
      workbenchStateIds.forEach((stateId) => {
        if (state.workbenchStateEntities[stateId].type != WorkbenchStateType.IMAGE_LAYER) {
          return;
        }
        let layerState = state.workbenchStateEntities[stateId] as WorkbenchImageLayerState;
        state.photometryPanelStateEntities[layerState.photometryPanelStateId].autoPhotIsValid = false;
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
    let refLayerHasWcs = refHeader.wcs && refHeader.wcs.isValid();
    let refViewportSize = refViewer.viewportSize;

    let visibleViewers = this.store.selectSnapshot(WorkbenchState.getVisibleViewerIds).map((id) => state.viewers[id]);

    let actions: any[] = [];
    visibleViewers.forEach((viewer) => {
      let targetHeader = this.store.selectSnapshot(WorkbenchState.getImageHeaderByViewerId(viewer.id));
      let targetImageTransform = this.store.selectSnapshot(WorkbenchState.getImageTransformByViewerId(viewer.id));
      let targetViewportTransform = this.store.selectSnapshot(WorkbenchState.getViewportTransformByViewerId(viewer.id));

      if (!targetHeader || !targetHeader.loaded || !targetImageTransform || !targetViewportTransform) return;

      if (state.viewerSyncMode == 'sky') {
        let targetHasWcs = targetHeader.wcs && targetHeader.wcs.isValid();
        if (refLayerHasWcs && targetHasWcs) {
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
        let targetImageData = this.store.selectSnapshot(WorkbenchState.getNormalizedImageDataByViewerId(viewer.id));
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
    let layerEntities = this.store.selectSnapshot(DataFilesState.getLayerEntities);

    let actions: any[] = [];
    visibleViewers.forEach((viewer) => {
      let layerId = viewer.layerId;
      if (!layerId) {
        return;
      }
      let layer = layerEntities[layerId] as ImageLayer;
      if (layer.type != LayerType.IMAGE) {
        return;
      }

      // prevent infinite loop by checking values
      // TODO: refactor normalizations to separate entities with IDs
      if (
        normalization.mode == layer.normalizer.mode &&
        normalization.stretchMode == layer.normalizer.stretchMode &&
        normalization.peakLevel == layer.normalizer.peakLevel &&
        normalization.peakPercentile == layer.normalizer.peakPercentile &&
        normalization.backgroundPercentile == layer.normalizer.backgroundPercentile &&
        normalization.backgroundLevel == layer.normalizer.backgroundLevel &&
        normalization.midPercentile == layer.normalizer.midPercentile &&
        normalization.midLevel == layer.normalizer.midLevel
      ) {
        return;
      }

      actions.push(
        new UpdateNormalizer(layer.id, {
          mode: normalization.mode,
          stretchMode: normalization.stretchMode,
          backgroundLevel: normalization.backgroundLevel,
          backgroundPercentile: normalization.backgroundPercentile,
          midLevel: normalization.midLevel,
          midPercentile: normalization.midPercentile,
          peakLevel: normalization.peakLevel,
          peakPercentile: normalization.peakPercentile,
        })
      );
    });

    return dispatch(actions);
  }


  @Action(InvalidateRawImageTiles)
  @ImmutableContext()
  public invalidateRawImageTiles(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { layerId: layerId }: InvalidateRawImageTiles
  ) {

    let actions: any[] = [];
    actions.push(new InvalidateAutoPhotByLayerId(layerId))
    actions.push(new InvalidateAutoCalByLayerId(layerId))
    actions.push(new InvalidateWcsCalibrationExtractionOverlayByLayerId(layerId));

    return dispatch(actions);
  }



  @Action(AddSources)
  @ImmutableContext()
  public addSources(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { }: AddSources
  ) {

    let actions: any[] = [];
    actions.push(new RemovePhotDatasByLayerId())
    return dispatch(actions);
  }

  @Action([UpdateNormalizerSuccess, UpdateColorMapSuccess, UpdateBlendModeSuccess, UpdateAlphaSuccess, UpdateVisibilitySuccess])
  @ImmutableContext()
  public updateNormalizerSuccess(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { layerId: layerId }: UpdateNormalizerSuccess | UpdateColorMapSuccess | UpdateBlendModeSuccess | UpdateAlphaSuccess | UpdateVisibilitySuccess
  ) {

    this.store.dispatch(new SyncAfterglowHeaders(layerId))
  }

  @Action([SyncAfterglowHeaders])
  @ImmutableContext()
  public syncAfterglowHeaders(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    action: SyncAfterglowHeaders
  ) {

    let layerId = action.layerId;

    let nextSyncRequest$ = this.actions$.pipe(
      ofActionDispatched(SyncAfterglowHeaders),
      filter<SyncAfterglowHeaders>((a) => a.layerId == layerId)
    )

    of(action).pipe(
      delay(1000),
      take(1),
      takeUntil(nextSyncRequest$),
    ).subscribe(() => {
      let layer = this.store.selectSnapshot(DataFilesState.getLayerById(layerId));
      if (!isImageLayer(layer)) return;

      let layers = [layer];

      let file = this.store.selectSnapshot(DataFilesState.getFileById(layer.fileId));
      if (file.syncLayerNormalizers) layers = this.store.selectSnapshot(DataFilesState.getLayersByFileId(file.id)).filter(isImageLayer)

      layers.forEach(layer => {
        let entries: HeaderEntry[] = []
        let normalizer = layer.normalizer;
        entries.push({ key: AfterglowHeaderKey.AG_NMODE, value: normalizer.mode, comment: 'AgA background/peak mode' })
        if (normalizer.backgroundPercentile !== undefined) entries.push({ key: AfterglowHeaderKey.AG_BKGP, value: normalizer.backgroundPercentile, comment: 'AgA background percentile' })
        if (normalizer.midPercentile !== undefined) entries.push({ key: AfterglowHeaderKey.AG_MIDP, value: normalizer.midPercentile, comment: 'AgA mid percentile' })
        if (normalizer.peakPercentile !== undefined) entries.push({ key: AfterglowHeaderKey.AG_PEAKP, value: normalizer.peakPercentile, comment: 'AgA peak percentile' })
        if (normalizer.backgroundLevel !== undefined) entries.push({ key: AfterglowHeaderKey.AG_BKGL, value: normalizer.backgroundLevel, comment: 'AgA background level' })
        if (normalizer.midLevel !== undefined) entries.push({ key: AfterglowHeaderKey.AG_MIDL, value: normalizer.midLevel, comment: 'AgA mid level' })
        if (normalizer.peakLevel !== undefined) entries.push({ key: AfterglowHeaderKey.AG_PEAKL, value: normalizer.peakLevel, comment: 'AgA peak level' })
        entries.push({ key: AfterglowHeaderKey.AG_CMAP, value: normalizer.colorMapName, comment: 'AgA color map' })
        entries.push({ key: AfterglowHeaderKey.AG_STRCH, value: normalizer.stretchMode, comment: 'AgA stretch mode' })
        entries.push({ key: AfterglowHeaderKey.AG_INVRT, value: normalizer.inverted, comment: 'AgA inverted' })
        entries.push({ key: AfterglowHeaderKey.AG_SCALE, value: normalizer.layerScale, comment: 'AgA layer scale' })
        entries.push({ key: AfterglowHeaderKey.AG_OFFSET, value: normalizer.layerOffset, comment: 'AgA layer offset' })
        entries.push({ key: AfterglowHeaderKey.AG_ALPHA, value: layer.alpha, comment: 'AgA layer alpha' })
        entries.push({ key: AfterglowHeaderKey.AG_BLEND, value: layer.blendMode, comment: 'AgA layer blend mode' })
        entries.push({ key: AfterglowHeaderKey.AG_VIS, value: layer.visible, comment: 'AgA layer visibility' })

        if (entries.length != 0) {
          this.store.dispatch([new UpdateLayerHeader(layer.id, entries)]);
        }
      })

    })




  }
}

