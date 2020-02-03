import { State, Action, Selector, StateContext } from '@ngxs/store';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie';
import { tap, catchError, finalize } from 'rxjs/operators';
import { of } from "rxjs";

import { InitAuth, Login, LoginSuccess, Logout, LoginOAuth, LoadAuthMethods, LoadPermittedOAuthClients, AddPermittedOAuthClient, LoadOAuthClients } from './auth.actions';
import { OAuthClient } from './models/oauth-client';
import { User } from './models/user';
import { AuthService } from './services/auth.service';
import { environment } from "../../environments/environment";
import { AuthMethod } from './models/auth-method';
import { Navigate } from '@ngxs/router-plugin';

export interface AuthStateModel {
  loginPending: boolean;
  loginError: string;
  loggedIn: boolean;
  user: User | null;
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
    loggedIn: false,
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
    private cookieService: CookieService) { }

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
  public static loggedIn(state: AuthStateModel) {
    return state.loggedIn;
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
  public init(ctx: StateContext<AuthStateModel>, { loggedIn }: InitAuth) {
    ctx.patchState({ loggedIn: loggedIn, user: null });
  }

  @Action(Login)
  public login(ctx: StateContext<AuthStateModel>, { credentials }: Login) {
    ctx.patchState({ loginPending: true });
    return this.authService.login(credentials).pipe(
      tap(result => {
        return ctx.dispatch(new LoginSuccess('http'));
      }),
      catchError(err => {
        ctx.patchState({ loginPending: false, loginError: err });
        return of('');
      }

      ));
  }

  @Action(LoginOAuth)
  public loginOAuth(ctx: StateContext<AuthStateModel>, { authMethodId, redirectUri, authCode }: LoginOAuth) {
    ctx.patchState({ loginPending: true });
    return this.authService.loginOAuth(authMethodId, redirectUri, authCode).pipe(
      tap(result => {
        return ctx.dispatch(new LoginSuccess('oauth'));
      }),
      catchError(err => {
        ctx.patchState({ loginPending: false, loginError: err });
        return of('');
      }

      ));
  }

  @Action(LoginSuccess)
  public loginSuccess(ctx: StateContext<AuthStateModel>, { method }: LoginSuccess) {
    ctx.patchState({ loginPending: false, loggedIn: true, loginError: '' });

    let nextUrl = localStorage.getItem("nextUrl");
    localStorage.removeItem("nextUrl");
    //if redirecting from oauth authorize page,  remove from navigation history so back button skips page
    ctx.dispatch(new Navigate([nextUrl && nextUrl != "" ? nextUrl : "/"], {}, {
      replaceUrl: method == 'oauth'
    }));
  }

  @Action(Logout)
  public logout(ctx: StateContext<AuthStateModel>, { }: Logout) {
    this.cookieService.put(environment.accessTokenCookieName, "", {
      expires: new Date()
    });

    return this.authService.logout().pipe(
      tap(result => {
        ctx.dispatch(new Navigate(["/login"]));
      }),
      catchError(err => {
        ctx.dispatch(new Navigate(["/login"]));
        return of('')
      })
    );
  }

  @Action(LoadAuthMethods)
  public loadAuthMethods(ctx: StateContext<AuthStateModel>, { }: LoadAuthMethods) {
    return this.authService.getAuthMethods().pipe(
      tap(result => {
        ctx.patchState({authMethods: result})
      }),
      catchError(err => {
        return of('')
      })
    );
  }

  @Action(LoadPermittedOAuthClients)
  public loadPermittedOAuthClients(ctx: StateContext<AuthStateModel>, { }: LoadPermittedOAuthClients) {
    ctx.patchState({ loadingPermittedOAuthClientIds: true });
    return this.authService.getPermittedOAuthClients().pipe(
      tap(result => {
        ctx.patchState({permittedOAuthClientIds: result})
      }),
      catchError(err => {
        
        return of('')
      }),
      finalize(() => ctx.patchState({ loadingPermittedOAuthClientIds: false }))
    );
  }

  @Action(AddPermittedOAuthClient)
  public addPermittedOAuthClient(ctx: StateContext<AuthStateModel>, { client }: AddPermittedOAuthClient) {
    return this.authService.addPermittedOAuthClient(client).pipe(
      tap(result => {

      }),
      catchError(err => {
        return of('')
      })
    );
  }

  @Action(LoadOAuthClients)
  public loadOAuthClients(ctx: StateContext<AuthStateModel>, { }: LoadOAuthClients) {
    ctx.patchState({loadingOAuthClients: true})
    return this.authService.getOAuthClients().pipe(
      tap(result => {
        ctx.patchState({oAuthClients: result})
      }),
      catchError(err => {
        return of('')
      }),
      finalize(() => ctx.patchState({loadingOAuthClients: false}))
    );
  }
}
