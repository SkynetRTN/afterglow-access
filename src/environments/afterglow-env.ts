export interface AfterglowEnv {
  production: boolean;
  environment: string;
  version: string;
  buildDate: string;
  coreVersion: string;
  configUrl: string;
  plugins: any[];
}
