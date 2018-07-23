import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CookieModule } from 'ngx-cookie';
import { ReactiveFormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { Http, RequestOptions } from '@angular/http';
import { LoginPageComponent } from './containers/login-page/login-page.component';
import { LogoutPageComponent } from './containers/logout-page/logout-page.component';
import { LoginFormComponent } from './components/login-form.component';
import { OauthAuthorizedPageComponent } from './containers/oauth-authorized-page/oauth-authorized-page.component';

import { AuthService } from './services/auth.service';
import { AuthGuard } from './services/auth-guard.service';
import { AuthEffects } from './effects/auth.effects';
import { reducers } from './reducers';
import { MaterialModule } from '../material';
import { OauthClientConsentPageComponent } from './containers/oauth-client-consent-page/oauth-client-consent-page.component';

export const COMPONENTS = [LoginPageComponent, LoginFormComponent, LogoutPageComponent, OauthAuthorizedPageComponent, OauthClientConsentPageComponent];

@NgModule({
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    MaterialModule,
    CookieModule.forChild(),
    StoreModule.forFeature('auth', reducers),
    EffectsModule.forFeature([AuthEffects]),
  ],
  declarations: COMPONENTS,
  exports: COMPONENTS,
})
export class AuthModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: AuthModule,
      providers: [
        AuthService,
        AuthGuard,
      ],
    };
  }
}
