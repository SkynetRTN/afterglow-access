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
  filter,
  take,
  takeUntil,
  flatMap,
} from "rxjs/operators";
import { merge } from "rxjs";
import {
  WorkbenchStateModel,
  WorkbenchTool,
  ViewerPanel,
  ViewerPanelContainer,
} from "./models/workbench-state";
import { ViewMode } from "./models/view-mode";
import { SidebarView } from "./models/sidebar-view";
import {
  createPsfCentroiderSettings,
  createDiskCentroiderSettings,
} from "./models/centroider";
import {
  LoadLibrarySuccess,
  LoadLibrary,
  ClearImageDataCache,
  LoadHdu,
  CloseHduSuccess,
  CloseDataFile,
  SyncFileTransformations,
  SyncFileNormalizations,
  CenterRegionInViewport,
} from "../data-files/data-files.actions";
import {
  SelectDataFileListItem,
  RemoveViewerLayoutItem,
  SetFocusedViewer,
  SetViewerData as SetViewerFile,
  SyncFilePlotters,
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
  SplitViewerPanel,
  UpdateFileInfoPanelConfig,
  MoveViewer,
  Initialize,
  UpdateCurrentViewportSize,
} from "./workbench.actions";
import {
  getWidth,
  getHeight,
  getSourceCoordinates,
  DataFile,
  ImageHdu,
  IHdu,
} from "../data-files/models/data-file";
import {
  WorkbenchFileStates,
  WorkbenchFileStatesModel,
} from "./workbench-file-states.state";
import {
  AddRegionToHistory,
  StartLine,
  UpdateLine,
  UpdatePlotterFileState,
  InitializeWorkbenchHduState,
  AddPhotDatas,
  SonificationRegionChanged,
} from "./workbench-file-states.actions";
import { AfterglowCatalogService } from "./services/afterglow-catalogs";
import { AfterglowFieldCalService } from "./services/afterglow-field-cals";
import { CorrelationIdGenerator } from "../utils/correlated-action";
import { CreateJob, UpdateJob } from "../jobs/jobs.actions";
import { PixelOpsJob, PixelOpsJobResult } from "../jobs/models/pixel-ops";
import { JobType } from "../jobs/models/job-types";
import { AlignmentJob, AlignmentJobResult } from "../jobs/models/alignment";
import { StackingJob } from "../jobs/models/stacking";
import {
  ImportAssetsCompleted,
  ImportAssets,
} from "../data-providers/data-providers.actions";
import { ImmutableContext } from "@ngxs-labs/immer-adapter";
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
import { PhotData } from "./models/source-phot-data";
import { Viewer } from "./models/viewer";
import { ResetState } from "../auth/auth.actions";
import {
  WorkbenchImageHduState,
  IWorkbenchHduState,
} from "./models/workbench-file-state";
import {
  DataFilesState,
  DataFilesStateModel,
} from "../data-files/data-files.state";
import { HduType } from "../data-files/models/data-file-type";
import { getViewportRegion } from "../data-files/models/transformation";

const workbenchStateDefaults: WorkbenchStateModel = {
  version: "051341ac-a968-4d48-9e01-8336ee6a978d",
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
  viewerLayoutItemIds: ["ROOT_CONTAINER"],
  viewerLayoutItems: {
    ROOT_CONTAINER: {
      id: "ROOT_CONTAINER",
      type: "container",
      direction: "row",
      itemIds: [],
    } as ViewerPanelContainer,
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
      selectedHduIds: [],
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
      auxHduId: null,
      auxHduIds: [],
      hduIds: [],
      scalarValue: 1,
      inPlace: false,
      opString: "",
    },
  },
  aligningPanelConfig: {
    alignFormData: {
      selectedHduIds: [],
      mode: "astrometric",
      inPlace: true,
    },
    currentAlignmentJobId: null,
  },
  stackingPanelConfig: {
    stackFormData: {
      selectedHduIds: [],
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
  ) { }

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
  public static getViewerPanelIds(state: WorkbenchStateModel) {
    return state.viewerLayoutItemIds.filter(
      (id) => state.viewerLayoutItems[id].type == "panel"
    );
  }

  @Selector([WorkbenchState.getViewerPanelIds])
  public static getViewerPanelEntities(
    state: WorkbenchStateModel,
    viewerPanelIds: string[]
  ) {
    return viewerPanelIds.reduce((obj, key) => {
      return {
        ...obj,
        [key]: state.viewerLayoutItems[key] as ViewerPanel,
      };
    }, {} as { [id: string]: ViewerPanel });
  }

  @Selector([WorkbenchState.getViewerPanelIds])
  public static getViewerPanels(
    state: WorkbenchStateModel,
    viewerPanelIds: string[]
  ) {
    return viewerPanelIds.map((id) => state.viewerLayoutItems[id]);
  }

  @Selector()
  public static getViewerPanelContainerIds(state: WorkbenchStateModel) {
    return state.viewerLayoutItemIds.filter(
      (id) => state.viewerLayoutItems[id].type == "container"
    );
  }

  @Selector([WorkbenchState.getViewerPanelContainerIds])
  public static getViewerPanelContainerEntities(
    state: WorkbenchStateModel,
    viewerPanelContainerIds: string[]
  ) {
    return viewerPanelContainerIds.reduce((obj, key) => {
      return {
        ...obj,
        [key]: state.viewerLayoutItems[key] as ViewerPanelContainer,
      };
    }, {} as { [id: string]: ViewerPanelContainer });
  }

  @Selector([WorkbenchState.getViewerPanelContainerIds])
  public static getViewerContainerPanels(
    state: WorkbenchStateModel,
    viewerPanelContainerIds: string[]
  ) {
    return viewerPanelContainerIds.map((id) => state.viewerLayoutItems[id]);
  }

  @Selector()
  public static getRootViewerPanelContainer(state: WorkbenchStateModel) {
    return state.viewerLayoutItems[
      state.rootViewerPanelContainerId
    ] as ViewerPanelContainer;
  }

  @Selector()
  public static getFocusedViewerPanelId(state: WorkbenchStateModel) {
    return state.focusedViewerPanelId;
  }

  @Selector()
  public static getViewerById(state: WorkbenchStateModel) {
    return (id: string) => {
      return id in state.viewers ? state.viewers[id] : null;
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

  @Selector([
    WorkbenchState.getFocusedViewer,
    DataFilesState.getDataFileEntities,
  ])
  public static getFocusedViewerFile(
    state: WorkbenchStateModel,
    focusedViewer: Viewer,
    dataFileEntities: { [id: string]: DataFile }
  ) {
    if (
      !focusedViewer ||
      !focusedViewer.fileId ||
      !(focusedViewer.fileId in dataFileEntities)
    )
      return null;
    return dataFileEntities[focusedViewer.fileId];
  }

  @Selector([WorkbenchState.getFocusedViewer, DataFilesState.getHduEntities])
  public static getFocusedViewerHdu(
    state: WorkbenchStateModel,
    focusedViewer: Viewer,
    hduEntities: { [id: string]: IHdu }
  ) {
    if (
      !focusedViewer ||
      !focusedViewer.hduId ||
      !(focusedViewer.hduId in hduEntities)
    )
      return null;
    return hduEntities[focusedViewer.hduId];
  }

  @Selector([
    WorkbenchState.getFocusedViewer,
    DataFilesState.getDataFileEntities,
    DataFilesState.getHduEntities,
  ])
  public static getFocusedViewerViewportSize(
    state: WorkbenchStateModel,
    focusedViewer: Viewer,
    dataFileEntities: { [id: string]: DataFile },
    hduEntities: { [id: string]: IHdu }
  ) {
    if (!focusedViewer) return null;
    return focusedViewer.viewportSize;
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
      let file = dataFilesState.hduEntities[fileId];
    };
  }

  @Selector([
    DataFilesState.getHduEntities,
    WorkbenchFileStates.getHduStateEntities,
  ])
  static getSonifierMarkers(
    state: WorkbenchStateModel,
    hdus: { [id: string]: IHdu },
    hduStates: { [id: string]: IWorkbenchHduState }
  ) {
    return (hduId: string) => {
      if (
        !(hduId in hdus) ||
        hdus[hduId].hduType != HduType.IMAGE ||
        !(hduId in hduStates)
      )
        return [];
      let hdu = hdus[hduId] as ImageHdu;
      let hduState = hduStates[hduId] as WorkbenchImageHduState;
      let sonifierState = hduState.sonificationPanelState;
      let region =
        sonifierState.regionHistory[sonifierState.regionHistoryIndex];
      let regionMode = sonifierState.regionMode;
      let progressLine = sonifierState.progressLine;
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

  @Selector([
    DataFilesState.getHduEntities,
    WorkbenchFileStates.getHduStateEntities,
    SourcesState,
  ])
  static getPhotometrySourceMarkers(
    state: WorkbenchStateModel,
    hdus: { [id: string]: IHdu },
    hduStates: { [id: string]: IWorkbenchHduState },
    sourcesState: SourcesStateModel
  ) {
    return (hduId: string) => {
      if (
        !(hduId in hdus) ||
        hdus[hduId].hduType != HduType.IMAGE ||
        !(hduId in hduStates)
      )
        return [];
      let hdu = hdus[hduId] as ImageHdu;
      let hduState = hduStates[hduId] as WorkbenchImageHduState;
      let sources = SourcesState.getSources(sourcesState);
      let selectedSourceIds = state.photometryPanelConfig.selectedSourceIds;
      let markers: Array<CircleMarker | TeardropMarker> = [];
      let mode = state.photometryPanelConfig.coordMode;
      if (!hdu.wcs.isValid()) mode = "pixel";

      sources.forEach((source) => {
        if (
          source.hduId != hduId &&
          !state.photometryPanelConfig.showSourcesFromAllFiles
        ) {
          return;
        }

        if (source.posType != mode) return;
        let selected = selectedSourceIds.includes(source.id);
        let coord = getSourceCoordinates(hdu, source);

        if (coord == null) {
          return;
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

  @Action(Initialize)
  @ImmutableContext()
  public initialize(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { }: Initialize
  ) {
    let state = getState();
    let dataFileEntities = this.store.selectSnapshot(
      DataFilesState.getDataFileEntities
    );
    let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);

    //load visible HDUs which were pulled from local storage
    let viewerEntities = state.viewers;
    let viewers = Object.values(
      this.store.selectSnapshot(WorkbenchState.getViewerPanelEntities)
    ).map((panel) => panel.selectedViewerId)
      .filter((viewerId) => viewerId in viewerEntities)
      .map(viewerId => viewerEntities[viewerId]);

    let hdus: IHdu[] = []
    viewers.forEach(viewer => {
      if (viewer.hduId) {
        if (viewer.hduId in hduEntities) {
          hdus.push(hduEntities[viewer.hduId]);
        }
      }
      else if (viewer.fileId && viewer.fileId in dataFileEntities) {
        hdus.push(...dataFileEntities[viewer.fileId].hduIds.map(hduId => hduEntities[hduId]))
      }

    })


    let actions = [];
    hdus.forEach((hdu) => {
      if (hdu.headerLoaded || hdu.headerLoading) return;

      actions.push(new LoadHdu(hdu.id))
    });

    this.store.dispatch(actions);
  }

  @Action(ResetState)
  @ImmutableContext()
  public resetState(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { }: ResetState
  ) {
    setState((state: WorkbenchStateModel) => {
      return workbenchStateDefaults;
    });
  }

  @Action(ToggleFullScreen)
  @ImmutableContext()
  public toggleFullScreen(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { }: ToggleFullScreen
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
    { }: ShowSidebar
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
    { }: HideSidebar
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
      let panel = Object.values(state.viewerLayoutItems).find((p) => {
        return (
          p.type == "panel" && (p as ViewerPanel).viewerIds.includes(viewerId)
        );
      }) as ViewerPanel;

      let viewer = state.viewers[viewerId];
      let referenceViewer = this.store.selectSnapshot(
        WorkbenchState.getFocusedViewer
      );

      if (panel) {
        if (
          (referenceViewer && state.viewerSyncEnabled) ||
          state.normalizationSyncEnabled ||
          state.plottingPanelConfig.plotterSyncEnabled
        ) {
          // before changing the selected viewer,  sync the new viewer's file with the old
          let hduEntities = this.store.selectSnapshot(
            DataFilesState.getHduEntities
          );
          let fileEntities = this.store.selectSnapshot(
            DataFilesState.getDataFileEntities
          );

          let referenceHduIds = [referenceViewer.hduId];
          if (!referenceViewer.hduId) {
            //use file
            referenceHduIds = fileEntities[referenceViewer.fileId].hduIds;
          }
          let referenceHdu = referenceHduIds
            .map((hduId) => hduEntities[hduId])
            .find((hdu) => hdu.hduType == HduType.IMAGE) as ImageHdu;

          let hduIds = [viewer.hduId];
          if (!viewer.hduId) {
            hduIds = fileEntities[viewer.fileId].hduIds;
          }
          let hdus = hduIds
            .map((hduId) => hduEntities[hduId])
            .filter((hdu) => hdu.hduType == HduType.IMAGE) as ImageHdu[];

          hdus.forEach((hdu) => {
            if (referenceHdu && hdu && hdu.hduType == HduType.IMAGE) {
              if (state.viewerSyncEnabled) {
                this.store.dispatch(
                  new SyncFileTransformations(referenceHdu.id, [hdu.id])
                );
              }
              if (state.normalizationSyncEnabled) {
                this.store.dispatch(
                  new SyncFileNormalizations(referenceHdu.id, [hdu.id])
                );
              }
              if (state.plottingPanelConfig.plotterSyncEnabled) {
                this.store.dispatch(
                  new SyncFilePlotters(
                    hduEntities[referenceHdu.id] as ImageHdu,
                    [hduEntities[hdu.id] as ImageHdu]
                  )
                );
              }
            }
          });
        }

        state.focusedViewerPanelId = panel.id;
        panel.selectedViewerId = viewerId;

        // loading of files/hdus is currently triggered by the SetViewerFile action
        // dispatch action to trigger loading if it is needed
        dispatch(new SetViewerFile(viewerId, viewer.fileId, viewer.hduId));


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

      if (
        panelId == null ||
        !state.viewerLayoutItemIds.includes(panelId) ||
        state.viewerLayoutItems[panelId].type != "panel"
      ) {
        //if a valid panel ID was not provided
        if (
          state.viewerLayoutItemIds.filter(
            (id) => state.viewerLayoutItems[id].type == "panel"
          ).length == 0
        ) {
          //if no panels exist, create a new panel
          panelId = `PANEL_${state.nextViewerPanelIdSeed++}`;
          state.viewerLayoutItemIds.push(panelId);
          state.viewerLayoutItems[panelId] = {
            id: panelId,
            type: "panel",
            selectedViewerId: null,
            viewerIds: [],
          } as ViewerPanel;

          //add panel to layout
          let rootContainer = state.viewerLayoutItems[
            state.rootViewerPanelContainerId
          ] as ViewerPanelContainer;
          rootContainer.itemIds.push(panelId);
        } else {
          // use currently focused panel
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
      if (viewer.fileId || viewer.hduId)
        dispatch(
          new SetViewerFile(id, viewer.fileId, viewer.hduId)
        );

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
        .filter((itemId) => state.viewerLayoutItems[itemId].type == "container")
        .map(
          (panelId) => state.viewerLayoutItems[panelId] as ViewerPanelContainer
        );

      let panels = state.viewerLayoutItemIds
        .filter((itemId) => state.viewerLayoutItems[itemId].type == "panel")
        .map(
          (panelId) => state.viewerLayoutItems[panelId] as ViewerPanelContainer
        );

      if (viewerLayoutItemId in state.viewerLayoutItems) {
        // if valid viewer layout item id
        if (state.viewerLayoutItems[viewerLayoutItemId].type == "container") {
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
            let nextPanel = panels.find(
              (panel) => panel.id != viewerLayoutItemId
            );
            state.focusedViewerPanelId = nextPanel ? nextPanel.id : null;
          }
        }

        let parentContainer = containers.find((container) =>
          container.itemIds.includes(viewerLayoutItemId)
        );

        if (parentContainer) {
          // remove from parent container
          parentContainer.itemIds = parentContainer.itemIds.filter(
            (id) => id != viewerLayoutItemId
          );

          if (
            parentContainer.id != state.rootViewerPanelContainerId &&
            parentContainer.itemIds.length == 1
          ) {
            // container is no longer necessary, merge up
            let parentParentContainer = containers.find((container) =>
              container.itemIds.includes(parentContainer.id)
            );

            if (parentParentContainer) {
              let index = parentParentContainer.itemIds.indexOf(
                parentContainer.id
              );
              parentParentContainer.itemIds[index] = parentContainer.itemIds[0];

              this.store.dispatch(
                new RemoveViewerLayoutItem(parentContainer.id)
              );
            }
          }
        }

        //remove item
        state.viewerLayoutItemIds = state.viewerLayoutItemIds.filter(
          (id) => id != viewerLayoutItemId
        );
        delete state.viewerLayoutItems[viewerLayoutItemId];
      }

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
      if (viewerId in state.viewers) {
        delete state.viewers[viewerId];
      }

      let panels = state.viewerLayoutItemIds
        .filter((itemId) => state.viewerLayoutItems[itemId].type == "panel")
        .map((panelId) => state.viewerLayoutItems[panelId] as ViewerPanel);

      let parentPanel = panels.find((panel) =>
        panel.viewerIds.includes(viewerId)
      );

      if (parentPanel) {
        let index = parentPanel.viewerIds.indexOf(viewerId);
        if (index > -1) {
          parentPanel.viewerIds.splice(index, 1);
          if (parentPanel.selectedViewerId == viewerId) {
            if (parentPanel.viewerIds.length != 0) {
              parentPanel.selectedViewerId =
                state.viewerIds[
                Math.max(0, Math.min(state.viewerIds.length - 1, index))
                ];
            } else {
              parentPanel.selectedViewerId = null;
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
      //find panel
      let panels = state.viewerLayoutItemIds
        .filter((itemId) => state.viewerLayoutItems[itemId].type == "panel")
        .map((panelId) => state.viewerLayoutItems[panelId] as ViewerPanel);

      let containers = state.viewerLayoutItemIds
        .filter((itemId) => state.viewerLayoutItems[itemId].type == "container")
        .map(
          (panelId) => state.viewerLayoutItems[panelId] as ViewerPanelContainer
        );

      let sourcePanel = panels.find((panel) =>
        panel.viewerIds.includes(viewerId)
      );

      if (sourcePanel) {
        if (sourcePanel.viewerIds.length == 1) {
          // cannot split a panel which only has one viewer
          return state;
        }

        let sourcePanelId = sourcePanel.id;

        let sourceContainer = containers.find((container) =>
          container.itemIds.includes(sourcePanelId)
        );

        if (sourceContainer) {
          let sourceContainerId = sourceContainer.id;

          //create new panel
          let nextPanelId = `PANEL_${state.nextViewerPanelIdSeed++}`;
          state.viewerLayoutItems[nextPanelId] = {
            id: nextPanelId,
            type: "panel",
            selectedViewerId: viewerId,
            viewerIds: [viewerId],
          } as ViewerPanel;

          state.viewerLayoutItemIds.push(nextPanelId);

          //remove viewer from source panel
          sourcePanel.viewerIds = sourcePanel.viewerIds.filter(
            (id) => id != viewerId
          );
          sourcePanel.selectedViewerId = sourcePanel.viewerIds[0];
          let sourcePanelIndex = sourceContainer.itemIds.indexOf(sourcePanelId);

          if (
            (sourceContainer.direction == "column" &&
              ["up", "down"].includes(direction)) ||
            (sourceContainer.direction == "row" &&
              ["left", "right"].includes(direction))
          ) {
            //add panel to parent container if same direction is requested
            sourceContainer.itemIds.splice(
              ["up", "left"].includes(direction)
                ? sourcePanelIndex
                : sourcePanelIndex + 1,
              0,
              nextPanelId
            );
          } else {
            //create new container to wrap source panel and new panel
            let nextContainerId = `CONTAINER_${state.nextViewerPanelContainerIdSeed++}`;
            state.viewerLayoutItems[nextContainerId] = {
              id: nextContainerId,
              type: "container",
              direction: ["up", "down"].includes(direction) ? "column" : "row",
              itemIds: [sourcePanel.id],
            } as ViewerPanelContainer;

            (state.viewerLayoutItems[
              nextContainerId
            ] as ViewerPanelContainer).itemIds.splice(
              ["up", "left"].includes(direction) ? 0 : 1,
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

      let sourcePanel = { ...panelEntities[sourcePanelId] as ViewerPanel };
      let sourceViewerIndex = sourcePanel.viewerIds.indexOf(viewerId);
      let targetPanel = { ...panelEntities[targetPanelId] as ViewerPanel };
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
            sourcePanel.viewerIds[
            Math.max(
              0,
              Math.min(
                sourcePanel.viewerIds.length - 1,
                sourceViewerIndex - 1
              )
            )
            ];
          
            let sourceSelectedViewer = viewerEntities[sourcePanel.selectedViewerId];
            //force load of newly focused viewer
            dispatch(new SetViewerFile(sourceSelectedViewer.viewerId, sourceSelectedViewer.fileId, sourceSelectedViewer.hduId))

        }
      }
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
      if (viewerId in state.viewers) {
        state.viewers[viewerId].markers = markers;
      }
      return state;
    });
  }

  @Action(ClearViewerMarkers)
  @ImmutableContext()
  public clearViewerMarkers(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { }: ClearViewerMarkers
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
    { viewerId, fileId, hduId }: SetViewerFile
  ) {
    let state = getState();
    let viewer = state.viewers[viewerId];
    let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
    let fileEntities = this.store.selectSnapshot(
      DataFilesState.getDataFileEntities
    );

    if (viewer) {
      //get current focused file id
      // let refHduIds: string[] = [];
      // let refImageHduIds: string[] = [];
      // let focusedPanel = state.viewerLayoutItems[state.focusedViewerPanelId];
      // if (focusedPanel) {
      //   let selectedViewerId = (focusedPanel as ViewerPanel).selectedViewerId;
      //   if (selectedViewerId && selectedViewerId in state.viewers) {
      //     let refData = state.viewers[selectedViewerId].data;
      //     refHduIds =
      //       refData.type == "hdu"
      //         ? [refData.id]
      //         : fileEntities[refData.id].hduIds;
      //     refImageHduIds = refHduIds.filter(
      //       (id) => hduEntities[id].hduType == HduType.IMAGE
      //     );
      //   }
      // }

      setState((state: WorkbenchStateModel) => {
        let viewer = state.viewers[viewerId];
        viewer.fileId = fileId;
        viewer.hduId = hduId;
        //for a more responsive feel, set the panel's selected viewer before loading
        let panel = Object.values(state.viewerLayoutItems).find(
          (item) =>
            item.type == "panel" &&
            (item as ViewerPanel).viewerIds.includes(viewerId)
        ) as ViewerPanel;
        if (panel) {
          state.focusedViewerPanelId = panel.id;
          panel.selectedViewerId = viewerId;
        }
        return state;
      });

      function onLoadComplete(store: Store) {
        //normalization
        let actions = [];
        let hduStateEntities = store.selectSnapshot(
          WorkbenchFileStates.getHduStateEntities
        );

        // TODO: Determine how syncing should occur now that viewer's original data and new data may contain multiple HDUs
        // if (imageHduIds.length != 0 && refHduIds.length != 0) {
        //   // for now, take the first HDU from the viewer's original data and apply it to all image HDUs in the new viewer data
        //   let hdus = hduIds.map((id) => hduEntities[id] as ImageHdu);
        //   let refHdu = hdus[refHduIds[0]] as ImageHdu;

        //   if (state.normalizationSyncEnabled) {
        //     actions.push(
        //       new SyncFileNormalizations(
        //         refHdu,
        //         hdus
        //       )
        //     );
        //   }
        //   else {
        //     hdus.forEach(hdu => {
        //       let normalization = (hduStateEntities[hdu.id] as WorkbenchImageHduState).normalization;
        //       if (normalization.initialized) {
        //         actions.push(new RenormalizeImageHdu(hdu.id));
        //       }
        //     })
        //   }

        //   if (state.viewerSyncEnabled) {
        //     actions.push(
        //       new SyncFileTransformations(
        //         refHdu,
        //         hdus
        //       )
        //     );
        //   }
        //   if (state.plottingPanelConfig.plotterSyncEnabled) {
        //     actions.push(
        //       new SyncFilePlotters(refHdu, hdus)
        //     );
        //   }

        //   hdus.forEach(hdu => {
        //     let sonifierState = (hduStateEntities[hdu.id] as WorkbenchImageHduState).sonificationPanelState;
        //     if (!sonifierState.regionHistoryInitialized) {
        //       actions.push(
        //         new AddRegionToHistory(hdu.id, {
        //           x: 0.5,
        //           y: 0.5,
        //           width: getWidth(hdu),
        //           height: getHeight(hdu),
        //         })
        //       );
        //     }
        //   })
        // }

        //actions.push(new SetFocusedViewer(viewerId));

        return dispatch(actions);
      }

      let hduIds = hduId ? [hduId] : fileEntities[fileId].hduIds;
      let actions = hduIds
        .map((id) => hduEntities[id])
        .filter(
          (hdu) =>
            !hdu.headerLoaded ||
            (hdu.hduType == HduType.IMAGE && !(hdu as ImageHdu).histLoaded)
        )
        .map((hdu) => new LoadHdu(hdu.id));

      if (actions.length == 0) {
        onLoadComplete(this.store);
        return;
      }

      let cancel$ = this.actions$.pipe(
        ofActionDispatched(SetViewerFile),
        filter<SetViewerFile>(
          (action) =>
            action.viewerId == viewerId &&
            (action.fileId != fileId ||
              action.hduId != hduId)
        )
      );

      return dispatch(actions).pipe(
        takeUntil(cancel$),
        take(1),
        flatMap((action) => onLoadComplete(this.store))
      );
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
    let dataFiles = this.store.selectSnapshot(DataFilesState.getHduEntities);

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
    let dataFiles = this.store.selectSnapshot(DataFilesState.getHduEntities);

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
    { }: ToggleShowConfig
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
    { }: CloseSidenav
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
    { }: OpenSidenav
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
    { hdus, correlationId }: LoadLibrarySuccess
  ) {
    let state = getState();
    let existingIds = this.store.selectSnapshot(WorkbenchFileStates.getHduIds);
    let dataFileEntities = this.store.selectSnapshot(
      DataFilesState.getHduEntities
    );
    let imageFileStateEntities = this.store.selectSnapshot(
      WorkbenchFileStates.getHduStateEntities
    );
    let newIds = hdus
      .map((imageFile) => imageFile.id)
      .filter((id) => !existingIds.includes(id));

    if (newIds.length != 0) {
      dispatch(new InitializeWorkbenchHduState(newIds));
    }

    let focusedViewer = this.store.selectSnapshot(
      WorkbenchState.getFocusedViewer
    );

    if (
      !focusedViewer || //no viewers have focus
      (!focusedViewer.hduId && !focusedViewer.fileId) //focused viewer has no assigned file
    ) {
      if (hdus[0]) {
        dispatch(new SelectDataFileListItem(hdus[0]));
      }
    }
  }

  @Action(CloseDataFile)
  @ImmutableContext()
  public removeDataFile(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { fileId }: CloseDataFile
  ) {
    let dataFiles = this.store.selectSnapshot(
      DataFilesState.getDataFileEntities
    );
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
      state.pixelOpsPanelConfig.pixelOpsFormData.hduIds = state.pixelOpsPanelConfig.pixelOpsFormData.hduIds.filter(
        (id) => id != hduId
      );
      state.pixelOpsPanelConfig.pixelOpsFormData.auxHduIds = state.pixelOpsPanelConfig.pixelOpsFormData.auxHduIds.filter(
        (id) => id != hduId
      );
      state.pixelOpsPanelConfig.pixelOpsFormData.auxHduId =
        state.pixelOpsPanelConfig.pixelOpsFormData.auxHduId == hduId
          ? null
          : state.pixelOpsPanelConfig.pixelOpsFormData.auxHduId;
      return state;
    });
  }

  @Action(SelectDataFileListItem)
  @ImmutableContext()
  public selectDataFile(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { item }: SelectDataFileListItem
  ) {
    let state = getState();
    let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
    let fileEntities = this.store.selectSnapshot(
      DataFilesState.getDataFileEntities
    );

    let file = item.type == 'file' ? item : fileEntities[item.fileId];
    let hdu = item.type == 'file' ? null : item;
    let viewers = Object.values(state.viewers);

    //check if file is already open
    let targetViewer = viewers.find(
      (viewer) => item.type == 'file' ? viewer.fileId == item.id && viewer.hduId == null : viewer.hduId == item.id
    );
    if (targetViewer) {
      dispatch(new SetFocusedViewer(targetViewer.viewerId));
      return;
    }

    //check if existing viewer is available
    targetViewer = viewers.find((viewer) => !viewer.keepOpen);
    if (targetViewer) {
      //temporary viewer exists
      dispatch(
        new SetViewerFile(targetViewer.viewerId, file.id, hdu ? hdu.id : null)
      );
      return;
    }
    let imageDataId = file.compositeImageDataId;
    if (hdu && hdu.hduType == HduType.IMAGE) {
      imageDataId = (hdu as ImageHdu).normalizedImageDataId
    }

    let viewer: Viewer = {
      viewerId: null,
      fileId: file.id,
      hduId: hdu ? hdu.id : null,
      panEnabled: true,
      zoomEnabled: true,
      markers: [],
      keepOpen: false,
      viewportSize: null,
    };

    dispatch(new CreateViewer(viewer, state.focusedViewerPanelId));
  }

  @Action([StartLine, UpdateLine, UpdatePlotterFileState])
  @ImmutableContext()
  public onPlotterChange(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduId }: StartLine | UpdateLine | UpdatePlotterFileState
  ) {
    let state = getState();
    let focusedViewer = this.store.selectSnapshot(
      WorkbenchState.getFocusedViewer
    );
    let dataFiles = this.store.selectSnapshot(DataFilesState.getHduEntities);

    // if (
    //   !state.plottingPanelConfig.plotterSyncEnabled ||
    //   !focusedViewer ||
    //   focusedViewer.data[0] != hduId
    // )
    //   return;

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

  @Action(SyncFilePlotters)
  @ImmutableContext()
  public syncFilePlotters(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { reference, hdus }: SyncFilePlotters
  ) {
    let state = getState();
    let hduStates = this.store.selectSnapshot(
      WorkbenchFileStates.getHduStateEntities
    );

    // TODO: LAYER
    let srcHdu = reference;
    let targetHdus = hdus;
    let srcPlotter = (hduStates[srcHdu.id] as WorkbenchImageHduState)
      .plottingPanelState;

    targetHdus.forEach((targetHdu) => {
      if (!targetHdu || targetHdu.id == srcHdu.id) return;
      return dispatch(
        new UpdatePlotterFileState(targetHdu.id, { ...srcPlotter })
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
    let hduStateEntities = this.store.selectSnapshot(WorkbenchFileStates.getHduStateEntities);
    if (
      !(hduId in hduStateEntities) ||
      hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;
    let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[
      hduId
    ] as ImageHdu;
    let hduState = hduStateEntities[hduId] as WorkbenchImageHduState;
    let sonifierState = hduState.sonificationPanelState;
    let sourceExtractorState = hduState.photometryPanelState;

    if (
      sonifierState.regionMode == SonifierRegionMode.CUSTOM &&
      sonifierState.viewportSync
    ) {
      //find viewer which contains file
      let viewer = this.store.selectSnapshot(WorkbenchState.getViewers).find(viewer => viewer.hduId == hduId);
      if (viewer && viewer.viewportSize) {
        let region =
          sonifierState.regionHistory[sonifierState.regionHistoryIndex];
        dispatch(
          new CenterRegionInViewport(
            hdu.transformation,
            hdu.rawImageDataId,
            viewer.viewportSize,
            region,
          )
        );
      }

    }
  }

  @Action(LoadCatalogs)
  @ImmutableContext()
  public loadCatalogs(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { }: LoadCatalogs
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
    { }: LoadFieldCals
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
      tap((fieldCal) => { }),
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
    { }: CreatePixelOpsJob
  ) {
    let state = getState();
    let hdus = this.store.selectSnapshot(DataFilesState.getHdus);
    let dataFiles = this.store.selectSnapshot(
      DataFilesState.getDataFileEntities
    );
    let data = state.pixelOpsPanelConfig.pixelOpsFormData;
    let imageHdus = data.hduIds
      .map((id) => hdus.find((f) => f.id == id))
      .filter((f) => f != null);
    let auxFileIds: number[] = [];
    let op;
    if (data.mode == "scalar") {
      op = `img ${data.operand} ${data.scalarValue}`;
    } else {
      op = `img ${data.operand} aux_img`;
      auxFileIds.push(parseInt(data.auxHduId));
    }
    let job: PixelOpsJob = {
      type: JobType.PixelOps,
      id: null,
      file_ids: imageHdus
        .sort((a, b) =>
          dataFiles[a.fileId].name < dataFiles[b.fileId].name
            ? -1
            : dataFiles[a.fileId].name > dataFiles[b.fileId].name
              ? 1
              : 0
        )
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
    { }: CreateAdvPixelOpsJob
  ) {
    let state = getState();
    let hdus = this.store.selectSnapshot(DataFilesState.getHdus);
    let dataFiles = this.store.selectSnapshot(
      DataFilesState.getDataFileEntities
    );
    let data = state.pixelOpsPanelConfig.pixelOpsFormData;
    let imageHdus = data.hduIds
      .map((id) => hdus.find((f) => f.id == id))
      .filter((f) => f != null);
    let auxImageFiles = data.auxHduIds
      .map((id) => hdus.find((f) => f.id == id))
      .filter((f) => f != null);
    let job: PixelOpsJob = {
      type: JobType.PixelOps,
      id: null,
      file_ids: imageHdus
        .sort((a, b) =>
          dataFiles[a.fileId].name < dataFiles[b.fileId].name
            ? -1
            : dataFiles[a.fileId].name > dataFiles[b.fileId].name
              ? 1
              : 0
        )
        .map((f) => parseInt(f.id)),
      aux_file_ids: auxImageFiles
        .sort((a, b) =>
          dataFiles[a.fileId].name < dataFiles[b.fileId].name
            ? -1
            : dataFiles[a.fileId].name > dataFiles[b.fileId].name
              ? 1
              : 0
        )
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
    { }: CreateAlignmentJob
  ) {
    let state = getState();
    let data = state.aligningPanelConfig.alignFormData;
    let hdus = this.store.selectSnapshot(DataFilesState.getHdus);
    let dataFiles = this.store.selectSnapshot(
      DataFilesState.getDataFileEntities
    );
    let imageHdus = data.selectedHduIds
      .map((id) => hdus.find((f) => f.id == id))
      .filter((f) => f != null);

    let job: AlignmentJob = {
      type: JobType.Alignment,
      id: null,
      file_ids: imageHdus
        .sort((a, b) =>
          dataFiles[a.fileId].name < dataFiles[b.fileId].name
            ? -1
            : dataFiles[a.fileId].name > dataFiles[b.fileId].name
              ? 1
              : 0
        )
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
        // TODO: determine if this is necessary
        // WorkbenchState.getViewers(getState()).forEach((viewer, index) => {
        //   if (viewer.data.type == 'hdu' && fileIds.includes(viewer.data.id)) {
        //     actions.push(new SetViewerData(viewer.viewerId, viewer.data));
        //   }
        // });

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
    { }: CreateStackingJob
  ) {
    let state = getState();
    let data = state.stackingPanelConfig.stackFormData;
    let hdus = this.store.selectSnapshot(DataFilesState.getHdus);
    let dataFiles = this.store.selectSnapshot(
      DataFilesState.getDataFileEntities
    );
    let imageHdus = data.selectedHduIds
      .map((id) => hdus.find((f) => f.id == id))
      .filter((f) => f != null);
    let job: StackingJob = {
      type: JobType.Stacking,
      id: null,
      file_ids: imageHdus
        .sort((a, b) =>
          dataFiles[a.fileId].name < dataFiles[b.fileId].name
            ? -1
            : dataFiles[a.fileId].name > dataFiles[b.fileId].name
              ? 1
              : 0
        )
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
    let importFromSurveyCorrId = this.correlationIdGenerator.next();
    setState((state: WorkbenchStateModel) => {
      state.dssImportLoading = true;
      return state;
    });
    let importCompleted$ = this.actions$.pipe(
      ofActionDispatched(ImportAssetsCompleted),
      filter<ImportAssetsCompleted>(
        (action) => action.correlationId == importFromSurveyCorrId
      ),
      take(1),
      flatMap((action) => {
        dispatch(new LoadLibrary());
        dispatch(new ImportFromSurveySuccess());
        let state = getState();
        let viewers = WorkbenchState.getViewers(state);

        return this.actions$.pipe(
          ofActionCompleted(LoadLibrary),
          take(1),
          filter((loadLibraryAction) => loadLibraryAction.result.successful),
          tap((loadLibraryAction) => {
            setState((state: WorkbenchStateModel) => {
              state.dssImportLoading = false;
              return state;
            });
            let hduEntities = this.store.selectSnapshot(
              DataFilesState.getHduEntities
            );
            if (action.fileIds[0] in hduEntities) {
              dispatch(
                new SelectDataFileListItem(hduEntities[action.fileIds[0]])
              );
            }
          })
        );
      })
    );
    dispatch(
      new ImportAssets(
        surveyDataProviderId,
        [
          {
            name: "",
            collection: false,
            path: `DSS\\${
              raHours * 15
              },${decDegs}\\${widthArcmins},${heightArcmins}`,
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
    { hduId, viewerId, settings }: ExtractSources
  ) {
    let state = getState();
    let photometryPageSettings = this.store.selectSnapshot(
      WorkbenchState.getPhotometryPanelConfig
    );
    let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
    let imageDataEntities = this.store.selectSnapshot(
      DataFilesState.getImageDataEntities
    );
    let transformEntities = this.store.selectSnapshot(
      DataFilesState.getTransformEntities
    );
    let hdu = hduEntities[hduId] as ImageHdu;
    let rawImageData = imageDataEntities[hdu.rawImageDataId];
    let imageToViewportTransform =
      transformEntities[hdu.transformation.imageToViewportTransformId];
    let hduState = this.store.selectSnapshot(
      WorkbenchFileStates.getHduStateEntities
    )[hdu.id] as WorkbenchImageHduState;
    let viewportSize = state.viewers[viewerId].viewportSize;
    let sonificationState = hduState.sonificationPanelState;

    let jobSettings: SourceExtractionJobSettings = {
      threshold: settings.threshold,
      fwhm: settings.fwhm,
      deblend: settings.deblend,
      limit: settings.limit,
    };
    if (
      settings.region == SourceExtractionRegionOption.VIEWPORT ||
      (settings.region == SourceExtractionRegionOption.SONIFIER_REGION &&
        sonificationState.regionMode == SonifierRegionMode.VIEWPORT)
    ) {
      let region = getViewportRegion(
        imageToViewportTransform,
        rawImageData.width,
        rawImageData.height,
        viewportSize.width,
        viewportSize.height
      );

      jobSettings = {
        ...jobSettings,
        x: Math.min(getWidth(hdu), Math.max(0, region.x + 1)),
        y: Math.min(getHeight(hdu), Math.max(0, region.y + 1)),
        width: Math.min(getWidth(hdu), Math.max(0, region.width + 1)),
        height: Math.min(getHeight(hdu), Math.max(0, region.height + 1)),
      };
    } else if (
      settings.region == SourceExtractionRegionOption.SONIFIER_REGION &&
      sonificationState.regionMode == SonifierRegionMode.CUSTOM
    ) {
      let region =
        sonificationState.regionHistory[sonificationState.regionHistoryIndex];
      jobSettings = {
        ...jobSettings,
        x: Math.min(getWidth(hdu), Math.max(0, region.x + 1)),
        y: Math.min(getHeight(hdu), Math.max(0, region.y + 1)),
        width: Math.min(getWidth(hdu), Math.max(0, region.width + 1)),
        height: Math.min(getHeight(hdu), Math.max(0, region.height + 1)),
      };
    }
    let job: SourceExtractionJob = {
      id: null,
      type: JobType.SourceExtraction,
      file_ids: [parseInt(hduId)],
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
            hdu.wcs &&
            hdu.wcs.isValid() &&
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
            hduId: d.file_id.toString(),
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
                hduId: fileId,
              } as PhotData);
            } else {
              let time = null;
              if (d.time && Date.parse(d.time + " GMT")) {
                time = new Date(Date.parse(d.time + " GMT"));
              }
              photDatas.push({
                id: null,
                sourceId: d.id,
                hduId: d.file_id.toString(),
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
