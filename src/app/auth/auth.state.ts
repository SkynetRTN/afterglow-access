import { State, Action, Selector, StateContext } from '@ngxs/store';
import { Router, UrlSerializer } from '@angular/router';
import { CookieService } from 'ngx-cookie';
import { tap, catchError, finalize } from 'rxjs/operators';
import { of, config } from "rxjs";

import { InitAuth, Login, LoginSuccess, Logout, CheckSession, ResetState } from './auth.actions';
import { OAuthClient } from './models/oauth-client';
import { CoreUser } from './models/user';
import { AuthService } from './services/auth.service';
import { appConfig } from "../../environments/environment";
import { AuthMethod } from './models/auth-method';
import { Navigate } from '@ngxs/router-plugin';
import { AuthGuard } from './services/auth-guard.service';

import jwt_decode from 'jwt-decode';
import * as uuid from 'uuid';
import { HttpParams } from '@angular/common/http';
import { LocationStrategy } from '@angular/common';
import { RedoRegionSelection } from '../core/image-files.actions';
import { local } from 'd3-selection';

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
  }
})
export class AuthState {
  constructor(private authService: AuthService,
    private router: Router,
    private location: LocationStrategy,
    private urlSerializer: UrlSerializer,
    private cookieService: CookieService,
    private authGuard: AuthGuard) {
  }

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
      if (event.key == 'aa_user') {
        ctx.dispatch(new CheckSession());
      }
    });

    ctx.dispatch(new CheckSession());
  }

  @Action(CheckSession)
  public checkSession(ctx: StateContext<AuthStateModel>, action: CheckSession) {
    let state = ctx.getState();
    if (state.user) {
      //user is logged in
      if (!this.authGuard.user) {
        //user logged out
        ctx.dispatch(new Navigate(['/logout']));
      }
      else if(state.user.id != this.authGuard.user.id) {
        //logged in as different user
        ctx.dispatch(new ResetState());
        ctx.dispatch(new LoginSuccess());
      }
    }
    else if(this.authGuard.user) {
      //logged in inside different tab
      ctx.dispatch(new LoginSuccess());
    }

    ctx.patchState({ user: this.authGuard.user });
  }

  @Action(Login)
  public login(ctx: StateContext<AuthStateModel>, action: Login) {
    if (action.nextUrl) localStorage.setItem('nextUrl', action.nextUrl);

    if (appConfig.authMethod == 'oauth2') {
      let nonce = uuid.v4();
      localStorage.setItem('aa_oauth_nonce', nonce);

      let redirectUri = location.origin + '/oauth2/authorized';

      let params: HttpParams = new HttpParams();
      params = params.set('client_id', appConfig.oauth2ClientId);
      params = params.set('redirect_uri', redirectUri);
      params = params.set('response_type', 'token');
      params = params.set('state', JSON.stringify({
        nonce: nonce
      }));
      params = params.set('scope', 'email');

      window.location.href = appConfig.coreServerUrl + '/oauth2/authorize?' + params.toString();

    }
    else {
      // cookie-based login
      let redirectUri = location.origin + '/login'
      let params: HttpParams = new HttpParams();
      params = params.set('next', redirectUri);

      window.location.href = appConfig.coreServerUrl + '/login?' + params.toString();
    }
  }

  @Action(LoginSuccess)
  public loginSuccess(ctx: StateContext<AuthStateModel>, action: LoginSuccess) {
    if (this.authGuard.user) {

      ctx.patchState({
        loginPending: false,
        loginError: '',
      });

      let nextUrl = localStorage.getItem("nextUrl");
      localStorage.removeItem("nextUrl");
      //if redirecting from oauth authorize page,  remove from navigation history so back button skips page
      ctx.dispatch(new Navigate([(nextUrl && nextUrl != "") ? nextUrl : "/"], {}, {
        replaceUrl: true
      }));
    }
    else {
      ctx.patchState({ loginPending: false, user: null, loginError: 'We encountered an unexpected error.  Please try again later.' });
    }


  }

  @Action(Logout)
  public logout(ctx: StateContext<AuthStateModel>, { }: Logout) {
    if (appConfig.authMethod == 'cookie') {
      localStorage.removeItem('aa_user');
      this.cookieService.remove(appConfig.authCookieName);
    }
    if (appConfig.authMethod == 'oauth2') {
      localStorage.removeItem('aa_user');
      localStorage.removeItem('aa_expires_at');
      localStorage.removeItem('aa_access_token');
    }

    ctx.dispatch(new ResetState());
    ctx.patchState({ user: this.authGuard.user });
  }
}
