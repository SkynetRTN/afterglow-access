import { NgxsLoggerPluginModule } from "@ngxs/logger-plugin";
import { AfterglowEnv } from "./afterglow-env";

export const env: AfterglowEnv = {
  production: true,
  environment: 'PROD',
  version: '1.0.2',
  buildDate: 'Friday, March 5, 2021',
  coreVersion: 'v1',
  configUrl: 'afterglow.json',
  plugins: [],
};
