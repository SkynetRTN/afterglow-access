import { NgxsLoggerPluginModule } from "@ngxs/logger-plugin";
import { AfterglowEnv } from "./afterglow-env";

export const env: AfterglowEnv = {
  production: false,
  environment: "LOCAL",
  version: '1.0.0',
  buildDate: 'Friday, March 5, 2021',
  coreVersion: "v1",
  configUrl: 'afterglow.json',
  plugins: [NgxsLoggerPluginModule.forRoot()],
};
