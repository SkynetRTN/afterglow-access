import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth/services/auth-guard.service'
import { OauthAuthorizedPageComponent } from './auth/containers/oauth-authorized-page/oauth-authorized-page.component';
import { DataProvidersComponent } from './core/containers/data-providers/data-providers.component';
import { DataProvidersIndexPageComponent } from './core/containers/data-providers/data-providers-index-page/data-providers-index-page.component';
import { DataProviderBrowsePageComponent } from './core/containers/data-providers/data-provider-browse-page/data-provider-browse-page.component';
import { WorkbenchComponent } from './core/containers/workbench/workbench.component';
import { ViewerPageComponent } from './core/containers/workbench/viewer-page/viewer-page.component'
import { PlotterPageComponent } from './core/containers/workbench/plotter-page/plotter-page.component';
import { SonifierPageComponent } from './core/containers/workbench/sonifier-page/sonifier-page.component';
import { CustomMarkerPageComponent } from './core/containers/workbench/custom-marker-page/custom-marker-page.component';
import { ImageCalculatorPageComponent } from './core/containers/workbench/image-calculator-page/image-calculator-page.component';
import { AlignerPageComponent } from './core/containers/workbench/aligner-page/aligner-page.component';
import { StackerPageComponent } from './core/containers/workbench/stacker-page/stacker-page.component';
import { InfoPageComponent } from './core/containers/workbench/info-page/info-page.component';
import { FieldCalPageComponent } from './core/containers/workbench/field-cal-page/field-cal-page.component';
import { WorkbenchGuard } from './core/services/workbench-guard.service';
import { PhotometryPageComponent } from './core/containers/workbench/photometry-page/photometry-page.component';
import { LogoutPageComponent } from './auth/containers/logout-page/logout-page.component';
import { LoginPageComponent } from './auth/containers/login-page/login-page.component';

export const AFTERGLOW_ROUTES: Routes = [
  {
    path: '',
    redirectTo: '/workbench/viewer',
    pathMatch: 'full'
  },
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
    path: 'oauth2/authorized',
    component: OauthAuthorizedPageComponent,
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
    path: 'workbench',
    component: WorkbenchComponent,
    data: { title: 'Workbench' },
    canActivate: [AuthGuard, WorkbenchGuard],
    canActivateChild: [AuthGuard, WorkbenchGuard],
    children: [
      {
        path: 'viewer',
        component: ViewerPageComponent,
        data: { title: 'Viewer' },
      },
      {
        path: 'file-info',
        component: InfoPageComponent,
        data: { title: 'File Info' },
      },
      {
        path: 'markers',
        component: CustomMarkerPageComponent,
        data: { title: 'Custom Markers' },
      },

      {
        path: 'plotter',
        component: PlotterPageComponent,
        data: { title: 'Plotter' },
      },
      {
        path: 'sonifier',
        component: SonifierPageComponent,
        data: { title: 'Sonifier' },
      },
      {
        path: 'field-cal',
        component: FieldCalPageComponent,
        data: { title: 'Field Calibration' },
      },
      {
        path: 'photometry',
        component: PhotometryPageComponent,
        data: { title: 'Photometry' },
      },
      {
        path: 'image-calculator',
        component: ImageCalculatorPageComponent,
        data: { title: 'Image Arithmetic' },
      },
      {
        path: 'aligner',
        component: AlignerPageComponent,
        data: { title: 'Aligner' },
      },
      {
        path: 'stacker',
        component: StackerPageComponent,
        data: { title: 'Stacker' },
      },
      {
        path: '',
        component: WorkbenchComponent,
        data: { title: 'Workbench' },
      },
    ]
  },

];
