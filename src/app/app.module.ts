import { NgModule } from '@angular/core';
import { NgxsModule } from '@ngxs/store';
import { NgxsRouterPluginModule } from '@ngxs/router-plugin';
import { NgxsReduxDevtoolsPluginModule } from '@ngxs/devtools-plugin';
import { NgxsLoggerPluginModule } from '@ngxs/logger-plugin';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { CookieModule } from 'ngx-cookie';
import localeEs from '@angular/common/locales/es';
registerLocaleData(localeEs, 'es');

import { TokenInterceptor } from './token.interceptor';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';

import { MaterialModule } from './material';
import { CoreModule } from './core/core.module';
import { AuthModule } from './auth/auth.module';
import { HotkeyModule } from 'angular2-hotkeys';
import { ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { registerLocaleData } from '@angular/common';



import { AppComponent } from './app.component';
import { AFTERGLOW_ROUTES } from './routes';
import { environment } from '../environments/environment';
import { NgxPopperModule } from 'ngx-popper';
import { ThemePickerModule } from './theme-picker';
import { AuthState } from './auth/auth.state';
import { JobsState } from './jobs/jobs.state';
import { DataProvidersState } from './data-providers/data-providers.state';
import { DataFilesState } from './data-files/data-files.state';
import { ImageFilesState } from './core/image-files.state';
import { WorkbenchState } from './core/workbench.state';
import { SourcesState } from './core/sources.state';
import { CustomMarkersState } from './core/custom-markers.state';
import { PhotDataState } from './core/phot-data.state.';




@NgModule({
  imports: [
    CommonModule,
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    RouterModule.forRoot(AFTERGLOW_ROUTES, { enableTracing: false }),
    MaterialModule,
    ReactiveFormsModule,
    FlexLayoutModule,
    CookieModule.forRoot(),
    NgxPopperModule,
    ThemePickerModule,
    CoreModule.forRoot(),
    AuthModule.forRoot(),
    HotkeyModule.forRoot({
      disableCheatSheet: true
    }),
    NgxsModule.forRoot(
      [AuthState, JobsState, DataProvidersState, DataFilesState, ImageFilesState, WorkbenchState, SourcesState, PhotDataState, CustomMarkersState],
      { developmentMode: !environment.production }
    ),
    NgxsRouterPluginModule.forRoot(),
    environment.plugins
  ],

  declarations: [
    AppComponent
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenInterceptor,
      multi: true
    },

  ],
  bootstrap: [AppComponent],
})
export class AppModule { }