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

import { MaterialModule } from './material';
import { WorkbenchModule } from './workbench/workbench.module';
import { AuthModule } from './auth/auth.module';
import { HotkeyModule } from 'angular2-hotkeys';
import { ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { registerLocaleData } from '@angular/common';
import { AvatarModule } from 'ngx-avatar';


import { AppComponent } from './app.component';
import { AFTERGLOW_ROUTES } from './routes';
import { appConfig } from '../environments/environment';
import { ThemePickerModule } from './theme-picker';
import { AuthState } from './auth/auth.state';
import { JobsState } from './jobs/jobs.state';
import { DataProvidersState } from './data-providers/data-providers.state';
import { HdusState, HdusStateModel } from './data-files/hdus.state';
import { DataFilesState, DataFilesStateModel } from './data-files/data-files.state';
import { WorkbenchHduStates, WorkbenchHduStatesModel } from './workbench/workbench-file-states.state';
import { WorkbenchState } from './workbench/workbench.state';
import { SourcesState } from './workbench/sources.state';
import { PhotDataState } from './workbench/phot-data.state.';
import { AfterglowStoragePluginModule, StorageOption } from './storage-plugin/public_api';
import { WasmService } from './wasm.service';
import { HduType } from './data-files/models/data-file-type';
import { ImageHdu, IHdu } from './data-files/models/data-file';
import { WorkbenchImageHduState } from './workbench/models/workbench-file-state';

export function hduSanitizer(v) {
  let state = {
    ...v
   } as HdusStateModel;

  state.entities = {
    ...state.entities
  }

  Object.keys(state.entities).forEach(key => {
    let hdu : IHdu = {
      ...state.entities[key],
      header: null,
      headerLoaded: false,
      headerLoading: false,
      wcs: null
    };

    if(hdu.hduType == HduType.IMAGE) {
      hdu = {
        ...hdu,
        hist: null,
        histLoaded: false,
        histLoading: false,
        tilesInitialized: false,
        tiles: []
      } as ImageHdu
    }

    state.entities[key] = hdu;

  })
  return state;
}

export function workbenchHduStateSanitizer(v) {
  let state = {
    ...v
   } as WorkbenchHduStatesModel;

  state.entities = {
    ...state.entities
  }

  Object.keys(state.entities).forEach(key => {
    let hduState = {
      ...state.entities[key]
    };

    if(hduState.hduType == HduType.IMAGE) {
      let imageHduState = hduState as WorkbenchImageHduState;
      hduState = {
        ...hduState,
        normalization: {
          ...imageHduState.normalization,
          tiles: []
        }
      } as WorkbenchImageHduState
    }

    state.entities[key] = hduState;

  })
  return state;
}


@NgModule({
  imports: [
    CommonModule,
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    RouterModule.forRoot(AFTERGLOW_ROUTES),
    MaterialModule,
    ReactiveFormsModule,
    FlexLayoutModule,
    CookieModule.forRoot(),
    AvatarModule,
    ThemePickerModule,
    WorkbenchModule.forRoot(),
    AuthModule.forRoot(),
    HotkeyModule.forRoot({
      disableCheatSheet: true
    }),
    NgxsModule.forRoot(
      [AuthState, JobsState, DataProvidersState, HdusState, DataFilesState, WorkbenchHduStates, WorkbenchState, SourcesState, PhotDataState],
      { developmentMode: !appConfig.production }
    ),
    AfterglowStoragePluginModule.forRoot({
      key: [
        AuthState,
        JobsState,
        DataProvidersState,
        HdusState,
        DataFilesState,
        WorkbenchHduStates,
        WorkbenchState,
        SourcesState,
        PhotDataState
      ],
      sanitizations: [
        {
          key: HdusState,
          sanitize: hduSanitizer
        },
        {
          key: WorkbenchHduStates,
          sanitize: workbenchHduStateSanitizer,
        }
      ],
      storage: StorageOption.SessionStorage
    }),
    NgxsRouterPluginModule.forRoot(),
    appConfig.plugins
  ],

  declarations: [
    AppComponent
  ],
  providers: [
    WasmService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenInterceptor,
      multi: true
    },

  ],
  bootstrap: [AppComponent],
})
export class AppModule { }