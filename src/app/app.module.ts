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
import { LayerType } from './data-files/models/data-file-type';
import { ImageLayer, ILayer, PixelType, Header } from './data-files/models/data-file';
import { DataFilesStateModel, DataFilesState } from './data-files/data-files.state';
import { IImageData } from './data-files/models/image-data';
import { ngxsConfig } from './ngxs.config';
import { WorkbenchStateModel } from './workbench/models/workbench-state';
import { AfterglowConfigService } from './afterglow-config.service';
import { AppState } from './app.state';
import { KeyboardShortcutsModule } from 'ng-keyboard-shortcuts';
import localeEs from '@angular/common/locales/es';
import { ColorPickerModule } from 'ngx-color-picker';
import { SettingsModule } from './settings/settings.module';
import { CosmeticCorrectionState } from './workbench/tools/cosmetic-correction/cosmetic-correction.state';
import { PixelOpsState } from './workbench/tools/pixel-ops/pixel-ops.state';
import { StackingState } from './workbench/tools/stacking/stacking.state';
import { AligningState } from './workbench/tools/aligning/aligning.state';
import { SourceCatalogState } from './workbench/tools/source-catalog/source-catalog.state';
import { PhotometryState, PhotometryStateModel, PhotometryViewerStateModel } from './workbench/tools/photometry/photometry.state';
import { WcsCalibrationState } from './workbench/tools/wcs-calibration/wcs-calibration.state';
import { SonificationState } from './workbench/tools/sonification/sonification.state';
import { CustomMarkerState } from './workbench/tools/custom-marker/custom-marker.state';
import { PlottingState } from './workbench/tools/plotting/plotting.state';
import { FileInfoState } from './workbench/tools/file-info/file-info.state';
import { DisplayState } from './workbench/tools/display/display.state';


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

  state.layerEntities = {
    ...state.layerEntities,
  };

  Object.keys(state.layerEntities).forEach((key) => {
    let layer: ILayer = {
      ...state.layerEntities[key],
    };

    if (layer.type == LayerType.IMAGE) {
      layer = {
        ...layer,
        loaded: false,
        loading: false,
        histogram: {
          initialized: false,
          loaded: false,
          loading: false,
          data: new Float32Array(),
          minBin: 0,
          maxBin: 0,
        },
      } as ImageLayer;
    }

    state.layerEntities[key] = layer;
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


  return state;
}

export function photometrySanitizer(v: PhotometryStateModel) {
  let state: PhotometryStateModel = {
    ...v,
    config: {
      ...v.config,
      creatingBatchJobs: false
    }
  };

  state.layerIdToViewerState = {
    ...state.layerIdToViewerState,
  };
  Object.keys(state.layerIdToViewerState).forEach((key) => {
    let photPanelState: PhotometryViewerStateModel = {
      ...state.layerIdToViewerState[key],
      autoPhotIsValid: false,
      autoCalIsValid: false,
      sourcePhotometryData: {},
    };

    state.layerIdToViewerState[key] = photPanelState;
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
    SettingsModule,
    AuthModule.forRoot(),
    KeyboardShortcutsModule.forRoot(),
    NgxsModule.forRoot(
      [AppState,
        AuthState,
        JobsState,
        DataProvidersState,
        DataFilesState,
        WorkbenchState,
        SourcesState,
        PhotDataState,
        CosmeticCorrectionState,
        PixelOpsState,
        StackingState,
        AligningState,
        SourceCatalogState,
        PhotometryState,
        WcsCalibrationState,
        SonificationState,
        CustomMarkerState,
        PlottingState,
        FileInfoState,
        DisplayState],
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
        CosmeticCorrectionState,
        PixelOpsState,
        StackingState,
        AligningState,
        SourceCatalogState,
        PhotometryState,
        WcsCalibrationState,
        SonificationState,
        CustomMarkerState,
        PlottingState,
        FileInfoState,
        DisplayState
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
        {
          key: PhotometryState,
          sanitize: photometrySanitizer
        }
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