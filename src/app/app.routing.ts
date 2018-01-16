import { MenuType } from './core/components/navbar/navbar.metadata';
import { RouterModule, Route } from '@angular/router';
// import { LoginComponent } from './authentication/login/login.component'
// import { LogoutComponent } from './authentication/logout/logout.component'
import { AuthGuard } from './auth/services/auth-guard.service'
import { LoginPageComponent } from './auth/containers/login-page/login-page.component';
import { OauthAuthorizedPageComponent } from './auth/containers/oauth-authorized-page/oauth-authorized-page.component';
import { LogoutPageComponent } from './auth/containers/logout-page/logout-page.component';
import { DataProvidersComponent } from './core/containers/data-providers/data-providers.component';
import { DataProvidersIndexPageComponent } from './core/containers/data-providers/data-providers-index-page/data-providers-index-page.component';
import { DataProviderBrowsePageComponent } from './core/containers/data-providers/data-provider-browse-page/data-provider-browse-page.component';
import { WorkbenchComponent } from './core/containers/workbench/workbench.component';
import { workbenchRoutes } from './core/containers/workbench/workbench.component';

export const routes  = [
  { path: '', title: 'Afterglow Access', redirectTo: '/workbench/viewer', pathMatch: 'full', menuType: MenuType.BRAND},
  { path: 'login', title: 'Login', component: LoginPageComponent, menuType: MenuType.RIGHT},
  { path: 'oauth_authorized', title: 'Authorized', component: OauthAuthorizedPageComponent, menuType: MenuType.HIDDEN},
  
  { path: 'import',  title: 'Import', component: DataProvidersComponent, canActivate: [AuthGuard], menuType: MenuType.RIGHT, children:
    [
      {path: ':slug/browse', component: DataProviderBrowsePageComponent, canActivate: [AuthGuard], menuType: MenuType.HIDDEN, children: []},
      {path: '', component: DataProvidersIndexPageComponent, canActivate: [AuthGuard], menuType: MenuType.HIDDEN, children: [] },
    ]
  },
  { path: 'workbench', title: 'Workbench', component: WorkbenchComponent, canActivate: [AuthGuard], menuType: MenuType.RIGHT, children: workbenchRoutes},
  { path: 'logout', title: 'Logout', component: LogoutPageComponent, canActivate: [AuthGuard], menuType: MenuType.RIGHT},
  // { path: 'multi-image-tools',  title: 'Multi-Image Tools', component: GettingStartedComponent, canActivate: [AuthGuard], menuType: MenuType.RIGHT },
  // { path: 'data-analysis-tools',  title: 'Data Analysis Tools', component: GettingStartedComponent, canActivate: [AuthGuard], menuType: MenuType.RIGHT },
  // { path: 'logout',  title: 'Logout', component: LogoutComponent, canActivate: [AuthGuard], menuType: MenuType.RIGHT }


  //{ path: 'register', title: 'Register', component: RegisterComponent, menuType: MenuType.HIDDEN },
];
