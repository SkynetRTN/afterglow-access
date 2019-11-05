export class AuthAction {
  public static readonly type = '[Auth] Add item';
  constructor(public payload: string) { }
}