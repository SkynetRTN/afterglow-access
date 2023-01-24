import { NgxsLoggerPluginModule } from '@ngxs/logger-plugin';
import { AfterglowEnv } from './afterglow-env';

export const env: AfterglowEnv = {
  production: true,
  environment: 'PROD',
  version: '1.0.15',
  buildDate: 'Tuesday, January 24, 2023',
  coreVersion: 'v1',
  configUrl: 'afterglow.json',
  plugins: [],
};
