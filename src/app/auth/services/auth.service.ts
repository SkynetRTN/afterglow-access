import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Location } from "@angular/common";
import { CoreUser } from "../models/user";
import { AuthMethod } from "../models/auth-method";
import { appConfig } from "../../../environments/environment";
import { OAuthClient } from "../models/oauth-client";
import { of, throwError } from "rxjs";
import { map } from "rxjs/operators";
import { getCoreApiUrl } from '../../../environments/app-config';

@Injectable()
export class AuthService {
  constructor(private http: HttpClient, private location: Location) {}

  getUser() {
    return this.http
      .get<CoreUser>(`${getCoreApiUrl(appConfig)}/user`)
  }
}
