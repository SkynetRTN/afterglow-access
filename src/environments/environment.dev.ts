import { NgxsLoggerPluginModule } from "@ngxs/logger-plugin";
import { AppConfig } from "./app-config";

export const appConfig: AppConfig = {
  production: false,
  environment: "DEV",
  coreServerUrl: "http://127.0.0.1:4200/core",
  coreApiVersion: "v1",
  authMethod: "cookie",
  authCookieName: "afterglow_core_access_token",
  oauth2ClientId: "baz",
  oauth2ClientSecret: "qux",
  tileSize: 512,
  upperPercentileDefault: 99.95,
  lowerPercentileDefault: 10,
  plugins: [NgxsLoggerPluginModule.forRoot()],
};
