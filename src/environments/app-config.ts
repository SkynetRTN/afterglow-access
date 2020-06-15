export interface AppConfig {
    production: boolean;
    environment: string;
    coreServerUrl: string;
    coreApiVersion: string;
    authMethod: 'cookie' | 'oauth2';
    authCookieName: string;
    oauth2ClientId: string;
    oauth2ClientSecret: string;
    tileSize: number;
    upperPercentileDefault: number;
    lowerPercentileDefault: number;
    plugins: any[];
}

export function getCoreApiUrl(config: AppConfig) {
    return `${config.coreServerUrl}/api/${config.coreApiVersion}`
}