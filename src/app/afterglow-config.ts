import { env } from '../environments/environment';

export function getCoreApiUrl(config: AfterglowConfig) {
  return `${config.coreUrl}/api/${env.coreVersion}`;
}

export function getCoreAjaxUrl(config: AfterglowConfig) {
  return `${config.coreUrl}/ajax`;
}

export interface AfterglowConfig {
  coreUrl: string;
  authMethod: 'cookie' | 'oauth2';
  authCookieName: string;
  oauth2ClientId: string;
  tileSize: number;
  saturationDefault: number;
  backgroundDefault: number;
  enableDebug: boolean;
}
