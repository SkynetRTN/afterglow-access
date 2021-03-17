import { Routes } from '@angular/router';
import { AuthGuard } from './auth/services/auth-guard.service';
import { AuthorizedPageComponent as AuthorizedPageComponent } from './auth/containers/authorized-page/authorized-page.component';
import { WorkbenchComponent } from './workbench/containers/workbench.component';
import { LogoutPageComponent } from './auth/containers/logout-page/logout-page.component';
import { LoginPageComponent } from './auth/containers/login-page/login-page.component';

export const AFTERGLOW_ROUTES: Routes = [
  {
    path: 'logout',
    component: LogoutPageComponent,
    data: { title: 'Logging out' },
  },
  {
    path: 'login',
    component: LoginPageComponent,
    data: { title: 'Authorizing Please Wait' },
  },
  {
    path: 'authorized',
    component: AuthorizedPageComponent,
    data: { title: 'Authorizing Please Wait' },
  },
  {
    path: '',
    component: WorkbenchComponent,
    data: { title: 'Workbench' },
    canActivate: [AuthGuard],
  },
];
