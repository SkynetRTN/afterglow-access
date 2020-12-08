import { DataProvider } from "./models/data-provider";
import { DataProviderAsset } from "./models/data-provider-asset";
import { BatchImportJob } from "../jobs/models/batch-import";

/**
 * Load Library Actions
 */
export class LoadDataProviders {
  public static readonly type = "[DataProvider] Load Data Provider";
}

export class LoadDataProvidersSuccess {
  public static readonly type = "[DataProvider] Load Data Provider Success";

  constructor(public dataProviders: DataProvider[]) {}
}

export class LoadDataProvidersFail {
  public static readonly type = "[DataProvider] Load Data Provider Fail";

  constructor(public error: any) {}
}

export class LoadDataProviderAssets {
  public static readonly type = "[DataProvider] Load Data Provider Assets";

  constructor(public dataProvider: DataProvider, public path: string) {}
}

export class LoadDataProviderAssetsSuccess {
  public static readonly type = "[DataProvider] Load Data Provider Assets Success";

  constructor(public dataProvider: DataProvider, public path: string, public assets: DataProviderAsset[]) {}
}

export class LoadDataProviderAssetsFail {
  public static readonly type = "[DataProvider] Load Data Provider Assets Fail";

  constructor(public error: any) {}
}

export class SortDataProviderAssets {
  public static readonly type = "[DataProvider] Sort Data Provider Assets";

  constructor(public fieldName?: string, public order?: "" | "asc" | "desc") {}
}

export class ToggleDataProviderAssetSelect {
  public static readonly type = "[DataProvider] Toggle Data Provider Asset Select";

  constructor(public asset: DataProviderAsset) {}
}

export class SelectAllDataProviderAssets {
  public static readonly type = "[DataProvider] Select All Data Provider Assets";
}

export class DeselectAllDataProviderAssets {
  public static readonly type = "[DataProvider] Deselect All Data Provider Assets";
}

export class ImportSelectedAssets {
  public static readonly type = "[DataProvider] Import Selected Assets";

  constructor(public dataProviderId: string, public assets: DataProviderAsset[], public correlationId?: string) {}
}

export class ImportSelectedAssetsSuccess {
  public static readonly type = "[DataProvider] Import Selected Assets Success";

  constructor(public fileIds: string[], public correlationId?: string) {}
}

export class ImportAssets {
  public static readonly type = "[DataProvider] Import Assets";

  constructor(public dataProviderId: string, public assets: DataProviderAsset[], public correlationId?: string) {}
}

export class ImportAssetsCompleted {
  public static readonly type = "[DataProvider] Import Assets Completed";

  constructor(
    public assets: DataProviderAsset[],
    public fileIds: string[],
    public errors: string[],
    public correlationId?: string
  ) {}
}

export class ImportAssetsStatusUpdated {
  public static readonly type = "[DataProvider] Import Assets Status Updated";

  constructor(public job: BatchImportJob, public correlationId?: string) {}
}

export class ImportAssetsCancel {
  public static readonly type = "[DataProvider] Import Assets Cancel";

  constructor(public correlationId?: string) {}
}
