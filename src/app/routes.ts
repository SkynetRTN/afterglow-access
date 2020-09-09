import { Routes } from '@angular/router';
import { AuthGuard } from './auth/services/auth-guard.service'
import { AuthorizedPageComponent as AuthorizedPageComponent } from './auth/containers/authorized-page/authorized-page.component';
import { DataProvidersComponent } from './core/containers/data-providers/data-providers.component';
import { DataProvidersIndexPageComponent } from './core/containers/data-providers/data-providers-index-page/data-providers-index-page.component';
import { DataProviderBrowsePageComponent } from './core/containers/data-providers/data-provider-browse-page/data-provider-browse-page.component';
import { WorkbenchComponent } from './core/containers/workbench/workbench.component';
import { WorkbenchGuard } from './core/services/workbench-guard.service';
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
    canActivate: [AuthGuard, WorkbenchGuard],
  //   canActivateChild: [AuthGuard, WorkbenchGuard],
  //   children: [
  //     {
  //       path: 'viewer',
        
  //       data: { title: 'Viewer' },
  //     },
  //     {
  //       path: 'file-info',
  //       component: InfoToolComponent,
  //       data: { title: 'File Info' },
  //     },
  //     {
  //       path: 'markers',
  //       component: CustomMarkerPageComponent,
  //       data: { title: 'Custom Markers' },
  //     },

  //     {
  //       path: 'plotter',
  //       component: PlotterPageComponent,
  //       data: { title: 'Plotter' },
  //     },
  //     {
  //       path: 'sonifier',
  //       component: SonifierPageComponent,
  //       data: { title: 'Sonifier' },
  //     },
  //     {
  //       path: 'field-cal',
  //       component: FieldCalPageComponent,
  //       data: { title: 'Field Calibration' },
  //     },
  //     {
  //       path: 'photometry',
  //       component: PhotometryPageComponent,
  //       data: { title: 'Photometry' },
  //     },
  //     {
  //       path: 'image-calculator',
  //       component: ImageCalculatorPageComponent,
  //       data: { title: 'Image Arithmetic' },
  //     },
  //     {
  //       path: 'aligner',
  //       component: AlignerPageComponent,
  //       data: { title: 'Aligner' },
  //     },
  //     {
  //       path: 'stacker',
  //       component: StackerPageComponent,
  //       data: { title: 'Stacker' },
  //     },
  //     {
  //       path: '',
  //       component: WorkbenchComponent,
  //       data: { title: 'Workbench' },
  //     },
  //   ]
  },

];
