import { NgxsLoggerPluginModule } from '@ngxs/logger-plugin';
import { AfterglowEnv } from './afterglow-env';

export const env: AfterglowEnv = {
  production: true,
  environment: 'PROD',
  version: '1.0.27',
  buildDate: 'Monday, March 4, 2024',
  coreVersion: 'v1',
  configUrl: 'afterglow.json',
  plugins: [],
};
