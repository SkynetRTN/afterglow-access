import { Injectable } from "@angular/core";
import {
  CanActivate,
  RouterStateSnapshot,
  ActivatedRouteSnapshot,
  Router,
  ActivatedRoute,
  CanActivateChild
} from "@angular/router";
import { Store } from "@ngrx/store";
import { CookieService } from "ngx-cookie";
import { Observable } from "rxjs";
import { map, take } from "rxjs/operators";
import * as fromCore from "../reducers";
import { environment } from "../../../environments/environment";
import { SetLastRouterPath } from "../actions/workbench";

@Injectable()
export class WorkbenchGuard implements CanActivate, CanActivateChild {
  lastRouterPath: string;
  constructor(
    private store: Store<fromCore.State>,
    private cookieService: CookieService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    store
      .select(fromCore.getWorkbenchState)
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
      this.router.navigate([routePath]);

      return false;
    }

    return true;
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.canActivate(route, state);
  }
}
