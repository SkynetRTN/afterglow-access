import { State, Action, Selector, StateContext, Store } from '@ngxs/store';
import { Router, UrlSerializer } from '@angular/router';
import { tap, catchError, finalize } from 'rxjs/operators';
import { of, config } from 'rxjs';

import { InitAuth, Login, LoginSuccess, Logout, CheckSession, ResetState } from './auth.actions';
import { OAuthClient } from './models/oauth-client';

import { CoreUser } from './models/user';
import { AuthService } from './services/auth.service';
import { env } from '../../environments/environment';
import { AuthMethod } from './models/auth-method';
import { Navigate } from '@ngxs/router-plugin';
import { AuthGuard } from './services/auth-guard.service';

import jwt_decode from 'jwt-decode';

import { HttpClient, HttpParams } from '@angular/common/http';
import { LocationStrategy } from '@angular/common';
import { AppState } from '../app.state';
import { AfterglowConfigService } from '../afterglow-config.service';
import { Injectable } from '@angular/core';
import { Initialize } from '../workbench/workbench.actions';
import { CookieService } from 'ngx-cookie-service';
import { getCoreAjaxUrl, getCoreApiUrl } from '../afterglow-config';

export interface AuthStateModel {
  loginPending: boolean;
  loginError: string;
  user: CoreUser | null;
  loadingOAuthClients: boolean;
  loadingPermittedOAuthClientIds: boolean;
  permittedOAuthClientIds: string[];
  oAuthClients: OAuthClient[];
  authMethods: AuthMethod[];
}

@State<AuthStateModel>({
  name: 'auth',
  defaults: {
    loginPending: false,
    loginError: '',
    user: null,
    loadingOAuthClients: false,
    loadingPermittedOAuthClientIds: false,
    permittedOAuthClientIds: [],
    oAuthClients: [],
    authMethods: [],
  },
})
@Injectable()
export class AuthState {
  constructor(
    private router: Router,
    private cookieService: CookieService,
    private authGuard: AuthGuard,
    private config: AfterglowConfigService,
    private http: HttpClient
  ) { }

  @Selector()
  public static state(state: AuthStateModel) {
    return state;
  }

  @Selector()
  public static loginPending(state: AuthStateModel) {
    return state.loginPending;
  }

  @Selector()
  public static loginError(state: AuthStateModel) {
    return state.loginError;
  }

  @Selector()
  public static user(state: AuthStateModel) {
    return state.user;
  }

  @Selector()
  public static authMethods(state: AuthStateModel) {
    return state.authMethods;
  }

  @Selector()
  public static permittedOAuthClientIds(state: AuthStateModel) {
    return state.permittedOAuthClientIds;
  }

  @Selector()
  public static loadingOAuthClients(state: AuthStateModel) {
    return state.loadingOAuthClients;
  }

  @Selector()
  public static oAuthClients(state: AuthStateModel) {
    return state.oAuthClients;
  }

  @Selector()
  public static loadingPermittedOAuthClientIds(state: AuthStateModel) {
    return state.loadingPermittedOAuthClientIds;
  }

  @Action(InitAuth)
  public init(ctx: StateContext<AuthStateModel>, action: InitAuth) {
    //redirect to authorizing page to get user info
    //watch for localstorage changes
    window.addEventListener('storage', (event: StorageEvent) => {
      if (['user', 'access_token'].includes(event.key)) {
        let state = ctx.getState();
        if (state.user && this.authGuard.user) {
          if (state.user.id != this.authGuard.user.id) {
            //local storage user does not match user in application state
            ctx.dispatch(new ResetState());
            ctx.patchState({
              user: null,
            });
            ctx.dispatch(new Navigate(['/login']));
          }
        } else if (state.user) {
          //user no longer exists in local storage/cookie
          //login could be in-progress at the oauth authorized endpoint or the login endpoint of the app
          ctx.dispatch(new Navigate(['/logout']));
        } else {
          //app state user is logged out
          //local storage/cookie user is not null
          ctx.dispatch(new LoginSuccess());
        }
      }
    });

    ctx.patchState({
      user: this.authGuard.user,
    });

    if (this.authGuard.user) {
      localStorage.setItem('nextUrl', this.router.url);
      ctx.dispatch(new LoginSuccess());
    }
  }

  @Action(CheckSession)
  public checkSession(ctx: StateContext<AuthStateModel>, action: CheckSession) { }

  @Action(Login)
  public login(ctx: StateContext<AuthStateModel>, action: Login) { }

  @Action(LoginSuccess)
  public loginSuccess(ctx: StateContext<AuthStateModel>, action: LoginSuccess) {
    if (this.authGuard.user) {
      let state = ctx.getState();
      if (state.user && this.authGuard.user.id != state.user.id) {
        //different user has logged in
        ctx.dispatch(new ResetState());
      }

      ctx.patchState({
        loginPending: false,
        loginError: '',
        user: this.authGuard.user,
      });

      let nextUrl = localStorage.getItem('nextUrl');
      localStorage.removeItem('nextUrl');

      this.router.navigateByUrl(nextUrl && nextUrl != '' ? nextUrl : '/');
      ctx.dispatch(new Initialize());
    } else {
      ctx.patchState({
        loginPending: false,
        user: null,
        loginError: 'We encountered an unexpected error.  Please try again later.',
      });
    }
  }

  @Action(Logout)
  public logout(ctx: StateContext<AuthStateModel>, { }: Logout) {
    console.log("LOGGING OUT: ", this.config.authMethod, this.config.authCookieName)
    if (this.config.authMethod == 'cookie') {
      console.log("removing all cookies")
      this.cookieService.delete(this.config.authCookieName, '/')
      this.cookieService.deleteAll('/')

      //TODO:  clean up this when we remove the separate ajax application
      // this.http.delete(`${getCoreAjaxUrl(this.config)}/sessions`).subscribe(() => { }, (error) => {

      // })
    } else if (this.config.authMethod == 'oauth2') {
    }
    localStorage.removeItem('user');
    localStorage.removeItem('expires_at');
    localStorage.removeItem('access_token');

    ctx.dispatch(new ResetState());
    ctx.patchState({ user: null });
  }
}