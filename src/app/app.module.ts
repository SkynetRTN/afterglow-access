import { NgModule } from '@angular/core';
import { NgxsModule } from '@ngxs/store';
import { NgxsRouterPluginModule } from '@ngxs/router-plugin';
import { APP_BASE_HREF, PlatformLocation } from '@angular/common';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { TokenInterceptor } from './interceptors/token.interceptor';
import { AfterglowCoreInterceptor } from './interceptors/afterglow-core.interceptor';
import { AppMaterialModule } from './app-material';
import { WorkbenchModule } from './workbench/workbench.module';
import { AuthModule } from './auth/auth.module';
import { ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { registerLocaleData } from '@angular/common';
import { AvatarModule } from 'ngx-avatar';
import { AppComponent } from './app.component';
import { AFTERGLOW_ROUTES } from './routes';
import { env } from '../environments/environment';
import { ThemePickerModule } from './theme-picker';
import { AuthState } from './auth/auth.state';
import { JobsState, JobsStateModel } from './jobs/jobs.state';
import { DataProvidersState } from './data-providers/data-providers.state';
import { WorkbenchState } from './workbench/workbench.state';
import { SourcesState } from './workbench/sources.state';
import { PhotDataState } from './workbench/phot-data.state.';
import { AfterglowStoragePluginModule, StorageOption } from './storage-plugin/public_api';
import { WasmService } from './wasm.service';
import { HduType } from './data-files/models/data-file-type';
import { ImageHdu, IHdu, PixelType, Header } from './data-files/models/data-file';
import { DataFilesStateModel, DataFilesState } from './data-files/data-files.state';
import { IImageData } from './data-files/models/image-data';
import { ngxsConfig } from './ngxs.config';
import { WorkbenchStateModel } from './workbench/models/workbench-state';
import { PhotometryPanelState } from './workbench/models/photometry-file-state';
import { AfterglowConfigService } from './afterglow-config.service';
import { AppState } from './app.state';
import { KeyboardShortcutsModule } from 'ng-keyboard-shortcuts';
import localeEs from '@angular/common/locales/es';
import { ColorPickerModule } from 'ngx-color-picker';


registerLocaleData(localeEs, 'es');

export function dataFileSanitizer(v: DataFilesStateModel) {
  let state = {
    ...v,
  } as DataFilesStateModel;

  state.headerEntities = {
    ...state.headerEntities,
  };
  Object.keys(state.headerEntities).forEach((key) => {
    let header: Header = {
      ...state.headerEntities[key],
      loading: false,
      loaded: false,
      entries: [],
      wcs: null,
    };

    state.headerEntities[key] = header;
  });

  state.hduEntities = {
    ...state.hduEntities,
  };

  Object.keys(state.hduEntities).forEach((key) => {
    let hdu: IHdu = {
      ...state.hduEntities[key],
    };

    if (hdu.type == HduType.IMAGE) {
      hdu = {
        ...hdu,
        loaded: false,
        loading: false,
        hist: {
          initialized: false,
          loaded: false,
          loading: false,
          data: new Float32Array(),
          minBin: 0,
          maxBin: 0,
        },
      } as ImageHdu;
    }

    state.hduEntities[key] = hdu;
  });

  state.imageDataEntities = {
    ...state.imageDataEntities,
  };
  Object.keys(state.imageDataEntities).forEach((key) => {
    let imageData: IImageData<PixelType> = {
      ...state.imageDataEntities[key],
      tiles: [],
      initialized: false,
    };

    state.imageDataEntities[key] = imageData;
  });
  return state;
}

export function workbenchSanitizer(v: WorkbenchStateModel) {
  let state = {
    ...v,
  } as WorkbenchStateModel;

  state.photometryPanelStateEntities = {
    ...state.photometryPanelStateEntities,
  };
  Object.keys(state.photometryPanelStateEntities).forEach((key) => {
    let photPanelState: PhotometryPanelState = {
      ...state.photometryPanelStateEntities[key],
      sourcePhotometryData: {},
    };

    state.photometryPanelStateEntities[key] = photPanelState;
  });
  return state;
}

export function jobSanitizer(v: JobsStateModel) {
  let state = {
    ...v,
  } as JobsStateModel;

  state.jobs = {};
  state.ids = [];
  state.lastUpdateTime = 0;
  return state;
}

@NgModule({
  imports: [
    CommonModule,
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    RouterModule.forRoot(AFTERGLOW_ROUTES),
    AppMaterialModule,
    ReactiveFormsModule,
    FlexLayoutModule,
    AvatarModule,
    ThemePickerModule,
    ColorPickerModule,
    WorkbenchModule.forRoot(),
    AuthModule.forRoot(),
    KeyboardShortcutsModule.forRoot(),
    NgxsModule.forRoot(
      [AppState, AuthState, JobsState, DataProvidersState, DataFilesState, WorkbenchState, SourcesState, PhotDataState],
      ngxsConfig
    ),
    AfterglowStoragePluginModule.forRoot({
      key: [
        AuthState,
        JobsState,
        DataProvidersState,
        DataFilesState,
        DataFilesState,
        WorkbenchState,
        SourcesState,
        PhotDataState,
      ],
      sanitizations: [
        {
          key: DataFilesState,
          sanitize: dataFileSanitizer,
        },
        {
          key: WorkbenchState,
          sanitize: workbenchSanitizer,
        },
        {
          key: JobsState,
          sanitize: jobSanitizer,
        },
      ],
      storage: StorageOption.SessionStorage,
    }),
    NgxsRouterPluginModule.forRoot(),
    env.plugins,
  ],

  declarations: [AppComponent],
  providers: [
    WasmService,
    AfterglowConfigService,
    [
      { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptor, multi: true },
      { provide: HTTP_INTERCEPTORS, useClass: AfterglowCoreInterceptor, multi: true }
    ],
    {
      provide: APP_BASE_HREF,
      useFactory: (s: PlatformLocation) => s.getBaseHrefFromDOM(),
      deps: [PlatformLocation]
    }
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }