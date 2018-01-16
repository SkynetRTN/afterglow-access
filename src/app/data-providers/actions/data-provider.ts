import { Action } from '@ngrx/store';
import { DataProvider } from '../models/data-provider';
import { DataProviderAsset } from '../models/data-provider-asset';
import { TOGGLE_ACTION } from '@ngrx/store-devtools/src/actions';
import { TdDataTableSortingOrder } from '@covalent/core';

export const LOAD_DATA_PROVIDERS = '[DataProvider] Load Data Provider';
export const LOAD_DATA_PROVIDERS_SUCCESS = '[DataProvider] Load Data Provider Success';
export const LOAD_DATA_PROVIDERS_FAIL = '[DataProvider] Load Data Provider Fail';

export const LOAD_DATA_PROVIDER_ASSETS = '[DataProvider] Load Data Provider Assets';
export const LOAD_DATA_PROVIDER_ASSETS_SUCCESS = '[DataProvider] Load Data Provider Assets Success';
export const LOAD_DATA_PROVIDER_ASSETS_FAIL = '[DataProvider] Load Data Provider Assets Fail';

export const SORT_DATA_PROVIDER_ASSETS = '[DataProvider] Sort Data Provider Assets';

export const TOGGLE_DATA_PROVIDER_ASSET_SELECT = '[DataProvider] Toggle Data Provider Asset Select';
export const SELECT_ALL_DATA_PROVIDER_ASSETS = '[DataProvider] Select All Data Provider Assets';
export const DESELECT_ALL_DATA_PROVIDER_ASSETS = '[DataProvider] Deselect All Data Provider Assets';

export const IMPORT_SELECTED_ASSETS = '[DataProvider] Import Selected Assets';
export const IMPORT_SELECTED_ASSETS_SUCCESS = '[DataProvider] Import Selected Assets Success';
export const IMPORT_SELECTED_ASSETS_FAIL = '[DataProvider] Import Selected Assets Fail';

/**
 * Load Library Actions
 */
export class LoadDataProviders implements Action {
  readonly type = LOAD_DATA_PROVIDERS;
}

export class LoadDataProvidersSuccess implements Action {
  readonly type = LOAD_DATA_PROVIDERS_SUCCESS;

  constructor(public payload: DataProvider[]) {}
}

export class LoadDataProvidersFail implements Action {
  readonly type = LOAD_DATA_PROVIDERS_FAIL;

  constructor(public payload: any) {}
}

export class LoadDataProviderAssets implements Action {
  readonly type = LOAD_DATA_PROVIDER_ASSETS;

  constructor(public payload: {dataProvider: DataProvider, path: string}) {}
}

export class LoadDataProviderAssetsSuccess implements Action {
  readonly type = LOAD_DATA_PROVIDER_ASSETS_SUCCESS;

  constructor(public payload: {dataProvider: DataProvider, path: string, assets: DataProviderAsset[]}) {}
}

export class LoadDataProviderAssetsFail implements Action {
  readonly type = LOAD_DATA_PROVIDER_ASSETS_FAIL;

  constructor(public payload: any) {}
}

export class SortDataProviderAssets implements Action {
  readonly type = SORT_DATA_PROVIDER_ASSETS;

  constructor(public payload: {fieldName: string, order: TdDataTableSortingOrder} = null) {}
}

export class ToggleDataProviderAssetSelect implements Action {
  readonly type = TOGGLE_DATA_PROVIDER_ASSET_SELECT;

  constructor(public payload: {asset: DataProviderAsset}) {}
}

export class SelectAllDataProviderAssets implements Action {
  readonly type = SELECT_ALL_DATA_PROVIDER_ASSETS;

  constructor(public payload: any) {}
}

export class DeselectAllDataProviderAssets implements Action {
  readonly type = DESELECT_ALL_DATA_PROVIDER_ASSETS;

  constructor(public payload: any) {}
}

export class ImportSelectedAssets implements Action {
  readonly type = IMPORT_SELECTED_ASSETS;

  constructor() {}
}

export class ImportSelectedAssetsSuccess implements Action {
  readonly type = IMPORT_SELECTED_ASSETS_SUCCESS;

  constructor(public payload: any) {}
}

export class ImportSelectedAssetsFail implements Action {
  readonly type = IMPORT_SELECTED_ASSETS_FAIL;

  constructor(public payload: any) {}
}


export type Actions =
| LoadDataProviders
| LoadDataProvidersSuccess
| LoadDataProvidersFail
| LoadDataProviderAssets
| LoadDataProviderAssetsSuccess
| LoadDataProviderAssetsFail
| SortDataProviderAssets
| ToggleDataProviderAssetSelect
| SelectAllDataProviderAssets
| DeselectAllDataProviderAssets
| ImportSelectedAssets
| ImportSelectedAssetsSuccess
| ImportSelectedAssetsFail;

