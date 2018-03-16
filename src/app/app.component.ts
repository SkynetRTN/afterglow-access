import { Component, OnInit } from '@angular/core';
import { CookieService } from 'ngx-cookie';;
import { AnyFn } from '@ngrx/store/src/selector';
import { Title } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs/Rx';
import { Subscription } from 'rxjs/Rx';
import { Store } from '@ngrx/store';
import { AuthGuard } from './auth/services/auth-guard.service';

import * as fromAuth from './auth/reducers';
import * as fromRoot from './reducers';
import * as fromDataFiles from './data-files/reducers';
import * as coreActions from './core/actions/core';
import * as authActions from './auth/actions/auth';
import * as dataFileActions from './data-files/actions/data-file';
import * as dataProviderActions from './data-providers/actions/data-provider';
import { Subscribable } from 'rxjs/Observable';
import { User } from './auth/models/user';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  private currentRoutes: any[] = [];
  private loggedIn$: Observable<boolean>;
  private user$: Observable<User>;
  private loggedInSub: Subscription;

  public constructor(
    private store: Store<fromRoot.State>,
    private authGuard: AuthGuard,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private titleService: Title
  ) {
    this.loggedIn$ = this.store.select(fromAuth.getLoggedIn)
    this.user$ = this.store.select(fromAuth.getUser);

    if (this.authGuard.isLoggedIn()) {
      this.store.dispatch(new authActions.Init({ loggedIn: true }));
    }

    // this.loggedInSub = this.loggedIn$.subscribe(loggedIn => {
    //   this.currentRoutes = routes.filter(route => route.menuType == MenuType.BRAND || (('canActivate' in route) == loggedIn));
    // })


  }

  getTitle(state, parent) {
    var data = [];
    if (parent && parent.snapshot.data && parent.snapshot.data.title) {
      data.push(parent.snapshot.data.title);
    }

    if (state && parent) {
      data.push(... this.getTitle(state, state.firstChild(parent)));
    }
    return data;
  }

  ngOnInit() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        var title = [...this.getTitle(this.router.routerState, this.router.routerState.root).reverse(), 'Afterglow Access'].join(' | ');
        this.titleService.setTitle(title);
      }
    });

    this.store.dispatch(new coreActions.Initialize());
  }

}