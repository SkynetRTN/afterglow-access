import { NgxsLoggerPluginModule } from "@ngxs/logger-plugin";
import { AppConfig } from "./app-config";

export const appConfig: AppConfig = {
  production: true,
  environment: "PROD",
  coreServerUrl: "/core",
  coreApiVersion: "v1",
  authMethod: "cookie",
  authCookieName: "afterglow_core_access_token",
  oauth2ClientId: "",
  oauth2ClientSecret: "",
  tileSize: 2048,
  upperPercentileDefault: 99.95,
  lowerPercentileDefault: 10,
  plugins: [],
};
