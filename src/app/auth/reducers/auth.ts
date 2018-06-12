import * as authActions from '../actions/auth';
import { User } from '../models/user';
import { OAuthClient } from '../models/oauth-client';

export interface State {
  loggedIn: boolean;
  user: User | null;
  loadingOAuthClients: boolean;
  loadingPermittedOAuthClientIds: boolean;
  permittedOAuthClientIds: string[];
  oAuthClients: OAuthClient[];
}

export const initialState: State = {
  loggedIn: false,
  user: null,
  loadingOAuthClients: false,
  loadingPermittedOAuthClientIds: false,
  permittedOAuthClientIds: [],
  oAuthClients: [],
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
        permittedOAuthClientIds: []
      };
    }

    case authActions.LOAD_PERMITTED_OAUTH_CLIENT_IDS: {
      return {
        ...state,
        loadingPermittedOAuthClientIds: true
      };
    }

    case authActions.LOAD_PERMITTED_OAUTH_CLIENT_IDS_SUCCESS: {
      return {
        ...state,
        loadingPermittedOAuthClientIds: false,
        permittedOAuthClientIds: action.payload.clientIds
      };
    }

    case authActions.LOAD_PERMITTED_OAUTH_CLIENT_IDS_FAIL: {
      return {
        ...state,
        loadingPermittedOAuthClientIds: false,
      };
    }

    case authActions.LOAD_OAUTH_CLIENTS: {
      return {
        ...state,
        loadingOAuthClients: true
      };
    }

    case authActions.LOAD_OAUTH_CLIENTS_SUCCESS: {
      return {
        ...state,
        loadingOAuthClients: false,
        oAuthClients: action.payload.clients
      };
    }

    case authActions.LOAD_OAUTH_CLIENTS_FAIL: {
      return {
        ...state,
        loadingOAuthClients: false
      };
    }

    

    default: {
      return state;
    }
  }
}

