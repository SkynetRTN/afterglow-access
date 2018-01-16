import { Component } from '@angular/core';
import { routes } from './app.routing'
import { CookieService } from 'ngx-cookie';
import { MenuType } from './core/components/navbar/navbar.metadata';
import { Observable } from 'rxjs/Rx';
import { Subscription } from 'rxjs/Rx';
import { Store } from '@ngrx/store';
import { AuthGuard } from './auth/services/auth-guard.service';
import * as fromAuth from './auth/reducers';
import * as fromRoot from './reducers';
import * as fromDataFiles from './data-files/reducers';
import * as authActions from './auth/actions/auth';
import * as dataFileActions from './data-files/actions/data-file';
import * as dataProviderActions from './data-providers/actions/data-provider';
import { Subscribable } from 'rxjs/Observable';
import { User } from './auth/models/user';
import { AnyFn } from '@ngrx/store/src/selector';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private currentRoutes: any[] = [];
  private loggedIn$: Observable<boolean>;
  private user$: Observable<User>;
  private loggedInSub: Subscription;

  public constructor(private store: Store<fromRoot.State>, private authGuard: AuthGuard) {
    this.loggedIn$ = this.store.select(fromAuth.getLoggedIn)
    this.user$ = this.store.select(fromAuth.getUser);
    
    if (this.authGuard.isLoggedIn()) {
      this.store.dispatch(new authActions.Init({loggedIn: true}));
    }

    this.loggedInSub = this.loggedIn$.subscribe(loggedIn => {
      this.currentRoutes = routes.filter(route => route.menuType == MenuType.BRAND || (('canActivate' in route) == loggedIn));
    })


  }

}