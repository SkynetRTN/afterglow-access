import { Injectable } from "@angular/core";
import {
  CanActivate,
  RouterStateSnapshot,
  ActivatedRouteSnapshot,
  Router,
  ActivatedRoute,
  CanActivateChild
} from "@angular/router";
import { CookieService } from "ngx-cookie";
import { Observable } from "rxjs";
import { map, take } from "rxjs/operators";
import { appConfig } from "../../../environments/environment";
import { Store } from '@ngxs/store';
import { WorkbenchState } from '../workbench.state';
import { Navigate } from '@ngxs/router-plugin';

@Injectable()
export class WorkbenchGuard implements CanActivate, CanActivateChild {
  lastRouterPath: string;
  constructor(
    private store: Store,
    private cookieService: CookieService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    store
      .select(WorkbenchState.getState)
      .pipe(map(state => state.lastRouterPath))
      .subscribe(v => {
        this.lastRouterPath = v;
      });
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    if (state.url == "/workbench") {
      let routePath = "/workbench/viewer";
      if (this.lastRouterPath && state.url != this.lastRouterPath) {
        routePath = this.lastRouterPath;
      }
      this.store.dispatch(new Navigate([routePath]));

      return false;
    }

    return true;
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.canActivate(route, state);
  }
}
