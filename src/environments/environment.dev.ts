import { NgxsLoggerPluginModule } from '@ngxs/logger-plugin';

export const AppConfig = {
  production: false,
  environment: 'DEV',
  baseUrl: 'http://127.0.0.1:4200/api/v1.0',
  accessTokenCookieName: 'access_token',
  tileSize: 512,
  upperPercentileDefault: 99.95,
  lowerPercentileDefault: 10,
  plugins: [NgxsLoggerPluginModule.forRoot()],
};
