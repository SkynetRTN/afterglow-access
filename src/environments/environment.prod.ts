import { NgxsLoggerPluginModule } from '@ngxs/logger-plugin';

export const environment = {
  production: true,
  apiUrl: '/api/v1.0',
  accessTokenCookieName: 'access_token',
  tileSize: 512,
  upperPercentileDefault: 99.95,
  lowerPercentileDefault: 10,
  plugins: [NgxsLoggerPluginModule.forRoot()],
};
