import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpModule } from '@angular/http';
import { RouterModule } from '@angular/router';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { FormsModule } from '@angular/forms';

//Angular Material
import { MaterialModule } from '../material'

//Covalent
import { CovalentDataTableModule } from '@covalent/core';

// Videogular2
import { VgCoreModule } from 'videogular2/core';
import { VgControlsModule } from 'videogular2/controls';
import { VgOverlayPlayModule } from 'videogular2/overlay-play';
import { VgBufferingModule } from 'videogular2/buffering';

import { NvD3Module } from 'ng2-nvd3';
import 'd3';
import 'nvd3';

import { LibModule }  from '../lib/lib.module';
import { PipesModule } from '../pipes/pipes.module';
import { DataFilesModule } from '../data-files/data-files.module';
import { DataProvidersModule } from '../data-providers/data-providers.module';
import { PapaParseModule } from 'ngx-papaparse';

import { WorkbenchViewerPanelComponent } from './containers/workbench/workbench-viewer-panel/workbench-viewer-panel.component';
import { PanZoomCanvasComponent } from './components/pan-zoom-canvas/pan-zoom-canvas.component';
import { WorkbenchDataFileListComponent } from './containers/workbench/workbench-data-file-list/workbench-data-file-list.component';
import { WorkbenchViewerGridComponent } from './containers/workbench/workbench-viewer-grid/workbench-viewer-grid.component';
import { ImageViewerStatusBarComponent } from './components/image-viewer-status-bar/image-viewer-status-bar.component';
import { ImageViewerMarkerOverlayComponent } from './components/image-viewer-marker-overlay/image-viewer-marker-overlay.component';
import { ImageViewerTitleBarComponent } from './components/image-viewer-title-bar/image-viewer-title-bar.component';
import { NormalizerFormComponent } from './components/normalizer-form/normalizer-form.component';
import { PhotSettingsDialogComponent } from './components/phot-settings-dialog/phot-settings-dialog.component';
import { SourceExtractionSettingsDialogComponent } from './components/source-extraction-settings-dialog/source-extraction-settings-dialog.component';
import { SvgRectangleMarkerComponent } from './components/svg-rectangle-marker/svg-rectangle-marker.component';
import { SvgLineMarkerComponent } from './components/svg-line-marker/svg-line-marker.component';
import { SvgCircleMarkerComponent } from './components/svg-circle-marker/svg-circle-marker.component';
import { CircleMarkerEditorComponent } from './components/circle-marker-editor/circle-marker-editor.component';
import { SvgTeardropMarkerComponent } from './components/svg-teardrop-marker/svg-teardrop-marker.component';
import { PlotterComponent } from './components/plotter/plotter.component'
import { AppFooterComponent } from './components/app-footer/app-footer.component'
import { NavbarComponent } from './components/navbar/navbar.component';
import { DataProvidersComponent } from './containers/data-providers/data-providers.component';
import { DataProvidersIndexPageComponent } from './containers/data-providers/data-providers-index-page/data-providers-index-page.component'
import { DataProviderBrowsePageComponent} from './containers/data-providers/data-provider-browse-page/data-provider-browse-page.component';
import { WorkbenchComponent } from './containers/workbench/workbench.component';
import { ViewerPageComponent } from './containers/workbench/viewer-page/viewer-page.component';
import { PlotterPageComponent } from './containers/workbench/plotter-page/plotter-page.component';
import { CustomMarkerPageComponent } from './containers/workbench/custom-marker-page/custom-marker-page.component';
import { SonifierPageComponent } from './containers/workbench/sonifier-page/sonifier-page.component';
import { SourceExtractorPageComponent } from './containers/workbench/source-extractor-page/source-extractor-page.component';
import { ImageCalculatorPageComponent } from './containers/workbench/image-calculator-page/image-calculator-page.component';
import { StackerPageComponent } from './containers/workbench/stacker-page/stacker-page.component';
import { AlignerPageComponent } from './containers/workbench/aligner-page/aligner-page.component';
import { WorkbenchEffects } from './effects/workbench';
import { SonifierEffects } from './effects/sonifier';
import { TransformationEffects } from './effects/transformation';
import { NormalizationEffects } from './effects/normalization';
import { SourceExtractorEffects } from './effects/source-extractor';
import { reducers } from './reducers';

import { StyleManager } from './services/style-manager';
import { AfterglowDataFileService } from './services/afterglow-data-files';
import { AfterglowDataProviderService } from './services/afterglow-data-providers';
import { JobsModule } from '../jobs/jobs.module';
import { SvgTextMarkerComponent } from './components/svg-text-marker/svg-text-marker.component';

import { ReactiveFormsModule } from '@angular/forms';

export const COMPONENTS = [
  NavbarComponent,
  AppFooterComponent,
  WorkbenchDataFileListComponent,
  WorkbenchViewerGridComponent,
  WorkbenchViewerPanelComponent,
  PanZoomCanvasComponent,
  ImageViewerMarkerOverlayComponent,
  ImageViewerTitleBarComponent,
  ImageViewerStatusBarComponent,
  NormalizerFormComponent,
  SvgRectangleMarkerComponent,
  SvgCircleMarkerComponent,
  SvgTextMarkerComponent,
  SvgTeardropMarkerComponent,
  SvgLineMarkerComponent,
  DataProvidersComponent,
  DataProvidersIndexPageComponent,
  DataProviderBrowsePageComponent,
  WorkbenchComponent,
  ViewerPageComponent,
  PlotterPageComponent,
  SonifierPageComponent,
  SourceExtractorPageComponent,
  ImageCalculatorPageComponent,
  StackerPageComponent,
  AlignerPageComponent,
  PhotSettingsDialogComponent,
  SourceExtractionSettingsDialogComponent,
  PlotterComponent,
  CustomMarkerPageComponent,
  CircleMarkerEditorComponent
];


@NgModule({
  imports: [
    RouterModule,
    CommonModule,
    HttpModule,
    FormsModule,
    ReactiveFormsModule,
    LibModule,
    PipesModule,
    DataProvidersModule,
    DataFilesModule,
    JobsModule,
    MaterialModule,
    CovalentDataTableModule,
    VgCoreModule,
    VgControlsModule,
    VgOverlayPlayModule,
    VgBufferingModule,
    NvD3Module,
    PapaParseModule,

    /**
     * StoreModule.forFeature is used for composing state
     * from feature modules. These modules can be loaded
     * eagerly or lazily and will be dynamically added to
     * the existing state.
     */
    StoreModule.forFeature('coreState', reducers),

    /**
     * Effects.forFeature is used to register effects
     * from feature modules. Effects can be loaded
     * eagerly or lazily and will be started immediately.
     *
     * All Effects will only be instantiated once regardless of
     * whether they are registered once or multiple times.
     */
    EffectsModule.forFeature([WorkbenchEffects, SonifierEffects, SourceExtractorEffects, NormalizationEffects, TransformationEffects]),
  ],

  declarations: COMPONENTS,
  exports: COMPONENTS,
  entryComponents: [
    PhotSettingsDialogComponent,
    SourceExtractionSettingsDialogComponent
  ],

})
export class CoreModule {
  static forRoot() {
    return {
      ngModule: CoreModule,
      providers: [AfterglowDataFileService, AfterglowDataProviderService],
    };
  }
}