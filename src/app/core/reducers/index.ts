import { createSelector, createFeatureSelector } from '@ngrx/store';

import { DataFileType } from '../../data-files/models/data-file-type';
import { ImageFile } from '../../data-files/models/data-file';

import * as fromRoot from '../../reducers';
import * as fromWorkbench from './workbench';
// import * as fromComparer from './comparer';
import * as fromViewer from './viewer';
import * as fromPlotter from './plotter';
import * as fromSonifier from './sonifier';
import * as fromSourceExtractor from './source-extractor';
import * as fromDataFiles from '../../data-files/reducers';


export const reducers = {
  viewerGlobalState: fromViewer.reducer,
  plotterGlobalState: fromPlotter.reducer,
  sonifierGlobalState: fromSonifier.reducer,
  sourceExtractorGlobalState: fromSourceExtractor.reducer,
  workbenchGlobalState: fromWorkbench.reducer
};

export interface CoreState {
  viewerGlobalState: fromViewer.State,
  plotterGlobalState: fromPlotter.State,
  sonifierGlobalState: fromSonifier.State,
  sourceExtractorGlobalState: fromSourceExtractor.State,
  workbenchGlobalState: fromWorkbench.State
}

export interface State extends fromRoot.State {
  'coreState': CoreState;
}

export const getCoreState = createFeatureSelector<CoreState>('coreState');

export const getViewerGlobalState = createSelector(
  getCoreState,
  state => state.viewerGlobalState
);

export const {
  selectIds: getViewerFileStateIds,
  selectEntities: getViewerFileStates,
  selectAll: getAllViewerFileStates,
  selectTotal: getTotalViewerFileStates,
} = fromViewer.adapter.getSelectors(getViewerGlobalState);

export const getPlotterGlobalState = createSelector(
  getCoreState,
  state => state.plotterGlobalState
);

export const {
  selectIds: getPlotterFileStateIds,
  selectEntities: getPlotterFileStates,
  selectAll: getAllPlotterFileStates,
  selectTotal: getTotalPlotterFileStates,
} = fromPlotter.adapter.getSelectors(getPlotterGlobalState);

export const getSonifierGlobalState = createSelector(
  getCoreState,
  state => state.sonifierGlobalState
);

export const {
  selectIds: getSonifierFileStateIds,
  selectEntities: getSonifierFileStates,
  selectAll: getAllSonifierFileStates,
  selectTotal: getTotalSonifierFileStates,
} = fromSonifier.adapter.getSelectors(getSonifierGlobalState);

export const getSourceExtractorGlobalState = createSelector(
  getCoreState,
  state => state.sourceExtractorGlobalState
);

export const {
  selectIds: getSourceExtractorFileStateIds,
  selectEntities: getSourceExtractorFileStates,
  selectAll: getAllSourceExtractorFileStates,
  selectTotal: getTotalSourceExtractorFileStates,
} = fromSourceExtractor.adapter.getSelectors(getSourceExtractorGlobalState);



export const getWorkbenchGlobalState = createSelector(
  getCoreState,
  state => state.workbenchGlobalState
);


const getWorkbenchSelectedFileId = createSelector(
  getWorkbenchGlobalState,
  fromWorkbench.getSelectedId
);

const getWorkbenchSelectedFile = createSelector(
  fromDataFiles.getDataFiles,
  getWorkbenchSelectedFileId,
  (entities, selectedId) => {
    return selectedId && entities[selectedId];
  }
);

const getWorkbenchSelectedImageFile = createSelector(
  getWorkbenchSelectedFile,
  (dataFile) => {
    return dataFile && dataFile.type == DataFileType.IMAGE && dataFile as ImageFile;
  }
);

const getWorkbenchSelectedViewerState = createSelector(
  getViewerFileStates,
  getWorkbenchSelectedImageFile,
  (viewerStates, imageFile) => {
    return imageFile && imageFile.id in viewerStates && viewerStates[imageFile.id]
  }
);

const getWorkbenchSelectedPlotterState = createSelector(
  getPlotterFileStates,
  getWorkbenchSelectedImageFile,
  (viewerStates, imageFile) => {
    return imageFile && imageFile.id in viewerStates && viewerStates[imageFile.id]
  }
);

const getWorkbenchSelectedSonifierState = createSelector(
  getSonifierFileStates,
  getWorkbenchSelectedImageFile,
  (sonifierStates, imageFile) => {
    return imageFile && imageFile.id in sonifierStates && sonifierStates[imageFile.id]
  }
);

const getWorkbenchSelectedSourceExtractorState = createSelector(
  getSourceExtractorFileStates,
  getWorkbenchSelectedImageFile,
  (sourceExtractorStates, imageFile) => {
    return imageFile && imageFile.id in sourceExtractorStates && sourceExtractorStates[imageFile.id]
  }
);


export const workbench = {
  getFileId: getWorkbenchSelectedFileId,
  getFile: getWorkbenchSelectedFile,
  getImageFile: getWorkbenchSelectedImageFile,
  getViewerFileState: getWorkbenchSelectedViewerState,
  getPlotterFileState: getWorkbenchSelectedPlotterState,
  getSonifierFileState: getWorkbenchSelectedSonifierState,
  getSourceExtractorFileState: getWorkbenchSelectedSourceExtractorState,
  getSidebarView: createSelector(getWorkbenchGlobalState, state => state.sidebarView),
  getShowSidebar: createSelector(getWorkbenchGlobalState, state => state.showSidebar),
  getShowConfig: createSelector(getWorkbenchGlobalState, state => state.showConfig),
}
