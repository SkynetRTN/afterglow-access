import { Component, OnInit, OnDestroy } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of, Subscription } from 'rxjs';
import { GetOAuthToken, LoginSuccess, CheckSession } from '../../auth.actions';
import { Navigate } from '@ngxs/router-plugin';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpErrorResponse, HttpBackend, HttpClient } from '@angular/common/http';

import * as moment from 'moment';
import * as qs from 'query-string';
import { HttpParams } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { env } from '../../../../environments/environment';
import { CookieService } from 'ngx-cookie-service';
import { AppState } from '../../../app.state';
import { AfterglowConfigService } from '../../../afterglow-config.service';
import { CoreApiResponse } from 'src/app/utils/core-api-response';
import { CoreUser } from '../../models/user';
import { getCoreApiUrl } from 'src/app/afterglow-config';

@Component({
  selector: 'app-authorized-page',
  templateUrl: './authorized-page.component.html',
  styleUrls: ['./authorized-page.component.css'],
})
export class AuthorizedPageComponent implements OnInit, OnDestroy {
  private sub: Subscription;
  private httpClient: HttpClient;

  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private cookieService: CookieService,
    private config: AfterglowConfigService,
    private handler: HttpBackend
  ) {
    this.httpClient = new HttpClient(handler)
  }

  ngOnInit() {
    if (this.config.authMethod == 'cookie') {

      if (this.cookieService.get(this.config.authCookieName)) {
        // need to bypass the interceptor for this so we can detect authentication issues
        this.httpClient.get<CoreApiResponse<CoreUser>>(`${getCoreApiUrl(this.config)}/user/`).pipe(
          catchError((error) => {


            if (error instanceof HttpErrorResponse) {
              switch ((<HttpErrorResponse>error).status) {
                case 401: {
                  console.log("FAILED LOGIN.  COULD NOT OBTAIN USER INFO AFTER REDIRECT TO AUTHORIZED ENDPOINT USING COOKIE: ", this.cookieService.get(this.config.authCookieName))
                }
              }
            }
            return of(null)
          })
        ).subscribe(
          (user) => {
            if (user) {
              localStorage.setItem('user', JSON.stringify(user.data));
              localStorage.setItem('access_token', this.cookieService.get(this.config.authCookieName));
              this.store.dispatch(new LoginSuccess());
            }

          },
          (error) => {
            //this.cookieService.remove(appConfig.authCookieName);
          }
        );
      }
    } else {
      this.sub = this.activatedRoute.fragment.subscribe((fragment) => {
        let params = qs.parse(fragment);

        let nonce = localStorage.getItem('oauth_nonce');
        if (nonce !== null && params['access_token'] && params['expires_in'] && params['state']) {
          let state = JSON.parse(params['state'] as string);
          if (state['nonce'] && state['nonce'] == nonce) {
            let expiresIn = parseInt(params['expires_in'] as string);
            localStorage.setItem('access_token', params['access_token'] as string);
            localStorage.setItem('expires_at', moment().add(expiresIn, 'seconds').toJSON());

            //get user
            this.authService.getUser().subscribe(
              (user) => {
                localStorage.setItem('user', JSON.stringify(user.data));
                this.store.dispatch(new LoginSuccess());
              },
              (error) => {
                localStorage.removeItem('access_token');
                localStorage.removeItem('expires_at');
              }
            );
          }
        } else {
        }
        localStorage.removeItem('oauth_nonce');
      });
    }
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }
}
