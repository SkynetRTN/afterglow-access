import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth/services/auth-guard.service'
import { LoginPageComponent } from './auth/containers/login-page/login-page.component';
import { OauthAuthorizedPageComponent } from './auth/containers/oauth-authorized-page/oauth-authorized-page.component';
import { OauthClientConsentPageComponent } from './auth/containers/oauth-client-consent-page/oauth-client-consent-page.component';
import { LogoutPageComponent } from './auth/containers/logout-page/logout-page.component';
import { DataProvidersComponent } from './core/containers/data-providers/data-providers.component';
import { DataProvidersIndexPageComponent } from './core/containers/data-providers/data-providers-index-page/data-providers-index-page.component';
import { DataProviderBrowsePageComponent } from './core/containers/data-providers/data-provider-browse-page/data-provider-browse-page.component';
import { WorkbenchComponent } from './core/containers/workbench/workbench.component';
import { ViewerPageComponent } from './core/containers/workbench/viewer-page/viewer-page.component'
import { PlotterPageComponent } from './core/containers/workbench/plotter-page/plotter-page.component';
import { SonifierPageComponent } from './core/containers/workbench/sonifier-page/sonifier-page.component';
import { SourceExtractorPageComponent } from './core/containers/workbench/source-extractor-page/source-extractor-page.component';
import { CustomMarkerPageComponent } from './core/containers/workbench/custom-marker-page/custom-marker-page.component';
import { ImageCalculatorPageComponent } from './core/containers/workbench/image-calculator-page/image-calculator-page.component';
import { AlignerPageComponent } from './core/containers/workbench/aligner-page/aligner-page.component';
import { StackerPageComponent } from './core/containers/workbench/stacker-page/stacker-page.component';
import { InfoPageComponent } from './core/containers/workbench/info-page/info-page.component';
import { FieldCalPageComponent } from './core/containers/workbench/field-cal-page/field-cal-page.component';

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
    path: 'oauth_client_consent',
    component: OauthClientConsentPageComponent,
    canActivate: [AuthGuard],
    data: { title: 'Grant Access' }
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
        path: 'file-info',
        component: InfoPageComponent,
        data: { title: 'File Info' },
        canActivate: [AuthGuard],
      },
      {
        path: 'markers',
        component: CustomMarkerPageComponent,
        data: { title: 'Custom Markers' },
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
        path: 'field-cal',
        component: FieldCalPageComponent,
        data: { title: 'Field Calibration' },
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
