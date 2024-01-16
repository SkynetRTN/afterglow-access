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
  ViewerLayoutItem
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
  UpdatePhotometrySettings,
  UpdateSourceExtractionSettings,
  SetSelectedCatalog,
  SetSelectedFieldCal,
  CloseSidenav,
  OpenSidenav,
  ExtractSources,
  ClearViewerMarkers,
  CreateViewer,
  CloseViewer,
  KeepViewerOpen,
  SplitViewerPanel,
  MoveViewer,
  Initialize,
  UpdateCurrentViewportSize,
  SyncViewerTransformations,
  SetViewerSyncMode,
  SyncViewerNormalizations,
  ToggleFileSelection,
  SetFileSelection,
  SetFileListFilter,
  ImportFromSurveyFail,
  UpdateSettings,
  UpdateCalibrationSettings,
  SyncAfterglowHeaders,
  UpdateCosmeticCorrectionSettings,
  UpdateAlignmentSettings,
  UpdateWcsSourceExtractionSettings,
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
import { DataFilesState } from '../data-files/data-files.state';
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
import { CustomMarkerPanelState } from './models/marker-file-state';
import { PlottingPanelState } from './models/plotter-file-state';
import { GlobalSettings, defaults as defaultGlobalSettings } from './models/global-settings';
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
import { SourceCatalogState, SourceCatalogViewerStateModel } from './tools/source-catalog/source-catalog.state';
import { InvalidateAutoCalByLayerId, InvalidateAutoPhotByLayerId, RemovePhotDatasByLayerId } from './tools/photometry/photometry.actions';
import { InvalidateWcsCalibrationExtractionOverlayByLayerId } from './tools/wcs-calibration/wcs-calibration.actions';

const workbenchStateDefaults: WorkbenchStateModel = {
  version: 'f40bd5a8-79a8-47f6-bf9d-1bef4c46f2ea',
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
  catalogs: [],
  selectedCatalogId: '',
  fieldCals: [],
  selectedFieldCalId: '',
  addFieldCalSourcesFromCatalogJobId: '',
  creatingAddFieldCalSourcesFromCatalogJob: false,
  addFieldCalSourcesFromCatalogFieldCalId: '',
  dssImportLoading: false
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
    private actions$: Actions
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
  public static getWcsSourceExtractionSettings(state: WorkbenchStateModel) {
    return state.settings.wcsSourceExtraction;
  }

  @Selector()
  public static getCentroidSettings(state: WorkbenchStateModel) {
    return state.settings.centroid;
  }

  @Selector([WorkbenchState.getSettings])
  public static getCosmeticCorrectionSettings(settings: GlobalSettings) {
    return settings.cosmeticCorrection;
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

  @Action(UpdateCosmeticCorrectionSettings)
  @ImmutableContext()
  public updateCosmeticCorrectionSettings(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { changes }: UpdateCosmeticCorrectionSettings
  ) {
    setState((state: WorkbenchStateModel) => {
      state.settings.cosmeticCorrection = {
        ...state.settings.cosmeticCorrection,
        ...changes,
      }
      return state;
    });

    //side-effects
    let actions: any[] = [];
    return dispatch(actions);
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

  @Action(UpdateWcsSourceExtractionSettings)
  @ImmutableContext()
  public updateWcsSourceExtractionSettings(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { changes }: UpdateWcsSourceExtractionSettings
  ) {
    setState((state: WorkbenchStateModel) => {
      state.settings.wcsSourceExtraction = {
        ...state.settings.wcsSourceExtraction,
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

    //when layers are merged or split,  viewers may need to be updated with the new file ID
    let fileEntities = this.store.selectSnapshot(DataFilesState.getFileEntities);
    state.viewerIds.forEach((viewerId) => {
      let viewer = state.viewers[viewerId];
      if (viewer.fileId && fileEntities[viewer.fileId]) {
        return;
      }
      dispatch(new CloseViewer(viewerId));
    });
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





  /*  Custom Markers */



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
          linkSourceLayerId: null,
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

