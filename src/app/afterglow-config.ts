
import { env } from '../environments/environment'

export function getCoreApiUrl(config: AfterglowConfig) {
  return `${config.coreUrl}/api/${env.coreVersion}`;
}

export interface AfterglowConfig {
  coreUrl: string;
  authMethod: "cookie" | "oauth2";
  authCookieName: string;
  oauth2ClientId: string;
  tileSize: number;
  saturationDefault: number;
  backgroundDefault: number;
  enableDebug: boolean;
}
