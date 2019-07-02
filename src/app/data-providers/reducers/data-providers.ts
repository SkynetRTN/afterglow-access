import { createSelector } from '@ngrx/store';
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { DataProvider } from '../models/data-provider';
import { DataProviderAsset } from '../models/data-provider-asset';

import * as dataProviderActions from '../actions/data-provider';

export interface State {
  dataProvidersLoaded: boolean;
  dataProviders: DataProvider[];
  loadingAssets: boolean;
  currentProvider: DataProvider;
  currentPath: string;
  currentPathBreadcrumbs: Array<{ name: string, url: string }>;
  currentAssets: DataProviderAsset[];
  selectedAssets: DataProviderAsset[];
  userSortField: string;
  userSortOrder: '' | 'asc' | 'desc';
  currentSortField: string;
  currentSortOrder: '' | 'asc' | 'desc';
  importing: boolean,
  pendingImports: DataProviderAsset[];
  completedImports: DataProviderAsset[];
  importErrors: Array<{ asset: DataProviderAsset, message: string }>
  importProgress: number
}

export const initialState: State = {
  dataProvidersLoaded: false,
  dataProviders: [],
  loadingAssets: false,
  currentProvider: null,
  currentPath: '',
  currentPathBreadcrumbs: [],
  currentAssets: [],
  selectedAssets: [],
  userSortField: null,
  userSortOrder: 'asc',
  currentSortField: null,
  currentSortOrder: 'asc',
  importing: false,
  pendingImports: [],
  completedImports: [],
  importErrors: [],
  importProgress: 0
}

export function reducer(
  state = initialState,
  action: dataProviderActions.Actions
): State {
  switch (action.type) {
    case dataProviderActions.LOAD_DATA_PROVIDERS_SUCCESS: {

      return {
        ...state,
        dataProviders: action.payload,
        dataProvidersLoaded: true,
      };
    }

    case dataProviderActions.LOAD_DATA_PROVIDER_ASSETS: {
      let changes: Partial<State> = {};
      if (state.importProgress == 1) {
        changes.importProgress = 0;
        changes.importErrors = [];
        changes.completedImports = [];
        changes.pendingImports = [];
        changes.importing = false;
      }


      return {
        ...state,
        loadingAssets: true,
        ...changes
      };
    }

    case dataProviderActions.LOAD_DATA_PROVIDER_ASSETS_SUCCESS: {

      //split path into breadcrumb URIs
      let currentProvider = { ...action.payload.dataProvider };
      let currentPath = action.payload.path;
      let breadcrumbs: Array<{ name: string, url: string }> = [];
      if (currentProvider.browseable) {

        breadcrumbs.push({ name: action.payload.dataProvider.name, url: currentPath ? '' : null });
        if (currentPath) {
          let paths = currentPath.split('/');
          for (let i = 0; i < paths.length; i++) {
            if (paths[i] == '') continue;
            breadcrumbs.push({ name: paths[i], url: i == paths.length - 1 ? null : breadcrumbs[breadcrumbs.length - 1]['url'].concat(i == 0 ? '' : '/', paths[i]) });
          }
        }

      }

      //sort assets
      let currentAssets = [...action.payload.assets];

      return {
        ...state,
        loadingAssets: false,
        currentProvider: currentProvider,
        currentPath: currentPath,
        currentPathBreadcrumbs: breadcrumbs,
        currentAssets: currentAssets,
        selectedAssets: []

      };
    }


    case dataProviderActions.SORT_DATA_PROVIDER_ASSETS: {
      let userSortField = state.userSortField;
      let userSortOrder = state.userSortOrder;

      let currentSortField = null;
      let currentSortOrder: '' | 'asc' | 'desc' = 'asc';

      //if action sets the sort field, use it
      if (action.payload) {
        userSortField = action.payload.fieldName;
        userSortOrder = action.payload.order;
      }

      if (userSortField) {
        //verify that the user selected sort field exists
        if (userSortField == 'name') {
          currentSortField = userSortField;
          currentSortOrder = userSortOrder;
        }
        else if (state.currentProvider) {
          let col = state.currentProvider.columns.find(col => col.fieldName == userSortField);
          if (col) {
            currentSortField = userSortField;
            currentSortOrder = userSortOrder;
          }
        }

      }

      if (!currentSortField) {
        //get default from current provider
        if (state.currentProvider && state.currentProvider.sortBy) {
          let col = state.currentProvider.columns.find(col => col.name == state.currentProvider.sortBy);
          if (col) {
            currentSortField = col.fieldName;
            currentSortOrder = state.currentProvider.sortAsc ? 'asc' : 'desc';
          }
        }
      }

      if (!currentSortField) {
        //use defaults
        currentSortField = 'name';
        currentSortOrder = 'asc';
      }

      let currentAssets = state.currentAssets.slice().sort((a, b) => {
        if (currentSortField != 'name') {
          if (currentSortField in a.metadata) {
            //custom sort using metadata column
            if (a.metadata[currentSortField] < b.metadata[currentSortField]) {
              return currentSortOrder == 'asc' ? -1 : 1;
            }
            if (a.metadata[currentSortField] > b.metadata[currentSortField]) {
              return currentSortOrder == 'asc' ? 1 : -1;
            }
            return 0;
          }
          currentSortField = 'name';
          currentSortOrder = 'asc';
        }

        if (a.collection != b.collection) {
          return a.collection ? -1 : 1;
        }

        if (a.name.toUpperCase() < b.name.toUpperCase()) {
          return currentSortOrder == 'asc' ? -1 : 1;
        }

        if (a.name.toUpperCase() > b.name.toUpperCase()) {
          return currentSortOrder == 'asc' ? 1 : -1;
        }
        return 0;

      })

      return {
        ...state,
        currentAssets: currentAssets,
        userSortField: userSortField,
        userSortOrder: userSortOrder,
        currentSortField: currentSortField,
        currentSortOrder: currentSortOrder,
      };
    }

    case dataProviderActions.LOAD_DATA_PROVIDER_ASSETS_FAIL: {

      return {
        ...state,
        loadingAssets: false
      };
    }

    case dataProviderActions.TOGGLE_DATA_PROVIDER_ASSET_SELECT: {
      if (action.payload.asset.collection) return state;

      let selectedAssets = [...state.selectedAssets];
      if (selectedAssets.includes(action.payload.asset)) {
        selectedAssets.splice(selectedAssets.indexOf(action.payload.asset), 1);
      }
      else {
        selectedAssets.push(action.payload.asset);
      }
      return {
        ...state,
        selectedAssets: selectedAssets
      };
    }

    case dataProviderActions.SELECT_ALL_DATA_PROVIDER_ASSETS: {
      let selectedAssets = state.currentAssets.filter(asset => !asset.collection);
      return {
        ...state,
        selectedAssets: selectedAssets

      };
    }

    case dataProviderActions.DESELECT_ALL_DATA_PROVIDER_ASSETS: {
      let selectedAssets = [];
      return {
        ...state,
        selectedAssets: selectedAssets

      };
    }

    case dataProviderActions.IMPORT_SELECTED_ASSETS: {

      return {
        ...state,
        importing: true,
        importProgress: 0,
        pendingImports: [...state.selectedAssets],
        completedImports: [],
        importErrors: [],
      };
    }

    case dataProviderActions.IMPORT_ASSETS: {

      return {
        ...state,
        importing: true,
        importProgress: 0,
        pendingImports: [...action.payload.assets],
        completedImports: [],
        importErrors: [],
      };
    }

    case dataProviderActions.IMPORT_ASSET_SUCCESS: {
      let pending = state.pendingImports.filter(asset => asset.path != action.payload.asset.path);
      let completed = [...state.completedImports, action.payload.asset]
      let total = pending.length + completed.length;
      let progress = total == 0 ? 0 : completed.length / total;
      return {
        ...state,
        importing: pending.length != 0,
        importProgress: progress,
        selectedAssets: state.selectedAssets.filter(asset => asset.path != action.payload.asset.path),
        pendingImports: pending,
        completedImports: completed
      };

    }

    case dataProviderActions.IMPORT_ASSET_FAIL: {
      let pending = state.pendingImports.filter(asset => asset.path != action.payload.asset.path);
      let completed = [...state.completedImports, action.payload.asset]
      let total = pending.length + completed.length;
      let progress = total == 0 ? 0 : completed.length / total;
      return {
        ...state,
        importing: pending.length != 0,
        importProgress: progress,
        pendingImports: pending,
        completedImports: completed,
        importErrors: [...state.importErrors, { asset: action.payload.asset, message: action.payload.error }]
      };
    }

    default: {
      return state;
    }
  }
}


