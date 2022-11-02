import { Component, OnInit, OnDestroy, AfterViewInit, LOCALE_ID, Inject } from '@angular/core';
import { Store } from '@ngxs/store';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { APP_BASE_HREF } from '@angular/common';

import { AuthService } from '../../services/auth.service';
import { env } from '../../../../environments/environment';
import { LoginSuccess, CheckSession } from '../../auth.actions';

import * as uuid from 'uuid';
import { HttpParams } from '@angular/common/http';
import { AppState } from '../../../app.state';
import { AfterglowConfigService } from '../../../afterglow-config.service';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.css'],
})
export class LoginPageComponent implements OnInit, OnDestroy, AfterViewInit {
  constructor(private config: AfterglowConfigService, @Inject(LOCALE_ID) protected localeId: string, @Inject(APP_BASE_HREF) public baseHref: string) { }

  ngOnInit() { }

  ngOnDestroy() { }

  ngAfterViewInit() {
    let redirectUri = location.origin + `${this.baseHref}authorized`;
    let params: HttpParams = new HttpParams();
    params = params.set('client_id', this.config.oauth2ClientId);
    params = params.set('redirect_uri', redirectUri);

    if (this.config.authMethod == 'oauth2') {
      let nonce = uuid.v4();
      localStorage.setItem('oauth_nonce', nonce);
      params = params.set('response_type', 'token');
      params = params.set(
        'state',
        JSON.stringify({
          nonce: nonce,
        })
      );
      params = params.set('scope', 'email');

      window.location.href = this.config.authUrl + '/oauth2/authorize?' + params.toString();
    } else {
      // cookie-based login

      window.location.href = this.config.authUrl + '/sign-in?' + params.toString();
    }
  }
}
