import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngxs/store';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { appConfig } from '../../../../environments/environment';
import { CookieService } from 'ngx-cookie';
import { LoginSuccess, CheckSession } from '../../auth.actions';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.css']
})
export class LoginPageComponent implements OnInit, OnDestroy {

  constructor(private store: Store,
    private cookieService: CookieService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private authService: AuthService) { }

  ngOnInit() {
    if (appConfig.authMethod == 'cookie' && this.cookieService.get(appConfig.authCookieName)) {
      
      this.authService.getUser().subscribe(
        (user) => {
          localStorage.setItem('aa_user', JSON.stringify(user));
          localStorage.setItem('aa_access_token', this.cookieService.get(appConfig.authCookieName));
          this.store.dispatch(new CheckSession());
        },
        (error) => {
          //this.cookieService.remove(appConfig.authCookieName);
        }
      )
    }
    else {

    }

    

  }

  ngOnDestroy() {

  }

}
