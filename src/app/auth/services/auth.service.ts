import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Location } from "@angular/common";
import { User, Credentials } from "../models/user";
import { AuthMethod } from "../models/auth-method";
import { environment } from "../../../environments/environment";
import { OAuthClient } from "../models/oauth-client";
import { of, throwError } from "rxjs";
import { map } from "rxjs/operators";

@Injectable()
export class AuthService {
  constructor(private http: HttpClient, private location: Location) {}

  login({ username, password }: Credentials) {
    /**
     * Simulate a failed login to display the error
     * message for the login form.
     */
    if (username !== "test") {
      return throwError("Invalid username or password");
    }

    return of();
  }

  loginOAuth(authMethodId: string, redirectUri: string, code: string) {
    return this.http.post(
      this.location.prepareExternalUrl(
        `${environment.apiUrl}/auth/login/${authMethodId}`
      ),
      { code: code, redirect_uri: redirectUri }
    );
  }

  getAuthMethods() {
    return this.http
      .get<any[]>(
        this.location.prepareExternalUrl(`${environment.apiUrl}/auth/methods`)
      )
      .pipe(
        map(resp =>
          resp.map(r => {
            let method: AuthMethod = {
              id: r.id,
              name: r.name,
              description: r.description,
              type: r.type
            };
            if (method.type == "oauth2server") {
              method.clientId = r.client_id;
              method.authorizeUrl = r.authorize_url;
              method.requestTokenParams = r.request_token_params;
            }
            return method;
          })
        )
      );
  }

  getOAuthClients() {
    return this.http
      .get<any[]>(
        this.location.prepareExternalUrl(`${environment.apiUrl}/oauth2/clients`)
      )
      .pipe(
        map(resp =>
          resp.map(r => {
            let client: OAuthClient = {
              clientId: r.id,
              redirectUri: r.redirect_uri,
              name: r.name,
              description: r.description
            };
  
            return client;
          })
        )
      )
  }

  getPermittedOAuthClients() {
    return this.http.get<string[]>(
      this.location.prepareExternalUrl(
        `${environment.apiUrl}/oauth2/user-clients`
      )
    );
  }

  addPermittedOAuthClient(client: OAuthClient) {
    return this.http.post(
      this.location.prepareExternalUrl(
        `${environment.apiUrl}/oauth2/user-clients`
      ),
      { client_id: client.clientId }
    );
  }

  logout() {
    return of(null);
    //return this.http.get(this.location.prepareExternalUrl(`${environment.apiUrl}/auth/logout`))
  }
}
