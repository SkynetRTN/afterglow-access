import { Routes } from '@angular/router';
import { AuthGuard } from './auth/services/auth-guard.service';
import { AuthorizedPageComponent as AuthorizedPageComponent } from './auth/containers/authorized-page/authorized-page.component';
import { WorkbenchComponent } from './workbench/containers/workbench.component';
import { LogoutPageComponent } from './auth/containers/logout-page/logout-page.component';
import { LoginPageComponent } from './auth/containers/login-page/login-page.component';
import { JobsPageComponent } from './jobs/containers/jobs-page/jobs-page.component';
import { SettingsPageComponent } from './settings/settings-page/settings-page.component';
import { PhotometrySettingsComponent } from './settings/photometry-settings/photometry-settings.component';
import { WcsCalibrationSettingsComponent } from './settings/wcs-calibration-settings/wcs-calibration-settings.component';
import { ThemeSettingsComponent } from './settings/theme-settings/theme-settings.component';

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
    path: 'jobs',
    component: JobsPageComponent,
    data: { title: 'Jobs' },
    canActivate: [AuthGuard],
  },
  {
    path: 'jobs/:id',
    component: JobsPageComponent,
    data: { title: 'Job' },
    canActivate: [AuthGuard],
  },
  {
    path: 'settings',
    component: SettingsPageComponent,
    data: { title: 'Settings' },
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'theme'
      },
      {
        path: 'theme',
        component: ThemeSettingsComponent,
        data: { title: 'Theme Settings' },
        canActivate: [AuthGuard],
      },
      {
        path: 'photometry',
        component: PhotometrySettingsComponent,
        data: { title: 'Photometry Settings' },
        canActivate: [AuthGuard],
      },
      {
        path: 'wcs-calibration',
        component: WcsCalibrationSettingsComponent,
        data: { title: 'WCS Calibration Settings' },
        canActivate: [AuthGuard],
      },
    ]
  },
  {
    path: 'workbench',
    component: WorkbenchComponent,
    data: { title: 'Workbench' },
    canActivate: [AuthGuard],
  },
  {
    path: '',
    redirectTo: 'workbench',
    pathMatch: 'full'
  },
];
