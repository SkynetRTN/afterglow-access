import { NgxsLoggerPluginModule } from "@ngxs/logger-plugin";
import { AfterglowEnv } from "./afterglow-env";

export const env: AfterglowEnv = {
  production: true,
  environment: "PROD",
  coreVersion: "v1",
  configUrl: 'afterglow.json',
  plugins: [],
};
