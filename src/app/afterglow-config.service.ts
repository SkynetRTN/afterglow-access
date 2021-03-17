import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { env } from '../environments/environment';
import { AfterglowConfig } from './afterglow-config';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AfterglowConfigService implements AfterglowConfig {
  usingDefaults: boolean = true;
  coreUrl: string;
  authMethod: 'cookie' | 'oauth2';
  authCookieName: string;
  oauth2ClientId: string;
  tileSize: number;
  saturationDefault: number;
  backgroundDefault: number;
  enableDebug: boolean;

  constructor(private http: HttpClient) {}

  loadConfig(): Observable<AfterglowConfig> {
    return this.http.get<AfterglowConfig>(env.configUrl).pipe(
      tap((config) => {
        for (const prop in config) {
          this[prop] = config[prop];
        }
      })
    );
  }
}
