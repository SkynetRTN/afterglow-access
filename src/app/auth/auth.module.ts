import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CookieModule } from 'ngx-cookie';
import { ReactiveFormsModule } from '@angular/forms';
import { LoginFormComponent } from './components/login-form.component';
import { OauthAuthorizedPageComponent } from './containers/oauth-authorized-page/oauth-authorized-page.component';

import { AuthService } from './services/auth.service';
import { AuthGuard } from './services/auth-guard.service';
import { MaterialModule } from '../material';
import { LoginPageComponent } from './containers/login-page/login-page.component';
import { LogoutPageComponent } from './containers/logout-page/logout-page.component';

export const COMPONENTS = [LoginFormComponent, OauthAuthorizedPageComponent, LoginPageComponent, LogoutPageComponent];

@NgModule({
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    MaterialModule,
    CookieModule.forChild(),
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
