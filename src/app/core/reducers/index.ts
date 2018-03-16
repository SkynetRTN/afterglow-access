import { createSelector, createFeatureSelector } from '@ngrx/store';

import { DataFileType } from '../../data-files/models/data-file-type';
import { ImageFile } from '../../data-files/models/data-file';

import * as fromRoot from '../../reducers';
import * as fromWorkbench from './workbench';
// import * as fromComparer from './comparer';
import * as fromImageFileState from './image-file-state';
import * as fromDataFiles from '../../data-files/reducers';
import { ImageFileState } from '../models/image-file-state';
import { WorkbenchState } from '../models/workbench-state';


export const reducers = {
  imageFileGlobalState: fromImageFileState.reducer,
  workbenchGlobalState: fromWorkbench.reducer
};

export interface CoreState {
  imageFileGlobalState: fromImageFileState.State,
  workbenchGlobalState: WorkbenchState
}

export interface State extends fromRoot.State {
  'coreState': CoreState;
}

export const getCoreState = createFeatureSelector<CoreState>('coreState');

export const getImageFileGlobalState = createSelector(
  getCoreState,
  state => state.imageFileGlobalState
);

export const {
  selectIds: getImageFileStateIds,
  selectEntities: getImageFileStates,
  selectAll: getAllImageFileStates,
  selectTotal: getTotalImageFileStates,
} = fromImageFileState.adapter.getSelectors(getImageFileGlobalState);


export const getWorkbenchGlobalState = createSelector(
  getCoreState,
  state => state.workbenchGlobalState
);


const getWorkbenchActiveViewerIndex = createSelector(
  getWorkbenchGlobalState,
  fromWorkbench.getActiveViewerIndex
);

const getWorkbenchViewers = createSelector(
  getWorkbenchGlobalState,
  fromWorkbench.getViewers
);

const getWorkbenchViewMode = createSelector(
  getWorkbenchGlobalState,
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
  getViewerSyncAvailable: createSelector(getWorkbenchGlobalState, state => state.viewerSyncAvailable),
  getViewerSyncEnabled: createSelector(getWorkbenchGlobalState, state => state.viewerSyncEnabled),
  getSidebarView: createSelector(getWorkbenchGlobalState, state => state.sidebarView),
  getShowSidebar: createSelector(getWorkbenchGlobalState, state => state.showSidebar),
  getShowConfig: createSelector(getWorkbenchGlobalState, state => state.showConfig),
  getMultiFileSelectionEnabled: createSelector(getWorkbenchGlobalState, state => state.multiFileSelectionEnabled),
}
