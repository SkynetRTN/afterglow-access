import { Injectable } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import { CanActivate, Router, RouterStateSnapshot, ActivatedRouteSnapshot, CanActivateChild } from '@angular/router';
import { CookieService } from 'ngx-cookie';
import { environment } from '../../../environments/environment';
import { Navigate } from '@ngxs/router-plugin';

@Injectable()
export class AuthGuard implements CanActivate, CanActivateChild {
  constructor(private store: Store, private cookieService: CookieService, private router: Router) {}

  isLoggedIn() {
    if (this.cookieService.get(environment.accessTokenCookieName)) {
      // logged in so return true
      return true;
    }
    return false;
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    if (this.isLoggedIn()) {
      // logged in so return true
      return true;
    }
    localStorage.setItem('nextUrl', state.url);
    return this.router.parseUrl('/login');
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.canActivate(route, state);
  }
}


