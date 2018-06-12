import { createSelector, createFeatureSelector } from '@ngrx/store';

import { DataFileType } from '../../data-files/models/data-file-type';
import { ImageFile } from '../../data-files/models/data-file';

import * as fromRoot from '../../reducers';
import * as fromWorkbench from './workbench';
// import * as fromComparer from './comparer';
import * as fromImageFileState from './image-file-state';
import * as fromSources from './source';
import * as fromDataFiles from '../../data-files/reducers';
import { ImageFileState } from '../models/image-file-state';
import { WorkbenchState } from '../models/workbench-state';


export const reducers = {
  imageFileState: fromImageFileState.reducer,
  sourcesState: fromSources.reducer,
  workbenchState: fromWorkbench.reducer
};

export interface CoreState {
  imageFileState: fromImageFileState.State,
  workbenchState: WorkbenchState,
  sourcesState: fromSources.State
}

export interface State extends fromRoot.State {
  'coreState': CoreState;
}

export const getCoreState = createFeatureSelector<CoreState>('coreState');

export const getImageFileGlobalState = createSelector(
  getCoreState,
  state => state.imageFileState
);

export const {
  selectIds: getImageFileStateIds,
  selectEntities: getImageFileStates,
  selectAll: getAllImageFileStates,
  selectTotal: getTotalImageFileStates,
} = fromImageFileState.adapter.getSelectors(getImageFileGlobalState);



export const getSourcesGlobalState = createSelector(
  getCoreState,
  state => state.sourcesState
);

export const {
  selectIds: getSourceIds,
  selectEntities: getSources,
  selectAll: getAllSources,
  selectTotal: getTotalSources,
} = fromSources.adapter.getSelectors(getSourcesGlobalState);

export const getSelectedSources = createSelector(
  getSourcesGlobalState,
  state => state.selectedSourceIds.map(sourceId => state.entities[sourceId])
);


export const getWorkbenchState = createSelector(
  getCoreState,
  state => state.workbenchState
);


const getWorkbenchActiveViewerIndex = createSelector(
  getWorkbenchState,
  fromWorkbench.getActiveViewerIndex
);



const getWorkbenchViewers = createSelector(
  getWorkbenchState,
  fromWorkbench.getViewers
);

const getWorkbenchViewMode = createSelector(
  getWorkbenchState,
  fromWorkbench.getViewMode
);

const getWorkbenchActiveViewer = createSelector(
  getWorkbenchActiveViewerIndex,
  getWorkbenchViewers,
  (index, viewers) => {
    return viewers[index];
  }
);

const getWorkbenchActiveViewerFileId = createSelector(
  getWorkbenchActiveViewer,
  (viewer) => {
    return viewer.fileId;
  }
)

const getWorkbenchActiveViewerFile = createSelector(
  getWorkbenchActiveViewerFileId,
  fromDataFiles.getDataFiles,
  (fileId, dataFiles) => {
    return dataFiles[fileId] as ImageFile;
  }
)

const getWorkbenchActiveViewerFileState = createSelector(
  getWorkbenchActiveViewerFileId,
  getImageFileStates,
  (fileId, fileStates) => {
    return fileStates[fileId];
  }
);

export const workbench = {
  getViewers: getWorkbenchViewers,
  getViewMode: getWorkbenchViewMode,
  getActiveViewerIndex: getWorkbenchActiveViewerIndex,
  getActiveViewer: getWorkbenchActiveViewer,
  getActiveFileId: getWorkbenchActiveViewerFileId,
  getActiveFile: getWorkbenchActiveViewerFile,
  getActiveFileState: getWorkbenchActiveViewerFileState,
  getViewerSyncEnabled: createSelector(getWorkbenchState, state => state.viewerSyncEnabled),
  getPlotterSyncEnabled: createSelector(getWorkbenchState, state => state.plotterSyncEnabled),
  getNormalizationSyncEnabled: createSelector(getWorkbenchState, state => state.normalizationSyncEnabled),
  getSidebarView: createSelector(getWorkbenchState, state => state.sidebarView),
  getShowSidebar: createSelector(getWorkbenchState, state => state.showSidebar),
  getShowConfig: createSelector(getWorkbenchState, state => state.showConfig),
  getActiveTool: createSelector(getWorkbenchState, state => state.activeTool),
  getMultiFileSelectionEnabled: createSelector(getWorkbenchState, state => state.multiFileSelectionEnabled),
  getShowAllSources: createSelector(getWorkbenchState, state => state.showAllSources),
}
