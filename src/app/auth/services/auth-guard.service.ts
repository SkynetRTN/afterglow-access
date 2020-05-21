import { Injectable } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import { CanActivate, Router, RouterStateSnapshot, ActivatedRouteSnapshot, CanActivateChild, UrlSerializer } from '@angular/router';
import { CookieService } from 'ngx-cookie';
import { appConfig } from '../../../environments/environment';

import * as moment from "moment";
import * as uuid from 'uuid';
import { LocationStrategy } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import { Login, ResetState } from '../auth.actions';

@Injectable()
export class AuthGuard implements CanActivate, CanActivateChild {
  constructor(private store: Store,
    private cookieService: CookieService,
    private router: Router,
    private location: LocationStrategy, 
    private urlSerializer: UrlSerializer) { }

  get user() {
    if(!localStorage.getItem('aa_user')) return null;
    if (appConfig.authMethod == 'cookie') {
      if(!this.cookieService.get(appConfig.authCookieName)) {
        return null;
      }
      else if(this.cookieService.get(appConfig.authCookieName) != localStorage.getItem('aa_access_token')) {
        //unexpected cookie change.  //could be a different user has logged in
        this.store.dispatch(new ResetState());
        return null;
      }
    }
    if (appConfig.authMethod == 'oauth2') {
      let expiresAt = moment(localStorage.getItem('aa_expires_at'));
      if(moment().isSameOrAfter(expiresAt)) {
        localStorage.removeItem('aa_user');
        return null;
      }
    }

    try {
      return JSON.parse(localStorage.getItem('aa_user'));
    }
    catch(err) {
      return null;
    }
  }

  canActivate(route: ActivatedRouteSnapshot, routerState: RouterStateSnapshot) {
    if (this.user) return true;
    
    this.store.dispatch(new Login(routerState.url));
    return false;

  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.canActivate(route, state);
  }
}


