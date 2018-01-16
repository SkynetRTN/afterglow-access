import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs/observable/of';
import { _throw } from 'rxjs/observable/throw';
import { User, Authenticate } from '../models/user';
import { AuthMethod } from '../models/auth-method';
import { Observable } from 'rxjs/Observable';
import { environment } from '../../../environments/environment';

@Injectable()
export class AuthService {

  constructor(private http: HttpClient) {}

  login({ username, password }: Authenticate) {
    /**
     * Simulate a failed login to display the error
     * message for the login form.
     */
    if (username !== 'test') {
      return _throw('Invalid username or password');
    }

    return of();
  }

  loginOAuth(authMethodId: string, redirectUri: string, code: string) {
    return this.http.post(`${environment.apiUrl}/auth/login/${authMethodId}`, {code: code, redirect_uri: redirectUri});
  }

  getAuthMethods() {
    return this.http.get<any[]>(`${environment.apiUrl}/auth/methods`)
      .map(resp => resp.map(r => {
        let method : AuthMethod = {
          id: r.id,
          name: r.name,
          description: r.description,
          type: r.type
        }
        if(method.type == 'oauth2server') {
          method.clientId = r.client_id;
          method.authorizeUrl = r.authorize_url;
          method.requestTokenParams = r.request_token_params;
        }
        return method;
    }));
  }

  logout() {
    return this.http.get(`${environment.apiUrl}/auth/logout`)
  }
}
