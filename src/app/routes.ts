import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth/services/auth-guard.service'
import { LoginPageComponent } from './auth/containers/login-page/login-page.component';
import { OauthAuthorizedPageComponent } from './auth/containers/oauth-authorized-page/oauth-authorized-page.component';
import { LogoutPageComponent } from './auth/containers/logout-page/logout-page.component';
import { DataProvidersComponent } from './core/containers/data-providers/data-providers.component';
import { DataProvidersIndexPageComponent } from './core/containers/data-providers/data-providers-index-page/data-providers-index-page.component';
import { DataProviderBrowsePageComponent } from './core/containers/data-providers/data-provider-browse-page/data-provider-browse-page.component';
import { WorkbenchComponent } from './core/containers/workbench/workbench.component';
import { ViewerPageComponent } from './core/containers/workbench/viewer-page/viewer-page.component'
import { PlotterPageComponent } from './core/containers/workbench/plotter-page/plotter-page.component';
import { SonifierPageComponent } from './core/containers/workbench/sonifier-page/sonifier-page.component';
import { SourceExtractorPageComponent } from './core/containers/workbench/source-extractor-page/source-extractor-page.component';
import { ImageCalculatorPageComponent } from './core/containers/workbench/image-calculator-page/image-calculator-page.component';
import { AlignerPageComponent } from './core/containers/workbench/aligner-page/aligner-page.component';
import { StackerPageComponent } from './core/containers/workbench/stacker-page/stacker-page.component';

export const AFTERGLOW_ROUTES: Routes = [
  {
    path: '',
    redirectTo: '/workbench/viewer',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginPageComponent,
    data: { title: 'Login' }
  },
  {
    path: 'oauth_authorized',
    component: OauthAuthorizedPageComponent,
    data: { title: 'Authorizing Please Wait' }
  },
  {
    path: 'logout',
    component: LogoutPageComponent,
    canActivate: [AuthGuard],
    data: { title: 'Logout' }
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
    path: 'workbench',
    component: WorkbenchComponent,
    data: { title: 'Workbench' },
    canActivate: [AuthGuard],
    children: [
      {
        path: 'viewer',
        component: ViewerPageComponent,
        data: { title: 'Viewer' },
        canActivate: [AuthGuard],
      },
      {
        path: 'plotter',
        component: PlotterPageComponent,
        data: { title: 'Plotter' },
        canActivate: [AuthGuard],
      },
      {
        path: 'sonifier',
        component: SonifierPageComponent,
        data: { title: 'Sonifier' },
        canActivate: [AuthGuard],
      },
      {
        path: 'source-extractor',
        component: SourceExtractorPageComponent,
        data: { title: 'Source Extractor' },
        canActivate: [AuthGuard],
      },
      // {path: 'catalog-calibrator', title: 'Catalog Calibrator', component: CatalogCalibratorPageComponent, canActivate: [AuthGuard], menuType: MenuType.LEFT},
      {
        path: 'image-calculator',
        component: ImageCalculatorPageComponent,
        data: { title: 'Image Arithmetic' },
        canActivate: [AuthGuard],
      },
      {
        path: 'aligner',
        component: AlignerPageComponent,
        data: { title: 'Aligner' },
        canActivate: [AuthGuard],
      },
      {
        path: 'stacker',
        component: StackerPageComponent,
        data: { title: 'Stacker' },
        canActivate: [AuthGuard],
      },
      {
        path: '',
        redirectTo: 'viewer',
        pathMatch: 'full',
      },
    ]
  },

];
