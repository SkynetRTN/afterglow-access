import { AfterglowConfig } from './afterglow-config';

export class LoadAfterglowConfig {
  public static readonly type = '[App] Load Afterglow Config';
}

export class LoadAfterglowConfigSuccess {
  public static readonly type = '[App] Load Afterglow Config Success';

  constructor(public config: AfterglowConfig) {}
}

export class LoadAfterglowConfigFail {
  public static readonly type = '[App] Load Afterglow Config Fail';
  constructor(public error: string) {}
}
