import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthorizedPageComponent } from './containers/authorized-page/authorized-page.component';

import { AuthService } from './services/auth.service';
import { AuthGuard } from './services/auth-guard.service';
import { AppMaterialModule } from '../app-material';
import { LoginPageComponent } from './containers/login-page/login-page.component';
import { LogoutPageComponent } from './containers/logout-page/logout-page.component';
import { CookieService } from 'ngx-cookie-service';

export const COMPONENTS = [AuthorizedPageComponent, LoginPageComponent, LogoutPageComponent];

@NgModule({
  imports: [CommonModule, ReactiveFormsModule, AppMaterialModule],
  providers: [CookieService],
  declarations: COMPONENTS,
  exports: COMPONENTS,
})
export class AuthModule {
  static forRoot(): ModuleWithProviders<AuthModule> {
    return {
      ngModule: AuthModule,
      providers: [AuthService, AuthGuard],
    };
  }
}
