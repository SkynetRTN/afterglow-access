import { Injectable } from '@angular/core';
import { CanActivate, Router, RouterStateSnapshot, ActivatedRouteSnapshot } from '@angular/router';
import { Store } from '@ngrx/store';
import { CookieService } from 'ngx-cookie';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import * as authActions from '../actions/auth';
import * as fromAuth from '../reducers';
import { environment } from '../../../environments/environment';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private store: Store<fromAuth.State>, private cookieService: CookieService) {}

  isLoggedIn() {
    if (this.cookieService.get(environment.accessTokenCookieName)) {
      // logged in so return true
      return true;
    }
    return false;
  }

  // getIdentity() {
  //   if(!i)
  // }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    if (this.isLoggedIn()) {
      // logged in so return true
      return true;
    }
    //console.log(route, state);
    localStorage.setItem('nextUrl', state.url);
    this.store.dispatch(new authActions.LoginRedirect());
    return false;


  //   return this.store
  //     .select(fromAuth.getLoggedIn)
  //     .map(authed => {
  //       if (!authed) {
  //         this.store.dispatch(new Auth.LoginRedirect());
  //         return false;
  //       }

  //       return true;
  //     })
  //     .take(1);
  // }
  }
}
