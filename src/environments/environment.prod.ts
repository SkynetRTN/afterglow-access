import { NgxsLoggerPluginModule } from '@ngxs/logger-plugin';
import { AfterglowEnv } from './afterglow-env';

export const env: AfterglowEnv = {
  production: true,
  environment: 'PROD',
  version: '1.0.8',
  buildDate: 'Monday, April 5, 2021',
  coreVersion: 'v1',
  configUrl: 'afterglow.json',
  plugins: [],
};
