import { NgxsLoggerPluginModule } from "@ngxs/logger-plugin";
import { AppConfig } from "./app-config";

export const appConfig: AppConfig = {
  production: false,
  environment: "DEV",
  coreServerUrl: "http://127.0.0.1:5000",
  coreApiVersion: "v1",
  authMethod: "oauth2",
  oauth2ClientId: "",
  oauth2ClientSecret: "",
  authCookieName: null,
  tileSize: 1024,
  upperPercentileDefault: 99.95,
  lowerPercentileDefault: 10,
  plugins: [NgxsLoggerPluginModule.forRoot()],
};
