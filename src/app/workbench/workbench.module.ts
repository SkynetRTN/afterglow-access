import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

//Angular Material
import { AppMaterialModule } from '../app-material';
import { UtilsModule } from '../utils/utils.module';
import { PipesModule } from '../pipes/pipes.module';
import { DataFilesModule } from '../data-files/data-files.module';
import { DataProvidersModule } from '../data-providers/data-providers.module';

import { LogMonitorModule } from 'ngx-log-monitor';
import { ImageViewerComponent } from './containers/image-viewer/image-viewer.component';
import { ViewerPanelComponent } from './containers/viewer-panel/viewer-panel.component';
import { PanZoomCanvasComponent } from './components/pan-zoom-canvas/pan-zoom-canvas.component';
import { DataFileListComponent } from './containers/data-file-list/data-file-list.component';
import { ImageViewerStatusBarComponent } from './components/image-viewer-status-bar/image-viewer-status-bar.component';
import { ImageViewerMarkerOverlayComponent } from './components/image-viewer-marker-overlay/image-viewer-marker-overlay.component';
import { NormalizerFormComponent } from './components/normalizer-form/normalizer-form.component';
import { SourceExtractionRegionDialogComponent } from './components/source-extraction-dialog/source-extraction-dialog.component';
import { SvgRectangleMarkerComponent } from './components/svg-rectangle-marker/svg-rectangle-marker.component';
import { SvgLineMarkerComponent } from './components/svg-line-marker/svg-line-marker.component';
import { SvgCircleMarkerComponent } from './components/svg-circle-marker/svg-circle-marker.component';
import { CircleMarkerEditorComponent } from './components/circle-marker-editor/circle-marker-editor.component';
import { SvgTeardropMarkerComponent } from './components/svg-teardrop-marker/svg-teardrop-marker.component';
import { PlotterComponent } from './components/plotter/plotter.component';
import { AppFooterComponent } from './components/app-footer/app-footer.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { WorkbenchComponent } from './containers/workbench.component';
import { DisplayToolPanelComponent } from './containers/display-panel/display-panel.component';
import { PlottingPanelComponent } from './containers/plotting-panel/plotting-panel.component';
import { CustomMarkerPanelComponent } from './containers/custom-marker-panel/custom-marker-panel.component';
import { FileInfoToolsetComponent } from './containers/file-info-panel/file-info-panel.component';
import { AfterglowDataFileService } from './services/afterglow-data-files';
import { AfterglowDataProviderService } from './services/afterglow-data-providers';
import { JobsModule } from '../jobs/jobs.module';
import { SvgTextMarkerComponent } from './components/svg-text-marker/svg-text-marker.component';

import { ReactiveFormsModule } from '@angular/forms';
import { AfterglowCatalogService } from './services/afterglow-catalogs';
import { FlexLayoutModule } from '@angular/flex-layout';
import { AfterglowFieldCalService } from './services/afterglow-field-cals';
import { ThemePickerModule } from '../theme-picker';
import { PixelOpsJobsDialogComponent } from './components/pixel-ops-jobs-dialog/pixel-ops-jobs-dialog.component';
import { AfterglowPlotlyModule } from '../afterglow-plotly/afterglow-plotly.module';
import { HelpDialogComponent } from './components/help-dialog/help-dialog.component';
import { RectangleMarkerEditorComponent } from './components/rectangle-marker-editor/rectangle-marker-editor.component';
import { AvatarModule } from 'ngx-avatar';
import { ViewerPanelLayoutComponent } from './containers/viewer-panel-layout/viewer-panel-layout.component';
import { SaveChangesDialogComponent } from './components/file-dialog/file-dialog.component';
import { JobProgressDialogComponent } from './components/job-progress-dialog/job-progress-dialog.component';
import { KeyboardShortcutsModule } from 'ng-keyboard-shortcuts';
import { FileListOptionComponent } from './containers/file-list-option/file-list-option.component';
import { FileToolbarComponent } from './components/file-toolbar/file-toolbar.component';
import { ImageLayerToolbarComponent } from './components/image-layer-toolbar/image-layer-toolbar.component';
import { MatDialogModule } from '@angular/material/dialog';
import { SvgOutlinedEllipseComponent } from './components/svg-outlined-ellipse/svg-outlined-ellipse.component';
import { ImageViewerEventService } from './services/image-viewer-event.service';
import { CatalogImportComponent } from './components/catalog-import/catalog-import.component';
import { ImageViewerMarkerService } from './services/image-viewer-marker.service';
import { ImageOrientationToolbarComponent } from './components/image-orientation-toolbar/image-orientation-toolbar.component';
import { SvgPhotometryMarkerComponent } from './components/svg-photometry-marker/svg-photometry-marker.component';
import { SvgCrosshairMarkerComponent } from './components/svg-crosshair-marker/svg-crosshair-marker.component';
import { PsfMatchingDialogComponent } from './components/psf-matching-dialog/psf-matching-dialog.component';
import { ColorPickerModule } from 'ngx-color-picker';
import { RenameLayerDialogComponent } from './components/rename-layer-dialog/rename-layer-dialog.component';
import { RenameFileDialogComponent } from './components/rename-file-dialog/rename-file-dialog.component';
import { PhotometricColorBalanceDialogComponent } from './components/photometric-color-balance-dialog/photometric-color-balance-dialog.component';
import { SourceNeutralizationDialogComponent } from './components/source-neutralization-dialog/source-neutralization-dialog.component';
import { SvgSourceMarkerComponent } from './components/svg-source-marker/svg-source-marker.component';
import { MergeSourcesDialogComponent } from './tools/source-catalog/merge-sources-dialog/merge-sources-dialog.component';
import { CosmeticCorrectionModule } from './tools/cosmetic-correction/cosmetic-correction.module';
import { PixelOpsModule } from './tools/pixel-ops/pixel-ops.module';
import { StackingModule } from './tools/stacking/stacking.module';
import { AligningModule } from './tools/aligning/aligning.module';
import { SourceCatalogModule } from './tools/source-catalog/source-catalog.module';
import { PhotometryModule } from './tools/photometry/photometry.module';
import { WcsCalibrationModule } from './tools/wcs-calibration/wcs-calibration.module';
import { SonificationModule } from './tools/sonification/sonification.module';

export const COMPONENTS = [
  NavbarComponent,
  AppFooterComponent,
  DataFileListComponent,
  ImageViewerComponent,
  PanZoomCanvasComponent,
  ImageViewerMarkerOverlayComponent,
  ImageViewerStatusBarComponent,
  NormalizerFormComponent,
  SvgRectangleMarkerComponent,
  SvgCircleMarkerComponent,
  SvgTextMarkerComponent,
  SvgTeardropMarkerComponent,
  SvgPhotometryMarkerComponent,
  SvgLineMarkerComponent,
  SvgCrosshairMarkerComponent,
  SvgOutlinedEllipseComponent,
  WorkbenchComponent,
  DisplayToolPanelComponent,
  PlottingPanelComponent,
  SourceExtractionRegionDialogComponent,
  PlotterComponent,
  CustomMarkerPanelComponent,
  CircleMarkerEditorComponent,
  RectangleMarkerEditorComponent,
  FileInfoToolsetComponent,
  PixelOpsJobsDialogComponent,
  HelpDialogComponent,
  ViewerPanelComponent,
  ViewerPanelLayoutComponent,
  SaveChangesDialogComponent,
  JobProgressDialogComponent,
  FileToolbarComponent,
  ImageLayerToolbarComponent,
  FileListOptionComponent,
  CatalogImportComponent,
  ImageOrientationToolbarComponent,
  PsfMatchingDialogComponent,
  RenameLayerDialogComponent,
  RenameFileDialogComponent,
  PhotometricColorBalanceDialogComponent,
  SourceNeutralizationDialogComponent,
  SvgSourceMarkerComponent,
  MergeSourcesDialogComponent
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
    AppMaterialModule,
    KeyboardShortcutsModule.forRoot(),
    FlexLayoutModule,
    ThemePickerModule,
    AfterglowPlotlyModule,
    AvatarModule,
    ColorPickerModule,
    MatDialogModule,
    LogMonitorModule,
    CosmeticCorrectionModule,
    PixelOpsModule,
    StackingModule,
    AligningModule,
    SourceCatalogModule,
    PhotometryModule,
    MatDialogModule,
    WcsCalibrationModule,
    SonificationModule
  ],
  declarations: COMPONENTS,
  exports: COMPONENTS
})
export class WorkbenchModule {
  static forRoot(): ModuleWithProviders<WorkbenchModule> {
    return {
      ngModule: WorkbenchModule,
      providers: [
        AfterglowDataFileService,
        AfterglowDataProviderService,
        AfterglowCatalogService,
        AfterglowFieldCalService,
        ImageViewerEventService,
        ImageViewerMarkerService,
      ],
    };
  }
}
