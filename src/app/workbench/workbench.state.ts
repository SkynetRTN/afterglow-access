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
} from "@ngxs/store";
import {
  tap,
  catchError,
  finalize,
  filter,
  take,
  takeUntil,
  map,
  flatMap,
} from "rxjs/operators";
import { of, merge, combineLatest, interval, Observable } from "rxjs";
import { produce } from "@ngxs-labs/immer-adapter";
import { Point, Matrix, Rectangle } from "paper";
import {
  WorkbenchStateModel,
  WorkbenchTool,
  ViewerPanel,
} from "./models/workbench-state";
import { ViewMode } from "./models/view-mode";
import { SidebarView } from "./models/sidebar-view";
import {
  createPsfCentroiderSettings,
  createDiskCentroiderSettings,
} from "./models/centroider";
import {
  LoadLibrarySuccess,
  RemoveDataFileSuccess,
  LoadDataFileHdr,
  LoadImageHist,
  LoadLibrary,
  ClearImageDataCache,
  LoadImageHistSuccess,
  LoadDataFileHdrSuccess,
  RemoveDataFile,
  LoadDataFile,
} from "../data-files/data-files.actions";
import {
  DataFilesState,
  DataFilesStateModel,
} from "../data-files/data-files.state";
import {
  SelectDataFile,
  CloseViewerPanel,
  SetFocusedViewer,
  SetViewerFile,
  SyncFileNormalizations,
  SyncFileTransformations,
  SyncFilePlotters,
  SetViewerFileSuccess,
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
  PhotometerSources,
  SetViewerMarkers,
  UpdatePixelOpsPageSettings as UpdatePixelOpsPanelConfig,
  UpdateStackingPanelConfig,
  UpdateAligningPanelConfig,
  ClearViewerMarkers,
  CreateViewer,
  CloseViewer,
  KeepViewerOpen,
  MoveToOtherView,
  UpdateFileInfoPanelConfig,
} from "./workbench.actions";
import {
  ImageFile,
  getWidth,
  getHeight,
  hasOverlap,
  getCenterTime,
  getSourceCoordinates,
  DataFile,
} from "../data-files/models/data-file";
import {
  WorkbenchFileStates,
  WorkbenchFileStatesModel,
} from "./workbench-file-states.state";
import {
  RenormalizeImageFile,
  AddRegionToHistory,
  MoveBy,
  ZoomBy,
  RotateBy,
  Flip,
  ResetImageTransform,
  SetViewportTransform,
  SetImageTransform,
  UpdateNormalizer,
  StartLine,
  UpdateLine,
  UpdatePlotterFileState,
  InitializeImageFileState,
  AddPhotDatas,
} from "./workbench-file-states.actions";
import { AfterglowCatalogService } from "./services/afterglow-catalogs";
import { AfterglowFieldCalService } from "./services/afterglow-field-cals";
import { CorrelationIdGenerator } from "../utils/correlated-action";
import { CreateJob, UpdateJob } from "../jobs/jobs.actions";
import { CatalogQueryJobResult } from "../jobs/models/catalog-query";
import { PixelOpsJob, PixelOpsJobResult } from "../jobs/models/pixel-ops";
import { JobType } from "../jobs/models/job-types";
import { JobActionHandler } from "../jobs/lib/job-action-handler";
import { AlignmentJob, AlignmentJobResult } from "../jobs/models/alignment";
import { StackingJob } from "../jobs/models/stacking";
import {
  ImportAssetsCompleted,
  ImportAssets,
} from "../data-providers/data-providers.actions";
import { ImmutableContext } from "@ngxs-labs/immer-adapter";
import { DataFileType } from "../data-files/models/data-file-type";
import { PosType, Source } from "./models/source";
import {
  MarkerType,
  LineMarker,
  RectangleMarker,
  CircleMarker,
  TeardropMarker,
  Marker,
} from "./models/marker";
import { SonifierRegionMode } from "./models/sonifier-file-state";
import { SourcesState, SourcesStateModel } from "./sources.state";
import { SourceExtractionRegionOption } from "./models/source-extraction-settings";
import {
  getViewportRegion,
  transformToMatrix,
  matrixToTransform,
} from "./models/transformation";
import {
  SourceExtractionJobSettings,
  SourceExtractionJob,
  SourceExtractionJobResult,
} from "../jobs/models/source-extraction";
import { JobsState } from "../jobs/jobs.state";
import { AddSources, RemoveSources } from "./sources.actions";
import {
  PhotometryJob,
  PhotometryJobSettings,
  PhotometryJobResult,
} from "../jobs/models/photometry";
import { Astrometry } from "../jobs/models/astrometry";
import { SourceId } from "../jobs/models/source-id";
import { PhotDataStateModel, PhotDataState } from "./phot-data.state.";
import { PhotData } from "./models/source-phot-data";
import { Viewer } from "./models/viewer";
import { ResetState } from "../auth/auth.actions";

const workbenchStateDefaults: WorkbenchStateModel = {
  version: 1,
  showSideNav: false,
  inFullScreenMode: false,
  fullScreenPanel: "file",
  activeTool: WorkbenchTool.VIEWER,
  viewMode: ViewMode.SPLIT_VERTICAL,
  nextViewerIdSeed: 0,
  nextViewerPanelIdSeed: 0,
  nextViewerPanelContainerIdSeed: 0,
  rootViewerPanelContainerId: "ROOT_CONTAINER",
  viewerIds: [],
  viewers: {},
  viewerPanelIds: [],
  viewerPanels: {},
  viewerPanelContainerIds: ["ROOT_CONTAINER"],
  viewerPanelContainers: {
    ROOT_CONTAINER: {
      id: "ROOT_CONTAINER",
      direction: "row",
      items: [],
    },
  },
  focusedViewerPanelId: null,
  viewerSyncEnabled: false,
  normalizationSyncEnabled: false,
  sidebarView: SidebarView.FILES,
  showSidebar: true,
  showConfig: true,
  centroidSettings: {
    useDiskCentroiding: false,
    psfCentroiderSettings: createPsfCentroiderSettings(),
    diskCentroiderSettings: createDiskCentroiderSettings(),
  },
  photometrySettings: {
    gain: 1,
    zeroPoint: 20,
    centroidRadius: 5,
    mode: "constant",
    a: 5,
    b: 5,
    theta: 0,
    aIn: 10,
    aOut: 15,
    bOut: 15,
    thetaOut: 0,
    aKrFactor: 1.0,
    aInKrFactor: 1.0,
    aOutKrFactor: 1.5,
  },
  sourceExtractionSettings: {
    threshold: 3,
    fwhm: 0,
    deblend: false,
    limit: 200,
    region: SourceExtractionRegionOption.ENTIRE_IMAGE,
  },
  fileInfoPanelConfig: {
    showRawHeader: false,
    useSystemTime: true,
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
    plotterMode: "1D",
  },
  photometryPanelConfig: {
    showSourceLabels: false,
    centroidClicks: true,
    showSourcesFromAllFiles: true,
    selectedSourceIds: [],
    coordMode: "sky",
    autoPhot: true,
    batchPhotFormData: {
      selectedImageFileIds: [],
    },
    batchPhotProgress: null,
    batchPhotJobId: null,
  },
  pixelOpsPanelConfig: {
    currentPixelOpsJobId: null,
    showCurrentPixelOpsJobState: true,
    pixelOpsFormData: {
      operand: "+",
      mode: "image",
      auxImageFileId: null,
      auxImageFileIds: [],
      imageFileIds: [],
      scalarValue: 1,
      inPlace: false,
      opString: "",
    },
  },
  aligningPanelConfig: {
    alignFormData: {
      selectedImageFileIds: [],
      mode: "astrometric",
      inPlace: true,
    },
    currentAlignmentJobId: null,
  },
  stackingPanelConfig: {
    stackFormData: {
      selectedImageFileIds: [],
      mode: "average",
      scaling: "none",
      rejection: "none",
      percentile: 50,
      low: 0,
      high: 0,
    },
    currentStackingJobId: null,
  },
  catalogs: [],
  selectedCatalogId: null,
  fieldCals: [],
  selectedFieldCalId: null,
  addFieldCalSourcesFromCatalogJobId: null,
  creatingAddFieldCalSourcesFromCatalogJob: false,
  addFieldCalSourcesFromCatalogFieldCalId: null,
  dssImportLoading: false,
};

@State<WorkbenchStateModel>({
  name: "workbench",
  defaults: workbenchStateDefaults,
})
export class WorkbenchState {
  protected viewerIdPrefix = "VWR";

  constructor(
    private store: Store,
    private afterglowCatalogService: AfterglowCatalogService,
    private afterglowFieldCalService: AfterglowFieldCalService,
    private correlationIdGenerator: CorrelationIdGenerator,
    private actions$: Actions
  ) {}

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

  @Selector()
  public static getViewerPanelIds(state: WorkbenchStateModel) {
    return state.viewerPanelIds;
  }

  @Selector()
  public static getViewerPanelEntities(state: WorkbenchStateModel) {
    return state.viewerPanels;
  }

  @Selector()
  public static getViewerPanels(state: WorkbenchStateModel) {
    return Object.values(state.viewerPanels);
  }

  @Selector()
  public static getViewerPanelContainerIds(state: WorkbenchStateModel) {
    return state.viewerPanelContainerIds;
  }

  @Selector()
  public static getViewerPanelContainerEntities(state: WorkbenchStateModel) {
    return state.viewerPanelContainers;
  }

  @Selector()
  public static getViewerPanelContainers(state: WorkbenchStateModel) {
    return Object.values(state.viewerPanelContainers);
  }

  @Selector()
  public static getRootViewerPanelContainer(state: WorkbenchStateModel) {
    return state.viewerPanelContainers[state.rootViewerPanelContainerId];
  }

  @Selector()
  public static getFocusedViewerPanelId(state: WorkbenchStateModel) {
    return state.focusedViewerPanelId;
  }

  @Selector()
  public static getViewerById(state: WorkbenchStateModel) {
    return (id: string) => {
      return state.viewers[id];
    };
  }

  @Selector([
    WorkbenchState.getFocusedViewerPanelId,
    WorkbenchState.getViewerPanelEntities,
  ])
  public static getFocusedViewerId(
    state: WorkbenchStateModel,
    focusedViewerPanelId: string,
    viewerPanelEntities: { [id: string]: ViewerPanel }
  ) {
    return viewerPanelEntities[focusedViewerPanelId].selectedViewerId;
  }

  @Selector([WorkbenchState.getFocusedViewerId])
  public static getFocusedViewer(
    state: WorkbenchStateModel,
    focusedViewerId: string
  ) {
    if (!focusedViewerId || !state.viewerIds.includes(focusedViewerId))
      return null;
    return state.viewers[focusedViewerId];
  }

  @Selector([WorkbenchState.getFocusedViewer])
  public static getFocusedFileId(
    state: WorkbenchStateModel,
    focusedViewer: Viewer
  ) {
    if (!focusedViewer) return null;
    return focusedViewer.fileId;
  }

  @Selector([WorkbenchState.getFocusedFileId, DataFilesState])
  public static getFocusedFile(
    state: WorkbenchStateModel,
    fileId: string,
    dataFilesState: DataFilesStateModel
  ) {
    if (!fileId || !dataFilesState.ids.includes(fileId)) return null;
    return dataFilesState.entities[fileId];
  }

  @Selector([WorkbenchState.getFocusedFile])
  public static getFocusedFileHeader(
    state: WorkbenchStateModel,
    file: DataFile
  ) {
    if (!file || !file.headerLoaded) return null;
    return file.header;
  }

  @Selector([WorkbenchState.getFocusedFileId, DataFilesState])
  public static getFocusedImageFileId(
    state: WorkbenchStateModel,
    fileId: string,
    dataFilesState: DataFilesStateModel
  ) {
    if (!fileId || dataFilesState.entities[fileId].type != DataFileType.IMAGE)
      return null;
    return fileId;
  }

  @Selector([WorkbenchState.getFocusedFile])
  public static getFocusedImageFile(
    state: WorkbenchStateModel,
    file: DataFile
  ) {
    if (!file || file.type != DataFileType.IMAGE) return null;
    return file as ImageFile;
  }

  @Selector([WorkbenchState.getFocusedImageFile, WorkbenchFileStates])
  public static getFocusedImageFileState(
    state: WorkbenchStateModel,
    imageFile: ImageFile,
    imageFilesState: WorkbenchFileStatesModel
  ) {
    if (!imageFile || !imageFilesState.ids.includes(imageFile.id)) return null;
    return imageFilesState.entities[imageFile.id];
  }

  // @Selector([DataFilesState])
  // public static getSelectedFile(state: WorkbenchStateModel, dataFilesState: DataFilesStateModel) {
  //   return dataFilesState.entities[state.selectedFileId];
  // }

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
  public static getNormalizationSyncEnabled(state: WorkbenchStateModel) {
    return state.normalizationSyncEnabled;
  }

  @Selector()
  public static getDssImportLoading(state: WorkbenchStateModel) {
    return state.dssImportLoading;
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
  public static getPhotometrySettings(state: WorkbenchStateModel) {
    return state.photometrySettings;
  }

  @Selector()
  public static getSourceExtractionSettings(state: WorkbenchStateModel) {
    return state.sourceExtractionSettings;
  }

  @Selector()
  public static getCentroidSettings(state: WorkbenchStateModel) {
    return state.centroidSettings;
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
  public static getPhotometryShowSourcesFromAllFiles(
    state: WorkbenchStateModel
  ) {
    return state.photometryPanelConfig.showSourcesFromAllFiles;
  }

  @Selector()
  public static getPhotometryShowSourceLabels(state: WorkbenchStateModel) {
    return state.photometryPanelConfig.showSourceLabels;
  }

  @Selector([WorkbenchFileStates, DataFilesState])
  static getPlotterMarkers(
    state: WorkbenchStateModel,
    imageFilesState: WorkbenchFileStatesModel,
    dataFilesState: DataFilesStateModel
  ) {
    return (fileId: string) => {
      let file = dataFilesState.entities[fileId] as ImageFile;
    };
  }

  @Selector([WorkbenchFileStates, DataFilesState])
  static getSonifierMarkers(
    state: WorkbenchStateModel,
    imageFilesState: WorkbenchFileStatesModel,
    dataFilesState: DataFilesStateModel
  ) {
    return (fileId: string) => {
      let file = dataFilesState.entities[fileId] as ImageFile;
      let sonifier = imageFilesState.entities[fileId].sonificationPanelState;
      let region = sonifier.regionHistory[sonifier.regionHistoryIndex];
      let regionMode = sonifier.regionMode;
      let progressLine = sonifier.progressLine;
      let result: Array<RectangleMarker | LineMarker> = [];
      if (region && regionMode == SonifierRegionMode.CUSTOM)
        result.push({
          type: MarkerType.RECTANGLE,
          ...region,
        } as RectangleMarker);
      if (progressLine)
        result.push({ type: MarkerType.LINE, ...progressLine } as LineMarker);
      return result;
    };
  }

  @Selector([WorkbenchFileStates, DataFilesState, SourcesState])
  static getPhotometrySourceMarkers(
    state: WorkbenchStateModel,
    imageFilesState: WorkbenchFileStatesModel,
    dataFilesState: DataFilesStateModel,
    sourcesState: SourcesStateModel
  ) {
    return (fileId: string) => {
      let file = dataFilesState.entities[fileId] as ImageFile;
      let sources = SourcesState.getSources(sourcesState);
      let selectedSourceIds = state.photometryPanelConfig.selectedSourceIds;
      let markers: Array<CircleMarker | TeardropMarker> = [];
      if (!file) return [[]];
      let mode = state.photometryPanelConfig.coordMode;
      if (!file.wcs.isValid()) mode = "pixel";

      sources.forEach((source) => {
        if (
          source.fileId != fileId &&
          !state.photometryPanelConfig.showSourcesFromAllFiles
        )
          return;
        if (source.posType != mode) return;
        let selected = selectedSourceIds.includes(source.id);
        let coord = getSourceCoordinates(file, source);

        if (coord == null) {
          return false;
        }

        if (source.pm) {
          markers.push({
            type: MarkerType.TEARDROP,
            x: coord.x,
            y: coord.y,
            radius: 15,
            labelGap: 14,
            labelTheta: 0,
            label: state.photometryPanelConfig.showSourceLabels
              ? source.label
              : "",
            theta: coord.theta,
            selected: selected,
            data: { id: source.id },
          } as TeardropMarker);
        } else {
          markers.push({
            type: MarkerType.CIRCLE,
            x: coord.x,
            y: coord.y,
            radius: 15,
            labelGap: 14,
            labelTheta: 0,
            label: state.photometryPanelConfig.showSourceLabels
              ? source.label
              : "",
            selected: selected,
            data: { id: source.id },
          } as CircleMarker);
        }
      });

      return markers;
    };
  }

  @Action(ResetState)
  @ImmutableContext()
  public resetState(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    {}: ResetState
  ) {
    setState((state: WorkbenchStateModel) => {
      return workbenchStateDefaults;
    });
  }

  @Action(ToggleFullScreen)
  @ImmutableContext()
  public toggleFullScreen(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    {}: ToggleFullScreen
  ) {
    setState((state: WorkbenchStateModel) => {
      state.inFullScreenMode = !state.inFullScreenMode;
      return state;
    });
  }

  @Action(SetFullScreen)
  @ImmutableContext()
  public setFullScreen(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { value }: SetFullScreen
  ) {
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
  public showSidebar(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    {}: ShowSidebar
  ) {
    setState((state: WorkbenchStateModel) => {
      state.showSidebar = true;
      return state;
    });
  }

  @Action(HideSidebar)
  @ImmutableContext()
  public hideSidebar(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    {}: HideSidebar
  ) {
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
    setState((state: WorkbenchStateModel) => {
      let panel = Object.values(state.viewerPanels).find((p) => {
        return p.viewerIds.includes(viewerId);
      });
      if (panel) {
        state.focusedViewerPanelId = panel.id;
        state.viewerPanels[panel.id].selectedViewerId = viewerId;

        let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
        if (state.viewers[viewerId].fileId in dataFiles) {
          let file = dataFiles[state.viewers[viewerId].fileId];
          if (!file.headerLoaded && !file.headerLoading) {
            //FORCE LOADING OF IMAGE
            dispatch(new SetViewerFile(viewerId, file.id));
          }
        }
      }
      return state;
    });
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
        viewerId: id,
      };
      state.viewerIds.push(id);

      if (panelId == null || !state.viewerPanelIds.includes(panelId)) {
        if (state.viewerPanelIds.length == 0) {
          panelId = `PANEL_${state.nextViewerPanelIdSeed++}`;
          state.viewerPanelIds.push(panelId);
          state.viewerPanels[panelId] = {
            id: panelId,
            selectedViewerId: null,
            viewerIds: [],
          };

          //add panel to layout
          let rootContainer =
            state.viewerPanelContainers[state.rootViewerPanelContainerId];
          rootContainer.items.push({ type: "panel", id: panelId });
        } else {
          panelId = state.viewerPanels[state.focusedViewerPanelId].id;
        }
      }

      if (state.viewerPanelIds.includes(panelId)) {
        let panel = state.viewerPanels[panelId];
        panel.viewerIds.push(id);
        panel.selectedViewerId = id;
      }
      if (viewer.fileId) dispatch(new SetViewerFile(id, viewer.fileId));

      return state;
    });
  }

  @Action(CloseViewerPanel)
  @ImmutableContext()
  public closeViewerPanel(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { viewerPanelId }: CloseViewerPanel
  ) {
    setState((state: WorkbenchStateModel) => {
      //TODO: close viewers

      state.viewerPanelIds = state.viewerPanelIds.filter(
        (id) => id != viewerPanelId
      );
      if (viewerPanelId in state.viewerPanels) {
        delete state.viewerPanels[viewerPanelId];
      }

      //remove panel from layout

      return state;
    });
  }

  @Action(CloseViewer)
  @ImmutableContext()
  public closeViewer(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { viewerId }: CloseViewer
  ) {
    setState((state: WorkbenchStateModel) => {
      state.viewerIds = state.viewerIds.filter((id) => id != viewerId);
      if (viewerId in state.viewers) delete state.viewers[viewerId];

      state.viewerPanelIds
        .map((panelId) => state.viewerPanels[panelId])
        .forEach((panel) => {
          let index = panel.viewerIds.indexOf(viewerId);
          if (index > -1) {
            panel.viewerIds.splice(index, 1);
            if (panel.selectedViewerId == viewerId) {
              if (panel.viewerIds.length != 0) {
                panel.selectedViewerId =
                  state.viewerIds[
                    Math.max(0, Math.min(state.viewerIds.length - 1, index))
                  ];
              } else {
                panel.selectedViewerId = null;
                this.store.dispatch(new CloseViewerPanel(panel.id));
              }
            }
          }
        });

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

  @Action(MoveToOtherView)
  @ImmutableContext()
  public moveToOtherView(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { viewerId }: MoveToOtherView
  ) {
    setState((state: WorkbenchStateModel) => {
      //find panel
      let panels = state.viewerPanelIds.map(
        (panelId) => state.viewerPanels[panelId]
      );
      let sourcePanel = panels.find((panel) =>
        panel.viewerIds.includes(viewerId)
      );

      if (sourcePanel) {
        console.log("FOUND PANEL: ", sourcePanel);
        let sourcePanelId = sourcePanel.id;
        let containers = state.viewerPanelContainerIds.map(
          (containerId) => state.viewerPanelContainers[containerId]
        );
        let sourceContainer = containers.find((container) =>
          container.items
            .filter((item) => item.type == "panel")
            .map((item) => item.id)
            .includes(sourcePanel.id)
        );
        if (sourceContainer) {
          console.log("FOUND CONTAINER: ", sourceContainer);
          let sourceContainerId = sourceContainer.id;

          //create new panel
          let nextPanelId = `PANEL_${state.nextViewerPanelIdSeed++}`;
          state.viewerPanels[nextPanelId] = {
            id: nextPanelId,
            selectedViewerId: viewerId,
            viewerIds: [viewerId],
          };
          state.viewerPanelIds.push(nextPanelId);

          //create new container
          let nextContainerId = `CONTAINER_${state.nextViewerPanelContainerIdSeed++}`;
          state.viewerPanelContainers[nextContainerId] = {
            id: nextContainerId,
            direction: "row",
            items: [
              {
                type: "panel",
                id: nextPanelId,
              },
            ],
          };
          state.viewerPanelContainerIds.push(nextContainerId);

          //add container to layout
          state.viewerPanelContainers[sourceContainer.id].items.push({
            type: "container",
            id: nextContainerId,
          });
          console.log("SETTING FOCUSED VIEWER PANEL ID: ", nextPanelId);
          state.focusedViewerPanelId = nextPanelId;

          //remove viewer from original panel
          let sourcePanelViewerIndex = sourcePanel.viewerIds.indexOf(viewerId);
          sourcePanel.viewerIds.splice(sourcePanelViewerIndex, 1);
          if (sourcePanel.viewerIds.length == 0) {
            //no more viewers - delete panel
            state.viewerPanelIds.splice(
              state.viewerPanelIds.indexOf(sourcePanelId)
            );
            delete state.viewerPanels[sourcePanelId];

            //remove panel from container
            sourceContainer.items = sourceContainer.items.filter(
              (item) => item.type != "panel" || item.id != sourcePanelId
            );

            if (sourceContainer.items.length == 0) {
              //empty container - delete container
              state.viewerPanelContainerIds.splice(
                state.viewerPanelContainerIds.indexOf(sourceContainerId)
              );
              delete state.viewerPanelContainers[sourceContainerId];

              //remove container from parent container
              let parentContainer = containers.find((container) =>
                container.items
                  .filter((item) => item.type == "container")
                  .map((item) => item.id)
                  .includes(sourceContainerId)
              );
              if(parentContainer) {
                parentContainer.items = parentContainer.items.filter(
                  (item) => item.type != "container" || item.id != sourceContainerId
                );
              }
            }
          } else {
            if (sourcePanel.selectedViewerId == viewerId) {
              sourcePanel.selectedViewerId =
                sourcePanel.viewerIds.length == 0
                  ? null
                  : sourcePanel.viewerIds[
                      Math.min(
                        Math.max(0, sourcePanelViewerIndex - 1),
                        sourcePanel.viewerIds.length - 1
                      )
                    ];
            }
          }
        }
      }
      // TODO VIEWER CHANGE
      // if (state.primaryViewerIds.includes(viewerId)) {
      //   state.primaryViewerIds = state.primaryViewerIds.filter(
      //     (id) => id != viewerId
      //   );
      //   state.secondaryViewerIds.push(viewerId);
      // } else if (state.secondaryViewerIds.includes(viewerId)) {
      //   state.secondaryViewerIds = state.secondaryViewerIds.filter(
      //     (id) => id != viewerId
      //   );
      //   state.primaryViewerIds.push(viewerId);
      // }
      return state;
    });
  }

  @Action(SetViewMode)
  @ImmutableContext()
  public setViewMode(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { viewMode }: SetViewMode
  ) {
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

  @Action(SetViewerMarkers)
  @ImmutableContext()
  public setViewerMarkers(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { viewerId, markers }: SetViewerMarkers
  ) {
    setState((state: WorkbenchStateModel) => {
      state.viewers[viewerId].markers = markers;
      return state;
    });
  }

  @Action(ClearViewerMarkers)
  @ImmutableContext()
  public clearViewerMarkers(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    {}: ClearViewerMarkers
  ) {
    setState((state: WorkbenchStateModel) => {
      state.viewerIds.forEach(
        (viewerId) => (state.viewers[viewerId].markers = [])
      );
      return state;
    });
  }

  @Action(SetViewerFile)
  @ImmutableContext()
  public setViewerFile(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { viewerId, fileId }: SetViewerFile
  ) {
    let state = getState();
    let viewer = state.viewers[viewerId];
    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);

    let actions = [];
    let dataFile = dataFiles[fileId] as ImageFile;
    if (dataFile && viewer) {
      let originalFileId;
      setState((state: WorkbenchStateModel) => {
        originalFileId = state.viewers[viewerId].fileId;
        state.viewers[viewerId].fileId = fileId;
        return state;
      });

      if (dataFile.headerLoaded && dataFile.histLoaded) {
        let referenceFileId = originalFileId;
        if (referenceFileId == null) {
          let referenceViewer = WorkbenchState.getViewers(state).find(
            (viewer, index) =>
              viewer.viewerId != viewerId && viewer.fileId != null
          );
          if (referenceViewer) referenceFileId = referenceViewer.fileId;
        }

        //normalization
        let imageFileStates = this.store.selectSnapshot(
          WorkbenchFileStates.getEntities
        );
        let normalization = imageFileStates[dataFile.id].normalization;
        if (state.normalizationSyncEnabled && referenceFileId) {
          actions.push(
            new SyncFileNormalizations(
              dataFiles[referenceFileId] as ImageFile,
              [dataFile]
            )
          );
        } else if (!normalization.initialized) {
          // //calculate good defaults based on histogram
          // let levels = calcLevels(
          //   dataFile.hist,
          //   environment.lowerPercentileDefault,
          //   environment.upperPercentileDefault,
          //   true
          // );
          actions.push(new RenormalizeImageFile(dataFile.id));
        }

        let sonifierState = imageFileStates[dataFile.id].sonificationPanelState;
        if (!sonifierState.regionHistoryInitialized) {
          actions.push(
            new AddRegionToHistory(dataFile.id, {
              x: 0.5,
              y: 0.5,
              width: getWidth(dataFile),
              height: getHeight(dataFile),
            })
          );
        }

        if (referenceFileId) {
          //sync pending file transformation to current file
          if (state.viewerSyncEnabled)
            actions.push(
              new SyncFileTransformations(
                dataFiles[referenceFileId] as ImageFile,
                [dataFile]
              )
            );
          if (state.plottingPanelConfig.plotterSyncEnabled)
            actions.push(
              new SyncFilePlotters(dataFiles[referenceFileId] as ImageFile, [
                dataFile,
              ])
            );
        }

        return dispatch(actions);
      } else {
        actions.push(new LoadDataFile(fileId));

        let cancel$ = this.actions$.pipe(
          ofActionDispatched(SetViewerFile),
          filter<SetViewerFile>(
            (action) => action.viewerId == viewerId && action.fileId != fileId
          )
        );

        let next$ = this.actions$.pipe(
          ofActionCompleted(LoadDataFile),
          takeUntil(cancel$),
          filter((r) => r.action.fileId == fileId),
          take(1),
          filter((r) => r.result.successful),
          flatMap((action) => dispatch(new SetViewerFile(viewerId, fileId)))
        );

        return merge(dispatch(actions), next$);
      }
    }
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

    let state = getState();
    let focusedViewer = this.store.selectSnapshot(
      WorkbenchState.getFocusedViewer
    );
    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);

    let actions = [];
    // TODO VIEWER CHANGE
    // let referenceFile = dataFiles[
    //   state.viewers[state.selectedPrimaryViewerId].fileId
    // ] as ImageFile;
    // let files = WorkbenchState.getViewers(state)
    //   .filter(
    //     (viewer, index) =>
    //       viewer.viewerId != state.selectedPrimaryViewerId &&
    //       viewer.fileId !== null
    //   )
    //   .map((viewer) => dataFiles[viewer.fileId] as ImageFile);
    // if (referenceFile && files.length != 0) {
    //   if (state.viewerSyncEnabled)
    //     actions.push(new SyncFileTransformations(referenceFile, files));
    // }

    return dispatch(actions);
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
    let focusedViewer = this.store.selectSnapshot(
      WorkbenchState.getFocusedViewer
    );
    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);

    let actions = [];
    // TODO VIEWER CHANGE
    // let referenceFile = dataFiles[
    //   state.viewers[state.selectedPrimaryViewerId].fileId
    // ] as ImageFile;
    // let files = WorkbenchState.getViewers(state)
    //   .filter(
    //     (viewer, index) =>
    //       viewer.viewerId != state.selectedPrimaryViewerId &&
    //       viewer.fileId !== null
    //   )
    //   .map((viewer) => dataFiles[viewer.fileId] as ImageFile);

    // if (referenceFile && files.length != 0) {
    //   if (state.normalizationSyncEnabled)
    //     actions.push(new SyncFileNormalizations(referenceFile, files));
    // }

    return dispatch(actions);
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
  public toggleShowConfig(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    {}: ToggleShowConfig
  ) {
    setState((state: WorkbenchStateModel) => {
      state.showConfig = !state.showConfig;
      return state;
    });
  }

  @Action(SetActiveTool)
  @ImmutableContext()
  public setActiveTool(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { tool }: SetActiveTool
  ) {
    setState((state: WorkbenchStateModel) => {
      state.activeTool = tool;
      return state;
    });
  }

  @Action(UpdateCentroidSettings)
  @ImmutableContext()
  public updateCentroidSettings(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { changes }: UpdateCentroidSettings
  ) {
    setState((state: WorkbenchStateModel) => {
      state.centroidSettings = {
        ...state.centroidSettings,
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
      state.photometrySettings = {
        ...state.photometrySettings,
        ...changes,
      };
      return state;
    });
  }

  @Action(UpdateSourceExtractionSettings)
  @ImmutableContext()
  public updateSourceExtractionSettings(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { changes }: UpdateSourceExtractionSettings
  ) {
    setState((state: WorkbenchStateModel) => {
      state.sourceExtractionSettings = {
        ...state.sourceExtractionSettings,
        ...changes,
      };
      return state;
    });
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
  public closeSideNav(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    {}: CloseSidenav
  ) {
    setState((state: WorkbenchStateModel) => {
      state.showSideNav = false;
      return state;
    });
  }

  @Action(OpenSidenav)
  @ImmutableContext()
  public openSideNav(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    {}: OpenSidenav
  ) {
    setState((state: WorkbenchStateModel) => {
      state.showSideNav = true;
      return state;
    });
  }

  @Action(LoadLibrarySuccess)
  @ImmutableContext()
  public loadLibrarySuccess(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { dataFiles, correlationId }: LoadLibrarySuccess
  ) {
    let state = getState();
    let existingIds = this.store.selectSnapshot(WorkbenchFileStates.getIds);
    let dataFileEntities = this.store.selectSnapshot(
      DataFilesState.getEntities
    );
    let imageFileStateEntities = this.store.selectSnapshot(
      WorkbenchFileStates.getEntities
    );
    let newIds = dataFiles
      .filter((dataFile) => dataFile.type == DataFileType.IMAGE)
      .map((imageFile) => imageFile.id)
      .filter((id) => !existingIds.includes(id));

    dispatch(new InitializeImageFileState(newIds));

    let focusedViewer = this.store.selectSnapshot(
      WorkbenchState.getFocusedViewer
    );
    if (
      !focusedViewer ||
      !focusedViewer.fileId ||
      (dataFiles.map((f) => f.id).indexOf(focusedViewer.fileId) == -1 &&
        dataFiles.length != 0) ||
      (dataFileEntities[focusedViewer.fileId] &&
        dataFileEntities[focusedViewer.fileId].type == DataFileType.IMAGE &&
        !imageFileStateEntities[focusedViewer.fileId].normalization.initialized)
    ) {
      if (dataFiles[0]) {
        dispatch(new SelectDataFile(dataFiles[0].id));
      }
    }
  }

  @Action(RemoveDataFile)
  @ImmutableContext()
  public removeDataFile(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { fileId }: RemoveDataFile
  ) {
    setState((state: WorkbenchStateModel) => {
      WorkbenchState.getViewers(state).forEach((v) => {
        if (v.fileId == fileId) v.fileId = null;
      });
      return state;
    });

    let focusedFileId = this.store.selectSnapshot(
      WorkbenchState.getFocusedFileId
    );
    if (focusedFileId == fileId) {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getDataFiles);
      let index = dataFiles.map((f) => f.id).indexOf(fileId);
      if (index != -1 && dataFiles.length != 1) {
        this.actions$
          .pipe(
            ofActionCompleted(RemoveDataFile),
            take(1),
            filter((a) => a.result.successful)
          )
          .subscribe(() => {
            dataFiles = this.store.selectSnapshot(DataFilesState.getDataFiles);
            let nextFile =
              dataFiles[Math.max(0, Math.min(dataFiles.length - 1, index))];
            if (nextFile) dispatch(new SelectDataFile(nextFile.id));
          });
      }
    }
  }

  @Action(RemoveDataFileSuccess)
  @ImmutableContext()
  public removeDataFileSuccess(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { fileId }: RemoveDataFileSuccess
  ) {
    setState((state: WorkbenchStateModel) => {
      state.aligningPanelConfig.alignFormData.selectedImageFileIds = state.aligningPanelConfig.alignFormData.selectedImageFileIds.filter(
        (fileId) => fileId != fileId
      );
      state.pixelOpsPanelConfig.pixelOpsFormData.imageFileIds = state.pixelOpsPanelConfig.pixelOpsFormData.imageFileIds.filter(
        (fileId) => fileId != fileId
      );
      state.pixelOpsPanelConfig.pixelOpsFormData.auxImageFileIds = state.pixelOpsPanelConfig.pixelOpsFormData.auxImageFileIds.filter(
        (fileId) => fileId != fileId
      );
      state.pixelOpsPanelConfig.pixelOpsFormData.auxImageFileId =
        state.pixelOpsPanelConfig.pixelOpsFormData.auxImageFileId == fileId
          ? null
          : state.pixelOpsPanelConfig.pixelOpsFormData.auxImageFileId;
      return state;
    });
  }

  @Action(SelectDataFile)
  @ImmutableContext()
  public selectDataFile(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { fileId }: SelectDataFile
  ) {
    let state = getState();

    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);

    if (fileId != null) {
      let dataFile = dataFiles[fileId];
      let viewers = WorkbenchState.getViewers(state);

      //check if file is already open
      let targetViewer = viewers.find((viewer) => viewer.fileId == fileId);
      if (targetViewer) {
        dispatch(new SetFocusedViewer(targetViewer.viewerId));
        return;
      }

      //check if existing viewer is available
      targetViewer = viewers.find((viewer) => !viewer.keepOpen);
      if (targetViewer) {
        //temporary viewer exists
        dispatch(new SetViewerFile(targetViewer.viewerId, dataFile.id));
        dispatch(new SetFocusedViewer(targetViewer.viewerId));
        return;
      }

      let viewer: Viewer = {
        viewerId: null,
        fileId: fileId,
        panEnabled: true,
        zoomEnabled: true,
        markers: [],
        keepOpen: false,
      };

      dispatch(new CreateViewer(viewer, state.focusedViewerPanelId));
    }
  }

  @Action([
    MoveBy,
    ZoomBy,
    RotateBy,
    Flip,
    ResetImageTransform,
    SetViewportTransform,
    SetImageTransform,
  ])
  @ImmutableContext()
  public onTransformChange(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    {
      fileId,
    }:
      | MoveBy
      | ZoomBy
      | RotateBy
      | Flip
      | ResetImageTransform
      | SetViewportTransform
      | SetImageTransform
  ) {
    let state = getState();
    let focusedViewer = this.store.selectSnapshot(
      WorkbenchState.getFocusedViewer
    );
    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);

    if (
      !state.viewerSyncEnabled ||
      !focusedViewer ||
      focusedViewer.fileId != fileId
    ) {
      return;
    }

    // TODO VIEWER CHANGE
    // let referenceFile = dataFiles[focusedViewer.fileId] as ImageFile;
    // let files = WorkbenchState.getViewers(state)
    //   .filter(
    //     (viewer, index) =>
    //       viewer.viewerId != state.selectedPrimaryViewerId &&
    //       viewer.fileId !== null
    //   )
    //   .map((viewer) => dataFiles[viewer.fileId] as ImageFile);

    // return dispatch(new SyncFileTransformations(referenceFile, files));
    return;
  }

  @Action(UpdateNormalizer)
  @ImmutableContext()
  public onNormalizationChange(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { fileId, changes }: UpdateNormalizer
  ) {
    let state = getState();
    let focusedViewer = this.store.selectSnapshot(
      WorkbenchState.getFocusedViewer
    );
    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);

    if (
      !state.normalizationSyncEnabled ||
      !focusedViewer ||
      focusedViewer.fileId != fileId
    )
      return;

    // TODO VIEWER CHANGE
    // let referenceFile = dataFiles[focusedViewer.fileId] as ImageFile;
    // let files = WorkbenchState.getViewers(state)
    //   .filter(
    //     (viewer, index) =>
    //       viewer.viewerId != state.selectedPrimaryViewerId &&
    //       viewer.fileId !== null
    //   )
    //   .map((viewer) => dataFiles[viewer.fileId] as ImageFile);

    // return dispatch(new SyncFileNormalizations(referenceFile, files));
    return;
  }

  @Action([StartLine, UpdateLine, UpdatePlotterFileState])
  @ImmutableContext()
  public onPlotterChange(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { fileId }: StartLine | UpdateLine | UpdatePlotterFileState
  ) {
    let state = getState();
    let focusedViewer = this.store.selectSnapshot(
      WorkbenchState.getFocusedViewer
    );
    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);

    if (
      !state.plottingPanelConfig.plotterSyncEnabled ||
      !focusedViewer ||
      focusedViewer.fileId != fileId
    )
      return;

    // TODO VIEWER CHANGE
    // let referenceFile = dataFiles[focusedViewer.fileId] as ImageFile;
    // let files = WorkbenchState.getViewers(state)
    //   .filter(
    //     (viewer, index) =>
    //       viewer.viewerId != state.selectedPrimaryViewerId &&
    //       viewer.fileId !== null
    //   )
    //   .map((viewer) => dataFiles[viewer.fileId] as ImageFile);

    // return dispatch(new SyncFilePlotters(referenceFile, files));
    return;
  }

  @Action(SyncFileNormalizations)
  @ImmutableContext()
  public syncFileNormalizations(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { reference, files }: SyncFileNormalizations
  ) {
    let state = getState();
    let imageFileStates = this.store.selectSnapshot(
      WorkbenchFileStates.getEntities
    );

    let srcFile: ImageFile = reference;
    if (!srcFile) return;

    let targetFiles: ImageFile[] = files;
    let srcNormalizer = imageFileStates[srcFile.id].normalization.normalizer;

    let actions = [];
    targetFiles.forEach((targetFile) => {
      if (!targetFile || targetFile.id == srcFile.id) return;
      actions.push(
        new UpdateNormalizer(targetFile.id, {
          ...srcNormalizer,
          peakPercentile: srcNormalizer.peakPercentile,
          backgroundPercentile: srcNormalizer.backgroundPercentile,
        })
      );
    });

    return dispatch(actions);
  }

  @Action(SyncFilePlotters)
  @ImmutableContext()
  public syncFilePlotters(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { reference, files }: SyncFilePlotters
  ) {
    let state = getState();
    let imageFileStates = this.store.selectSnapshot(
      WorkbenchFileStates.getEntities
    );

    let srcFile: ImageFile = reference;
    let targetFiles: ImageFile[] = files;
    let srcPlotter = imageFileStates[srcFile.id].plottingPanelState;

    targetFiles.forEach((targetFile) => {
      if (!targetFile || targetFile.id == srcFile.id) return;
      return dispatch(
        new UpdatePlotterFileState(targetFile.id, { ...srcPlotter })
      );
    });
  }

  @Action(SyncFileTransformations)
  @ImmutableContext()
  public syncFileTransformations(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { reference, files }: SyncFileTransformations
  ) {
    let state = getState();
    let imageFileStates = this.store.selectSnapshot(
      WorkbenchFileStates.getEntities
    );

    let actions = [];
    let srcFile: ImageFile = reference;
    let targetFiles: ImageFile[] = files;

    if (!srcFile) return;

    let srcHasWcs = srcFile.wcs.isValid();
    let srcImageTransform =
      imageFileStates[srcFile.id].transformation.imageTransform;
    let srcViewportTransform =
      imageFileStates[srcFile.id].transformation.viewportTransform;

    targetFiles.forEach((targetFile) => {
      if (!targetFile || targetFile.id == srcFile.id) return;

      let targetHasWcs = targetFile.wcs.isValid();

      if (srcHasWcs && targetHasWcs) {
        let srcWcs = srcFile.wcs;
        let srcWcsTransform = new Matrix(
          srcWcs.m11,
          srcWcs.m21,
          srcWcs.m12,
          srcWcs.m22,
          0,
          0
        );
        let originWorld = srcWcs.pixToWorld([0, 0]);
        let targetWcs = targetFile.wcs;
        let originPixels = targetWcs.worldToPix(originWorld);
        let targetWcsTransform = new Matrix(
          targetWcs.m11,
          targetWcs.m21,
          targetWcs.m12,
          targetWcs.m22,
          0,
          0
        );
        let targetImageFileState = imageFileStates[targetFile.id];

        if (hasOverlap(srcFile, targetFile)) {
          let srcToTargetTransform = srcWcsTransform
            .inverted()
            .appended(targetWcsTransform)
            .translate(-originPixels[0], -originPixels[1]);
          let targetImageMatrix = transformToMatrix(
            imageFileStates[srcFile.id].transformation.imageTransform
          ).appended(srcToTargetTransform);
          actions.push(
            new SetImageTransform(
              targetFile.id,
              matrixToTransform(targetImageMatrix)
            )
          );
          actions.push(
            new SetViewportTransform(
              targetFile.id,
              imageFileStates[srcFile.id].transformation.viewportTransform
            )
          );
        }
      } else {
        let targetImageFileState = imageFileStates[targetFile.id];
        actions.push(new SetImageTransform(targetFile.id, srcImageTransform));
        actions.push(
          new SetViewportTransform(targetFile.id, srcViewportTransform)
        );
      }
    });
    return dispatch(actions);
  }

  @Action(LoadCatalogs)
  @ImmutableContext()
  public loadCatalogs(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    {}: LoadCatalogs
  ) {
    return this.afterglowCatalogService.getCatalogs().pipe(
      tap((catalogs) => {
        setState((state: WorkbenchStateModel) => {
          state.catalogs = catalogs;
          state.selectedCatalogId =
            catalogs.length != 0 ? catalogs[0].name : null;
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
  public loadFieldCals(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    {}: LoadFieldCals
  ) {
    return this.afterglowFieldCalService.getFieldCals().pipe(
      tap((fieldCals) => {
        setState((state: WorkbenchStateModel) => {
          state.fieldCals = fieldCals;
          state.selectedFieldCalId =
            state.selectedFieldCalId == null
              ? fieldCals.length == 0
                ? null
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
        return dispatch([
          new CreateFieldCalSuccess(fieldCal),
          new LoadFieldCals(),
        ]);
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
      tap((fieldCal) => {}),
      flatMap((fieldCal) => {
        return dispatch([
          new UpdateFieldCalSuccess(fieldCal),
          new LoadFieldCals(),
        ]);
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
  public createPixelOpsJob(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    {}: CreatePixelOpsJob
  ) {
    let state = getState();
    let dataFiles = this.store.selectSnapshot(DataFilesState.getDataFiles);
    let data = state.pixelOpsPanelConfig.pixelOpsFormData;
    let imageFiles = data.imageFileIds
      .map((id) => dataFiles.find((f) => f.id == id))
      .filter((f) => f != null);
    let auxFileIds: number[] = [];
    let op;
    if (data.mode == "scalar") {
      op = `img ${data.operand} ${data.scalarValue}`;
    } else {
      op = `img ${data.operand} aux_img`;
      auxFileIds.push(parseInt(data.auxImageFileId));
    }
    let job: PixelOpsJob = {
      type: JobType.PixelOps,
      id: null,
      file_ids: imageFiles
        .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
        .map((f) => parseInt(f.id)),
      aux_file_ids: auxFileIds,
      op: op,
      inplace: data.inPlace,
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
        let jobEntity = this.store.selectSnapshot(JobsState.getEntities)[
          a.job.id
        ];
        let result = jobEntity.result as PixelOpsJobResult;
        if (result.errors.length != 0) {
          console.error(
            "Errors encountered during pixel ops job: ",
            result.errors
          );
        }
        if (result.warnings.length != 0) {
          console.error(
            "Warnings encountered during pixel ops job: ",
            result.warnings
          );
        }
        dispatch(new LoadLibrary());
      })
    );

    let jobUpdated$ = this.actions$.pipe(
      ofActionSuccessful(UpdateJob),
      filter<CreateJob>((a) => a.correlationId == correlationId),
      takeUntil(jobCompleted$),
      tap((a) => {
        let jobEntity = this.store.selectSnapshot(JobsState.getEntities)[
          a.job.id
        ];
        setState((state: WorkbenchStateModel) => {
          state.pixelOpsPanelConfig.currentPixelOpsJobId = jobEntity.job.id;
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
    {}: CreateAdvPixelOpsJob
  ) {
    let state = getState();
    let dataFiles = this.store.selectSnapshot(DataFilesState.getDataFiles);

    let data = state.pixelOpsPanelConfig.pixelOpsFormData;
    let imageFiles = data.imageFileIds
      .map((id) => dataFiles.find((f) => f.id == id))
      .filter((f) => f != null);
    let auxImageFiles = data.auxImageFileIds
      .map((id) => dataFiles.find((f) => f.id == id))
      .filter((f) => f != null);
    let job: PixelOpsJob = {
      type: JobType.PixelOps,
      id: null,
      file_ids: imageFiles
        .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
        .map((f) => parseInt(f.id)),
      aux_file_ids: auxImageFiles
        .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
        .map((f) => parseInt(f.id)),
      op: data.opString,
      inplace: data.inPlace,
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
        let jobEntity = this.store.selectSnapshot(JobsState.getEntities)[
          a.job.id
        ];
        let result = jobEntity.result as PixelOpsJobResult;
        if (result.errors.length != 0) {
          console.error("Errors encountered during pixel ops: ", result.errors);
        }
        if (result.warnings.length != 0) {
          console.error(
            "Warnings encountered during pixel ops: ",
            result.warnings
          );
        }
        dispatch(new LoadLibrary());
      })
    );

    let jobUpdated$ = this.actions$.pipe(
      ofActionSuccessful(UpdateJob),
      filter<CreateJob>((a) => a.correlationId == correlationId),
      takeUntil(jobCompleted$),
      tap((a) => {
        let jobEntity = this.store.selectSnapshot(JobsState.getEntities)[
          a.job.id
        ];
        setState((state: WorkbenchStateModel) => {
          state.pixelOpsPanelConfig.currentPixelOpsJobId = jobEntity.job.id;
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
    {}: CreateAlignmentJob
  ) {
    let state = getState();
    let data = state.aligningPanelConfig.alignFormData;
    let dataFiles = this.store.selectSnapshot(DataFilesState.getDataFiles);
    let imageFiles = data.selectedImageFileIds
      .map((id) => dataFiles.find((f) => f.id == id))
      .filter((f) => f != null);

    let job: AlignmentJob = {
      type: JobType.Alignment,
      id: null,
      file_ids: imageFiles
        .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
        .map((f) => parseInt(f.id)),
      inplace: data.inPlace,
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
        let jobEntity = this.store.selectSnapshot(JobsState.getEntities)[
          a.job.id
        ];
        let result = jobEntity.result as AlignmentJobResult;
        if (result.errors.length != 0) {
          console.error("Errors encountered during aligning: ", result.errors);
        }
        if (result.warnings.length != 0) {
          console.error(
            "Warnings encountered during aligning: ",
            result.warnings
          );
        }

        let fileIds = result.file_ids.map((id) => id.toString());
        let actions = [];
        if ((jobEntity.job as AlignmentJob).inplace) {
          actions.push(new ClearImageDataCache(fileIds));
        } else {
          actions.push(new LoadLibrary());
        }
        WorkbenchState.getViewers(getState()).forEach((viewer, index) => {
          if (fileIds.includes(viewer.fileId)) {
            actions.push(new SetViewerFile(viewer.viewerId, viewer.fileId));
          }
        });

        return dispatch(actions);
      })
    );

    let jobUpdated$ = this.actions$.pipe(
      ofActionSuccessful(UpdateJob),
      filter<CreateJob>((a) => a.correlationId == correlationId),
      takeUntil(jobCompleted$),
      tap((a) => {
        let jobEntity = this.store.selectSnapshot(JobsState.getEntities)[
          a.job.id
        ];
        setState((state: WorkbenchStateModel) => {
          state.aligningPanelConfig.currentAlignmentJobId = jobEntity.job.id;
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
    {}: CreateStackingJob
  ) {
    let state = getState();
    let data = state.stackingPanelConfig.stackFormData;
    let dataFiles = this.store.selectSnapshot(DataFilesState.getDataFiles);
    let imageFiles = data.selectedImageFileIds
      .map((id) => dataFiles.find((f) => f.id == id))
      .filter((f) => f != null);
    let job: StackingJob = {
      type: JobType.Stacking,
      id: null,
      file_ids: imageFiles
        .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
        .map((f) => parseInt(f.id)),
      stacking_settings: {
        mode: data.mode,
        scaling: data.scaling == "none" ? null : data.scaling,
        rejection: data.rejection == "none" ? null : data.rejection,
        percentile: data.percentile,
        lo: data.low,
        hi: data.high,
      },
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
        let jobEntity = this.store.selectSnapshot(JobsState.getEntities)[
          a.job.id
        ];
        let result = jobEntity.result as PixelOpsJobResult;
        if (result.errors.length != 0) {
          console.error("Errors encountered during stacking: ", result.errors);
        }
        if (result.warnings.length != 0) {
          console.error(
            "Warnings encountered during stacking: ",
            result.warnings
          );
        }
        dispatch(new LoadLibrary());
      })
    );

    let jobUpdated$ = this.actions$.pipe(
      ofActionSuccessful(UpdateJob),
      filter<CreateJob>((a) => a.correlationId == correlationId),
      takeUntil(jobCompleted$),
      tap((a) => {
        let jobEntity = this.store.selectSnapshot(JobsState.getEntities)[
          a.job.id
        ];
        setState((state: WorkbenchStateModel) => {
          state.stackingPanelConfig.currentStackingJobId = jobEntity.job.id;
          return state;
        });
      })
    );

    return merge(jobSuccessful$, jobUpdated$);
  }

  @Action(ImportFromSurvey)
  @ImmutableContext()
  public importFromSurvey(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    {
      surveyDataProviderId,
      raHours,
      decDegs,
      widthArcmins,
      heightArcmins,
      imageFileId,
      correlationId,
    }: ImportFromSurvey
  ) {
    // TODO VIEWER CHANGE
    // let importFromSurveyCorrId = this.correlationIdGenerator.next();
    // setState((state: WorkbenchStateModel) => {
    //   state.dssImportLoading = true;
    //   return state;
    // });
    // let importCompleted$ = this.actions$.pipe(
    //   ofActionDispatched(ImportAssetsCompleted),
    //   filter<ImportAssetsCompleted>(
    //     (action) => action.correlationId == importFromSurveyCorrId
    //   ),
    //   take(1),
    //   flatMap((action) => {
    //     dispatch(new LoadLibrary());
    //     dispatch(new ImportFromSurveySuccess());
    //     let state = getState();
    //     let viewers = WorkbenchState.getViewers(state);
    //     let targetViewer = viewers.find(
    //       (v) => v.viewerId != state.selectedPrimaryViewerId
    //     );
    //     return this.actions$.pipe(
    //       ofActionCompleted(LoadLibrary),
    //       take(1),
    //       filter((loadLibraryAction) => loadLibraryAction.result.successful),
    //       tap((loadLibraryAction) => {
    //         setState((state: WorkbenchStateModel) => {
    //           state.dssImportLoading = false;
    //           return state;
    //         });
    //         if (targetViewer) {
    //           // if(getState().viewMode == ViewMode.SINGLE ) {
    //           //   dispatch(new SetViewMode(ViewMode.SPLIT_VERTICAL));
    //           // }
    //           dispatch(new SetFocusedViewer(targetViewer.viewerId));
    //           dispatch(new SelectDataFile(action.fileIds[0].toString()));
    //         }
    //       })
    //     );
    //   })
    // );
    // dispatch(
    //   new ImportAssets(
    //     surveyDataProviderId,
    //     [
    //       {
    //         name: "",
    //         collection: false,
    //         path: `DSS\\${
    //           raHours * 15
    //         },${decDegs}\\${widthArcmins},${heightArcmins}`,
    //         metadata: {},
    //       },
    //     ],
    //     importFromSurveyCorrId
    //   )
    // );
    // return importCompleted$;
  }

  /* Source Extraction */
  @Action(ExtractSources)
  @ImmutableContext()
  public extractSources(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { fileId, settings }: ExtractSources
  ) {
    let state = getState();
    let photometryPageSettings = this.store.selectSnapshot(
      WorkbenchState.getPhotometryPanelConfig
    );
    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
    let imageFile = dataFiles[fileId] as ImageFile;
    let imageFileState = this.store.selectSnapshot(
      WorkbenchFileStates.getEntities
    )[imageFile.id];
    let sonifier = imageFileState.sonificationPanelState;

    let jobSettings: SourceExtractionJobSettings = {
      threshold: settings.threshold,
      fwhm: settings.fwhm,
      deblend: settings.deblend,
      limit: settings.limit,
    };
    if (
      settings.region == SourceExtractionRegionOption.VIEWPORT ||
      (settings.region == SourceExtractionRegionOption.SONIFIER_REGION &&
        imageFileState.sonificationPanelState.regionMode ==
          SonifierRegionMode.VIEWPORT)
    ) {
      let region = getViewportRegion(imageFileState.transformation, imageFile);

      jobSettings = {
        ...jobSettings,
        x: Math.min(getWidth(imageFile), Math.max(0, region.x + 1)),
        y: Math.min(getHeight(imageFile), Math.max(0, region.y + 1)),
        width: Math.min(getWidth(imageFile), Math.max(0, region.width + 1)),
        height: Math.min(getHeight(imageFile), Math.max(0, region.height + 1)),
      };
    } else if (
      settings.region == SourceExtractionRegionOption.SONIFIER_REGION &&
      imageFileState.sonificationPanelState.regionMode ==
        SonifierRegionMode.CUSTOM
    ) {
      let region = sonifier.regionHistory[sonifier.regionHistoryIndex];
      jobSettings = {
        ...jobSettings,
        x: Math.min(getWidth(imageFile), Math.max(0, region.x + 1)),
        y: Math.min(getHeight(imageFile), Math.max(0, region.y + 1)),
        width: Math.min(getWidth(imageFile), Math.max(0, region.width + 1)),
        height: Math.min(getHeight(imageFile), Math.max(0, region.height + 1)),
      };
    }
    let job: SourceExtractionJob = {
      id: null,
      type: JobType.SourceExtraction,
      file_ids: [parseInt(fileId)],
      source_extraction_settings: jobSettings,
      merge_sources: false,
      source_merge_settings: null,
    };

    let correlationId = this.correlationIdGenerator.next();
    dispatch(new CreateJob(job, 1000, correlationId));
    return this.actions$.pipe(
      ofActionSuccessful(CreateJob),
      filter<CreateJob>((a) => a.correlationId == correlationId),
      tap((a) => {
        let jobEntity = this.store.selectSnapshot(JobsState.getEntities)[
          a.job.id
        ];
        let result = jobEntity.result as SourceExtractionJobResult;
        if (result.errors.length != 0) {
          dispatch(new ExtractSourcesFail(result.errors.join(",")));
          return;
        }
        let sources = result.data.map((d) => {
          let posType = PosType.PIXEL;
          let primaryCoord = d.x;
          let secondaryCoord = d.y;

          if (
            photometryPageSettings.coordMode == "sky" &&
            dataFiles[fileId].wcs &&
            dataFiles[fileId].wcs.isValid() &&
            "ra_hours" in d &&
            d.ra_hours !== null &&
            "dec_degs" in d &&
            d.dec_degs !== null
          ) {
            posType = PosType.SKY;
            primaryCoord = d.ra_hours;
            secondaryCoord = d.dec_degs;
          }

          let pmEpoch = null;
          if (d.time && Date.parse(d.time + " GMT")) {
            pmEpoch = new Date(Date.parse(d.time + " GMT")).toISOString();
          }
          return {
            id: null,
            label: null,
            objectId: null,
            fileId: d.file_id.toString(),
            posType: posType,
            primaryCoord: primaryCoord,
            secondaryCoord: secondaryCoord,
            pm: null,
            pmPosAngle: null,
            pmEpoch: pmEpoch,
          } as Source;
        });

        dispatch(new AddSources(sources));
      })
    );
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

  @Action(PhotometerSources)
  @ImmutableContext()
  public photometerSources(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { sourceIds, fileIds, settings, isBatch }: PhotometerSources
  ) {
    let state = getState();
    let sourcesState = this.store.selectSnapshot(SourcesState.getState);

    sourceIds = sourceIds.filter((id) => sourcesState.ids.includes(id));

    let s: PhotometryJobSettings;

    if (settings.mode == "adaptive") {
      s = {
        mode: "auto",
        a: settings.aKrFactor,
        a_in: settings.aInKrFactor,
        a_out: settings.aOutKrFactor,
      };
    } else {
      s = {
        mode: "aperture",
        a: settings.a,
        b: settings.b,
        a_in: settings.aIn,
        a_out: settings.aOut,
        b_out: settings.bOut,
        theta: settings.theta,
        theta_out: settings.thetaOut,
      };
    }

    s.gain = settings.gain;
    s.centroid_radius = settings.centroidRadius;
    s.zero_point = settings.zeroPoint;

    let job: PhotometryJob = {
      type: JobType.Photometry,
      settings: s,
      id: null,
      file_ids: fileIds.map((id) => parseInt(id)),
      sources: sourceIds.map((id, index) => {
        let source = sourcesState.entities[id];
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
        return {
          id: source.id,
          pm_epoch: source.pmEpoch
            ? new Date(source.pmEpoch).toISOString()
            : null,
          x: x,
          y: y,
          pm_pixel: pmPixel,
          pm_pos_angle_pixel: pmPosAnglePixel,
          ra_hours: raHours,
          dec_degs: decDegs,
          pm_sky: pmSky,
          pm_pos_angle_sky: pmPosAngleSky,
        } as Astrometry & SourceId;
      }),
    };

    let correlationId = this.correlationIdGenerator.next();
    dispatch(new CreateJob(job, 1000, correlationId));

    setState((state: WorkbenchStateModel) => {
      if (isBatch) state.photometryPanelConfig.batchPhotProgress = 0;
      return state;
    });

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
        let jobEntity = this.store.selectSnapshot(JobsState.getEntities)[
          a.job.id
        ];
        let result = jobEntity.result as PhotometryJobResult;
        if (result.errors.length != 0) {
          console.error(
            "Errors encountered while photometering sources: ",
            result.errors
          );
        }
        if (result.warnings.length != 0) {
          console.error(
            "Warnings encountered while photometering sources: ",
            result.warnings
          );
        }

        setState((state: WorkbenchStateModel) => {
          if (isBatch) state.photometryPanelConfig.batchPhotProgress = null;
          return state;
        });

        let photDatas = [];
        fileIds.forEach((fileId) => {
          sourceIds.forEach((sourceId) => {
            let d = result.data.find(
              (d) => d.id == sourceId && d.file_id.toString() == fileId
            );
            if (!d) {
              photDatas.push({
                id: null,
                sourceId: sourceId,
                fileId: fileId,
              } as PhotData);
            } else {
              let time = null;
              if (d.time && Date.parse(d.time + " GMT")) {
                time = new Date(Date.parse(d.time + " GMT"));
              }
              photDatas.push({
                id: null,
                sourceId: d.id,
                fileId: d.file_id.toString(),
                time: time,
                filter: d.filter,
                telescope: d.telescope,
                expLength: d.exp_length,
                raHours: d.ra_hours,
                decDegs: d.dec_degs,
                x: d.x,
                y: d.y,
                mag: d.mag,
                magError: d.mag_error,
                flux: d.flux,
                fluxError: d.flux_error,
              } as PhotData);
            }
          });
        });
        dispatch(new AddPhotDatas(photDatas));
      })
    );

    let jobUpdated$ = this.actions$.pipe(
      ofActionSuccessful(UpdateJob),
      filter<CreateJob>((a) => a.correlationId == correlationId),
      takeUntil(jobCompleted$),
      tap((a) => {
        let jobEntity = this.store.selectSnapshot(JobsState.getEntities)[
          a.job.id
        ];

        setState((state: WorkbenchStateModel) => {
          if (isBatch) {
            state.photometryPanelConfig.batchPhotJobId = a.job.id;
            state.photometryPanelConfig.batchPhotProgress =
              jobEntity.job.state.progress;
          }
          return state;
        });
      })
    );

    return merge(jobSuccessful$, jobUpdated$);
  }
}
