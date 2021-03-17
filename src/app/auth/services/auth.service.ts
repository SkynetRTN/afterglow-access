import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { CoreUser } from '../models/user';
import { AuthMethod } from '../models/auth-method';
import { env } from '../../../environments/environment';
import { OAuthClient } from '../models/oauth-client';
import { of, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { getCoreApiUrl } from '../../afterglow-config';
import { Store } from '@ngxs/store';
import { AppState } from '../../app.state';
import { AfterglowConfigService } from '../../afterglow-config.service';

@Injectable()
export class AuthService {
  constructor(private http: HttpClient, private config: AfterglowConfigService) {}

  getUser() {
    return this.http.get<CoreUser>(`${getCoreApiUrl(this.config)}/user`);
  }
}
