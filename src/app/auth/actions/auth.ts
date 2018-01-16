import { Action } from '@ngrx/store';
import { User, Authenticate } from '../models/user';
import { AuthMethod } from '../models/auth-method';

export const INIT = '[Auth] Init';

export const LOGIN = '[Auth] Login';
export const LOGIN_SUCCESS = '[Auth] Login Success';
export const LOGIN_FAIL = '[Auth] Login Fail';

export const LOGIN_OAUTH = '[Auth] Login OAuth';
export const LOGIN_OAUTH_SUCCESS = '[Auth] Login OAuth Success';
export const LOGIN_OAUTH_FAIL = '[Auth] Login OAuth Fail';

export const LOGOUT = '[Auth] Logout';
export const LOGOUT_SUCCESS = '[Auth] Logout Success';
export const LOGOUT_FAIL = '[Auth] Logout Fail';
export const LOGIN_REDIRECT = '[Auth] Login Redirect';

export const LOAD_AUTH_METHODS = '[Auth] Load Auth Methods';
export const LOAD_AUTH_METHODS_SUCCESS = '[Auth] Load Auth Methods Success';
export const LOAD_AUTH_METHODS_FAIL = '[Auth] Load Auth Methods Fail';

export class Init implements Action {
  readonly type = INIT;

  constructor(public payload: {loggedIn: boolean}) {}
}

export class Login implements Action {
  readonly type = LOGIN;

  constructor(public payload: Authenticate) {}
}

export class LoginSuccess implements Action {
  readonly type = LOGIN_SUCCESS;
}

export class LoginFailure implements Action {
  readonly type = LOGIN_FAIL;

  constructor(public payload: any) {}
}

export class LoginOAuth implements Action {
  readonly type = LOGIN_OAUTH;

  constructor(public payload: {authMethodId: string, redirectUri: string, authCode: string}) {}
}

export class LoginOAuthSuccess implements Action {
  readonly type = LOGIN_OAUTH_SUCCESS;
}

export class LoginOAuthFail implements Action {
  readonly type = LOGIN_OAUTH_FAIL;

  constructor(public payload: any) {}
}

export class LoginRedirect implements Action {
  readonly type = LOGIN_REDIRECT;
}

export class Logout implements Action {
  readonly type = LOGOUT;
}

export class LogoutSuccess implements Action {
  readonly type = LOGOUT_SUCCESS;
}

export class LogoutFail implements Action {
  readonly type = LOGOUT_FAIL;

  constructor(public payload: any) {}
}

export class LoadAuthMethods implements Action {
  readonly type = LOAD_AUTH_METHODS;
}

export class LoadAuthMethodsSuccess implements Action {
  readonly type = LOAD_AUTH_METHODS_SUCCESS;

  constructor(public payload: { authMethods: AuthMethod[] }) {}
}

export class LoadAuthMethodsFail implements Action {
  readonly type = LOAD_AUTH_METHODS_FAIL;

  constructor(public payload: any) {}
}

export type Actions =
  | Init
  | Login
  | LoginSuccess
  | LoginFailure
  | LoginOAuth
  | LoginOAuthSuccess
  | LoginOAuthFail
  | LoginRedirect
  | Logout
  | LogoutSuccess
  | LogoutFail
  | LoadAuthMethods
  | LoadAuthMethodsSuccess
  | LoadAuthMethodsFail;
