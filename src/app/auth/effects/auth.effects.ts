import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { Effect, Actions, ofType } from "@ngrx/effects";
import { of, Observable } from "rxjs";
import { CookieService } from "ngx-cookie";
import {
  tap,
  map,
  exhaustMap,
  catchError,
  switchMap,
  flatMap,
  mapTo
} from "rxjs/operators";
import { Store } from "@ngrx/store";
import { AuthService } from "../services/auth.service";
import { AuthGuard } from "../services/auth-guard.service";
import * as fromAuth from "../reducers";
import * as authActions from "../actions/auth";
import * as dataFileActions from "../../data-files/actions/data-file";
import * as dataProviderActions from "../../data-providers/actions/data-provider";
import { User, Authenticate } from "../models/user";
import { environment } from "../../../environments/environment";

@Injectable()
export class AuthEffects {
  @Effect()
  login$ = this.actions$.pipe(
    ofType<authActions.Login>(authActions.LOGIN),
    map(action => {
      return action.payload;
    }),
    exhaustMap((auth: Authenticate) =>
      this.authService.login(auth).pipe(
        map(result => new authActions.LoginSuccess()),
        catchError(error => of(new authActions.LoginFailure(error)))
      )
    )
  );

  @Effect()
  loginOAuth$ = this.actions$.pipe(
    ofType<authActions.LoginOAuth>(authActions.LOGIN_OAUTH),
    switchMap(action =>
      this.authService
        .loginOAuth(
          action.payload.authMethodId,
          action.payload.redirectUri,
          action.payload.authCode
        )
        .pipe(
          map(result => new authActions.LoginOAuthSuccess()),
          catchError(error => of(new authActions.LoginOAuthFail(error)))
        )
    )
  );

  @Effect({ dispatch: false })
  loginSuccess$ = this.actions$.pipe(
    ofType<authActions.LoginSuccess | authActions.LoginOAuthSuccess>(
      authActions.LOGIN_SUCCESS,
      authActions.LOGIN_OAUTH_SUCCESS
    ),
    tap(action => {
      let nextUrl = localStorage.getItem("nextUrl");
      localStorage.removeItem("nextUrl");
      //if redirecting from oauth authorize page,  remove from navigation history so back button skips page
      this.router.navigateByUrl(nextUrl && nextUrl != "" ? nextUrl : "/", {
        replaceUrl: action.type == authActions.LOGIN_OAUTH_SUCCESS
      });
    })
  );

  @Effect({ dispatch: false })
  loginRedirect$ = this.actions$.pipe(
    ofType<authActions.LoginRedirect>(authActions.LOGIN_REDIRECT),
    tap(() => {
      this.router.navigate(["/login"]);
    })
  );

  @Effect()
  logout$ = this.actions$.pipe(
    ofType<authActions.Logout>(authActions.LOGOUT),
    switchMap(action => {
      //this.cookieService.remove(environment.accessTokenCookieName);
      this.cookieService.put(environment.accessTokenCookieName, "", {
        expires: new Date()
      });
      return this.authService.logout().pipe(
        map(result => new authActions.LogoutSuccess()),
        catchError(error => of(new authActions.LogoutSuccess()))
      );
    })
  );

  @Effect({ dispatch: false })
  logoutSuccess$ = this.actions$.pipe(
    ofType<authActions.LogoutSuccess>(authActions.LOGOUT_SUCCESS),
    tap(() => {
      this.router.navigate(["/login"]);
    })
  );

  @Effect()
  loadAuthMethods$ = this.actions$.pipe(
    ofType<authActions.LoadAuthMethods>(authActions.LOAD_AUTH_METHODS),
    flatMap(action =>
      this.authService.getAuthMethods().pipe(
        map(
          result =>
            new authActions.LoadAuthMethodsSuccess({ authMethods: result })
        ),
        catchError(error => of(new authActions.LoadAuthMethodsFail(error)))
      )
    )
  );

  @Effect()
  loadPermittedOauthClients$ = this.actions$.pipe(
    ofType<authActions.LoadPermittedOAuthClientIds>(
      authActions.LOAD_PERMITTED_OAUTH_CLIENT_IDS
    ),
    flatMap(action =>
      this.authService.getPermittedOAuthClients().pipe(
        map(
          result =>
            new authActions.LoadPermittedOAuthClientIdsSuccess({
              clientIds: result
            })
        ),
        catchError(error =>
          of(new authActions.LoadPermittedOAuthClientIdsFail(error))
        )
      )
    )
  );

  @Effect()
  addPermittedOauthClient$ = this.actions$.pipe(
    ofType<authActions.AddPermittedOAuthClient>(
      authActions.ADD_PERMITTED_OAUTH_CLIENT
    ),
    flatMap(action =>
      this.authService.addPermittedOAuthClient(action.payload.client).pipe(
        map(result => new authActions.AddPermittedOAuthClientSuccess()),
        catchError(error =>
          of(new authActions.AddPermittedOAuthClientFail(error))
        )
      )
    )
  );

  @Effect()
  addPermittedOauthClientSuccess$ = this.actions$.pipe(
    ofType<authActions.AddPermittedOAuthClientSuccess>(
      authActions.ADD_PERMITTED_OAUTH_CLIENT_SUCCESS
    ),
    map(action => new authActions.LoadPermittedOAuthClientIds())
  );

  @Effect()
  loadOauthClients$ = this.actions$.pipe(
    ofType<authActions.LoadOAuthClients>(authActions.LOAD_OAUTH_CLIENTS),
    flatMap(action =>
      this.authService.getOAuthClients().pipe(
        map(
          result => new authActions.LoadOAuthClientsSuccess({ clients: result })
        ),
        catchError(error => of(new authActions.LoadOAuthClientsFail(error)))
      )
    )
  );

  constructor(
    private actions$: Actions,
    private store: Store<fromAuth.State>,
    private authService: AuthService,
    private authGuard: AuthGuard,
    private router: Router,
    private cookieService: CookieService
  ) {}
}
