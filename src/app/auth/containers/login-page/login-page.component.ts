import {APP_BASE_HREF} from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import { Observable } from "rxjs";
import { Router } from '@angular/router';
import {PlatformLocation, Location } from '@angular/common';
import { map } from 'rxjs/operators';
import { Credentials } from '../../models/user';
import { AuthMethod } from '../../models/auth-method';
import { AuthState } from '../../auth.state';
import { LoadAuthMethods, Login } from '../../auth.actions';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.css'],
})
export class LoginPageComponent implements OnInit {
  @Select(AuthState.loginPending)
  pending$: Observable<boolean>

  @Select(AuthState.loginError)
  error$: Observable<string>

  @Select(AuthState.authMethods)
  authMethods$: Observable<AuthMethod[]>

  showHttpAuth$ = this.authMethods$.pipe(map(methods => methods.findIndex(method => method.type == 'http') != -1));
  oauthServerMethods$ = this.authMethods$.pipe(map(methods => methods.filter(method => method.type == 'oauth2server')));

  constructor(private store: Store, private router: Router, private location: Location) {}

  ngOnInit() {
    this.store.dispatch(new LoadAuthMethods());
  }

  onSubmit($event: Credentials) {
    this.store.dispatch(new Login($event));
  }

  onOauthMethodClick(method: AuthMethod) {
    let params = new URLSearchParams();
    for(let key in method.requestTokenParams){
        params.set(key, method.requestTokenParams[key]) 
    }
    

    params.set('client_id', method.clientId);
    let redirectUri = window.location.origin + '/oauth_authorized';
    params.set('redirect_uri', redirectUri)
    localStorage.setItem('pendingOauthMethod', JSON.stringify({id: method.id, redirectUri: redirectUri}));
    window.location.href = method.authorizeUrl + '?' + params.toString();
    
  }
}
