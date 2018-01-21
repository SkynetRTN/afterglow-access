import { createSelector} from '@ngrx/store';
import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { TdDataTableSortingOrder } from '@covalent/core';
import { DataProvider } from '../models/data-provider';
import { DataProviderAsset } from '../models/data-provider-asset';

import * as dataProviderActions from '../actions/data-provider';
import { select } from 'd3';
import { TdDataTableCellComponent } from '@covalent/core/data-table/data-table-cell/data-table-cell.component';

export interface State {
  dataProvidersLoaded: boolean;
  dataProviders: DataProvider[];
  loadingAssets: boolean;
  currentProvider: DataProvider;
  currentPath: string;
  currentPathBreadcrumbs: Array<{name: string, url: string}>;
  currentAssets: DataProviderAsset[];
  selectedAssets: DataProviderAsset[];
  userSortField: string;
  userSortOrder: TdDataTableSortingOrder;
  currentSortField: string;
  currentSortOrder: TdDataTableSortingOrder;
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
  userSortOrder: TdDataTableSortingOrder.Ascending,
  currentSortField: null,
  currentSortOrder: TdDataTableSortingOrder.Ascending
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
      
      return {
        ...state,
        loadingAssets: true
      };
    }

    case dataProviderActions.LOAD_DATA_PROVIDER_ASSETS_SUCCESS: {

      //split path into breadcrumb URIs
      let currentProvider = {...action.payload.dataProvider};
      let currentPath = action.payload.path;
      let breadcrumbs: Array<{name: string, url: string}> = [];
      if(currentProvider.browseable && currentPath && currentPath != '') {
        breadcrumbs.push({name: 'root', url: ''});
        let paths = currentPath.split('/');
        for(let i=0; i<paths.length; i++) {
          if(paths[i] == '') continue;
          breadcrumbs.push({name: paths[i], url: i==paths.length-1 ? null : breadcrumbs[breadcrumbs.length-1]['url'].concat(i == 0 ? '' : '/', paths[i])});
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
      let currentSortOrder = TdDataTableSortingOrder.Ascending;

      //if action sets the sort field, use it
      if(action.payload) {
        userSortField = action.payload.fieldName;
        userSortOrder = action.payload.order;
      }
      
      if(userSortField) {
        //verify that the user selected sort field exists
        if(userSortField == 'name') {
          currentSortField = userSortField;
          currentSortOrder = userSortOrder;
        }
        else if(state.currentProvider) {
          let col = state.currentProvider.columns.find(col => col.fieldName == userSortField);
          if(col) {
            currentSortField = userSortField;
            currentSortOrder = userSortOrder;
          }
        }

      }
      
      if(!currentSortField) {
        //get default from current provider
        if(state.currentProvider && state.currentProvider.sortBy) {
          let col = state.currentProvider.columns.find(col => col.name == state.currentProvider.sortBy);
          if(col) {
            currentSortField = col.fieldName;
            currentSortOrder = state.currentProvider.sortAsc ? TdDataTableSortingOrder.Ascending : TdDataTableSortingOrder.Descending;
          }
        }
      }
      
      if(!currentSortField) {
        //use defaults
        currentSortField = 'name';
        currentSortOrder = TdDataTableSortingOrder.Ascending;
      }

      let currentAssets = state.currentAssets.sort((a,b) => {
        if(currentSortField != 'name') {
          if(currentSortField in a.metadata) {
             //custom sort using metadata column
            if(a.metadata[currentSortField] < b.metadata[currentSortField]) {
              return currentSortOrder == TdDataTableSortingOrder.Ascending ? -1 : 1;
            }
            if(a.metadata[currentSortField] > b.metadata[currentSortField]) {
              return currentSortOrder == TdDataTableSortingOrder.Ascending ? 1 : -1;
            }
            return 0;
          }
          currentSortField = 'name';
          currentSortOrder = TdDataTableSortingOrder.Ascending;
        }

        if(a.collection != b.collection) {
          return a.collection ? -1 : 1;
        }
        
        if(a.name.toUpperCase() < b.name.toUpperCase()) {
          return currentSortOrder == TdDataTableSortingOrder.Ascending ? -1 : 1;
        }

        if(a.name.toUpperCase() > b.name.toUpperCase()) {
          return currentSortOrder == TdDataTableSortingOrder.Ascending ? 1 : -1;
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
      if(action.payload.asset.collection) return state;
      
      let selectedAssets = [...state.selectedAssets];
      if(selectedAssets.includes(action.payload.asset)) {
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
    
    default: {
      return state;
    }
  }
}


