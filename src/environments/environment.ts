import { NgxsLoggerPluginModule } from '@ngxs/logger-plugin';
import { AppConfig } from './app-config';

export const appConfig: AppConfig = {
  production: false,
  environment: 'LOCAL',
  coreServerUrl: 'http://127.0.0.1:4200/core',
  coreApiVersion: 'v1',
  authMethod: 'cookie',
  authCookieName: 'afterglow_core_access_token',
  oauth2ClientId: '',
  oauth2ClientSecret: '',
  tileSize: 2048,
  upperPercentileDefault: 99.95,
  lowerPercentileDefault: 10,
  plugins: [NgxsLoggerPluginModule.forRoot()],
};
