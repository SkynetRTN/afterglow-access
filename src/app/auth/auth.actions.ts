import { Credentials } from './models/user';
import { OAuthClient } from './models/oauth-client';

export class InitAuth {
  public static readonly type = '[Auth] Init';
  constructor(public loggedIn: boolean) { }
}

export class Login {
  public static readonly type = '[Auth] Login';
  constructor(public credentials: Credentials) { }
}

export class LoginOAuth {
  public static readonly type = '[Auth] Login OAUth';
  constructor(public authMethodId: string, public redirectUri: string, public authCode: string) { }
}

export class LoginSuccess {
  public static readonly type = '[Auth] Login Success';
  constructor(public method: 'http' | 'oauth') { }
}

export class Logout {
  public static readonly type = '[Auth] Logout';
}

export class LoadAuthMethods {
  public static readonly type = '[Auth] Load Auth Methods';
}

export class LoadPermittedOAuthClients {
  public static readonly type = '[Auth] Load Permitted OAuth Clients';
}

export class AddPermittedOAuthClient {
  public static readonly type = '[Auth] Add Permitted OAuth Client';
  constructor(public client: OAuthClient) { }
}

export class LoadOAuthClients {
  public static readonly type = '[Auth] Load OAuth Clients';
}
