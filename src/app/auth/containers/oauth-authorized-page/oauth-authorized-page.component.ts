import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import {PlatformLocation } from '@angular/common';
import { Store } from '@ngrx/store';
import * as fromAuth from '../../reducers';
import * as authActions from '../../actions/auth';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs/Rx';

@Component({
  selector: 'app-oauth-authorized-page',
  templateUrl: './oauth-authorized-page.component.html',
  styleUrls: ['./oauth-authorized-page.component.css']
})
export class OauthAuthorizedPageComponent implements OnInit, OnDestroy {
  private sub: Subscription;

  constructor(private store: Store<fromAuth.State>, private activatedRoute: ActivatedRoute, private router: Router) { }

  ngOnInit() {
    this.sub = this.activatedRoute.queryParams.subscribe(queryParams => {
      if(!localStorage.getItem('pendingOauthMethod')) {
        this.router.navigate(['/login'], {replaceUrl:true});
      }
      else {
        if(queryParams['code']) {
          let pendingOAuth = JSON.parse(localStorage.getItem('pendingOauthMethod'));
          this.store.dispatch(new authActions.LoginOAuth({authMethodId: pendingOAuth.id, redirectUri: pendingOAuth.redirectUri, authCode: queryParams['code']}));
        }
        else {
          //TODO show error
        }
        localStorage.removeItem('pendingOauthMethod');

      }
    })
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

}
