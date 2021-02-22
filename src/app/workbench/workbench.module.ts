import { NgModule, ModuleWithProviders } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";

//Angular Material
import { MaterialModule } from "../material";

//Covalent
// import { CovalentDataTableModule } from '@covalent/core';

// Videogular2
import { VgCoreModule } from "videogular2/compiled/core";
import { VgControlsModule } from "videogular2/compiled/controls";
import { VgOverlayPlayModule } from "videogular2/compiled/overlay-play";
import { VgBufferingModule } from "videogular2/compiled/buffering";

// import { NvD3Module } from 'ng2-nvd3';
// import 'd3';
// import 'nvd3';

// import { TreeModule,  } from '@circlon/angular-tree-component';

import { UtilsModule } from "../utils/utils.module";
import { PipesModule } from "../pipes/pipes.module";
import { DataFilesModule } from "../data-files/data-files.module";
import { DataProvidersModule } from "../data-providers/data-providers.module";

import { WorkbenchImageViewerComponent } from "./containers/workbench-image-viewer/workbench-image-viewer.component";
import { WorkbenchViewerPanelComponent } from "./containers/workbench-viewer-panel/workbench-viewer-panel.component";
import { PanZoomCanvasComponent } from "./components/pan-zoom-canvas/pan-zoom-canvas.component";
import {
  WorkbenchDataFileListComponent,
  FileListItemComponent,
} from "./containers/workbench-data-file-list/workbench-data-file-list.component";
import { ImageViewerStatusBarComponent } from "./components/image-viewer-status-bar/image-viewer-status-bar.component";
import { ImageViewerMarkerOverlayComponent } from "./components/image-viewer-marker-overlay/image-viewer-marker-overlay.component";
import { NormalizerFormComponent } from "./components/normalizer-form/normalizer-form.component";
import { PhotSettingsDialogComponent } from "./components/phot-settings-dialog/phot-settings-dialog.component";
import { SourceExtractionDialogComponent } from "./components/source-extraction-dialog/source-extraction-dialog.component";
import { SvgRectangleMarkerComponent } from "./components/svg-rectangle-marker/svg-rectangle-marker.component";
import { SvgLineMarkerComponent } from "./components/svg-line-marker/svg-line-marker.component";
import { SvgCircleMarkerComponent } from "./components/svg-circle-marker/svg-circle-marker.component";
import { CircleMarkerEditorComponent } from "./components/circle-marker-editor/circle-marker-editor.component";
import { SvgTeardropMarkerComponent } from "./components/svg-teardrop-marker/svg-teardrop-marker.component";
import { PlotterComponent } from "./components/plotter/plotter.component";
import { AppFooterComponent } from "./components/app-footer/app-footer.component";
import { NavbarComponent } from "./components/navbar/navbar.component";
import { WorkbenchComponent } from "./containers/workbench.component";
import { DisplayToolsetComponent } from "./components/display-panel/display-panel.component";
import { PlottingPanelComponent } from "./components/plotting-panel/plotting-panel.component";
import { CustomMarkerPanelComponent } from "./components/custom-marker-panel/custom-marker-panel.component";
import { SonificationPanelComponent } from "./components/sonification-panel/sonification-panel.component";
import { FileInfoToolsetComponent } from "./components/file-info-panel/file-info-panel.component";
import { PhotometryPageComponent } from "./components/photometry-panel/photometry-panel.component";
import { ImageCalculatorPageComponent } from "./components/pixel-ops-panel/pixel-ops-panel.component";
import { StackerPanelComponent } from "./components/stacking-panel/stacking-panel.component";
import { AlignerPageComponent } from "./components/aligning-panel/aligning-panel.component";
import { AfterglowDataFileService } from "./services/afterglow-data-files";
import { AfterglowDataProviderService } from "./services/afterglow-data-providers";
import { JobsModule } from "../jobs/jobs.module";
import { SvgTextMarkerComponent } from "./components/svg-text-marker/svg-text-marker.component";

import { ReactiveFormsModule } from "@angular/forms";
import { TreeModule } from "@circlon/angular-tree-component";
import { AfterglowCatalogService } from "./services/afterglow-catalogs";
import { CreateFieldCalDialogComponent } from "./components/create-field-cal-dialog/create-field-cal-dialog.component";
import { FlexLayoutModule } from "@angular/flex-layout";
import { AfterglowFieldCalService } from "./services/afterglow-field-cals";
import { ThemePickerModule } from "../theme-picker";
import { PixelOpsJobsDialogComponent } from "./components/pixel-ops-jobs-dialog/pixel-ops-jobs-dialog.component";
import { AfterglowPlotlyModule } from "../afterglow-plotly/afterglow-plotly.module";
import { HelpDialogComponent } from "./components/help-dialog/help-dialog.component";
import { RectangleMarkerEditorComponent } from "./components/rectangle-marker-editor/rectangle-marker-editor.component";
import { ThemeDialogComponent } from "./components/theme-dialog/theme-dialog.component";
import { AvatarModule } from "ngx-avatar";
import { WorkbenchViewerLayoutComponent } from "./containers/workbench-viewer-layout/workbench-viewer-layout.component";
import { HduSelectorComponent } from "./components/hdu-selector/hdu-selector.component";
import { SaveChangesDialogComponent } from "./components/file-dialog/file-dialog.component";
import { JobProgressDialogComponent } from "./components/job-progress-dialog/job-progress-dialog.component";
import { WcsCalibrationPanelComponent } from './components/wcs-calibration-panel/wcs-calibration-panel.component';

export const COMPONENTS = [
  NavbarComponent,
  AppFooterComponent,
  WorkbenchDataFileListComponent,
  WorkbenchImageViewerComponent,
  HduSelectorComponent,
  PanZoomCanvasComponent,
  ImageViewerMarkerOverlayComponent,
  ImageViewerStatusBarComponent,
  NormalizerFormComponent,
  SvgRectangleMarkerComponent,
  SvgCircleMarkerComponent,
  SvgTextMarkerComponent,
  SvgTeardropMarkerComponent,
  SvgLineMarkerComponent,
  WorkbenchComponent,
  DisplayToolsetComponent,
  PlottingPanelComponent,
  SonificationPanelComponent,
  PhotometryPageComponent,
  ImageCalculatorPageComponent,
  StackerPanelComponent,
  AlignerPageComponent,
  PhotSettingsDialogComponent,
  SourceExtractionDialogComponent,
  CreateFieldCalDialogComponent,
  PlotterComponent,
  CustomMarkerPanelComponent,
  CircleMarkerEditorComponent,
  RectangleMarkerEditorComponent,
  FileInfoToolsetComponent,
  PixelOpsJobsDialogComponent,
  HelpDialogComponent,
  ThemeDialogComponent,
  WorkbenchViewerPanelComponent,
  WorkbenchViewerLayoutComponent,
  SaveChangesDialogComponent,
  FileListItemComponent,
  JobProgressDialogComponent,
  WcsCalibrationPanelComponent,
];

@NgModule({
  imports: [
    TreeModule,
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
    FlexLayoutModule,
    ThemePickerModule,
    AfterglowPlotlyModule,
    AvatarModule,
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
    SaveChangesDialogComponent,
    JobProgressDialogComponent,
  ],
})
export class WorkbenchModule {
  static forRoot(): ModuleWithProviders<WorkbenchModule> {
    return {
      ngModule: WorkbenchModule,
      providers: [AfterglowDataFileService, AfterglowDataProviderService, AfterglowCatalogService, AfterglowFieldCalService],
    };
  }
}
