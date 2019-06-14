import { Injectable } from '@angular/core';
import { CanActivate, RouterStateSnapshot, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { CookieService } from 'ngx-cookie';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import * as fromCore from '../reducers';
import { environment } from '../../../environments/environment';
import { SetLastRouterPath } from '../actions/workbench';

@Injectable()
export class WorkbenchGuard implements CanActivate {

  lastRouterPath: string;
  constructor(private store: Store<fromCore.State>, private cookieService: CookieService, private router: Router) {
    store.select(fromCore.getWorkbenchState).pipe(
      map(state => state.lastRouterPath)
    ).subscribe(v => {
      this.lastRouterPath = v;
    })

  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    console.log("HERE", this.lastRouterPath, state.url, this.lastRouterPath && state.url != this.lastRouterPath)
    if(this.lastRouterPath && state.url != this.lastRouterPath) {
      console.log('navigating...');
      this.router.navigate([this.lastRouterPath]);
      return false;
    }
    
    return true;

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
