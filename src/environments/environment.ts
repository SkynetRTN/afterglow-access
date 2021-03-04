import { NgxsLoggerPluginModule } from "@ngxs/logger-plugin";
import { AfterglowEnv } from "./afterglow-env";

export const env: AfterglowEnv = {
  production: false,
  environment: "LOCAL",
  coreVersion: "v1",
  configUrl: 'afterglow.json',
  plugins: [NgxsLoggerPluginModule.forRoot()],
};
