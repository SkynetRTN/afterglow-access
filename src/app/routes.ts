import { Routes } from '@angular/router';
import { AuthGuard } from './auth/services/auth-guard.service'
import { AuthorizedPageComponent as AuthorizedPageComponent } from './auth/containers/authorized-page/authorized-page.component';
import { DataProvidersComponent } from './core/containers/data-providers/data-providers.component';
import { DataProvidersIndexPageComponent } from './core/containers/data-providers/data-providers-index-page/data-providers-index-page.component';
import { DataProviderBrowsePageComponent } from './core/containers/data-providers/data-provider-browse-page/data-provider-browse-page.component';
import { WorkbenchComponent } from './core/containers/workbench/workbench.component';
import { LogoutPageComponent } from './auth/containers/logout-page/logout-page.component';
import { LoginPageComponent } from './auth/containers/login-page/login-page.component';

export const AFTERGLOW_ROUTES: Routes = [
  {
    path: 'logout',
    component: LogoutPageComponent,
    data: { title: 'Logging out' }
  },
  {
    path: 'login',
    component: LoginPageComponent,
    data: { title: 'Authorizing Please Wait' }
  },
  {
    path: 'authorized',
    component: AuthorizedPageComponent,
    data: { title: 'Authorizing Please Wait' }
  },
  {
    path: 'data-providers',
    component: DataProvidersComponent,
    canActivate: [AuthGuard],
    data: {  },
    children: [
      {
        path: ':slug/browse',
        component: DataProviderBrowsePageComponent,
        data: { title: 'Browse' },
        canActivate: [AuthGuard],
        children: []
      },
      {
        path: '',
        component: DataProvidersIndexPageComponent,
        data: { title: 'Data Providers' },
        canActivate: [AuthGuard],
        children: []
      },
    ]
  },
  {
    path: '',
    component: WorkbenchComponent,
    data: { title: 'Workbench' },
    canActivate: [AuthGuard],
  },

];
