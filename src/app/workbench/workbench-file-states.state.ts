import {
  State,
  Action,
  Selector,
  StateContext,
  Store,
  Actions,
} from "@ngxs/store";
import {
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
} from "./workbench-file-states.actions";
import {
  WorkbenchImageHduState,
  IWorkbenchHduState,
  WorkbenchFileState,
} from "./models/workbench-file-state";
import {
  LoadHduHeaderSuccess,
  CloseHduSuccess,
  CloseDataFileSuccess,
  CenterRegionInViewport,
} from "../data-files/data-files.actions";
import { ImmutableContext } from "@ngxs-labs/immer-adapter";
import { HduType } from "../data-files/models/data-file-type";
import { SonifierRegionMode } from "./models/sonifier-file-state";
import {
  getHeight,
  getWidth,
  ImageHdu,
} from "../data-files/models/data-file";
import {
  DataFilesState,
} from "../data-files/data-files.state";
import { AfterglowDataFileService } from "./services/afterglow-data-files";
import { CorrelationIdGenerator } from "../utils/correlated-action";
import { ResetState } from "../auth/auth.actions";
import { PlottingPanelState } from './models/plotter-file-state';

export interface WorkbenchFileStatesModel {
  version: number;
  fileIds: string[];
  fileStateEntities: { [id: string]: WorkbenchFileState };
  hduIds: string[];
  hduStateEntities: { [id: string]: IWorkbenchHduState };
  nextMarkerId: number;
  nextPlottingPanelStateId: number,
  plottingPanelStateIds: string[];
  plottingPanelStateEntities: { [id: string]: PlottingPanelState };
}

const defaultWorkbenchHduStatesModel: WorkbenchFileStatesModel = {
  version: 1,
  hduIds: [],
  hduStateEntities: {},
  fileIds: [],
  fileStateEntities: {},
  nextPlottingPanelStateId: 0,
  plottingPanelStateEntities: {},
  plottingPanelStateIds: [],
  nextMarkerId: 0,
};

@State<WorkbenchFileStatesModel>({
  name: "workbenchFileStates",
  defaults: defaultWorkbenchHduStatesModel,
})
export class WorkbenchFileStates {
  constructor(
    private store: Store,
    private afterglowDataFileService: AfterglowDataFileService,
    private correlationIdGenerator: CorrelationIdGenerator,
    private actions$: Actions
  ) {}

  @Selector()
  public static getState(state: WorkbenchFileStatesModel) {
    return state;
  }

  @Selector()
  public static getFileStateEntities(state: WorkbenchFileStatesModel) {
    return state.fileStateEntities;
  }

  @Selector()
  public static getFileIds(state: WorkbenchFileStatesModel) {
    return state.fileIds;
  }

  @Selector()
  public static getFileStates(state: WorkbenchFileStatesModel) {
    return Object.values(state.fileStateEntities);
  }

  @Selector()
  public static getFileState(state: WorkbenchFileStatesModel) {
    return (fileId: string) => {
      return fileId in state.fileStateEntities
        ? state.fileStateEntities[fileId]
        : null;
    };
  }

  @Selector()
  public static getHduStateEntities(state: WorkbenchFileStatesModel) {
    return state.hduStateEntities;
  }

  @Selector()
  public static getHduIds(state: WorkbenchFileStatesModel) {
    return state.hduIds;
  }

  @Selector()
  public static getHduStates(state: WorkbenchFileStatesModel) {
    return Object.values(state.hduStateEntities);
  }

  @Selector()
  public static getHduState(state: WorkbenchFileStatesModel) {
    return (hduId: string) => {
      return hduId in state.hduStateEntities
        ? state.hduStateEntities[hduId]
        : null;
    };
  }

  @Selector()
  public static getPlottingPanelStateEntities(state: WorkbenchFileStatesModel) {
    return state.plottingPanelStateEntities;
  }

  @Selector()
  public static getPlottingPanelStateIds(state: WorkbenchFileStatesModel) {
    return state.plottingPanelStateIds;
  }

  @Selector()
  public static getPlottingPanelStates(state: WorkbenchFileStatesModel) {
    return Object.values(state.plottingPanelStateEntities);
  }

  @Selector()
  public static getPlottingPanelState(state: WorkbenchFileStatesModel) {
    return (plottingPanelStateId: string) => {
      return state.plottingPanelStateEntities[plottingPanelStateId];
    };
  }

  @Selector()
  public static getSonificationPanelState(state: WorkbenchFileStatesModel) {
    return (hduId: string) => {
      if (
        !(hduId in state.hduStateEntities) ||
        state.hduStateEntities[hduId].hduType != HduType.IMAGE
      )
        return null;
      return (state.hduStateEntities[hduId] as WorkbenchImageHduState)
        .sonificationPanelState;
    };
  }

  @Selector()
  public static getPhotometryPanelState(state: WorkbenchFileStatesModel) {
    return (hduId: string) => {
      if (
        !(hduId in state.hduStateEntities) ||
        state.hduStateEntities[hduId].hduType != HduType.IMAGE
      )
        return null;
      return (state.hduStateEntities[hduId] as WorkbenchImageHduState)
        .photometryPanelState;
    };
  }

  @Selector()
  public static getCustomMarkerPanelState(state: WorkbenchFileStatesModel) {
    return (hduId: string) => {
      if (
        !(hduId in state.hduStateEntities) ||
        state.hduStateEntities[hduId].hduType != HduType.IMAGE
      )
        return null;
      return (state.hduStateEntities[hduId] as WorkbenchImageHduState)
        .customMarkerPanelState;
    };
  }

  @Action(ResetState)
  @ImmutableContext()
  public resetState(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    {}: ResetState
  ) {
    setState((state: WorkbenchFileStatesModel) => {
      return defaultWorkbenchHduStatesModel;
    });
  }

  @Action(InitializeWorkbenchHduState)
  @ImmutableContext()
  public initializeWorkbenchHduState(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduIds }: InitializeWorkbenchHduState
  ) {
    setState((state: WorkbenchFileStatesModel) => {
      hduIds.forEach((hduId) => {
        let hduEntities = this.store.selectSnapshot(
          DataFilesState.getHduEntities
        );
        if (!(hduId in hduEntities)) return;
        let hdu = hduEntities[hduId];

        //initialize HDU states
        let hduState: IWorkbenchHduState = {
          id: hdu.id,
          hduType: hdu.hduType,
        };

        if (hdu.hduType == HduType.IMAGE) {
          let plottingPanelStateId = `PLOTTING_PANEL_${state.nextPlottingPanelStateId++}`
          state.plottingPanelStateEntities[plottingPanelStateId] = {
            measuring: false,
            lineMeasureStart: null,
            lineMeasureEnd: null,
          }
          state.plottingPanelStateIds.push(plottingPanelStateId);

          hduState = {
            ...hduState,
            plottingPanelStateId: plottingPanelStateId,
            sonificationPanelState: {
              sonificationUri: null,
              regionHistory: [],
              regionHistoryIndex: null,
              regionHistoryInitialized: false,
              regionMode: SonifierRegionMode.VIEWPORT,
              viewportSync: true,
              duration: 10,
              toneCount: 22,
              progressLine: null,
            },
            photometryPanelState: {
              sourceExtractionJobId: null,
              sourcePhotometryData: {},
            },
            customMarkerPanelState: {
              entities: {},
              ids: [],
            },
          } as WorkbenchImageHduState;
        } else if (hdu.hduType == HduType.TABLE) {
        }

        state.hduStateEntities[hduState.id] = hduState;
        state.hduIds.push(hdu.id);

        let fileEntities = this.store.selectSnapshot(
          DataFilesState.getDataFileEntities
        );
        if (!(hdu.fileId in fileEntities)) return;
        let file = fileEntities[hdu.fileId];

        if (file.id in state.fileStateEntities) return;

        let plottingPanelStateId = `PLOTTING_PANEL_${state.nextPlottingPanelStateId++}`
        state.plottingPanelStateEntities[plottingPanelStateId] = {
          measuring: false,
          lineMeasureStart: null,
          lineMeasureEnd: null,
        }
        state.plottingPanelStateIds.push(plottingPanelStateId);
        
        state.fileStateEntities[file.id] = {
          id: file.id,
          plottingPanelStateId: plottingPanelStateId,
        };
        state.fileIds.push(file.id);
      });

      return state;
    });
  }

  @Action(CloseDataFileSuccess)
  @ImmutableContext()
  public closeDataFileSuccess(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { fileId }: CloseDataFileSuccess
  ) {
    setState((state: WorkbenchFileStatesModel) => {
      state.fileIds = state.fileIds.filter((id) => id != fileId);
      if (fileId in state.fileStateEntities)
        delete state.fileStateEntities[fileId];
      return state;
    });
  }

  @Action(CloseHduSuccess)
  @ImmutableContext()
  public closeHduSuccess(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId }: CloseHduSuccess
  ) {
    setState((state: WorkbenchFileStatesModel) => {
      state.hduIds = state.hduIds.filter((id) => id != hduId);
      if (hduId in state.hduStateEntities) delete state.hduStateEntities[hduId];
      return state;
    });
  }

 
  @Action(LoadHduHeaderSuccess)
  @ImmutableContext()
  public loadDataFileHdrSuccess(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId, header }: LoadHduHeaderSuccess
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[
      hduId
    ] as ImageHdu;
    let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
    let sonifierState = hduState.sonificationPanelState;
    
    if (!sonifierState.regionHistoryInitialized) {
      dispatch(
        new AddRegionToHistory(hduId, {
          x: 0,
          y: 0,
          width: getWidth(hdu),
          height: getHeight(hdu),
        })
      );
    }
  }

  @Action([AddRegionToHistory, UndoRegionSelection, RedoRegionSelection])
  @ImmutableContext()
  public regionHistoryChanged(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId }: AddRegionToHistory | UndoRegionSelection | RedoRegionSelection
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[
      hduId
    ] as ImageHdu;
    let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
    if (
      hduState.sonificationPanelState.regionMode == SonifierRegionMode.CUSTOM
    ) {
      dispatch(new SonificationRegionChanged(hduId));
    }
  }

  

  @Action(UpdateSonifierFileState)
  @ImmutableContext()
  public updateSonifierFileState(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId, changes }: UpdateSonifierFileState
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      hduState.sonificationPanelState = {
        ...hduState.sonificationPanelState,
        ...changes,
      };

      dispatch(new SonificationRegionChanged(hduId));

      return state;
    });
  }

  @Action(AddRegionToHistory)
  @ImmutableContext()
  public addRegionToHistory(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId, region }: AddRegionToHistory
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let sonifierState = hduState.sonificationPanelState;
      if (!sonifierState.regionHistoryInitialized) {
        sonifierState.regionHistoryIndex = 0;
        sonifierState.regionHistory = [region];
        sonifierState.regionHistoryInitialized = true;
      } else {
        sonifierState.regionHistory = [
          ...sonifierState.regionHistory.slice(
            0,
            sonifierState.regionHistoryIndex + 1
          ),
          region,
        ];
        sonifierState.regionHistoryIndex++;
      }
      return state;
    });
  }

  @Action(UndoRegionSelection)
  @ImmutableContext()
  public undoRegionSelection(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId }: UndoRegionSelection
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let sonifierState = hduState.sonificationPanelState;
      if (
        !sonifierState.regionHistoryInitialized ||
        sonifierState.regionHistoryIndex == 0
      )
        return state;
      sonifierState.regionHistoryIndex--;
      return state;
    });
  }

  @Action(RedoRegionSelection)
  @ImmutableContext()
  public redoRegionSelection(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId }: RedoRegionSelection
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let sonifierState = hduState.sonificationPanelState;
      if (
        !sonifierState.regionHistoryInitialized ||
        sonifierState.regionHistoryIndex ==
          sonifierState.regionHistory.length - 1
      )
        return state;
      sonifierState.regionHistoryIndex++;
      return state;
    });
  }

  @Action(ClearRegionHistory)
  @ImmutableContext()
  public clearRegionHistory(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId }: ClearRegionHistory
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let sonifierState = hduState.sonificationPanelState;
      if (
        !sonifierState.regionHistoryInitialized ||
        sonifierState.regionHistoryIndex ==
          sonifierState.regionHistory.length - 1
      )
        return state;
      sonifierState.regionHistoryIndex = null;
      sonifierState.regionHistory = [];
      sonifierState.regionHistoryInitialized = false;
      return state;
    });
  }

  @Action(SetProgressLine)
  @ImmutableContext()
  public setProgressLine(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId, line }: SetProgressLine
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let sonifierState = hduState.sonificationPanelState;
      sonifierState.progressLine = line;
      return state;
    });
  }

  @Action(UpdatePhotometryFileState)
  @ImmutableContext()
  public updatePhotometryFileState(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId, changes }: UpdatePhotometryFileState
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      hduState.photometryPanelState = {
        ...hduState.photometryPanelState,
        ...changes,
      };
      return state;
    });
  }

  @Action(StartLine)
  @ImmutableContext()
  public startLine(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { plottingPanelStateId, point }: StartLine
  ) {
    let state = getState();
    if (!(plottingPanelStateId in state.plottingPanelStateEntities)) {
      return;
    }
     

    setState((state: WorkbenchFileStatesModel) => {
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
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { plottingPanelStateId, point }: UpdateLine
  ) {
    let state = getState();
    if (!(plottingPanelStateId in state.plottingPanelStateEntities)) {
      return;
    }

    setState((state: WorkbenchFileStatesModel) => {
      let plottingPanelState = state.plottingPanelStateEntities[plottingPanelStateId];
      if (!plottingPanelState.measuring) return state;

      plottingPanelState.lineMeasureEnd = point;

      return state;
    });
  }

  @Action(UpdatePlottingPanelState)
  @ImmutableContext()
  public updatePlotterFileState(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { plottingPanelStateId, changes }: UpdatePlottingPanelState
  ) {
    let state = getState();
    if (!(plottingPanelStateId in state.plottingPanelStateEntities)) {
      return;
    }

    setState((state: WorkbenchFileStatesModel) => {
      let plottingPanelState = state.plottingPanelStateEntities[plottingPanelStateId];

      plottingPanelState = {
        ...plottingPanelState,
        ...changes,
      };
      return state;
    });
  }

  /*  Custom Markers */
  @Action(UpdateCustomMarker)
  @ImmutableContext()
  public updateCustomMarker(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId, markerId, changes }: UpdateCustomMarker
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[
        hduId
      ] as ImageHdu;
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let markerState = hduState.customMarkerPanelState;
      if (markerState.ids.includes(markerId)) {
        markerState.entities[markerId] = {
          ...markerState.entities[markerId],
          ...changes,
        };
      }
      return state;
    });
  }

  @Action(AddCustomMarkers)
  @ImmutableContext()
  public addCustomMarkers(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId, markers }: AddCustomMarkers
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[
        hduId
      ] as ImageHdu;
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let markerState = hduState.customMarkerPanelState;

      markers.forEach((marker) => {
        let nextSeed = state.nextMarkerId++;
        if (marker.label == null || marker.label == undefined) {
          // marker.marker.label = `M${nextSeed}`;
          marker.label = "";
        }
        let id = `CUSTOM_MARKER_${hdu.fileId}_${hduId}_${nextSeed.toString()}`;
        markerState.ids.push(id);
        markerState.entities[id] = {
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
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId, markers }: RemoveCustomMarkers
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[
        hduId
      ] as ImageHdu;
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let markerState = hduState.customMarkerPanelState;

      let idsToRemove = markers.map((m) => m.id);
      markerState.ids = markerState.ids.filter(
        (id) => !idsToRemove.includes(id)
      );
      markers.forEach((marker) => {
        if (marker.id in markerState.entities)
          delete markerState.entities[marker.id];
      });

      return state;
    });
  }

  @Action(SelectCustomMarkers)
  @ImmutableContext()
  public selectCustomMarkers(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId, markers }: SelectCustomMarkers
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[
        hduId
      ] as ImageHdu;
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let markerState = hduState.customMarkerPanelState;
      markers.forEach((marker) => {
        if (markerState.ids.includes(marker.id)) {
          markerState.entities[marker.id].selected = true;
        }
      });
      return state;
    });
  }

  @Action(DeselectCustomMarkers)
  @ImmutableContext()
  public deselectCustomMarkers(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId, markers }: DeselectCustomMarkers
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[
        hduId
      ] as ImageHdu;
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let markerState = hduState.customMarkerPanelState;
      markers.forEach((marker) => {
        if (markerState.ids.includes(marker.id)) {
          markerState.entities[marker.id].selected = false;
        }
      });
      return state;
    });
  }

  @Action(SetCustomMarkerSelection)
  @ImmutableContext()
  public setCustomMarkerSelection(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { hduId, markers }: SetCustomMarkerSelection
  ) {
    let state = getState();
    if (
      !(hduId in state.hduStateEntities) ||
      state.hduStateEntities[hduId].hduType != HduType.IMAGE
    )
      return;

    setState((state: WorkbenchFileStatesModel) => {
      let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[
        hduId
      ] as ImageHdu;
      let hduState = state.hduStateEntities[hduId] as WorkbenchImageHduState;
      let markerState = hduState.customMarkerPanelState;

      let selectedMarkerIds = markers.map((m) => m.id);
      markerState.ids.forEach((markerId) => {
        markerState.entities[markerId].selected = selectedMarkerIds.includes(
          markerId
        );
      });
      return state;
    });
  }

  @Action(AddPhotDatas)
  @ImmutableContext()
  public addPhotDatas(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { photDatas }: AddPhotDatas
  ) {
    setState((state: WorkbenchFileStatesModel) => {
      photDatas.forEach((d) => {
        if (
          !d.hduId ||
          !(d.hduId in state.hduStateEntities) ||
          state.hduStateEntities[d.hduId].hduType != HduType.IMAGE ||
          !d.sourceId
        )
          return;
        let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[
          d.hduId
        ] as ImageHdu;
        let hduState = state.hduStateEntities[
          d.hduId
        ] as WorkbenchImageHduState;
        let photometryPanelState = hduState.photometryPanelState;
        photometryPanelState.sourcePhotometryData[d.sourceId] = d;
      });

      return state;
    });
  }

  @Action(RemoveAllPhotDatas)
  @ImmutableContext()
  public removeAllPhotDatas(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    {}: RemoveAllPhotDatas
  ) {
    setState((state: WorkbenchFileStatesModel) => {
      state.hduIds.forEach((hduId) => {
        if (state.hduStateEntities[hduId].hduType != HduType.IMAGE) return;
        (state.hduStateEntities[
          hduId
        ] as WorkbenchImageHduState).photometryPanelState.sourcePhotometryData = {};
      });
      return state;
    });
  }

  @Action(RemovePhotDatas)
  @ImmutableContext()
  public removePhotDatas(
    { getState, setState, dispatch }: StateContext<WorkbenchFileStatesModel>,
    { sourceId }: RemovePhotDatas
  ) {
    setState((state: WorkbenchFileStatesModel) => {
      state.hduIds.forEach((hduId) => {
        if (state.hduStateEntities[hduId].hduType != HduType.IMAGE) return;
        let photometryPanelState = (state.hduStateEntities[
          hduId
        ] as WorkbenchImageHduState).photometryPanelState;
        if (sourceId in photometryPanelState.sourcePhotometryData) {
          delete photometryPanelState.sourcePhotometryData[sourceId];
        }
      });
      return state;
    });
  }
}
