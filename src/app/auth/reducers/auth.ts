import * as authActions from '../actions/auth';
import { User } from '../models/user';

export interface State {
  loggedIn: boolean;
  user: User | null;
}

export const initialState: State = {
  loggedIn: false,
  user: null,
};

export function reducer(state = initialState, action: authActions.Actions): State {
  switch (action.type) {

    case authActions.INIT: {
      return {
        ...state,
        loggedIn: action.payload.loggedIn,
        user: null,
      };
    }


    case authActions.LOGIN_SUCCESS:
    case authActions.LOGIN_OAUTH_SUCCESS: {


      return {
        ...state,
        loggedIn: true,
        user: null
      };
    }

    case authActions.LOGOUT_SUCCESS: {
      return {
        ...state,
        loggedIn: false,
        user: null,
      };
    }

    

    default: {
      return state;
    }
  }
}

export const getLoggedIn = (state: State) => state.loggedIn;
export const getUser = (state: State) => state.user;
