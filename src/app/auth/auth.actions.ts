import { OAuthClient } from './models/oauth-client';

export class InitAuth {
  public static readonly type = '[Auth] Init';
  constructor() {}
}

export class CheckSession {
  public static readonly type = '[Auth] Check Session';
  constructor() {}
}

export class Login {
  public static readonly type = '[Auth] Login';
  constructor(public nextUrl: string = null) {}
}

export class GetOAuthToken {
  public static readonly type = '[Auth] Get OAuth Token';
  constructor(public authCode: string) {}
}

export class LoginSuccess {
  public static readonly type = '[Auth] Login Success';
  constructor() {}
}

export class Logout {
  public static readonly type = '[Auth] Logout';
}

export class ResetState {
  public static readonly type = '[Auth] Reset State';
}
