import { NgxsLoggerPluginModule } from '@ngxs/logger-plugin';
import { AfterglowEnv } from './afterglow-env';

export const env: AfterglowEnv = {
  production: true,
  environment: 'PROD',
  version: '1.0.26',
  buildDate: 'Wednesday, January 24, 2024',
  coreVersion: 'v1',
  configUrl: 'afterglow.json',
  plugins: [],
};
