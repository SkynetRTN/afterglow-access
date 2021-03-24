import { NgxsLoggerPluginModule } from '@ngxs/logger-plugin';
import { AfterglowEnv } from './afterglow-env';

export const env: AfterglowEnv = {
  production: true,
  environment: 'PROD',
  version: '1.0.5',
  buildDate: 'Wednesday, March 24, 2021',
  coreVersion: 'v1',
  configUrl: 'afterglow.json',
  plugins: [],
};
