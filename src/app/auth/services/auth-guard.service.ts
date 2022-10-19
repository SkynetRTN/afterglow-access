import { Injectable } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import {
  CanActivate,
  Router,
  RouterStateSnapshot,
  ActivatedRouteSnapshot,
  CanActivateChild,
  UrlSerializer,
} from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { env } from '../../../environments/environment';

import * as moment from 'moment';
import * as uuid from 'uuid';
import { LocationStrategy } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import { Login, ResetState } from '../auth.actions';
import { AuthState } from '../auth.state';
import { Navigate } from '@ngxs/router-plugin';
import { AppState } from '../../app.state';
import { AfterglowConfigService } from '../../afterglow-config.service';

@Injectable()
export class AuthGuard implements CanActivate, CanActivateChild {
  constructor(private store: Store, private cookieService: CookieService, private config: AfterglowConfigService) { }

  get user() {
    if (!localStorage.getItem('user')) return null;
    if (this.config.authMethod == 'cookie') {
      if (!this.cookieService.get(this.config.authCookieName)) {
        return null;
      } else if (this.cookieService.get(this.config.authCookieName) != localStorage.getItem('access_token')) {
        //unexpected cookie change.  //could be that a different user has logged in
        return null;
      }
    }
    if (this.config.authMethod == 'oauth2') {
      let expiresAt = moment(localStorage.getItem('expires_at'));
      if (moment().isSameOrAfter(expiresAt)) {
        localStorage.removeItem('user');
        return null;
      }
    }

    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch (err) {
      return null;
    }
  }

  canActivate(route: ActivatedRouteSnapshot, routerState: RouterStateSnapshot) {
    if (this.user) return true;

    localStorage.setItem('nextUrl', routerState.url);

    //without running async,  we enter an endless loop of router cancelations
    //TODO:  Understand this more.
    setTimeout(() => {
      this.store.dispatch(new Navigate(['/login']));
    });

    return false;
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.canActivate(route, state);
  }
}
