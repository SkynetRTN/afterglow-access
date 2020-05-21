import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { Store } from '@ngxs/store';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { appConfig } from '../../../../environments/environment';
import { CookieService } from 'ngx-cookie';
import { LoginSuccess, CheckSession } from '../../auth.actions';

import * as uuid from 'uuid';
import { HttpParams } from '@angular/common/http';


@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.css']
})
export class LoginPageComponent implements OnInit, OnDestroy, AfterViewInit {

  constructor(private store: Store,
    private cookieService: CookieService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private authService: AuthService) { }

  ngOnInit() {
    

  }

  ngOnDestroy() {

  }

  ngAfterViewInit() {
    let redirectUri = location.origin + '/authorized';

    if (appConfig.authMethod == 'oauth2') {
      let nonce = uuid.v4();
      localStorage.setItem('aa_oauth_nonce', nonce);

      let params: HttpParams = new HttpParams();
      params = params.set('client_id', appConfig.oauth2ClientId);
      params = params.set('redirect_uri', redirectUri);
      params = params.set('response_type', 'token');
      params = params.set('state', JSON.stringify({
        nonce: nonce
      }));
      params = params.set('scope', 'email');

      window.location.href = appConfig.coreServerUrl + '/oauth2/authorize?' + params.toString();

    }
    else {
      // cookie-based login
      let params: HttpParams = new HttpParams();
      params = params.set('next', redirectUri);

      window.location.href = appConfig.coreServerUrl + '/login?' + params.toString();
    }
  }

}
