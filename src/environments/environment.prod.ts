import { NgxsLoggerPluginModule } from '@ngxs/logger-plugin';
import { AfterglowEnv } from './afterglow-env';

export const env: AfterglowEnv = {
  production: true,
  environment: 'PROD',
  version: '1.0.23',
  buildDate: 'Tuesday, March 21, 2023',
  coreVersion: 'v1',
  configUrl: 'afterglow.json',
  plugins: [],
};
