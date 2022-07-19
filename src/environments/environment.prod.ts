import { NgxsLoggerPluginModule } from '@ngxs/logger-plugin';
import { AfterglowEnv } from './afterglow-env';

export const env: AfterglowEnv = {
  production: true,
  environment: 'PROD',
  version: '1.0.13',
  buildDate: 'Tuesday, July 19, 2022',
  coreVersion: 'v1',
  configUrl: 'afterglow.json',
  plugins: [],
};
