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
import { CoreModule } from './core/core.module';
import { AuthModule } from './auth/auth.module';
import { HotkeyModule } from 'angular2-hotkeys';
import { ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { registerLocaleData } from '@angular/common';
import { AvatarModule } from 'ngx-avatar';


import { AppComponent } from './app.component';
import { AFTERGLOW_ROUTES } from './routes';
import { appConfig } from '../environments/environment';
import { NgxPopperModule } from 'ngx-popper';
import { ThemePickerModule } from './theme-picker';
import { AuthState } from './auth/auth.state';
import { JobsState } from './jobs/jobs.state';
import { DataProvidersState } from './data-providers/data-providers.state';
import { DataFilesState, DataFilesStateModel } from './data-files/data-files.state';
import { ImageFilesState, ImageFilesStateModel } from './core/image-files.state';
import { WorkbenchState } from './core/workbench.state';
import { SourcesState } from './core/sources.state';
import { CustomMarkersState } from './core/custom-markers.state';
import { PhotDataState } from './core/phot-data.state.';
import { AfterglowStoragePluginModule, StorageOption } from './storage-plugin/public_api';
import { DataFileType } from './data-files/models/data-file-type';
import { ImageFile } from './data-files/models/data-file';

export function dataFileSanitizer(v) {
  let state = {
    ...v
   } as DataFilesStateModel;

  state.entities = {
    ...state.entities
  }

  Object.keys(state.entities).forEach(key => {
    let dataFile = {
      ...state.entities[key]
    };

    dataFile.header = null;
    dataFile.headerLoaded = false;
    dataFile.headerLoading = false;
    dataFile.wcs = null;
    

    if(dataFile.type == DataFileType.IMAGE) {
      let imageFile = dataFile as ImageFile;
      imageFile.hist = null;
      imageFile.histLoaded = false;
      imageFile.histLoading = false;
      imageFile.tilesInitialized = false;
      imageFile.tiles = [];
    }
    state.entities[key] = dataFile;

  })
  return state;
}

export function imageFileStateSanitizer(v) {
  let state = {
    ...v
   } as ImageFilesStateModel;

  state.entities = {
    ...state.entities
  }

  Object.keys(state.entities).forEach(key => {
    let imageFileState = {
      ...state.entities[key]
    };

    imageFileState.normalization = {
      ...imageFileState.normalization,
      initialized: false,
      normalizedTiles: []
    }

    state.entities[key] = imageFileState;

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
    NgxPopperModule,
    AvatarModule,
    ThemePickerModule,
    CoreModule.forRoot(),
    AuthModule.forRoot(),
    HotkeyModule.forRoot({
      disableCheatSheet: true
    }),
    NgxsModule.forRoot(
      [AuthState, JobsState, DataProvidersState, DataFilesState, ImageFilesState, WorkbenchState, SourcesState, PhotDataState, CustomMarkersState],
      { developmentMode: !appConfig.production }
    ),
    AfterglowStoragePluginModule.forRoot({
      key: [
        AuthState,
        JobsState,
        DataProvidersState,
        DataFilesState,
        ImageFilesState,
        WorkbenchState,
        SourcesState,
        PhotDataState,
        CustomMarkersState
      ],
      sanitizations: [
        {
          key: DataFilesState,
          sanitize: dataFileSanitizer
        },
        {
          key: ImageFilesState,
          sanitize: imageFileStateSanitizer,
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
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenInterceptor,
      multi: true
    },

  ],
  bootstrap: [AppComponent],
})
export class AppModule { }