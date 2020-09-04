import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

//Angular Material
import { MaterialModule } from '../material'

//Covalent
// import { CovalentDataTableModule } from '@covalent/core';

// Videogular2
import { VgCoreModule } from 'videogular2/core';
import { VgControlsModule } from 'videogular2/controls';
import { VgOverlayPlayModule } from 'videogular2/overlay-play';
import { VgBufferingModule } from 'videogular2/buffering';

// import { NvD3Module } from 'ng2-nvd3';
// import 'd3';
// import 'nvd3';

import { UtilsModule }  from '../utils/utils.module';
import { PipesModule } from '../pipes/pipes.module';
import { DataFilesModule } from '../data-files/data-files.module';
import { DataProvidersModule } from '../data-providers/data-providers.module';

import { WorkbenchViewerPanelComponent } from './containers/workbench/workbench-viewer-panel/workbench-viewer-panel.component';
import { PanZoomCanvasComponent } from './components/pan-zoom-canvas/pan-zoom-canvas.component';
import { WorkbenchDataFileListComponent } from './containers/workbench/workbench-data-file-list/workbench-data-file-list.component';
import { WorkbenchViewerGridComponent } from './containers/workbench/workbench-viewer-grid/workbench-viewer-grid.component';
import { ImageViewerStatusBarComponent } from './components/image-viewer-status-bar/image-viewer-status-bar.component';
import { ImageViewerMarkerOverlayComponent } from './components/image-viewer-marker-overlay/image-viewer-marker-overlay.component';
import { ImageViewerTitleBarComponent } from './components/image-viewer-title-bar/image-viewer-title-bar.component';
import { NormalizerFormComponent } from './components/normalizer-form/normalizer-form.component';
import { PhotSettingsDialogComponent } from './components/phot-settings-dialog/phot-settings-dialog.component';
import { SourceExtractionDialogComponent } from './components/source-extraction-dialog/source-extraction-dialog.component';
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
import { DisplayToolComponent } from './components/display-tool/display-tool.component';
import { PlotterPageComponent } from './containers/workbench/plotter-page/plotter-page.component';
import { FieldCalPageComponent } from './containers/workbench/field-cal-page/field-cal-page.component';
import { CustomMarkerPageComponent } from './containers/workbench/custom-marker-page/custom-marker-page.component';
import { SonifierPageComponent } from './containers/workbench/sonifier-page/sonifier-page.component';
import { InfoToolComponent } from './components/info-tool/info-tool.component';
import { PhotometryPageComponent } from './containers/workbench/photometry-page/photometry-page.component';
import { ImageCalculatorPageComponent } from './containers/workbench/image-calculator-page/image-calculator-page.component';
import { StackerPageComponent } from './containers/workbench/stacker-page/stacker-page.component';
import { AlignerPageComponent } from './containers/workbench/aligner-page/aligner-page.component';
import { AfterglowDataFileService } from './services/afterglow-data-files';
import { AfterglowDataProviderService } from './services/afterglow-data-providers';
import { JobsModule } from '../jobs/jobs.module';
import { SvgTextMarkerComponent } from './components/svg-text-marker/svg-text-marker.component';

import { ReactiveFormsModule } from '@angular/forms';
import {NgxPopperModule} from 'ngx-popper';
import { AfterglowCatalogService } from './services/afterglow-catalogs';
import { CreateFieldCalDialogComponent } from './components/create-field-cal-dialog/create-field-cal-dialog.component';
import { FlexLayoutModule } from '@angular/flex-layout';
import { AfterglowFieldCalService } from './services/afterglow-field-cals';
import { ThemePickerModule } from '../theme-picker';
import { PixelOpsJobsDialogComponent } from './components/pixel-ops-jobs-dialog/pixel-ops-jobs-dialog.component';
import { WorkbenchGuard } from './services/workbench-guard.service';
import { AfterglowPlotlyModule } from '../afterglow-plotly/afterglow-plotly.module';
import { HelpDialogComponent } from './components/help-dialog/help-dialog.component';
import { RectangleMarkerEditorComponent } from './components/rectangle-marker-editor/rectangle-marker-editor.component';
import { ThemeDialogComponent } from './components/theme-dialog/theme-dialog.component';
import { WorkbenchPageBaseComponent } from './containers/workbench/workbench-page-base/workbench-page-base.component';
import { ConfirmationDialogComponent } from './components/confirmation-dialog/confirmation-dialog.component';
import { WorkbenchViewManagerComponent } from './containers/workbench/workbench-view-manager/workbench-view-manager.component';
import { AvatarModule } from 'ngx-avatar';

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
  DisplayToolComponent,
  PlotterPageComponent,
  SonifierPageComponent,
  FieldCalPageComponent,
  PhotometryPageComponent,
  ImageCalculatorPageComponent,
  StackerPageComponent,
  AlignerPageComponent,
  PhotSettingsDialogComponent,
  SourceExtractionDialogComponent,
  CreateFieldCalDialogComponent,
  PlotterComponent,
  CustomMarkerPageComponent,
  CircleMarkerEditorComponent,
  RectangleMarkerEditorComponent,
  InfoToolComponent,
  PixelOpsJobsDialogComponent,
  HelpDialogComponent,
  ThemeDialogComponent,
  WorkbenchPageBaseComponent,
  ConfirmationDialogComponent,
  WorkbenchViewManagerComponent
];


@NgModule({
  imports: [
    RouterModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    UtilsModule.forRoot(),
    PipesModule,
    DataProvidersModule,
    DataFilesModule,
    JobsModule,
    MaterialModule,
    // CovalentDataTableModule,
    VgCoreModule,
    VgControlsModule,
    VgOverlayPlayModule,
    VgBufferingModule,
    // NvD3Module,
    NgxPopperModule,
    FlexLayoutModule,
    ThemePickerModule,
    AfterglowPlotlyModule,
    AvatarModule
  ],

  declarations: COMPONENTS,
  exports: COMPONENTS,
  entryComponents: [
    PhotSettingsDialogComponent,
    SourceExtractionDialogComponent,
    CreateFieldCalDialogComponent,
    PixelOpsJobsDialogComponent,
    HelpDialogComponent,
    ThemeDialogComponent,
    ConfirmationDialogComponent
  ],

})
export class CoreModule {
  static forRoot() {
    return {
      ngModule: CoreModule,
      providers: [AfterglowDataFileService, AfterglowDataProviderService, AfterglowCatalogService, AfterglowFieldCalService, WorkbenchGuard],
    };
  }
}