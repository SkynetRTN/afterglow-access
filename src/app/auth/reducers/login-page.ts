import * as authActions from '../actions/auth';
import { AuthMethod } from '../models/auth-method';

export interface State {
  error: string | null;
  pending: boolean;
  nextUrl: string | null;
  authMethods: AuthMethod[];
}

export const initialState: State = {
  error: null,
  pending: false,
  nextUrl: null,
  authMethods: []
};

export function reducer(state = initialState, action: authActions.Actions): State {
  switch (action.type) {
    case authActions.LOGIN: {
      return {
        ...state,
        error: null,
        pending: true,
      };
    }
    case authActions.LOGIN_SUCCESS: {
      return {
        ...state,
        error: null,
        pending: false,
      };
    }

    case authActions.LOGIN_FAIL: {
      return {
        ...state,
        error: action.payload,
        pending: false,
      };
    }

    case authActions.LOAD_AUTH_METHODS_SUCCESS: {
      return {
        ...state,
        authMethods: action.payload.authMethods
      };
    }

    default: {
      return state;
    }
  }
}

export const getError = (state: State) => state.error;
export const getPending = (state: State) => state.pending;
export const getAuthMethods = (state: State) => state.authMethods;
export const getNextUrl = (state: State) => state.nextUrl;
