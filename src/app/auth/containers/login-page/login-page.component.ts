import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {PlatformLocation } from '@angular/common';
import { Store } from '@ngrx/store';
import { Authenticate } from '../../models/user';
import { AuthMethod } from '../../models/auth-method';
import * as fromAuth from '../../reducers';
import * as authActions from '../../actions/auth';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.css'],
})
export class LoginPageComponent implements OnInit {
  pending$ = this.store.select(fromAuth.getLoginPagePending);
  error$ = this.store.select(fromAuth.getLoginPageError);
  authMethods$ = this.store.select(fromAuth.getLoginPageAuthMethods)
  showHttpAuth$ = this.authMethods$.map(methods => methods.findIndex(method => method.type == 'http') != -1);
  oauthServerMethods$ = this.authMethods$.map(methods => methods.filter(method => method.type == 'oauth2server'));

  constructor(private store: Store<fromAuth.State>, private router: Router, private platformLocation: PlatformLocation) {}

  ngOnInit() {
    this.store.dispatch(new authActions.LoadAuthMethods());
  }

  onSubmit($event: Authenticate) {
    this.store.dispatch(new authActions.Login($event));
  }

  onOauthMethodClick(method: AuthMethod) {
    let params = new URLSearchParams();
    for(let key in method.requestTokenParams){
        params.set(key, method.requestTokenParams[key]) 
    }
    
    params.set('client_id', method.clientId);
    let redirectUri = (this.platformLocation as any).location.origin + '/oauth_authorized';
    params.set('redirect_uri', redirectUri)
    //params.set('state', JSON.stringify({nextUrl: method.id}));

    localStorage.setItem('pendingOauthMethod', JSON.stringify({id: method.id, redirectUri: redirectUri}));

    window.location.href = method.authorizeUrl + '?' + params.toString();
    //console.log(`${method.authorizeUrl}?` + params.toString());
    //window.location.href = `${method.authorizeUrl}?client_id=${method.clientId}&redirect_uri=${redirectUri}&` + params.toString();

  }
}
