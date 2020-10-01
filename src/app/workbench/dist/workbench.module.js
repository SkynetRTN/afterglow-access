"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.WorkbenchModule = exports.COMPONENTS = void 0;
var core_1 = require("@angular/core");
var common_1 = require("@angular/common");
var router_1 = require("@angular/router");
var forms_1 = require("@angular/forms");
//Angular Material
var material_1 = require("../material");
//Covalent
// import { CovalentDataTableModule } from '@covalent/core';
// Videogular2
var core_2 = require("videogular2/core");
var controls_1 = require("videogular2/controls");
var overlay_play_1 = require("videogular2/overlay-play");
var buffering_1 = require("videogular2/buffering");
// import { NvD3Module } from 'ng2-nvd3';
// import 'd3';
// import 'nvd3';
// import { TreeModule,  } from '@circlon/angular-tree-component';
var utils_module_1 = require("../utils/utils.module");
var pipes_module_1 = require("../pipes/pipes.module");
var data_files_module_1 = require("../data-files/data-files.module");
var data_providers_module_1 = require("../data-providers/data-providers.module");
var workbench_viewer_component_1 = require("./containers/workbench-viewer/workbench-viewer.component");
var workbench_viewer_panel_component_1 = require("./containers/workbench-viewer-panel/workbench-viewer-panel.component");
var pan_zoom_canvas_component_1 = require("./components/pan-zoom-canvas/pan-zoom-canvas.component");
var workbench_data_file_list_component_1 = require("./containers/workbench-data-file-list/workbench-data-file-list.component");
var image_viewer_status_bar_component_1 = require("./components/image-viewer-status-bar/image-viewer-status-bar.component");
var image_viewer_marker_overlay_component_1 = require("./components/image-viewer-marker-overlay/image-viewer-marker-overlay.component");
var image_viewer_title_bar_component_1 = require("./components/image-viewer-title-bar/image-viewer-title-bar.component");
var normalizer_form_component_1 = require("./components/normalizer-form/normalizer-form.component");
var phot_settings_dialog_component_1 = require("./components/phot-settings-dialog/phot-settings-dialog.component");
var source_extraction_dialog_component_1 = require("./components/source-extraction-dialog/source-extraction-dialog.component");
var svg_rectangle_marker_component_1 = require("./components/svg-rectangle-marker/svg-rectangle-marker.component");
var svg_line_marker_component_1 = require("./components/svg-line-marker/svg-line-marker.component");
var svg_circle_marker_component_1 = require("./components/svg-circle-marker/svg-circle-marker.component");
var circle_marker_editor_component_1 = require("./components/circle-marker-editor/circle-marker-editor.component");
var svg_teardrop_marker_component_1 = require("./components/svg-teardrop-marker/svg-teardrop-marker.component");
var plotter_component_1 = require("./components/plotter/plotter.component");
var app_footer_component_1 = require("./components/app-footer/app-footer.component");
var navbar_component_1 = require("./components/navbar/navbar.component");
var data_providers_component_1 = require("./containers/data-providers/data-providers.component");
var data_providers_index_page_component_1 = require("./containers/data-providers/data-providers-index-page/data-providers-index-page.component");
var data_provider_browse_page_component_1 = require("./containers/data-providers/data-provider-browse-page/data-provider-browse-page.component");
var workbench_component_1 = require("./containers/workbench.component");
var display_panel_component_1 = require("./components/display-panel/display-panel.component");
var plotting_panel_component_1 = require("./components/plotting-panel/plotting-panel.component");
var custom_marker_panel_component_1 = require("./components/custom-marker-panel/custom-marker-panel.component");
var sonification_panel_component_1 = require("./components/sonification-panel/sonification-panel.component");
var file_info_panel_component_1 = require("./components/file-info-panel/file-info-panel.component");
var photometry_panel_component_1 = require("./components/photometry-panel/photometry-panel.component");
var pixel_ops_panel_component_1 = require("./components/pixel-ops-panel/pixel-ops-panel.component");
var stacking_panel_component_1 = require("./components/stacking-panel/stacking-panel.component");
var aligning_panel_component_1 = require("./components/aligning-panel/aligning-panel.component");
var afterglow_data_files_1 = require("./services/afterglow-data-files");
var afterglow_data_providers_1 = require("./services/afterglow-data-providers");
var jobs_module_1 = require("../jobs/jobs.module");
var svg_text_marker_component_1 = require("./components/svg-text-marker/svg-text-marker.component");
var forms_2 = require("@angular/forms");
var afterglow_catalogs_1 = require("./services/afterglow-catalogs");
var create_field_cal_dialog_component_1 = require("./components/create-field-cal-dialog/create-field-cal-dialog.component");
var flex_layout_1 = require("@angular/flex-layout");
var afterglow_field_cals_1 = require("./services/afterglow-field-cals");
var theme_picker_1 = require("../theme-picker");
var pixel_ops_jobs_dialog_component_1 = require("./components/pixel-ops-jobs-dialog/pixel-ops-jobs-dialog.component");
var afterglow_plotly_module_1 = require("../afterglow-plotly/afterglow-plotly.module");
var help_dialog_component_1 = require("./components/help-dialog/help-dialog.component");
var rectangle_marker_editor_component_1 = require("./components/rectangle-marker-editor/rectangle-marker-editor.component");
var theme_dialog_component_1 = require("./components/theme-dialog/theme-dialog.component");
var confirmation_dialog_component_1 = require("./components/confirmation-dialog/confirmation-dialog.component");
var ngx_avatar_1 = require("ngx-avatar");
var workbench_viewer_layout_component_1 = require("./containers/workbench-viewer-layout/workbench-viewer-layout.component");
exports.COMPONENTS = [
    navbar_component_1.NavbarComponent,
    app_footer_component_1.AppFooterComponent,
    workbench_data_file_list_component_1.WorkbenchDataFileListComponent,
    workbench_viewer_component_1.WorkbenchViewerComponent,
    pan_zoom_canvas_component_1.PanZoomCanvasComponent,
    image_viewer_marker_overlay_component_1.ImageViewerMarkerOverlayComponent,
    image_viewer_title_bar_component_1.ImageViewerTitleBarComponent,
    image_viewer_status_bar_component_1.ImageViewerStatusBarComponent,
    normalizer_form_component_1.NormalizerFormComponent,
    svg_rectangle_marker_component_1.SvgRectangleMarkerComponent,
    svg_circle_marker_component_1.SvgCircleMarkerComponent,
    svg_text_marker_component_1.SvgTextMarkerComponent,
    svg_teardrop_marker_component_1.SvgTeardropMarkerComponent,
    svg_line_marker_component_1.SvgLineMarkerComponent,
    data_providers_component_1.DataProvidersComponent,
    data_providers_index_page_component_1.DataProvidersIndexPageComponent,
    data_provider_browse_page_component_1.DataProviderBrowsePageComponent,
    workbench_component_1.WorkbenchComponent,
    display_panel_component_1.DisplayToolsetComponent,
    plotting_panel_component_1.PlottingPanelComponent,
    sonification_panel_component_1.SonificationPanelComponent,
    photometry_panel_component_1.PhotometryPageComponent,
    pixel_ops_panel_component_1.ImageCalculatorPageComponent,
    stacking_panel_component_1.StackerPageComponent,
    aligning_panel_component_1.AlignerPageComponent,
    phot_settings_dialog_component_1.PhotSettingsDialogComponent,
    source_extraction_dialog_component_1.SourceExtractionDialogComponent,
    create_field_cal_dialog_component_1.CreateFieldCalDialogComponent,
    plotter_component_1.PlotterComponent,
    custom_marker_panel_component_1.CustomMarkerPanelComponent,
    circle_marker_editor_component_1.CircleMarkerEditorComponent,
    rectangle_marker_editor_component_1.RectangleMarkerEditorComponent,
    file_info_panel_component_1.FileInfoToolsetComponent,
    pixel_ops_jobs_dialog_component_1.PixelOpsJobsDialogComponent,
    help_dialog_component_1.HelpDialogComponent,
    theme_dialog_component_1.ThemeDialogComponent,
    confirmation_dialog_component_1.ConfirmationDialogComponent,
    workbench_viewer_panel_component_1.WorkbenchViewerPanelComponent,
    workbench_viewer_layout_component_1.WorkbenchViewerLayoutComponent
];
var WorkbenchModule = /** @class */ (function () {
    function WorkbenchModule() {
    }
    WorkbenchModule_1 = WorkbenchModule;
    WorkbenchModule.forRoot = function () {
        return {
            ngModule: WorkbenchModule_1,
            providers: [afterglow_data_files_1.AfterglowDataFileService, afterglow_data_providers_1.AfterglowDataProviderService, afterglow_catalogs_1.AfterglowCatalogService, afterglow_field_cals_1.AfterglowFieldCalService]
        };
    };
    var WorkbenchModule_1;
    WorkbenchModule = WorkbenchModule_1 = __decorate([
        core_1.NgModule({
            imports: [
                // TreeModule,
                router_1.RouterModule,
                common_1.CommonModule,
                forms_1.FormsModule,
                forms_2.ReactiveFormsModule,
                utils_module_1.UtilsModule.forRoot(),
                pipes_module_1.PipesModule,
                data_providers_module_1.DataProvidersModule,
                data_files_module_1.DataFilesModule,
                jobs_module_1.JobsModule,
                material_1.MaterialModule,
                // CovalentDataTableModule,
                core_2.VgCoreModule,
                controls_1.VgControlsModule,
                overlay_play_1.VgOverlayPlayModule,
                buffering_1.VgBufferingModule,
                // NvD3Module,
                flex_layout_1.FlexLayoutModule,
                theme_picker_1.ThemePickerModule,
                afterglow_plotly_module_1.AfterglowPlotlyModule,
                ngx_avatar_1.AvatarModule,
            ],
            declarations: exports.COMPONENTS,
            exports: exports.COMPONENTS,
            entryComponents: [
                phot_settings_dialog_component_1.PhotSettingsDialogComponent,
                source_extraction_dialog_component_1.SourceExtractionDialogComponent,
                create_field_cal_dialog_component_1.CreateFieldCalDialogComponent,
                pixel_ops_jobs_dialog_component_1.PixelOpsJobsDialogComponent,
                help_dialog_component_1.HelpDialogComponent,
                theme_dialog_component_1.ThemeDialogComponent,
                confirmation_dialog_component_1.ConfirmationDialogComponent
            ]
        })
    ], WorkbenchModule);
    return WorkbenchModule;
}());
exports.WorkbenchModule = WorkbenchModule;
