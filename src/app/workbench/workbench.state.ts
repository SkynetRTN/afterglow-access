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
import { tap, catchError, filter, take, takeUntil, flatMap } from "rxjs/operators";
import { Point, Matrix, Rectangle } from "paper";
import { merge } from "rxjs";
import { WorkbenchStateModel, WorkbenchTool, ViewerPanel, ViewerPanelContainer } from "./models/workbench-state";
import { ViewMode } from "./models/view-mode";
import { SidebarView } from "./models/sidebar-view";
import { createPsfCentroiderSettings, createDiskCentroiderSettings } from "./models/centroider";
import {
  LoadLibrarySuccess,
  LoadLibrary,
  ClearImageDataCache,
  LoadHdu,
  CloseHduSuccess,
  CloseDataFile,
  CenterRegionInViewport,
  LoadHduHeaderSuccess,
  CloseDataFileSuccess,
  UpdateTransform,
  UpdateNormalizer,
} from "../data-files/data-files.actions";
import {
  SelectDataFileListItem,
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
  RemoveAllPhotDatas,
  RemovePhotDatas,
  SetSelectedHduId,
  Sonify,
  ClearSonification,
  SyncViewerTransformations,
  SetViewerSyncMode,
  SyncViewerNormalizations,
} from "./workbench.actions";
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
} from "../data-files/models/data-file";

import { AfterglowCatalogService } from "./services/afterglow-catalogs";
import { AfterglowFieldCalService } from "./services/afterglow-field-cals";
import { CorrelationIdGenerator } from "../utils/correlated-action";
import { CreateJob, UpdateJob } from "../jobs/jobs.actions";
import { PixelOpsJob, PixelOpsJobResult } from "../jobs/models/pixel-ops";
import { JobType } from "../jobs/models/job-types";
import { AlignmentJob, AlignmentJobResult } from "../jobs/models/alignment";
import { StackingJob } from "../jobs/models/stacking";
import { ImportAssetsCompleted, ImportAssets } from "../data-providers/data-providers.actions";
import { ImmutableContext } from "@ngxs-labs/immer-adapter";
import { PosType, Source } from "./models/source";
import { MarkerType, LineMarker, RectangleMarker, CircleMarker, TeardropMarker, Marker } from "./models/marker";
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
import { PhotometryJob, PhotometryJobSettings, PhotometryJobResult } from "../jobs/models/photometry";
import { Astrometry } from "../jobs/models/astrometry";
import { SourceId } from "../jobs/models/source-id";
import { PhotData } from "./models/source-phot-data";
import { Viewer, ImageViewer, TableViewer } from "./models/viewer";
import { ResetState } from "../auth/auth.actions";
import { WorkbenchImageHduState, IWorkbenchHduState, WorkbenchTableHduState } from "./models/workbench-file-state";
import { DataFilesState, DataFilesStateModel } from "../data-files/data-files.state";
import { HduType } from "../data-files/models/data-file-type";
import {
  getViewportRegion,
  Transform,
  getImageToViewportTransform,
  appendTransform,
  matrixToTransform,
} from "../data-files/models/transformation";
import { SonificationJob, SonificationJobResult } from "../jobs/models/sonification";
import { IImageData } from "../data-files/models/image-data";

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
  viewerSyncMode: "pixel",
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
    plotMode: "1D",
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

  hduIds: [],
  hduStateEntities: {},
  fileIds: [],
  fileStateEntities: {},
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
    return state.viewerLayoutItemIds.filter((id) => state.viewerLayoutItems[id].type == "panel");
  }

  @Selector([WorkbenchState.getViewerPanelIds])
  public static getViewerPanelEntities(state: WorkbenchStateModel, viewerPanelIds: string[]) {
    return viewerPanelIds.reduce((obj, key) => {
      return {
        ...obj,
        [key]: state.viewerLayoutItems[key] as ViewerPanel,
      };
    }, {} as { [id: string]: ViewerPanel });
  }

  @Selector([WorkbenchState.getViewerPanelIds])
  public static getViewerPanels(state: WorkbenchStateModel, viewerPanelIds: string[]) {
    return viewerPanelIds.map((id) => state.viewerLayoutItems[id]);
  }

  @Selector()
  public static getViewerPanelContainerIds(state: WorkbenchStateModel) {
    return state.viewerLayoutItemIds.filter((id) => state.viewerLayoutItems[id].type == "container");
  }

  @Selector([WorkbenchState.getViewerPanelContainerIds])
  public static getViewerPanelContainerEntities(state: WorkbenchStateModel, viewerPanelContainerIds: string[]) {
    return viewerPanelContainerIds.reduce((obj, key) => {
      return {
        ...obj,
        [key]: state.viewerLayoutItems[key] as ViewerPanelContainer,
      };
    }, {} as { [id: string]: ViewerPanelContainer });
  }

  @Selector([WorkbenchState.getViewerPanelContainerIds])
  public static getViewerContainerPanels(state: WorkbenchStateModel, viewerPanelContainerIds: string[]) {
    return viewerPanelContainerIds.map((id) => state.viewerLayoutItems[id]);
  }

  @Selector()
  public static getRootViewerPanelContainer(state: WorkbenchStateModel) {
    return state.viewerLayoutItems[state.rootViewerPanelContainerId] as ViewerPanelContainer;
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

  @Selector([WorkbenchState.getViewerPanelIds])
  public static getVisibleViewerIds(state: WorkbenchStateModel, viewerPanelIds: string[]) {
    return viewerPanelIds
      .map((panelId) => (state.viewerLayoutItems[panelId] as ViewerPanel).selectedViewerId)
      .filter((id) => id !== null);
  }

  @Selector([WorkbenchState.getFocusedViewerPanelId, WorkbenchState.getViewerPanelEntities])
  public static getFocusedViewerId(
    state: WorkbenchStateModel,
    focusedViewerPanelId: string,
    viewerPanelEntities: { [id: string]: ViewerPanel }
  ) {
    return viewerPanelEntities[focusedViewerPanelId].selectedViewerId;
  }

  @Selector([WorkbenchState.getFocusedViewerId])
  public static getFocusedViewer(state: WorkbenchStateModel, focusedViewerId: string) {
    if (!focusedViewerId || !state.viewerIds.includes(focusedViewerId)) return null;
    return state.viewers[focusedViewerId];
  }

  @Selector([WorkbenchState.getFocusedViewer])
  public static getFocusedImageViewer(state: WorkbenchStateModel, focusedViewer: Viewer) {
    if (!focusedViewer || focusedViewer.type != "image") return null;
    return focusedViewer as ImageViewer;
  }

  @Selector([WorkbenchState.getFocusedViewer])
  public static getFocusedTableViewer(state: WorkbenchStateModel, focusedViewer: Viewer) {
    if (!focusedViewer || focusedViewer.type != "table") return null;
    return focusedViewer as TableViewer;
  }

  @Selector([WorkbenchState.getFocusedViewer, DataFilesState.getFileEntities])
  public static getFocusedViewerFile(
    state: WorkbenchStateModel,
    focusedViewer: Viewer,
    dataFileEntities: { [id: string]: DataFile }
  ) {
    if (!focusedViewer || !focusedViewer.fileId || !(focusedViewer.fileId in dataFileEntities)) return null;
    return dataFileEntities[focusedViewer.fileId];
  }

  @Selector([WorkbenchState.getFocusedViewer, DataFilesState.getHduEntities])
  public static getFocusedViewerHdu(state: WorkbenchStateModel, focusedViewer: Viewer, hduEntities: { [id: string]: IHdu }) {
    if (!focusedViewer || !focusedViewer.hduId) {
      return null;
    }
    let hdu = hduEntities[focusedViewer.hduId];
    if (!hdu) {
      return null;
    }
    return hdu;
  }

  @Selector([WorkbenchState.getFocusedViewerHdu])
  public static getFocusedViewerImageHdu(state: WorkbenchStateModel, focusedViewerHdu: IHdu) {
    if (!focusedViewerHdu || focusedViewerHdu.hduType != HduType.IMAGE) {
      return null;
    }
    return focusedViewerHdu as ImageHdu;
  }

  @Selector([WorkbenchState.getFocusedViewer])
  public static getFocusedViewerViewportSize(state: WorkbenchStateModel, focusedViewer: Viewer) {
    if (!focusedViewer) return null;
    return focusedViewer.viewportSize;
  }

  @Selector([DataFilesState.getFileEntities, DataFilesState.getHduEntities])
  public static getFirstImageHeaderIdFromViewerId(
    state: WorkbenchStateModel,
    fileEntities: { [id: string]: DataFile },
    hduEntities: { [id: string]: IHdu }
  ) {
    return (id: string) => {
      let viewer = state.viewers[id];
      if (!viewer || viewer.type != "image" || !viewer.fileId) {
        return null;
      }

      let hduId = viewer.hduId;
      if (!hduId) {
        //use first image HDU from file
        let file = fileEntities[viewer.fileId];
        hduId = file.hduIds.find((hduId) => hduEntities[hduId].hduType == HduType.IMAGE);
        if (!hduId) {
          return null;
        }
      }

      let hdu = hduEntities[hduId];
      if (!hdu) {
        return null;
      }

      return hdu.headerId;
    };
  }

  @Selector([DataFilesState.getFileEntities, DataFilesState.getHduEntities])
  public static getViewportTransformIdFromViewerId(
    state: WorkbenchStateModel,
    fileEntities: { [id: string]: DataFile },
    hduEntities: { [id: string]: IHdu }
  ) {
    return (id: string) => {
      let viewer = state.viewers[id];
      if (!viewer || viewer.type != "image" || !viewer.fileId) {
        return null;
      }

      let viewportTransformId = fileEntities[viewer.fileId].viewportTransformId;
      if (viewer.hduId) {
        viewportTransformId = (hduEntities[viewer.hduId] as ImageHdu).viewportTransformId;
      }

      if (!viewportTransformId) {
        return null;
      }

      return viewportTransformId;
    };
  }

  @Selector([DataFilesState.getFileEntities, DataFilesState.getHduEntities])
  public static getImageTransformIdFromViewerId(
    state: WorkbenchStateModel,
    fileEntities: { [id: string]: DataFile },
    hduEntities: { [id: string]: IHdu }
  ) {
    return (id: string) => {
      let viewer = state.viewers[id];
      if (!viewer || viewer.type != "image" || !viewer.fileId) {
        return null;
      }

      let imageTransformId = fileEntities[viewer.fileId].imageTransformId;
      if (viewer.hduId) {
        imageTransformId = (hduEntities[viewer.hduId] as ImageHdu).imageTransformId;
      }

      if (!imageTransformId) {
        return null;
      }

      return imageTransformId;
    };
  }

  @Selector([DataFilesState.getFileEntities, DataFilesState.getHduEntities])
  public static getNormalizedImageDataIdFromViewerId(
    state: WorkbenchStateModel,
    fileEntities: { [id: string]: DataFile },
    hduEntities: { [id: string]: IHdu }
  ) {
    return (id: string) => {
      let viewer = state.viewers[id];
      if (!viewer || viewer.type != "image" || !viewer.fileId) {
        return null;
      }

      let normalizedImageDataId = fileEntities[viewer.fileId].compositeImageDataId;
      if (viewer.hduId) {
        normalizedImageDataId = (hduEntities[viewer.hduId] as ImageHdu).normalizedImageDataId;
      }

      if (!normalizedImageDataId) {
        return null;
      }

      return normalizedImageDataId;
    };
  }

  @Selector([DataFilesState.getFileEntities, DataFilesState.getHduEntities])
  public static getRawImageDataIdFromViewerId(
    state: WorkbenchStateModel,
    fileEntities: { [id: string]: DataFile },
    hduEntities: { [id: string]: IHdu }
  ) {
    return (id: string) => {
      let viewer = state.viewers[id];
      if (!viewer || viewer.type != "image" || !viewer.fileId || !viewer.hduId) {
        return null;
      }

      let rawImageDataId = (hduEntities[viewer.hduId] as ImageHdu).rawImageDataId;

      if (!rawImageDataId) {
        return null;
      }

      return rawImageDataId;
    };
  }

  @Selector()
  public static getCustomMarkerPanelStateIdFromViewerId(state: WorkbenchStateModel) {
    return (id: string) => {
      let viewer = state.viewers[id];
      if (!viewer || viewer.type != "image" || !viewer.fileId) {
        return null;
      }

      return viewer.hduId
        ? (state.hduStateEntities[viewer.hduId] as WorkbenchImageHduState).customMarkerPanelStateId
        : state.fileStateEntities[viewer.fileId].customMarkerPanelStateId;
    };
  }

  @Selector()
  public static getPlottingPanelStateIdFromViewerId(state: WorkbenchStateModel) {
    return (id: string) => {
      let viewer = state.viewers[id];
      if (!viewer || viewer.type != "image" || !viewer.fileId) {
        return null;
      }

      return viewer.hduId
        ? (state.hduStateEntities[viewer.hduId] as WorkbenchImageHduState).plottingPanelStateId
        : state.fileStateEntities[viewer.fileId].plottingPanelStateId;
    };
  }

  @Selector()
  public static getSonificationPanelStateIdFromViewerId(state: WorkbenchStateModel) {
    return (id: string) => {
      let viewer = state.viewers[id];
      if (!viewer || viewer.type != "image" || !viewer.fileId) {
        return null;
      }

      return viewer.hduId ? (state.hduStateEntities[viewer.hduId] as WorkbenchImageHduState).sonificationPanelStateId : null;
    };
  }

  @Selector()
  public static getPhotometryPanelStateIdFromViewerId(state: WorkbenchStateModel) {
    return (id: string) => {
      let viewer = state.viewers[id];
      if (!viewer || viewer.type != "image" || !viewer.fileId) {
        return null;
      }

      return viewer.hduId ? (state.hduStateEntities[viewer.hduId] as WorkbenchImageHduState).photometryPanelStateId : null;
    };
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
  public static getPhotometryShowSourcesFromAllFiles(state: WorkbenchStateModel) {
    return state.photometryPanelConfig.showSourcesFromAllFiles;
  }

  @Selector()
  public static getPhotometryShowSourceLabels(state: WorkbenchStateModel) {
    return state.photometryPanelConfig.showSourceLabels;
  }

  @Selector()
  public static getFileStateEntities(state: WorkbenchStateModel) {
    return state.fileStateEntities;
  }

  @Selector()
  public static getFileIds(state: WorkbenchStateModel) {
    return state.fileIds;
  }

  @Selector()
  public static getFileStates(state: WorkbenchStateModel) {
    return Object.values(state.fileStateEntities);
  }

  @Selector()
  public static getFileStateById(state: WorkbenchStateModel) {
    return (fileId: string) => {
      return fileId in state.fileStateEntities ? state.fileStateEntities[fileId] : null;
    };
  }

  @Selector()
  public static getHduStateEntities(state: WorkbenchStateModel) {
    return state.hduStateEntities;
  }

  @Selector()
  public static getHduIds(state: WorkbenchStateModel) {
    return state.hduIds;
  }

  @Selector()
  public static getHduStates(state: WorkbenchStateModel) {
    return Object.values(state.hduStateEntities);
  }

  @Selector()
  public static getHduStateById(state: WorkbenchStateModel) {
    return (hduId: string) => {
      return hduId in state.hduStateEntities ? state.hduStateEntities[hduId] : null;
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

  @Selector()
  public static getCustomMarkerPanelStateById(state: WorkbenchStateModel) {
    return (customMarkerPanelStateId: string) => {
      return state.customMarkerPanelStateEntities[customMarkerPanelStateId];
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

  @Selector()
  public static getPlottingPanelStateById(state: WorkbenchStateModel) {
    return (plottingPanelStateId: string) => {
      return state.plottingPanelStateEntities[plottingPanelStateId];
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

  @Selector()
  public static getSonificationPanelStateById(state: WorkbenchStateModel) {
    return (sonificationPanelStateId: string) => {
      return state.sonificationPanelStateEntities[sonificationPanelStateId];
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

  @Selector()
  public static getPhotometryPanelStateById(state: WorkbenchStateModel) {
    return (photometryPanelStateId: string) => {
      return state.photometryPanelStateEntities[photometryPanelStateId];
    };
  }

  @Selector()
  public static getSelecteHduId(state: WorkbenchStateModel) {
    return (fileId: string) => {
      return state.fileStateEntities[fileId].selectedHduId;
    };
  }

  @Action(Initialize)
  @ImmutableContext()
  public initialize({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, {}: Initialize) {
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

    let actions = [];
    let headerEntities = this.store.selectSnapshot(DataFilesState.getHeaderEntities);
    hdus.forEach((hdu) => {
      let header = headerEntities[hdu.headerId];
      if (!header || header.loaded || header.loading) return;

      actions.push(new LoadHdu(hdu.id));
    });


    this.store.dispatch(actions);
  }

  @Action(ResetState)
  @ImmutableContext()
  public resetState({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, {}: ResetState) {
    setState((state: WorkbenchStateModel) => {
      return workbenchStateDefaults;
    });
  }

  @Action(ToggleFullScreen)
  @ImmutableContext()
  public toggleFullScreen({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, {}: ToggleFullScreen) {
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
  public showSidebar({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, {}: ShowSidebar) {
    setState((state: WorkbenchStateModel) => {
      state.showSidebar = true;
      return state;
    });
  }

  @Action(HideSidebar)
  @ImmutableContext()
  public hideSidebar({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, {}: HideSidebar) {
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
      return p.type == "panel" && (p as ViewerPanel).viewerIds.includes(viewerId);
    }) as ViewerPanel;
    if (!panel) {
      return;
    }
    let viewer = state.viewers[viewerId];
    if (!viewer) {
      return;
    }

    let refViewer = this.store.selectSnapshot(WorkbenchState.getFocusedViewer);
    let refImageTransformId = null;
    let refViewportTransformId = null;
    let refHeaderId = null;
    let refNormalization = null;
    if (refViewer) {
      refViewportTransformId = this.store.selectSnapshot(WorkbenchState.getViewportTransformIdFromViewerId)(refViewer.id);
      refImageTransformId = this.store.selectSnapshot(WorkbenchState.getImageTransformIdFromViewerId)(refViewer.id);
      refHeaderId = this.store.selectSnapshot(WorkbenchState.getFirstImageHeaderIdFromViewerId)(refViewer.id);
      
      if(refViewer.hduId) {
        let refHdu = hduEntities[refViewer.hduId] as ImageHdu;
        if(refHdu.hduType == HduType.IMAGE) {
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
      if (refHeaderId && refImageTransformId && refViewportTransformId) {
        // ensure that the new file/hdu is synced to what was previously in the viewer
        if (state.viewerSyncEnabled) {
          store.dispatch(new SyncViewerTransformations(refHeaderId, refImageTransformId, refViewportTransformId));
        }
      }

      if(refNormalization && state.normalizationSyncEnabled) {
        store.dispatch(new SyncViewerNormalizations(refNormalization));
      }

      let actions = [];
      return dispatch(actions);
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
        state.viewerLayoutItems[panelId].type != "panel"
      ) {
        //if a valid panel ID was not provided
        if (state.viewerLayoutItemIds.filter((id) => state.viewerLayoutItems[id].type == "panel").length == 0) {
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
          let rootContainer = state.viewerLayoutItems[state.rootViewerPanelContainerId] as ViewerPanelContainer;
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
        .filter((itemId) => state.viewerLayoutItems[itemId].type == "container")
        .map((panelId) => state.viewerLayoutItems[panelId] as ViewerPanelContainer);

      let panels = state.viewerLayoutItemIds
        .filter((itemId) => state.viewerLayoutItems[itemId].type == "panel")
        .map((panelId) => state.viewerLayoutItems[panelId] as ViewerPanelContainer);

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
            let nextPanel = panels.find((panel) => panel.id != viewerLayoutItemId);
            state.focusedViewerPanelId = nextPanel ? nextPanel.id : null;
          }
        }

        let parentContainer = containers.find((container) => container.itemIds.includes(viewerLayoutItemId));

        if (parentContainer) {
          // remove from parent container
          parentContainer.itemIds = parentContainer.itemIds.filter((id) => id != viewerLayoutItemId);

          if (parentContainer.id != state.rootViewerPanelContainerId && parentContainer.itemIds.length == 1) {
            // container is no longer necessary, merge up
            let parentParentContainer = containers.find((container) => container.itemIds.includes(parentContainer.id));

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
        .filter((itemId) => state.viewerLayoutItems[itemId].type == "panel")
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
  public keepViewerOpen({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { viewerId }: KeepViewerOpen) {
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
            type: "panel",
            selectedViewerId: viewerId,
            viewerIds: [viewerId],
          } as ViewerPanel;

          state.viewerLayoutItemIds.push(nextPanelId);

          //remove viewer from source panel
          sourcePanel.viewerIds = sourcePanel.viewerIds.filter((id) => id != viewerId);
          sourcePanel.selectedViewerId = sourcePanel.viewerIds[0];
          let sourcePanelIndex = sourceContainer.itemIds.indexOf(sourcePanelId);

          if (
            (sourceContainer.direction == "column" && ["up", "down"].includes(direction)) ||
            (sourceContainer.direction == "row" && ["left", "right"].includes(direction))
          ) {
            //add panel to parent container if same direction is requested
            sourceContainer.itemIds.splice(
              ["up", "left"].includes(direction) ? sourcePanelIndex : sourcePanelIndex + 1,
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

            (state.viewerLayoutItems[nextContainerId] as ViewerPanelContainer).itemIds.splice(
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
    let viewer = state.viewers[viewerId];
    let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
    let headerEntities = this.store.selectSnapshot(DataFilesState.getHeaderEntities);
    let fileEntities = this.store.selectSnapshot(DataFilesState.getFileEntities);

    if (!viewer) return;

    let refViewportTransformId = this.store.selectSnapshot(WorkbenchState.getViewportTransformIdFromViewerId)(viewer.id);
    let refImageTransformId = this.store.selectSnapshot(WorkbenchState.getImageTransformIdFromViewerId)(viewer.id);
    let refHeaderId = this.store.selectSnapshot(WorkbenchState.getFirstImageHeaderIdFromViewerId)(viewer.id);
    let refNormalization = null;
    if(viewer.hduId) {
      let refHdu = hduEntities[viewer.hduId] as ImageHdu;
      if(refHdu.hduType == HduType.IMAGE) {
        refNormalization = refHdu.normalizer;
      }
    }

    setState((state: WorkbenchStateModel) => {
      //for a more responsive feel, set the panel's selected viewer before loading
      let panel = Object.values(state.viewerLayoutItems).find(
        (item) => item.type == "panel" && (item as ViewerPanel).viewerIds.includes(viewerId)
      ) as ViewerPanel;
      if (panel) {
        state.focusedViewerPanelId = panel.id;
        panel.selectedViewerId = viewerId;
      }
      return state;
    });

    function onLoadComplete(store: Store) {
      //normalization
      if (refHeaderId && refImageTransformId && refViewportTransformId) {
        // ensure that the new file/hdu is synced to what was previously in the viewer
        if (state.viewerSyncEnabled) {
          store.dispatch(new SyncViewerTransformations(refHeaderId, refImageTransformId, refViewportTransformId));
        }

        if(refNormalization && state.normalizationSyncEnabled) {
          store.dispatch(new SyncViewerNormalizations(refNormalization));
        }
      
      }

      //wait to set the viewer file and hdu until after it has loaded the header/hist
      setState((state: WorkbenchStateModel) => {
        let viewer = state.viewers[viewerId];
        viewer.fileId = fileId;
        viewer.hduId = hduId;
        return state;
      });

      let actions = [];
      return dispatch(actions);
    }

    let hduIds = hduId ? [hduId] : fileEntities[fileId].hduIds;
    let actions = hduIds.map((hduId) => new LoadHdu(hduId));

    let cancel$ = this.actions$.pipe(
      ofActionDispatched(SetViewerFile),
      filter<SetViewerFile>((action) => action.viewerId == viewerId && (action.fileId != fileId || action.hduId != hduId))
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
  public setShowConfig({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { showConfig }: SetShowConfig) {
    setState((state: WorkbenchStateModel) => {
      state.showConfig = showConfig;
      return state;
    });
  }

  @Action(ToggleShowConfig)
  @ImmutableContext()
  public toggleShowConfig({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, {}: ToggleShowConfig) {
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

      state.aligningPanelConfig.currentAlignmentJobId = null;

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

      state.stackingPanelConfig.currentStackingJobId = null;

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
  public closeSideNav({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, {}: CloseSidenav) {
    setState((state: WorkbenchStateModel) => {
      state.showSideNav = false;
      return state;
    });
  }

  @Action(OpenSidenav)
  @ImmutableContext()
  public openSideNav({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, {}: OpenSidenav) {
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
    let existingIds = state.hduIds;
    let newIds = hdus.map((imageFile) => imageFile.id).filter((id) => !existingIds.includes(id));

    if (newIds.length != 0) {
      dispatch(new InitializeWorkbenchHduState(newIds));
    }

    let focusedViewer = this.store.selectSnapshot(WorkbenchState.getFocusedViewer);

    if (
      !focusedViewer || //no viewers have focus
      (!focusedViewer.hduId && !focusedViewer.fileId) //focused viewer has no assigned file
    ) {
      if (hdus[0]) {
        dispatch(
          new SelectDataFileListItem({
            fileId: hdus[0].fileId,
            hduId: hdus[0].id,
          })
        );
      }
    }
  }

  @Action(CloseDataFile)
  @ImmutableContext()
  public removeDataFile({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { fileId }: CloseDataFile) {
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
    let fileEntities = this.store.selectSnapshot(DataFilesState.getFileEntities);

    let file = fileEntities[item.fileId];
    let workbenchFileState = state.fileStateEntities[file.id];
    let hdu = item.hduId ? hduEntities[item.hduId] : null;
    let workbenchHduState = hdu ? state.hduStateEntities[hdu.id] : null;

    let viewers = Object.values(state.viewers);

    //check if file is already open
    let targetViewer = viewers.find((viewer) => viewer.fileId == item.fileId && viewer.hduId == item.hduId);
    if (targetViewer) {
      dispatch(new SetFocusedViewer(targetViewer.id));
      return;
    }

    //check if existing viewer is available
    // if no HDU is specified,  use an image viewer for composite image data
    let targetViewerType = !hdu || hdu.hduType == HduType.IMAGE ? "image" : "table";
    targetViewer = viewers.find((viewer) => !viewer.keepOpen && viewer.type == targetViewerType);
    if (targetViewer) {
      //temporary viewer exists
      dispatch(new SetViewerFile(targetViewer.id, file.id, hdu ? hdu.id : null));
      return;
    }

    let viewerBase = {
      id: null,
      fileId: file.id,
      hduId: hdu ? hdu.id : null,
      keepOpen: false,
      viewportSize: null,
    };

    if (targetViewerType == "image") {
      let imageHdu = hdu as ImageHdu;
      let imageHduWorkbenchState = workbenchHduState as WorkbenchImageHduState;
      let headerId: string = null;
      let imageDataId: string = null;
      if (hdu) {
        headerId = hdu.headerId;
        imageDataId = (hdu as ImageHdu).normalizedImageDataId;
      } else {
        imageDataId = file.compositeImageDataId;

        //use header from first image hdu
        let firstImageHduId = file.hduIds.find((hduId) => hduEntities[hduId].hduType == HduType.IMAGE);
        if (firstImageHduId) {
          headerId = hduEntities[firstImageHduId].headerId;
        }
      }

      let imageViewer: ImageViewer = {
        ...viewerBase,
        type: "image",
        panEnabled: true,
        zoomEnabled: true,
      };
      dispatch(new CreateViewer(imageViewer, state.focusedViewerPanelId));
      return;
    } else {
      let tableViewer: TableViewer = {
        ...viewerBase,
        type: "table",
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
      return dispatch(new UpdatePlottingPanelState(id, {
        ...referenceState
      }));
    });
  }

  @Action(SonificationRegionChanged)
  @ImmutableContext()
  public sonificationRegionChanged(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduId }: SonificationRegionChanged
  ) {
    let state = getState();
    let hduStateEntities = this.store.selectSnapshot(WorkbenchState.getHduStateEntities);
    if (!(hduId in hduStateEntities) || hduStateEntities[hduId].hduType != HduType.IMAGE) return;
    let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[hduId] as ImageHdu;
    let hduState = hduStateEntities[hduId] as WorkbenchImageHduState;
    let sonifierState = state.sonificationPanelStateEntities[hduState.sonificationPanelStateId];

    if (sonifierState.regionMode == SonifierRegionMode.CUSTOM && sonifierState.viewportSync) {
      //find viewer which contains file
      let viewer = this.store.selectSnapshot(WorkbenchState.getViewers).find((viewer) => viewer.hduId == hduId);
      if (viewer && viewer.viewportSize) {
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
  public loadCatalogs({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, {}: LoadCatalogs) {
    return this.afterglowCatalogService.getCatalogs().pipe(
      tap((catalogs) => {
        setState((state: WorkbenchStateModel) => {
          state.catalogs = catalogs;
          state.selectedCatalogId = catalogs.length != 0 ? catalogs[0].name : null;
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
  public loadFieldCals({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, {}: LoadFieldCals) {
    return this.afterglowFieldCalService.getFieldCals().pipe(
      tap((fieldCals) => {
        setState((state: WorkbenchStateModel) => {
          state.fieldCals = fieldCals;
          state.selectedFieldCalId =
            state.selectedFieldCalId == null ? (fieldCals.length == 0 ? null : fieldCals[0].id) : state.selectedFieldCalId;
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
  public createFieldCal({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { fieldCal }: CreateFieldCal) {
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
  public updateFieldCal({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { fieldCal }: UpdateFieldCal) {
    return this.afterglowFieldCalService.updateFieldCal(fieldCal).pipe(
      tap((fieldCal) => {}),
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
  public createPixelOpsJob({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, {}: CreatePixelOpsJob) {
    let state = getState();
    let hdus = this.store.selectSnapshot(DataFilesState.getHdus);
    let dataFiles = this.store.selectSnapshot(DataFilesState.getFileEntities);
    let data = state.pixelOpsPanelConfig.pixelOpsFormData;
    let imageHdus = data.hduIds.map((id) => hdus.find((f) => f.id == id)).filter((f) => f != null);
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
        let jobEntity = this.store.selectSnapshot(JobsState.getEntities)[a.job.id];
        let result = jobEntity.result as PixelOpsJobResult;
        if (result.errors.length != 0) {
          console.error("Errors encountered during pixel ops job: ", result.errors);
        }
        if (result.warnings.length != 0) {
          console.error("Warnings encountered during pixel ops job: ", result.warnings);
        }
        dispatch(new LoadLibrary());
      })
    );

    let jobUpdated$ = this.actions$.pipe(
      ofActionSuccessful(UpdateJob),
      filter<CreateJob>((a) => a.correlationId == correlationId),
      takeUntil(jobCompleted$),
      tap((a) => {
        let jobEntity = this.store.selectSnapshot(JobsState.getEntities)[a.job.id];
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
    let hdus = this.store.selectSnapshot(DataFilesState.getHdus);
    let dataFiles = this.store.selectSnapshot(DataFilesState.getFileEntities);
    let data = state.pixelOpsPanelConfig.pixelOpsFormData;
    let imageHdus = data.hduIds.map((id) => hdus.find((f) => f.id == id)).filter((f) => f != null);
    let auxImageFiles = data.auxHduIds.map((id) => hdus.find((f) => f.id == id)).filter((f) => f != null);
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
        let jobEntity = this.store.selectSnapshot(JobsState.getEntities)[a.job.id];
        let result = jobEntity.result as PixelOpsJobResult;
        if (result.errors.length != 0) {
          console.error("Errors encountered during pixel ops: ", result.errors);
        }
        if (result.warnings.length != 0) {
          console.error("Warnings encountered during pixel ops: ", result.warnings);
        }
        dispatch(new LoadLibrary());
      })
    );

    let jobUpdated$ = this.actions$.pipe(
      ofActionSuccessful(UpdateJob),
      filter<CreateJob>((a) => a.correlationId == correlationId),
      takeUntil(jobCompleted$),
      tap((a) => {
        let jobEntity = this.store.selectSnapshot(JobsState.getEntities)[a.job.id];
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
  public createAlignmentJob({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, {}: CreateAlignmentJob) {
    let state = getState();
    let data = state.aligningPanelConfig.alignFormData;
    let hdus = this.store.selectSnapshot(DataFilesState.getHdus);
    let dataFiles = this.store.selectSnapshot(DataFilesState.getFileEntities);
    let imageHdus = data.selectedHduIds.map((id) => hdus.find((f) => f.id == id)).filter((f) => f != null);

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
        let jobEntity = this.store.selectSnapshot(JobsState.getEntities)[a.job.id];
        let result = jobEntity.result as AlignmentJobResult;
        if (result.errors.length != 0) {
          console.error("Errors encountered during aligning: ", result.errors);
        }
        if (result.warnings.length != 0) {
          console.error("Warnings encountered during aligning: ", result.warnings);
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
        let jobEntity = this.store.selectSnapshot(JobsState.getEntities)[a.job.id];
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
  public createStackingJob({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, {}: CreateStackingJob) {
    let state = getState();
    let data = state.stackingPanelConfig.stackFormData;
    let hdus = this.store.selectSnapshot(DataFilesState.getHdus);
    let dataFiles = this.store.selectSnapshot(DataFilesState.getFileEntities);
    let imageHdus = data.selectedHduIds.map((id) => hdus.find((f) => f.id == id)).filter((f) => f != null);
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
        let jobEntity = this.store.selectSnapshot(JobsState.getEntities)[a.job.id];
        let result = jobEntity.result as PixelOpsJobResult;
        if (result.errors.length != 0) {
          console.error("Errors encountered during stacking: ", result.errors);
        }
        if (result.warnings.length != 0) {
          console.error("Warnings encountered during stacking: ", result.warnings);
        }
        dispatch(new LoadLibrary());
      })
    );

    let jobUpdated$ = this.actions$.pipe(
      ofActionSuccessful(UpdateJob),
      filter<CreateJob>((a) => a.correlationId == correlationId),
      takeUntil(jobCompleted$),
      tap((a) => {
        let jobEntity = this.store.selectSnapshot(JobsState.getEntities)[a.job.id];
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
    { surveyDataProviderId, raHours, decDegs, widthArcmins, heightArcmins, imageFileId, correlationId }: ImportFromSurvey
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
            let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
            if (action.fileIds[0] in hduEntities) {
              let hdu = hduEntities[action.fileIds[0]];
              dispatch(
                new SelectDataFileListItem({
                  fileId: hdu.fileId,
                  hduId: hdu.id,
                })
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
            path: `DSS\\${raHours * 15},${decDegs}\\${widthArcmins},${heightArcmins}`,
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
    let photometryPageSettings = this.store.selectSnapshot(WorkbenchState.getPhotometryPanelConfig);
    let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
    let imageDataEntities = this.store.selectSnapshot(DataFilesState.getImageDataEntities);
    let transformEntities = this.store.selectSnapshot(DataFilesState.getTransformEntities);
    let hdu = hduEntities[hduId] as ImageHdu;
    let header = this.store.selectSnapshot(DataFilesState.getHeaderEntities)[hdu.headerId];
    let rawImageData = imageDataEntities[hdu.rawImageDataId];
    let viewportTransform = transformEntities[hdu.viewportTransformId];
    let imageTransform = transformEntities[hdu.imageTransformId];
    let imageToViewportTransform = getImageToViewportTransform(viewportTransform, imageTransform);
    let hduState = state.hduStateEntities[hdu.id] as WorkbenchImageHduState;
    let viewportSize = state.viewers[viewerId].viewportSize;
    let sonificationState = state.sonificationPanelStateEntities[hduState.sonificationPanelStateId];

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
        x: Math.min(getWidth(header), Math.max(0, region.x + 1)),
        y: Math.min(getHeight(header), Math.max(0, region.y + 1)),
        width: Math.min(getWidth(header), Math.max(0, region.width + 1)),
        height: Math.min(getHeight(header), Math.max(0, region.height + 1)),
      };
    } else if (
      settings.region == SourceExtractionRegionOption.SONIFIER_REGION &&
      sonificationState.regionMode == SonifierRegionMode.CUSTOM
    ) {
      let region = sonificationState.regionHistory[sonificationState.regionHistoryIndex];
      jobSettings = {
        ...jobSettings,
        x: Math.min(getWidth(header), Math.max(0, region.x + 1)),
        y: Math.min(getHeight(header), Math.max(0, region.y + 1)),
        width: Math.min(getWidth(header), Math.max(0, region.width + 1)),
        height: Math.min(getHeight(header), Math.max(0, region.height + 1)),
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
        let jobEntity = this.store.selectSnapshot(JobsState.getEntities)[a.job.id];
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
            header.wcs &&
            header.wcs.isValid() &&
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
  public removeSources({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { sourceIds }: RemoveSources) {
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
          pm_epoch: source.pmEpoch ? new Date(source.pmEpoch).toISOString() : null,
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
        let jobEntity = this.store.selectSnapshot(JobsState.getEntities)[a.job.id];
        let result = jobEntity.result as PhotometryJobResult;
        if (result.errors.length != 0) {
          console.error("Errors encountered while photometering sources: ", result.errors);
        }
        if (result.warnings.length != 0) {
          console.error("Warnings encountered while photometering sources: ", result.warnings);
        }

        setState((state: WorkbenchStateModel) => {
          if (isBatch) state.photometryPanelConfig.batchPhotProgress = null;
          return state;
        });

        let photDatas = [];
        fileIds.forEach((fileId) => {
          sourceIds.forEach((sourceId) => {
            let d = result.data.find((d) => d.id == sourceId && d.file_id.toString() == fileId);
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
        let jobEntity = this.store.selectSnapshot(JobsState.getEntities)[a.job.id];

        setState((state: WorkbenchStateModel) => {
          if (isBatch) {
            state.photometryPanelConfig.batchPhotJobId = a.job.id;
            state.photometryPanelConfig.batchPhotProgress = jobEntity.job.state.progress;
          }
          return state;
        });
      })
    );

    return merge(jobSuccessful$, jobUpdated$);
  }

  @Action(InitializeWorkbenchHduState)
  @ImmutableContext()
  public initializeWorkbenchHduState(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduIds }: InitializeWorkbenchHduState
  ) {
    setState((state: WorkbenchStateModel) => {
      hduIds.forEach((hduId) => {
        let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
        if (!(hduId in hduEntities)) return;
        let hdu = hduEntities[hduId];
        let hduState: IWorkbenchHduState;

        //initialize HDU states
        if (hdu.hduType == HduType.IMAGE) {
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
          };
          state.customMarkerPanelStateIds.push(customMarkerPanelStateId);

          let sonificationPanelStateId = `SONIFICATION_PANEL_${state.nextSonificationPanelStateId++}`;
          state.sonificationPanelStateEntities[sonificationPanelStateId] = {
            id: sonificationPanelStateId,
            sonificationUri: null,
            regionHistory: [],
            regionHistoryIndex: null,
            regionHistoryInitialized: false,
            regionMode: SonifierRegionMode.VIEWPORT,
            viewportSync: true,
            duration: 10,
            toneCount: 22,
            progressLine: null,
            sonificationJobProgress: null,
          };
          state.sonificationPanelStateIds.push(sonificationPanelStateId);

          let photometryPanelStateId = `PHOTOMETRY_PANEL_${state.nextPhotometryPanelStateId++}`;
          state.photometryPanelStateEntities[photometryPanelStateId] = {
            id: photometryPanelStateId,
            sourceExtractionJobId: null,
            sourcePhotometryData: {},
          };
          state.photometryPanelStateIds.push(photometryPanelStateId);

          let imageHduState: WorkbenchImageHduState = {
            id: hdu.id,
            hduType: HduType.IMAGE,
            plottingPanelStateId: plottingPanelStateId,
            customMarkerPanelStateId: customMarkerPanelStateId,
            sonificationPanelStateId: sonificationPanelStateId,
            photometryPanelStateId: photometryPanelStateId,
          };

          hduState = imageHduState;
        } else if (hdu.hduType == HduType.TABLE) {
          let tableHduState: WorkbenchTableHduState = {
            id: hdu.id,
            hduType: HduType.TABLE,
          };

          hduState = tableHduState;
        }

        state.hduStateEntities[hduState.id] = hduState;
        state.hduIds.push(hdu.id);

        let fileEntities = this.store.selectSnapshot(DataFilesState.getFileEntities);
        if (!(hdu.fileId in fileEntities)) return;
        let file = fileEntities[hdu.fileId];

        if (file.id in state.fileStateEntities) return;

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
        };
        state.customMarkerPanelStateIds.push(customMarkerPanelStateId);

        state.fileStateEntities[file.id] = {
          id: file.id,
          plottingPanelStateId: plottingPanelStateId,
          customMarkerPanelStateId: customMarkerPanelStateId,
          selectedHduId: file.hduIds.length == 0 ? null : file.hduIds[0],
        };
        state.fileIds.push(file.id);
      });

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
      state.fileIds = state.fileIds.filter((id) => id != fileId);
      if (fileId in state.fileStateEntities) delete state.fileStateEntities[fileId];
      return state;
    });
  }

  @Action(CloseHduSuccess)
  @ImmutableContext()
  public closeHduSuccess({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { hduId }: CloseHduSuccess) {
    setState((state: WorkbenchStateModel) => {
      state.hduIds = state.hduIds.filter((id) => id != hduId);
      if (hduId in state.hduStateEntities) delete state.hduStateEntities[hduId];
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
    if (!(hduId in state.hduStateEntities) || state.hduStateEntities[hduId].hduType != HduType.IMAGE) return;

    let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[hduId] as ImageHdu;
    let header = this.store.selectSnapshot(DataFilesState.getHeaderEntities)[hdu.headerId];

    let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
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

  @Action([AddRegionToHistory, UndoRegionSelection, RedoRegionSelection])
  @ImmutableContext()
  public regionHistoryChanged(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduId }: AddRegionToHistory | UndoRegionSelection | RedoRegionSelection
  ) {
    let state = getState();
    if (!(hduId in state.hduStateEntities) || state.hduStateEntities[hduId].hduType != HduType.IMAGE) return;

    let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[hduId] as ImageHdu;
    let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
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
    let state = getState();
    if (!(hduId in state.hduStateEntities) || state.hduStateEntities[hduId].hduType != HduType.IMAGE) return;

    setState((state: WorkbenchStateModel) => {
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let sonificationPanelState = state.sonificationPanelStateEntities[hduState.sonificationPanelStateId];
      sonificationPanelState = {
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
    let state = getState();
    if (!(hduId in state.hduStateEntities) || state.hduStateEntities[hduId].hduType != HduType.IMAGE) return;

    setState((state: WorkbenchStateModel) => {
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let sonificationPanelState = state.sonificationPanelStateEntities[hduState.sonificationPanelStateId];
      if (!sonificationPanelState.regionHistoryInitialized) {
        sonificationPanelState.regionHistoryIndex = 0;
        sonificationPanelState.regionHistory = [region];
        sonificationPanelState.regionHistoryInitialized = true;
      } else {
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
    let state = getState();
    if (!(hduId in state.hduStateEntities) || state.hduStateEntities[hduId].hduType != HduType.IMAGE) return;

    setState((state: WorkbenchStateModel) => {
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let sonificationPanelState = state.sonificationPanelStateEntities[hduState.sonificationPanelStateId];
      if (!sonificationPanelState.regionHistoryInitialized || sonificationPanelState.regionHistoryIndex == 0) return state;
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
    let state = getState();
    if (!(hduId in state.hduStateEntities) || state.hduStateEntities[hduId].hduType != HduType.IMAGE) return;

    setState((state: WorkbenchStateModel) => {
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let sonificationPanelState = state.sonificationPanelStateEntities[hduState.sonificationPanelStateId];
      if (
        !sonificationPanelState.regionHistoryInitialized ||
        sonificationPanelState.regionHistoryIndex == sonificationPanelState.regionHistory.length - 1
      )
        return state;
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
    let state = getState();
    if (!(hduId in state.hduStateEntities) || state.hduStateEntities[hduId].hduType != HduType.IMAGE) return;

    setState((state: WorkbenchStateModel) => {
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
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
    let state = getState();
    if (!(hduId in state.hduStateEntities) || state.hduStateEntities[hduId].hduType != HduType.IMAGE) return;

    setState((state: WorkbenchStateModel) => {
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let sonfiicationPanelState = state.sonificationPanelStateEntities[hduState.sonificationPanelStateId];
      sonfiicationPanelState.progressLine = line;
      return state;
    });
  }

  @Action(Sonify)
  @ImmutableContext()
  public sonify({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { hduId, region }: Sonify) {
    let state = getState();
    let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
    let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
    if (!hduState || hduState.hduType != HduType.IMAGE) return;

    let sonificationPanelState = state.sonificationPanelStateEntities[hduState.sonificationPanelStateId];

    let job: SonificationJob = {
      id: null,
      file_id: parseInt(hduId),
      type: JobType.Sonification,
      settings: {
        x: Math.floor(region.x) + 1,
        y: Math.floor(region.y) + 1,
        width: Math.floor(region.width),
        height: Math.floor(region.height),
        num_tones: Math.floor(sonificationPanelState.toneCount),
        tempo: Math.ceil(region.height / sonificationPanelState.duration),
        index_sounds: true,
      },
    };

    // let correlationId = this.correlationIdGenerator.next();
    // dispatch(new CreateJob(job, 1000, correlationId));
    // return this.actions$.pipe(
    //   ofActionSuccessful(CreateJob),
    //   filter<CreateJob>((a) => a.correlationId == correlationId),
    //   tap((a) => {
    //     let jobEntity = this.store.selectSnapshot(JobsState.getEntities)[
    //       a.job.id
    //     ];
    //     let result = jobEntity.result as PhotometryJobResult;
    //     if (result.errors.length != 0) {

    //       return;
    //     }

    let correlationId = this.correlationIdGenerator.next();
    dispatch(new CreateJob(job, 1000, correlationId));

    setState((state: WorkbenchStateModel) => {
      let sonificationPanelState = state.sonificationPanelStateEntities[hduState.sonificationPanelStateId];
      sonificationPanelState.sonificationJobProgress = 0;
      sonificationPanelState.sonificationUri = null;
      return state;
    });

    let jobCompleted$ = this.actions$.pipe(
      ofActionCompleted(CreateJob),
      filter((v) => v.action.correlationId == correlationId),
      take(1)
    );

    let jobStatusUpdated$ = this.actions$.pipe(
      ofActionSuccessful(UpdateJob),
      filter<UpdateJob>((a) => a.correlationId == correlationId),
      takeUntil(jobCompleted$),
      tap((a) => {
        setState((state: WorkbenchStateModel) => {
          let sonificationPanelState = state.sonificationPanelStateEntities[hduState.sonificationPanelStateId];
          sonificationPanelState.sonificationJobProgress = a.job.state.progress;
          return state;
        });
      })
    );

    return merge(
      jobStatusUpdated$,
      jobCompleted$.pipe(
        tap((a) => {
          setState((state: WorkbenchStateModel) => {
            if (a.result.successful) {
              job = (a.action as CreateJob).job as SonificationJob;
              let sonificationPanelState = state.sonificationPanelStateEntities[hduState.sonificationPanelStateId];
              let jobEntity = this.store.selectSnapshot(JobsState.getEntities)[job.id];
              let result = jobEntity.result as SonificationJobResult;
              if (result.errors.length != 0) {
                sonificationPanelState.sonificationJobProgress = null;
                sonificationPanelState.sonificationUri = null;
                return;
              }
              sonificationPanelState.sonificationJobProgress = null;
              sonificationPanelState.sonificationUri = `core/api/v1/jobs/${job.id}/result/files/sonification`;
            }

            return state;
          });
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
    let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
    let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
    if (!hduState || hduState.hduType != HduType.IMAGE) return;
    setState((state: WorkbenchStateModel) => {
      let sonificationPanelState = state.sonificationPanelStateEntities[hduState.sonificationPanelStateId];
      sonificationPanelState.sonificationJobProgress = null;
      sonificationPanelState.sonificationUri = null;
      return state;
    });
  }

  @Action(UpdatePhotometryFileState)
  @ImmutableContext()
  public updatePhotometryFileState(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { hduId, changes }: UpdatePhotometryFileState
  ) {
    let state = getState();
    if (!(hduId in state.hduStateEntities) || state.hduStateEntities[hduId].hduType != HduType.IMAGE) return;

    setState((state: WorkbenchStateModel) => {
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
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
          marker.label = "";
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
        if (marker.id in markerState.markerEntities) delete markerState.markerEntities[marker.id];
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
        if (markerState.markerIds.includes(marker.id)) {
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
        if (markerState.markerIds.includes(marker.id)) {
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
  public addPhotDatas({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { photDatas }: AddPhotDatas) {
    setState((state: WorkbenchStateModel) => {
      photDatas.forEach((d) => {
        if (
          !d.hduId ||
          !(d.hduId in state.hduStateEntities) ||
          state.hduStateEntities[d.hduId].hduType != HduType.IMAGE ||
          !d.sourceId
        )
          return;
        let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[d.hduId] as ImageHdu;
        let hduState = state.hduStateEntities[d.hduId] as WorkbenchImageHduState;
        let photometryPanelState = state.photometryPanelStateEntities[hduState.photometryPanelStateId];
        photometryPanelState.sourcePhotometryData[d.sourceId] = d;
      });

      return state;
    });
  }

  @Action(RemoveAllPhotDatas)
  @ImmutableContext()
  public removeAllPhotDatas({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, {}: RemoveAllPhotDatas) {
    setState((state: WorkbenchStateModel) => {
      state.hduIds.forEach((hduId) => {
        if (state.hduStateEntities[hduId].hduType != HduType.IMAGE) {
          return;
        }
        let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
        state.photometryPanelStateEntities[hduState.photometryPanelStateId].sourcePhotometryData = {};
      });
      return state;
    });
  }

  @Action(RemovePhotDatas)
  @ImmutableContext()
  public removePhotDatas(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { sourceId }: RemovePhotDatas
  ) {
    setState((state: WorkbenchStateModel) => {
      state.hduIds.forEach((hduId) => {
        if (state.hduStateEntities[hduId].hduType != HduType.IMAGE) return;
        let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
        let photometryPanelState = state.photometryPanelStateEntities[hduState.photometryPanelStateId];
        if (sourceId in photometryPanelState.sourcePhotometryData) {
          delete photometryPanelState.sourcePhotometryData[sourceId];
        }
      });
      return state;
    });
  }

  @Action(SetSelectedHduId)
  @ImmutableContext()
  public setSelectedHduId(
    { setState, getState, dispatch }: StateContext<WorkbenchStateModel>,
    { fileId, hduId }: SetSelectedHduId
  ) {
    setState((state: WorkbenchStateModel) => {
      state.fileStateEntities[fileId].selectedHduId = hduId;
      return state;
    });
  }

  @Action(SyncViewerTransformations)
  @ImmutableContext()
  public syncFileTransformations(
    { getState, setState, dispatch }: StateContext<WorkbenchStateModel>,
    { refHeaderId, refImageTransformId, refViewportTransformId }: SyncViewerTransformations
  ) {
    let state = getState();
    let headerEntities = this.store.selectSnapshot(DataFilesState.getHeaderEntities);
    let transformEntities = this.store.selectSnapshot(DataFilesState.getTransformEntities);
    let refHeader = headerEntities[refHeaderId];
    let refImageTransform = transformEntities[refImageTransformId];
    let refViewportTransform = transformEntities[refViewportTransformId];
    let refImageToViewportTransform = getImageToViewportTransform(refViewportTransform, refImageTransform);
    let refHduHasWcs = refHeader.wcs && refHeader.wcs.isValid();

    let visibleViewers = this.store.selectSnapshot(WorkbenchState.getVisibleViewerIds).map((id) => state.viewers[id]);

    console.log();

    let actions = [];
    visibleViewers.forEach((viewer) => {
      let targetImageTransform: Transform;
      let targetViewportTransform: Transform;
      let targetHeaderId = this.store.selectSnapshot(WorkbenchState.getFirstImageHeaderIdFromViewerId)(viewer.id);
      let targetHeader = headerEntities[targetHeaderId];
      let targetImageTransformId = this.store.selectSnapshot(WorkbenchState.getImageTransformIdFromViewerId)(viewer.id);
      let targetViewportTransformId = this.store.selectSnapshot(WorkbenchState.getViewportTransformIdFromViewerId)(
        viewer.id
      );

      if (!targetHeader || !targetHeader.loaded || !targetImageTransformId || !targetViewportTransformId) return;

      if (state.viewerSyncMode == "sky") {
        let targetHasWcs = targetHeader.wcs && targetHeader.wcs.isValid();
        if (refHduHasWcs && targetHasWcs) {
          let referenceWcs = refHeader.wcs;
          let referenceWcsMat = new Matrix(referenceWcs.m11, referenceWcs.m21, referenceWcs.m12, referenceWcs.m22, 0, 0);
          let originWorld = referenceWcs.pixToWorld([0, 0]);
          let wcs = targetHeader.wcs;
          let originPixels = wcs.worldToPix(originWorld);
          let wcsMat = new Matrix(wcs.m11, wcs.m21, wcs.m12, wcs.m22, 0, 0);

          if (hasOverlap(refHeader, targetHeader)) {
            let srcToTargetMat = referenceWcsMat.inverted().appended(wcsMat).translate(-originPixels[0], -originPixels[1]);

            targetImageTransform = appendTransform(
              targetImageTransformId,
              refImageTransform,
              matrixToTransform(targetImageTransformId, srcToTargetMat)
            );
            targetViewportTransform = {
              ...refViewportTransform,
              id: targetViewportTransformId,
            };
          }
        }
      } else {
        targetViewportTransform = {
          ...refViewportTransform,
          id: targetViewportTransformId,
        };
        targetImageTransform = {
          ...refImageTransform,
          id: targetImageTransformId,
        };
      }

      if (targetViewportTransform && targetImageTransform) {
        if (targetImageTransformId != refImageTransformId) {
          actions.push(new UpdateTransform(targetImageTransform.id, targetImageTransform));
        }
        if (targetViewportTransformId != refViewportTransformId) {
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

    let actions = [];
    visibleViewers.forEach((viewer) => {
      let hduId = viewer.hduId;
      if (!hduId) {
        return;
      }
      let hdu = hduEntities[hduId] as ImageHdu;
      if (hdu.hduType != HduType.IMAGE) {
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
}
