import { State, Action, Selector, StateContext, Store, Actions, ofActionDispatched, ofActionSuccessful, ofActionErrored } from '@ngxs/store';
import { tap, catchError, finalize, filter, take, takeUntil, map, flatMap } from 'rxjs/operators';
import { of, merge, combineLatest, interval, Observable } from "rxjs";
import { Point, Matrix, Rectangle } from 'paper';
import { WorkbenchStateModel, WorkbenchTool } from './models/workbench-state';
import { ViewMode } from './models/view-mode';
import { SidebarView } from './models/sidebar-view';
import { createPsfCentroiderSettings, createDiskCentroiderSettings } from './models/centroider';
import { SourceIdentificationModeOption } from './models/source-identification-mode-option';
import { LoadLibrarySuccess, RemoveDataFileSuccess, LoadDataFileHdr, LoadImageHist, LoadLibrary, ClearImageDataCache, LoadImageHistSuccess, LoadDataFileHdrFail, LoadImageHistFail, LoadDataFileHdrSuccess } from '../data-files/data-files.actions';
import { DataFilesState, DataFilesStateModel } from '../data-files/data-files.state';
import { SelectDataFile, SetActiveViewer, SetViewerFile, SyncFileNormalizations, SyncFileTransformations, SyncFilePlotters, SetViewerFileSuccess, SetViewerSyncEnabled, LoadCatalogs, LoadCatalogsSuccess, LoadCatalogsFail, LoadFieldCals, LoadFieldCalsSuccess, LoadFieldCalsFail, CreateFieldCal, CreateFieldCalSuccess, CreateFieldCalFail, UpdateFieldCal, UpdateFieldCalSuccess, UpdateFieldCalFail, AddFieldCalSourcesFromCatalog, CreatePixelOpsJob, CreateAdvPixelOpsJob, CreateAlignmentJob, CreateStackingJob, ImportFromSurvey, ImportFromSurveySuccess, SetViewMode, SetLastRouterPath, ToggleFullScreen, SetFullScreen, SetFullScreenPanel, SetSidebarView, ShowSidebar, HideSidebar, SetNormalizationSyncEnabled, SetPlotterSyncEnabled, SetPlotMode, SetShowConfig, ToggleShowConfig, SetActiveTool, SetShowAllSources, UpdateCentroidSettings, UpdatePlotterSettings, SetSourceExtractionMode, UpdatePhotSettings, UpdateSourceExtractionSettings, SetSelectedCatalog, SetSelectedFieldCal, UpdatePixelOpsFormData, UpdateAlignFormData, UpdateStackFormData, CloseSidenav, OpenSidenav } from './workbench.actions';
import { ImageFile, getWidth, getHeight, hasOverlap, getCenterTime } from '../data-files/models/data-file';
import { ImageFilesState, ImageFilesStateModel } from './image-files.state';
import { RenormalizeImageFile, AddRegionToHistory, MoveBy, ZoomBy, RotateBy, Flip, ResetImageTransform, SetViewportTransform, SetImageTransform, UpdateNormalizer, StartLine, UpdateLine, UpdatePlotterFileState, InitializeImageFileState } from './image-files.actions';
import { AfterglowCatalogService } from './services/afterglow-catalogs';
import { AfterglowFieldCalService } from './services/afterglow-field-cals';
import { CorrelationIdGenerator } from '../utils/correlated-action';
import { CreateJob } from '../jobs/jobs.actions';
import { CatalogQueryJobResult } from '../jobs/models/catalog-query';
import { PixelOpsJob } from '../jobs/models/pixel-ops';
import { JobType } from '../jobs/models/job-types';
import { JobActionHandler } from '../jobs/lib/job-action-handler';
import { AlignmentJob, AlignmentJobResult } from '../jobs/models/alignment';
import { StackingJob } from '../jobs/models/stacking';
import { ImportAssetsCompleted, ImportAssets } from '../data-providers/data-providers.actions';
import { ImmutableContext } from '@ngxs-labs/immer-adapter';
import { DataFileType } from '../data-files/models/data-file-type';
import { PosType } from './models/source';
import { MarkerType, LineMarker, RectangleMarker, CircleMarker, TeardropMarker, Marker } from './models/marker';
import { SonifierRegionMode } from './models/sonifier-file-state';
import { SourcesState, SourcesStateModel } from './sources.state';
import { CustomMarkersState, CustomMarkersStateModel } from './custom-markers.state';

@State<WorkbenchStateModel>({
  name: 'workbench',
  defaults: {
    showSideNav: false,
    lastRouterPath: null,
    inFullScreenMode: false,
    fullScreenPanel: 'file',
    selectedFileId: null,
    activeViewerIndex: 0,
    activeTool: WorkbenchTool.VIEWER,
    viewMode: ViewMode.SINGLE,
    viewers: [
      {
        fileId: null,
        panEnabled: true,
        zoomEnabled: true
      },
      {
        fileId: null,
        panEnabled: true,
        zoomEnabled: true
      },
    ],
    viewerSyncEnabled: false,
    normalizationSyncEnabled: false,
    plotterSyncEnabled: false,
    plotterMode: '1D',
    sidebarView: SidebarView.FILES,
    showSidebar: true,
    showConfig: true,
    showAllSources: true,
    centroidSettings: {
      centroidClicks: false,
      useDiskCentroiding: false,
      psfCentroiderSettings: createPsfCentroiderSettings(),
      diskCentroiderSettings: createDiskCentroiderSettings()
    },
    photSettings: {
      centroid_radius: 4,
      a: 5,
      a_in: 10,
      a_out: 15
    },
    sourceExtractionSettings: {
      threshold: 3,
      fwhm: 0,
      deblend: false,
      limit: 200,
    },
    sourceExtractorModeOption: SourceIdentificationModeOption.MOUSE,
    plotterSettings: {
      interpolatePixels: false
    },
    catalogs: [],
    selectedCatalogId: null,
    fieldCals: [],
    selectedFieldCalId: null,
    currentPixelOpsJobId: null,
    showCurrentPixelOpsJobState: true,
    addFieldCalSourcesFromCatalogJobId: null,
    creatingAddFieldCalSourcesFromCatalogJob: false,
    addFieldCalSourcesFromCatalogFieldCalId: null,
    pixelOpsFormData: {
      operand: '+',
      mode: 'image',
      auxImageFileId: null,
      auxImageFileIds: [],
      imageFileIds: [],
      scalarValue: 1,
      inPlace: false,
      opString: ''
    },
    alignFormData: {
      selectedImageFileIds: [],
      mode: 'astrometric',
      inPlace: true,
    },
    currentAlignmentJobId: null,
    stackFormData: {
      selectedImageFileIds: [],
      mode: 'average',
      scaling: 'none',
      rejection: 'none',
      percentile: 50,
      low: 0,
      high: 0,
    },
    currentStackingJobId: null,
    surveyImportCorrId: null
  }
})
export class WorkbenchState {

  constructor(private store: Store, private afterglowCatalogService: AfterglowCatalogService, private afterglowFieldCalService: AfterglowFieldCalService, private correlationIdGenerator: CorrelationIdGenerator, private actions$: Actions) { }

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
  public static getViewers(state: WorkbenchStateModel) {
    return state.viewers;
  }

  @Selector([DataFilesState])
  public static getActiveImageFile(state: WorkbenchStateModel, dataFilesState: DataFilesStateModel) {
    let activeViewer = WorkbenchState.getActiveViewer(state);
    if (!activeViewer || activeViewer.fileId == null) return null;
    let dataFile = dataFilesState.entities[activeViewer.fileId];
    if (dataFile.type != DataFileType.IMAGE) return null;
    return dataFile as ImageFile;
  }

  @Selector([DataFilesState, ImageFilesState])
  public static getActiveImageFileState(state: WorkbenchStateModel, dataFilesState: DataFilesStateModel, imageFilesState: ImageFilesStateModel) {
    let activeImageFile = WorkbenchState.getActiveImageFile(state, dataFilesState);
    if (!activeImageFile) return null;
    return imageFilesState.entities[activeImageFile.id];
  }

  @Selector()
  public static getActiveViewerIndex(state: WorkbenchStateModel) {
    return state.activeViewerIndex;
  }

  @Selector()
  public static getActiveViewer(state: WorkbenchStateModel) {
    if (state.activeViewerIndex < state.viewers.length) return state.viewers[state.activeViewerIndex];
    return null;
  }


  @Selector([DataFilesState])
  public static getSelectedFile(state: WorkbenchStateModel, dataFilesState: DataFilesStateModel) {
    return dataFilesState.entities[state.selectedFileId];
  }

  @Selector()
  public static getShowConfig(state: WorkbenchStateModel) {
    return state.showConfig;
  }

  @Selector()
  public static getPlotterSyncEnabled(state: WorkbenchStateModel) {
    return state.plotterSyncEnabled;
  }

  @Selector()
  public static getShowAllSources(state: WorkbenchStateModel) {
    return state.showAllSources;
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
  public static getSurveyImportCorrId(state: WorkbenchStateModel) {
    return state.surveyImportCorrId;
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

  @Selector([ImageFilesState, DataFilesState])
  static getPlotterMarkers(state: WorkbenchStateModel, imageFilesState: ImageFilesStateModel, dataFilesState: DataFilesStateModel) {
    return (fileId: string) => {
      let file = dataFilesState.entities[fileId] as ImageFile;
      let plotter = imageFilesState.entities[fileId].plotter;
      let lineMeasureStart = plotter.lineMeasureStart;
      let lineMeasureEnd = plotter.lineMeasureEnd;

      if (!lineMeasureStart || !lineMeasureEnd) return [[]];

      if (!file) return [[]];

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
        if (!file.headerLoaded || !file.wcs.isValid()) return [[]];
        let wcs = file.wcs;
        if (startPosType == PosType.SKY) {
          let xy = wcs.worldToPix([startPrimaryCoord, startSecondaryCoord]);
          x1 = Math.max(Math.min(xy[0], getWidth(file)), 0);
          y1 = Math.max(Math.min(xy[1], getHeight(file)), 0);
        }

        if (endPosType == PosType.SKY) {
          let xy = wcs.worldToPix([endPrimaryCoord, endSecondaryCoord]);
          x2 = Math.max(Math.min(xy[0], getWidth(file)), 0);
          y2 = Math.max(Math.min(xy[1], getHeight(file)), 0);
        }
      }

      if (state.plotterMode == '1D') {
        return [
          {
            type: MarkerType.LINE,
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2
          } as LineMarker
        ];
      }
      else {
        return [
          {
            type: MarkerType.RECTANGLE,
            x: Math.min(x1, x2),
            y: Math.min(y1, y2),
            width: Math.abs(x2 - x1),
            height: Math.abs(y2 - y1)
          } as RectangleMarker
        ];
      }
    };
  }

  @Selector([ImageFilesState, DataFilesState])
  static getSonifierMarkers(state: WorkbenchStateModel, imageFilesState: ImageFilesStateModel, dataFilesState: DataFilesStateModel) {
    return (fileId: string) => {
      let file = dataFilesState.entities[fileId] as ImageFile;
      let sonifier = imageFilesState.entities[fileId].sonifier;
      let region = sonifier.region;
      let regionMode = sonifier.regionMode;
      let progressLine = sonifier.progressLine;
      let result: Array<RectangleMarker | LineMarker> = [];
      if (region && regionMode == SonifierRegionMode.CUSTOM)
        result.push({
          type: MarkerType.RECTANGLE,
          ...region
        } as RectangleMarker);
      if (progressLine)
        result.push({ type: MarkerType.LINE, ...progressLine } as LineMarker);
      return result;
    };
  }

  @Selector([ImageFilesState, DataFilesState, SourcesState])
  static getSourceMarkers(state: WorkbenchStateModel, imageFilesState: ImageFilesStateModel, dataFilesState: DataFilesStateModel, sourcesState: SourcesStateModel) {
    return (fileId: string) => {
      let file = dataFilesState.entities[fileId] as ImageFile;
      let sources = SourcesState.getSources(sourcesState);
      let selectedSources = SourcesState.getSelectedSources(sourcesState);
      let markers: Array<CircleMarker | TeardropMarker> = [];
      if (!file) return [[]];
      sources.forEach(source => {
        let primaryCoord = source.primaryCoord;
        let secondaryCoord = source.secondaryCoord;
        let pm = source.pm;
        let posAngle = source.pmPosAngle;
        let epoch = source.pmEpoch;
        let selected = selectedSources.includes(source);

        if (pm) {
          if (!file.headerLoaded) return;
          let fileEpoch = getCenterTime(file);
          if (!fileEpoch) return;

          let deltaT = (fileEpoch.getTime() - epoch.getTime()) / 1000.0;
          let mu = (source.pm * deltaT) / 3600.0;
          let theta = source.pmPosAngle * (Math.PI / 180.0);
          let cd = Math.cos((secondaryCoord * Math.PI) / 180);

          primaryCoord += (mu * Math.sin(theta)) / cd / 15;
          primaryCoord = primaryCoord % 360;
          secondaryCoord += mu * Math.cos(theta);
          secondaryCoord = Math.max(-90, Math.min(90, secondaryCoord));

          // primaryCoord += (primaryRate * deltaT)/3600/15 * (source.posType == PosType.PIXEL ? 1 : Math.cos(secondaryCoord*Math.PI/180));
        }

        if (source.fileId != fileId && !state.showAllSources) return;

        let x = primaryCoord;
        let y = secondaryCoord;
        let theta = posAngle;

        console.log("HERE", file, file.headerLoaded, file.wcs.isValid());

        if (source.posType == PosType.SKY) {
          if (!file.headerLoaded || !file.wcs.isValid()) return;
          let wcs = file.wcs;
          let xy = wcs.worldToPix([primaryCoord, secondaryCoord]);
          x = xy[0];
          y = xy[1];
          if (
            x < 0.5 ||
            x >= getWidth(file) + 0.5 ||
            y < 0.5 ||
            y >= getHeight(file) + 0.5
          )
            return;

          if (pm) {
            theta = posAngle + wcs.positionAngle();
            theta = theta % 360;
            if (theta < 0) theta += 360;
          }
        }

        if (pm) {
          markers.push({
            type: MarkerType.TEARDROP,
            x: x,
            y: y,
            radius: 15,
            labelGap: 14,
            labelTheta: 0,
            theta: theta,
            selected: selected,
            data: { id: source.id }
          } as TeardropMarker);
        } else {
          markers.push({
            type: MarkerType.CIRCLE,
            x: x,
            y: y,
            radius: 15,
            labelGap: 14,
            labelTheta: 0,
            selected: selected,
            data: { id: source.id }
          } as CircleMarker);
        }
      });

      return markers;
    };
  }

  @Selector([ImageFilesState, DataFilesState, CustomMarkersState])
  static getCustomMarkers(state: WorkbenchStateModel, imageFilesState: ImageFilesStateModel, dataFilesState: DataFilesStateModel, customMarkersState: CustomMarkersStateModel) {
    return (fileId: string) => {

      if (fileId === null) return [[]];
      let file = dataFilesState.entities[fileId] as ImageFile;
      let markers: Array<Marker> = [];
      let selectedCustomMarkers = CustomMarkersState.getSelectedCustomMarkers(customMarkersState);
      if (!file) return [[]];
      markers = CustomMarkersState.getCustomMarkers(customMarkersState)
        .filter(customMarker => customMarker.fileId == file.id)
        .map(customMarker => {
          let marker = {
            ...customMarker.marker,
            data: { id: customMarker.id },
            selected:
              state.activeTool == WorkbenchTool.CUSTOM_MARKER &&
              selectedCustomMarkers.includes(customMarker)
          };
          return marker;
        });

      return markers;
    };
  }


  @Action(SetLastRouterPath)
  @ImmutableContext()
  public setLastRouterPath({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { path }: SetLastRouterPath) {
    setState((state: WorkbenchStateModel) => {
      state.lastRouterPath = path;
      return state;
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
  public setFullScreenPanel({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { panel }: SetFullScreenPanel) {
    setState((state: WorkbenchStateModel) => {
      state.fullScreenPanel = panel;
      return state;
    });
  }

  @Action(SetSidebarView)
  @ImmutableContext()
  public setSidebarView({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { sidebarView }: SetSidebarView) {
    setState((state: WorkbenchStateModel) => {
      let showSidebar = true;
      if (sidebarView == state.sidebarView) {
        showSidebar = !state.showSidebar
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

  @Action(SetActiveViewer)
  @ImmutableContext()
  public setActiveViewer({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { viewerIndex }: SetActiveViewer) {
    setState((state: WorkbenchStateModel) => {
      state.activeViewerIndex = viewerIndex;
      return state;
    });
  }


  @Action(SetViewMode)
  @ImmutableContext()
  public setViewMode({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { viewMode }: SetViewMode) {
    setState((state: WorkbenchStateModel) => {
      let activeViewerIndex = state.activeViewerIndex;
      if (viewMode == ViewMode.SINGLE) {
        activeViewerIndex = 0;
      }
      state.viewMode = viewMode;
      state.activeViewerIndex = activeViewerIndex;
      return state;
    });
  }

  @Action(SetViewerFile)
  @ImmutableContext()
  public setViewerFile({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { viewerIndex, fileId }: SetViewerFile) {
    let originalFileId;
    setState((state: WorkbenchStateModel) => {
      originalFileId = state.viewers[viewerIndex].fileId;
      state.viewers[viewerIndex].fileId = fileId;
      return state;
    });

    let state = getState();
    let viewer = state.viewers[viewerIndex];
    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);

    let actions = [];
    let dataFile = dataFiles[fileId] as ImageFile;
    if (dataFile && viewer) {

      if (dataFile.headerLoaded && dataFile.histLoaded) {

        let referenceFileId = originalFileId;
        if (referenceFileId == null) {
          let referenceViewer = state.viewers.find(
            (viewer, index) =>
              index != viewerIndex && viewer.fileId != null
          );
          if (referenceViewer) referenceFileId = referenceViewer.fileId;
        }

        //normalization
        let imageFileStates = this.store.selectSnapshot(ImageFilesState.getEntities);
        let normalization = imageFileStates[dataFile.id].normalization;
        if (state.normalizationSyncEnabled && referenceFileId) {
          actions.push(
            new SyncFileNormalizations(dataFiles[referenceFileId] as ImageFile, [dataFile])
          );
        } else if (!normalization.initialized) {
          // //calculate good defaults based on histogram
          // let levels = calcLevels(
          //   dataFile.hist,
          //   environment.lowerPercentileDefault,
          //   environment.upperPercentileDefault,
          //   true
          // );
          actions.push(
            new RenormalizeImageFile(dataFile.id)
          );
        }

        let sonifierState = imageFileStates[dataFile.id].sonifier;
        if (!sonifierState.regionHistoryInitialized) {
          actions.push(
            new AddRegionToHistory(dataFile.id, {
              x: 0.5,
              y: 0.5,
              width: getWidth(dataFile),
              height: getHeight(dataFile)
            })
          );
        }

        if (referenceFileId) {
          //sync pending file transformation to current file
          if (state.viewerSyncEnabled)
            actions.push(
              new SyncFileTransformations(dataFiles[referenceFileId] as ImageFile, [dataFile])
            );
          if (state.plotterSyncEnabled)
            actions.push(
              new SyncFilePlotters(dataFiles[referenceFileId] as ImageFile, [dataFile])
            );
        }

        return dispatch(actions);
      }
      else {
        if (!dataFile.headerLoaded && !dataFile.headerLoading) {
          actions.push(
            new LoadDataFileHdr(dataFile.id)
          );
        }
        if (!dataFile.histLoaded && !dataFile.histLoading) {
          actions.push(
            new LoadImageHist(dataFile.id)
          );
        }


        let cancel$ = this.actions$.pipe(
          ofActionDispatched(SetViewerFile)
        )

        let loadFail$ = this.actions$.pipe(
          ofActionDispatched(LoadDataFileHdrFail, LoadImageHistFail),
          filter<LoadDataFileHdrFail | LoadImageHistFail>(action => action.fileId == fileId)
        )

        let hdrLoaded$ = this.actions$.pipe(
          ofActionDispatched(LoadDataFileHdrSuccess),
          filter(action => action.fileId == fileId)
        )

        let histLoaded$ = this.actions$.pipe(
          ofActionDispatched(LoadImageHistSuccess),
          filter(action => action.fileId == fileId)
        )

        let next$ = combineLatest(hdrLoaded$, histLoaded$).pipe(
          takeUntil(merge(cancel$, loadFail$)),
          filter(action => {
            let files = this.store.selectSnapshot(DataFilesState.getEntities);
            return files[fileId].headerLoaded && (files[fileId] as ImageFile).histLoaded;
          }),
          take(1),
          flatMap(action => dispatch(new SetViewerFile(viewerIndex, fileId)))
        )

        return merge(dispatch(actions), next$);
      }
    }
  }

  @Action(SetViewerSyncEnabled)
  @ImmutableContext()
  public setViewerSyncEnabled({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { value }: SetViewerSyncEnabled) {
    setState((state: WorkbenchStateModel) => {
      state.viewerSyncEnabled = value;
      return state;
    });

    let state = getState();
    let activeViewer = WorkbenchState.getActiveViewer(state);
    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);

    let actions = [];
    let referenceFile = dataFiles[state.viewers[state.activeViewerIndex].fileId] as ImageFile;
    let files = state.viewers
      .filter(
        (viewer, index) =>
          index != state.activeViewerIndex && viewer.fileId !== null
      )
      .map(viewer => dataFiles[viewer.fileId] as ImageFile);
    if (referenceFile && files.length != 0) {
      if (state.viewerSyncEnabled)
        actions.push(
          new SyncFileTransformations(referenceFile, files)
        );
    }

    return dispatch(actions);
  }

  @Action(SetNormalizationSyncEnabled)
  @ImmutableContext()
  public setNormalizationSyncEnabled({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { value }: SetNormalizationSyncEnabled) {
    setState((state: WorkbenchStateModel) => {
      state.normalizationSyncEnabled = value;
      return state;
    });
  }

  @Action(SetPlotterSyncEnabled)
  @ImmutableContext()
  public setPlotterSyncEnabled({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { value }: SetPlotterSyncEnabled) {
    setState((state: WorkbenchStateModel) => {
      state.plotterSyncEnabled = value;
      return state;
    });
  }

  @Action(SetPlotMode)
  @ImmutableContext()
  public setPlotMode({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { mode }: SetPlotMode) {
    setState((state: WorkbenchStateModel) => {
      state.plotterMode = mode;
      return state;
    });
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

  @Action(SetShowAllSources)
  @ImmutableContext()
  public setShowAllSources({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { showAllSources }: SetShowAllSources) {
    setState((state: WorkbenchStateModel) => {
      state.showAllSources = showAllSources;
      return state;
    });
  }

  @Action(UpdateCentroidSettings)
  @ImmutableContext()
  public updateCentroidSettings({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { changes }: UpdateCentroidSettings) {
    setState((state: WorkbenchStateModel) => {
      state.centroidSettings = {
        ...state.centroidSettings,
        ...changes
      }
      return state;
    });
  }

  @Action(UpdatePlotterSettings)
  @ImmutableContext()
  public updatePlotterSettings({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { changes }: UpdatePlotterSettings) {
    setState((state: WorkbenchStateModel) => {
      state.plotterSettings = {
        ...state.plotterSettings,
        ...changes
      }
      return state;
    });
  }

  @Action(UpdatePhotSettings)
  @ImmutableContext()
  public updatePhotSettings({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { changes }: UpdatePhotSettings) {
    setState((state: WorkbenchStateModel) => {
      state.photSettings = {
        ...state.photSettings,
        ...changes
      }
      return state;
    });
  }

  @Action(UpdateSourceExtractionSettings)
  @ImmutableContext()
  public updateSourceExtractionSettings({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { changes }: UpdateSourceExtractionSettings) {
    setState((state: WorkbenchStateModel) => {
      state.sourceExtractionSettings = {
        ...state.sourceExtractionSettings,
        ...changes
      }
      return state;
    });
  }


  @Action(SetSourceExtractionMode)
  @ImmutableContext()
  public setSourceExtractionMode({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { mode }: SetSourceExtractionMode) {
    setState((state: WorkbenchStateModel) => {
      state.sourceExtractorModeOption = mode;
      return state;
    });
  }

  @Action(SetSelectedCatalog)
  @ImmutableContext()
  public setSelectedCatalog({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { catalogId }: SetSelectedCatalog) {
    setState((state: WorkbenchStateModel) => {
      state.selectedCatalogId = catalogId;
      return state;
    });
  }

  @Action(SetSelectedFieldCal)
  @ImmutableContext()
  public setSelectedFieldCal({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { fieldCalId }: SetSelectedFieldCal) {
    setState((state: WorkbenchStateModel) => {
      state.selectedFieldCalId = fieldCalId;
      return state;
    });
  }

  @Action(UpdatePixelOpsFormData)
  @ImmutableContext()
  public updatePixelOpsFormData({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { data }: UpdatePixelOpsFormData) {
    setState((state: WorkbenchStateModel) => {
      state.pixelOpsFormData = {
        ...state.pixelOpsFormData,
        ...data
      }
      return state;
    });
  }

  @Action(UpdateAlignFormData)
  @ImmutableContext()
  public updateAlignFormData({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { data }: UpdateAlignFormData) {
    setState((state: WorkbenchStateModel) => {
      state.alignFormData = {
        ...state.alignFormData,
        ...data
      }
      return state;
    });
  }

  @Action(UpdateStackFormData)
  @ImmutableContext()
  public updateStackFormData({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { data }: UpdateStackFormData) {
    setState((state: WorkbenchStateModel) => {
      state.stackFormData = {
        ...state.stackFormData,
        ...data
      }
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
  public loadLibrarySuccess({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { dataFiles, correlationId }: LoadLibrarySuccess) {
    let state = getState();
    let existingIds = this.store.selectSnapshot(ImageFilesState.getIds);
    let newIds = dataFiles.filter(dataFile => dataFile.type == DataFileType.IMAGE)
      .map(imageFile => imageFile.id)
      .filter(id => !existingIds.includes(id));

    dispatch(new InitializeImageFileState(newIds));

    let activeViewer = WorkbenchState.getActiveViewer(state);
    if (
      !activeViewer ||
      !activeViewer.fileId ||
      (dataFiles.map(f => f.id).indexOf(activeViewer.fileId) == -1 &&
        dataFiles.length != 0)
    ) {
      if (dataFiles[0]) {
        dispatch(new SelectDataFile(dataFiles[0].id));
      }
    }

  }

  @Action(RemoveDataFileSuccess)
  @ImmutableContext()
  public removeDataFileSuccess({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { fileId }: RemoveDataFileSuccess) {
    setState((state: WorkbenchStateModel) => {
      if (state.selectedFileId == fileId) state.selectedFileId = null;
      state.alignFormData.selectedImageFileIds = state.alignFormData.selectedImageFileIds.filter(fileId => fileId != fileId);
      state.pixelOpsFormData.imageFileIds = state.pixelOpsFormData.imageFileIds.filter(fileId => fileId != fileId);
      state.pixelOpsFormData.auxImageFileIds = state.pixelOpsFormData.auxImageFileIds.filter(fileId => fileId != fileId);
      state.pixelOpsFormData.auxImageFileId = state.pixelOpsFormData.auxImageFileId == fileId ? null : state.pixelOpsFormData.auxImageFileId;
      return state;
    });


    let state = getState();
    let activeViewer = WorkbenchState.getActiveViewer(state);

    if (activeViewer && activeViewer.fileId == fileId) {
      dispatch(new SelectDataFile(null));
    }
  }

  @Action(SelectDataFile)
  @ImmutableContext()
  public selectDataFile({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { fileId }: SelectDataFile) {
    let state = getState();
    let activeViewer = WorkbenchState.getActiveViewer(state);
    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);

    if (fileId != null) {
      let dataFile = dataFiles[fileId];
      if (state.viewers.length != 0) {
        if (!activeViewer) {
          dispatch(new SetActiveViewer(0));
        }
        else if (activeViewer.fileId != dataFile.id) {
          dispatch(new SetViewerFile(state.viewers.indexOf(activeViewer), dataFile.id));
        }
      }
    }

    setState((state: WorkbenchStateModel) => {
      state.selectedFileId = fileId;
      return state;
    });

  }






  @Action([MoveBy, ZoomBy, RotateBy, Flip, ResetImageTransform, SetViewportTransform, SetImageTransform])
  @ImmutableContext()
  public onTransformChange({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { fileId }: MoveBy | ZoomBy | RotateBy | Flip | ResetImageTransform | SetViewportTransform | SetImageTransform) {
    let state = getState();
    let activeViewer = WorkbenchState.getActiveViewer(state);
    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);

    if (
      !state.viewerSyncEnabled ||
      !activeViewer ||
      activeViewer.fileId != fileId
    ) {
      return;
    }


    let referenceFile = dataFiles[activeViewer.fileId] as ImageFile;
    let files = state.viewers
      .filter(
        (viewer, index) =>
          index != state.activeViewerIndex && viewer.fileId !== null
      )
      .map(viewer => dataFiles[viewer.fileId] as ImageFile);

    return dispatch(new SyncFileTransformations(referenceFile, files));
  }


  @Action(UpdateNormalizer)
  @ImmutableContext()
  public onNormalizationChange({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { fileId, changes }: UpdateNormalizer) {
    let state = getState();
    let activeViewer = WorkbenchState.getActiveViewer(state);
    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);

    if (
      !state.normalizationSyncEnabled ||
      !activeViewer ||
      activeViewer.fileId != fileId
    )
      return;

    let referenceFile = dataFiles[activeViewer.fileId] as ImageFile;
    let files = state.viewers
      .filter(
        (viewer, index) =>
          index != state.activeViewerIndex && viewer.fileId !== null
      )
      .map(viewer => dataFiles[viewer.fileId] as ImageFile);

    return dispatch(new SyncFileNormalizations(referenceFile, files));
  }



  @Action([StartLine, UpdateLine, UpdatePlotterFileState])
  @ImmutableContext()
  public onPlotterChange({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { fileId }: StartLine | UpdateLine | UpdatePlotterFileState) {
    let state = getState();
    let activeViewer = WorkbenchState.getActiveViewer(state);
    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);

    if (
      !state.plotterSyncEnabled ||
      !activeViewer ||
      activeViewer.fileId != fileId
    )
      return;

    let referenceFile = dataFiles[activeViewer.fileId] as ImageFile;
    let files = state.viewers
      .filter(
        (viewer, index) =>
          index != state.activeViewerIndex && viewer.fileId !== null
      )
      .map(viewer => dataFiles[viewer.fileId] as ImageFile);


    return dispatch(new SyncFilePlotters(referenceFile, files));
  }

  @Action(SyncFileNormalizations)
  @ImmutableContext()
  public syncFileNormalizations({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { reference, files }: SyncFileNormalizations) {

    let state = getState();
    let imageFileStates = this.store.selectSnapshot(ImageFilesState.getImageFileStates);

    let srcFile: ImageFile = reference;
    if (!srcFile) return;

    let targetFiles: ImageFile[] = files;
    let srcNormalizer = imageFileStates[srcFile.id].normalization.normalizer;

    targetFiles.forEach(targetFile => {
      if (!targetFile || targetFile.id == srcFile.id) return;
      return dispatch(new UpdateNormalizer(targetFile.id, {
        ...srcNormalizer,
        peakPercentile: srcNormalizer.peakPercentile,
        backgroundPercentile: srcNormalizer.backgroundPercentile
      }));
    });
  }

  @Action(SyncFilePlotters)
  @ImmutableContext()
  public syncFilePlotters({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { reference, files }: SyncFilePlotters) {

    let state = getState();
    let imageFileStates = this.store.selectSnapshot(ImageFilesState.getImageFileStates);

    let srcFile: ImageFile = reference;
    let targetFiles: ImageFile[] = files;
    let srcPlotter = imageFileStates[srcFile.id].plotter;

    targetFiles.forEach(targetFile => {
      if (!targetFile || targetFile.id == srcFile.id) return;
      return dispatch(new UpdatePlotterFileState(targetFile.id, { ...srcPlotter }));
    });
  }

  @Action(SyncFileTransformations)
  @ImmutableContext()
  public syncFileTransformations({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { reference, files }: SyncFileTransformations) {

    let state = getState();
    let imageFileStates = this.store.selectSnapshot(ImageFilesState.getImageFileStates);

    let actions = [];
    let srcFile: ImageFile = reference;
    let targetFiles: ImageFile[] = files;

    if (!srcFile) return;

    let srcHasWcs = srcFile.wcs.isValid();
    let srcImageTransform =
      imageFileStates[srcFile.id].transformation.imageTransform;
    let srcViewportTransform =
      imageFileStates[srcFile.id].transformation.viewportTransform;

    targetFiles.forEach(targetFile => {
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
          let targetImageTransform = imageFileStates[srcFile.id].transformation.imageTransform.appended(srcToTargetTransform);
          actions.push(new SetImageTransform(targetFile.id, targetImageTransform));
          actions.push(new SetViewportTransform(targetFile.id, imageFileStates[srcFile.id].transformation.viewportTransform));
        }
      } else {
        let targetImageFileState = imageFileStates[targetFile.id];
        actions.push(
          new SetImageTransform(targetFile.id, srcImageTransform)
        );
        actions.push(
          new SetViewportTransform(targetFile.id, srcViewportTransform)
        );
      }
    });
    return dispatch(actions);
  }


  @Action(LoadCatalogs)
  @ImmutableContext()
  public loadCatalogs({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { }: LoadCatalogs) {
    return this.afterglowCatalogService.getCatalogs().pipe(
      tap(catalogs => {
        setState((state: WorkbenchStateModel) => {
          state.catalogs = catalogs;
          state.selectedCatalogId = catalogs.length != 0 ? catalogs[0].name : null
          return state;
        });
      }),
      flatMap(catalogs => {
        return dispatch(new LoadCatalogsSuccess(catalogs));

      }),
      catchError(err => {
        return dispatch(new LoadCatalogsFail(err));
      })
    );
  }

  @Action(LoadFieldCals)
  @ImmutableContext()
  public loadFieldCals({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { }: LoadFieldCals) {
    return this.afterglowFieldCalService.getFieldCals().pipe(
      tap(fieldCals => {
        setState((state: WorkbenchStateModel) => {
          state.fieldCals = fieldCals;
          state.selectedFieldCalId = state.selectedFieldCalId == null ? (fieldCals.length == 0 ? null : fieldCals[0].id) : state.selectedFieldCalId
          return state;
        });
      }),
      flatMap(fieldCals => {
        return dispatch(new LoadFieldCalsSuccess(fieldCals));

      }),
      catchError(err => {
        return dispatch(new LoadFieldCalsFail(err));
      })
    );
  }

  @Action(CreateFieldCal)
  @ImmutableContext()
  public createFieldCal({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { fieldCal }: CreateFieldCal) {
    return this.afterglowFieldCalService.createFieldCal(fieldCal).pipe(
      tap(fieldCal => {
        setState((state: WorkbenchStateModel) => {
          state.selectedFieldCalId = fieldCal.id;
          return state;
        });
      }),
      flatMap(fieldCal => {
        return dispatch([new CreateFieldCalSuccess(fieldCal), new LoadFieldCals()]);

      }),
      catchError(err => {
        return dispatch(new CreateFieldCalFail(err));
      })
    );
  }

  @Action(UpdateFieldCal)
  @ImmutableContext()
  public updateFieldCal({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { fieldCal }: UpdateFieldCal) {
    return this.afterglowFieldCalService.updateFieldCal(fieldCal).pipe(
      tap(fieldCal => {

      }),
      flatMap(fieldCal => {
        return dispatch([new UpdateFieldCalSuccess(fieldCal), new LoadFieldCals()]);

      }),
      catchError(err => {
        return dispatch(new UpdateFieldCalFail(err));
      })
    );
  }

  @Action(AddFieldCalSourcesFromCatalog)
  @ImmutableContext()
  public addFieldCalSourcesFromCatalog({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { fieldCalId, catalogQueryJob }: AddFieldCalSourcesFromCatalog) {
    let correlationId = this.correlationIdGenerator.next();
    let createJobAction = new CreateJob(catalogQueryJob, 1000, correlationId)
    let { jobCreated$, jobUpdated$, jobCompleted$ } = JobActionHandler.getJobStreams(correlationId, this.actions$);

    return merge(
      dispatch(createJobAction),
      jobCompleted$.pipe(
        tap(jobCompleted => {
          let result = jobCompleted.result as CatalogQueryJobResult;
          setState((state: WorkbenchStateModel) => {
            let fieldCal = state.fieldCals.find(c => c.id == fieldCalId);
            if (fieldCal) {
              fieldCal.catalogSources = fieldCal.catalogSources.concat(result.data);
            }
            return state;
          });
        })
      )
    );



    // let createJobCorrId = this.correlationIdGenerator.next();
    // let job = catalogQueryJob;

    // let createJobSuccess$ = this.actions$.pipe(
    //   ofActionDispatched(CreateJobSuccess),
    //   filter<CreateJobSuccess>(action => action.correlationId == createJobCorrId),
    //   tap(action => {

    //   }),
    //   flatMap(createJobSuccess => {
    //     let jobCompleted$ = this.actions$.pipe(
    //       ofActionDispatched(JobCompleted),
    //       filter<JobCompleted>(jobCompleted => jobCompleted.job.id == createJobSuccess.job.id),
    //       take(1),
    //       tap(jobCompleted => {
    //         let result = jobCompleted.result as CatalogQueryJobResult;
    //         setState((state: WorkbenchStateModel) => {
    //           let fieldCal = state.fieldCals.find(c => c.id == fieldCalId);
    //           if (fieldCal) {
    //             fieldCal.catalogSources = fieldCal.catalogSources.concat(result.data);
    //           }
    //           return state;
    //         });
    //       })
    //     )

    //     let jobUpdated$ = this.actions$.pipe(
    //       ofActionDispatched(UpdateJobSuccess),
    //       filter<UpdateJobSuccess>(updateJobSuccess => updateJobSuccess.job.id == createJobSuccess.job.id),
    //       takeUntil(jobCompleted$),
    //       tap(updateJobSuccess => {

    //       }),
    //       // flatMap(updateJobSuccess => {
    //       //   return dispatch(new ImportAssetsStatusUpdated(updateJobSuccess.job as BatchImportJob, correlationId))
    //       // })
    //     )

    //     return merge(jobUpdated$, jobCompleted$)
    //   })
    // )

    // let createJobFailure$ = this.actions$.pipe(
    //   ofActionDispatched(CreateJobFail),
    //   filter<CreateJobFail>(action => action.correlationId == createJobCorrId),
    //   tap(action => {

    //   }),
    //   // flatMap(action => {

    //   //   return dispatch(new ImportAssetsCompleted(assets, [], [`Unable to create the batch import job.  Please try again later: Error: ${action.error}`], correlationId));
    //   // })
    // )

    // // let importAssetsCanceled$ = this.actions$.pipe(
    // //   ofActionDispatched(ImportAssetsCancel),
    // //   filter<ImportAssetsCancel>(action => action.correlationId == correlationId),
    // //   take(1)
    // // );

    // let result$ = merge(createJobSuccess$, createJobFailure$).pipe(
    //   take(1),
    //   // takeUntil(importAssetsCanceled$)
    // );

    // return merge(dispatch(new CreateJob(job, 1000, createJobCorrId)), result$);
  }


  @Action(CreatePixelOpsJob)
  @ImmutableContext()
  public createPixelOpsJob({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { }: CreatePixelOpsJob) {
    let state = getState();
    let correlationId = this.correlationIdGenerator.next();
    let dataFiles = this.store.selectSnapshot(DataFilesState.getDataFiles);
    let data = state.pixelOpsFormData;
    let imageFiles = data.imageFileIds.map(id => dataFiles.find(f => f.id == id)).filter(f => f != null);
    let auxFileIds: number[] = [];
    let op;
    if (data.mode == 'scalar') {
      op = `img ${data.operand} ${data.scalarValue}`;
    }
    else {
      op = `img ${data.operand} aux_img`;
      auxFileIds.push(parseInt(data.auxImageFileId));
    }
    let job: PixelOpsJob = {
      type: JobType.PixelOps,
      id: null,
      file_ids: imageFiles.sort((a, b) => (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0).map(f => parseInt(f.id)),
      aux_file_ids: auxFileIds,
      op: op,
      inplace: data.inPlace
    };

    let createJobAction = new CreateJob(job, 1000, correlationId)
    let { jobCreated$, jobUpdated$, jobCompleted$ } = JobActionHandler.getJobStreams(correlationId, this.actions$);

    return merge(
      dispatch(createJobAction),
      jobCompleted$.pipe(
        filter(jobCompleted => jobCompleted.result.errors.length == 0),
        flatMap(jobCompleted => dispatch(new LoadLibrary()))
      )
    );


    // let createJobSuccess$ = this.actions$.pipe(
    //   ofActionDispatched(CreateJobSuccess),
    //   filter<CreateJobSuccess>(action => action.correlationId == createJobCorrId),
    //   flatMap(createJobSuccess => {
    //     return this.actions$.pipe(
    //       ofActionDispatched(JobCompleted),
    //       filter<JobCompleted>(jobCompleted => jobCompleted.job.id == createJobSuccess.job.id),
    //       take(1),
    //       filter(jobCompleted => jobCompleted.result.errors.length == 0),
    //       flatMap(jobCompleted => dispatch(new LoadLibrary()))
    //     );
    //   })
    // )

    // let createJobFailure$ = this.actions$.pipe(
    //   ofActionDispatched(CreateJobFail),
    //   filter<CreateJobFail>(action => action.correlationId == createJobCorrId),
    // )

    // let result$ = merge(createJobSuccess$, createJobFailure$).pipe(
    //   take(1),
    // );

    // return merge(dispatch(new CreateJob(job, 1000, createJobCorrId)), result$);
  }

  @Action(CreateAdvPixelOpsJob)
  @ImmutableContext()
  public createAdvPixelOpsJob({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { }: CreateAdvPixelOpsJob) {
    let state = getState();
    let correlationId = this.correlationIdGenerator.next();
    let dataFiles = this.store.selectSnapshot(DataFilesState.getDataFiles);

    let data = state.pixelOpsFormData;
    let imageFiles = data.imageFileIds.map(id => dataFiles.find(f => f.id == id)).filter(f => f != null);
    let auxImageFiles = data.auxImageFileIds.map(id => dataFiles.find(f => f.id == id)).filter(f => f != null);
    let job: PixelOpsJob = {
      type: JobType.PixelOps,
      id: null,
      file_ids: imageFiles.sort((a, b) => (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0).map(f => parseInt(f.id)),
      aux_file_ids: auxImageFiles.sort((a, b) => (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0).map(f => parseInt(f.id)),
      op: data.opString,
      inplace: data.inPlace
    };

    let createJobAction = new CreateJob(job, 1000, correlationId)
    let { jobCreated$, jobUpdated$, jobCompleted$ } = JobActionHandler.getJobStreams(correlationId, this.actions$);

    return merge(
      dispatch(createJobAction),
      jobCompleted$.pipe(
        filter(jobCompleted => jobCompleted.result.errors.length == 0),
        flatMap(jobCompleted => dispatch(new LoadLibrary()))
      )
    );


    // let createJobSuccess$ = this.actions$.pipe(
    //   ofActionDispatched(CreateJobSuccess),
    //   filter<CreateJobSuccess>(action => action.correlationId == createJobCorrId),
    //   flatMap(createJobSuccess => {
    //     return this.actions$.pipe(
    //       ofActionDispatched(JobCompleted),
    //       filter<JobCompleted>(jobCompleted => jobCompleted.job.id == createJobSuccess.job.id),
    //       take(1),
    //       filter(jobCompleted => jobCompleted.result.errors.length == 0),
    //       flatMap(jobCompleted => dispatch(new LoadLibrary()))
    //     );
    //   })
    // )

    // let createJobFailure$ = this.actions$.pipe(
    //   ofActionDispatched(CreateJobFail),
    //   filter<CreateJobFail>(action => action.correlationId == createJobCorrId),
    // )

    // let result$ = merge(createJobSuccess$, createJobFailure$).pipe(
    //   take(1),
    // );

    // return merge(dispatch(new CreateJob(job, 1000, createJobCorrId)), result$);
  }


  @Action(CreateAlignmentJob)
  @ImmutableContext()
  public createAlignmentJob({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { }: CreateAlignmentJob) {
    let state = getState();
    let correlationId = this.correlationIdGenerator.next();
    let data = state.alignFormData;
    let dataFiles = this.store.selectSnapshot(DataFilesState.getDataFiles);
    let imageFiles = data.selectedImageFileIds.map(id => dataFiles.find(f => f.id == id)).filter(f => f != null);

    let job: AlignmentJob = {
      type: JobType.Alignment,
      id: null,
      file_ids: imageFiles.sort((a, b) => (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0).map(f => parseInt(f.id)),
      inplace: data.inPlace
    };

    let createJobAction = new CreateJob(job, 1000, correlationId)
    let { jobCreated$, jobUpdated$, jobCompleted$ } = JobActionHandler.getJobStreams(correlationId, this.actions$);

    return merge(
      dispatch(createJobAction),
      jobCompleted$.pipe(
        filter(jobCompleted => jobCompleted.result.errors.length == 0),
        flatMap(jobCompleted => {
          let result = jobCompleted.result as AlignmentJobResult;
          let fileIds = result.file_ids.map(id => id.toString());
          let actions = [];
          actions.push(new ClearImageDataCache(fileIds));
          getState().viewers.forEach((viewer, index) => {
            if (fileIds.includes(viewer.fileId)) {
              actions.push(new SetViewerFile(index, viewer.fileId))
            }
          })

          return dispatch(actions);
        })
      )
    );
  }

  @Action(CreateStackingJob)
  @ImmutableContext()
  public createStackingJob({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { }: CreateStackingJob) {
    let state = getState();
    let correlationId = this.correlationIdGenerator.next();
    let data = state.stackFormData;
    let dataFiles = this.store.selectSnapshot(DataFilesState.getDataFiles);
    let imageFiles = data.selectedImageFileIds.map(id => dataFiles.find(f => f.id == id)).filter(f => f != null);
    let job: StackingJob = {
      type: JobType.Stacking,
      id: null,
      file_ids: imageFiles.sort((a, b) => (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0).map(f => parseInt(f.id)),
      stacking_settings: {
        mode: data.mode,
        scaling: data.scaling == 'none' ? null : data.scaling,
        rejection: data.rejection == 'none' ? null : data.rejection,
        percentile: data.percentile,
        lo: data.low,
        hi: data.high
      }
    };

    let createJobAction = new CreateJob(job, 1000, correlationId)
    let { jobCreated$, jobUpdated$, jobCompleted$ } = JobActionHandler.getJobStreams(correlationId, this.actions$);

    return merge(
      dispatch(createJobAction),
      jobCompleted$.pipe(
        filter(jobCompleted => jobCompleted.result.errors.length == 0),
        flatMap(jobCompleted => {
          return dispatch(new LoadLibrary());
        })
      )
    );
  }


  @Action(ImportFromSurvey)
  @ImmutableContext()
  public importFromSurvey({ getState, setState, dispatch }: StateContext<WorkbenchStateModel>, { surveyDataProviderId, raHours, decDegs, widthArcmins, heightArcmins, imageFileId, correlationId }: ImportFromSurvey) {
    let importFromSurveyCorrId = this.correlationIdGenerator.next();

    let importCompleted$ = this.actions$.pipe(
      ofActionDispatched(ImportAssetsCompleted),
      filter<ImportAssetsCompleted>(action => action.correlationId == importFromSurveyCorrId),
      flatMap(action => {
        return dispatch([
          new LoadLibrary(),
          new ImportFromSurveySuccess(),
          new SetViewMode(ViewMode.SPLIT_VERTICAL),
          new SetViewerFile(1, action.fileIds[0].toString())
        ])
      })
    )
    return merge(
      dispatch(new ImportAssets(
        surveyDataProviderId,
        [
          {
            name: "",
            collection: false,
            path: `DSS\\${raHours * 15},${decDegs}\\${widthArcmins},${heightArcmins}`,
            metadata: {}
          }
        ],
        importFromSurveyCorrId
      )),
      importCompleted$
    );
  }






}
