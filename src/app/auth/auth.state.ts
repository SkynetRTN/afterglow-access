import { State, Action, Selector, StateContext } from '@ngxs/store';
import { AuthAction } from './auth.actions';

export interface AuthStateModel {
  items: string[];
}

@State<AuthStateModel>({
  name: 'auth',
  defaults: {
    items: []
  }
})
export class AuthState {

  @Selector()
  public static getState(state: AuthStateModel) {
    return state;
  }

  @Action(AuthAction)
  public add(ctx: StateContext<AuthStateModel>, { payload }: AuthAction) {
    const stateModel = ctx.getState();
    stateModel.items = [...stateModel.items, payload];
    ctx.setState(stateModel);
  }
}
