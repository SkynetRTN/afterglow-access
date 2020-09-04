"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.AppModule = exports.imageFileStateSanitizer = exports.dataFileSanitizer = void 0;
var core_1 = require("@angular/core");
var store_1 = require("@ngxs/store");
var router_plugin_1 = require("@ngxs/router-plugin");
var common_1 = require("@angular/common");
var http_1 = require("@angular/common/http");
var http_2 = require("@angular/common/http");
var platform_browser_1 = require("@angular/platform-browser");
var animations_1 = require("@angular/platform-browser/animations");
var router_1 = require("@angular/router");
var ngx_cookie_1 = require("ngx-cookie");
var es_1 = require("@angular/common/locales/es");
common_2.registerLocaleData(es_1["default"], 'es');
var token_interceptor_1 = require("./token.interceptor");
var material_1 = require("./material");
var core_module_1 = require("./core/core.module");
var auth_module_1 = require("./auth/auth.module");
var angular2_hotkeys_1 = require("angular2-hotkeys");
var forms_1 = require("@angular/forms");
var flex_layout_1 = require("@angular/flex-layout");
var common_2 = require("@angular/common");
var ngx_avatar_1 = require("ngx-avatar");
var app_component_1 = require("./app.component");
var routes_1 = require("./routes");
var environment_1 = require("../environments/environment");
var ngx_popper_1 = require("ngx-popper");
var theme_picker_1 = require("./theme-picker");
var auth_state_1 = require("./auth/auth.state");
var jobs_state_1 = require("./jobs/jobs.state");
var data_providers_state_1 = require("./data-providers/data-providers.state");
var data_files_state_1 = require("./data-files/data-files.state");
var workbench_file_states_state_1 = require("./core/workbench-file-states.state");
var workbench_state_1 = require("./core/workbench.state");
var sources_state_1 = require("./core/sources.state");
var phot_data_state_1 = require("./core/phot-data.state.");
var public_api_1 = require("./storage-plugin/public_api");
var data_file_type_1 = require("./data-files/models/data-file-type");
var wasm_service_1 = require("./wasm.service");
function dataFileSanitizer(v) {
    var state = __assign({}, v);
    state.entities = __assign({}, state.entities);
    Object.keys(state.entities).forEach(function (key) {
        var dataFile = __assign({}, state.entities[key]);
        dataFile.header = null;
        dataFile.headerLoaded = false;
        dataFile.headerLoading = false;
        dataFile.wcs = null;
        if (dataFile.type == data_file_type_1.DataFileType.IMAGE) {
            var imageFile = dataFile;
            imageFile.hist = null;
            imageFile.histLoaded = false;
            imageFile.histLoading = false;
            imageFile.tilesInitialized = false;
            imageFile.tiles = [];
        }
        state.entities[key] = dataFile;
    });
    return state;
}
exports.dataFileSanitizer = dataFileSanitizer;
function imageFileStateSanitizer(v) {
    var state = __assign({}, v);
    state.entities = __assign({}, state.entities);
    Object.keys(state.entities).forEach(function (key) {
        var imageFileState = __assign({}, state.entities[key]);
        imageFileState.normalization = __assign(__assign({}, imageFileState.normalization), { initialized: false, normalizedTiles: [] });
        state.entities[key] = imageFileState;
    });
    return state;
}
exports.imageFileStateSanitizer = imageFileStateSanitizer;
var AppModule = /** @class */ (function () {
    function AppModule() {
    }
    AppModule = __decorate([
        core_1.NgModule({
            imports: [
                common_1.CommonModule,
                platform_browser_1.BrowserModule,
                animations_1.BrowserAnimationsModule,
                http_1.HttpClientModule,
                router_1.RouterModule.forRoot(routes_1.AFTERGLOW_ROUTES),
                material_1.MaterialModule,
                forms_1.ReactiveFormsModule,
                flex_layout_1.FlexLayoutModule,
                ngx_cookie_1.CookieModule.forRoot(),
                ngx_popper_1.NgxPopperModule,
                ngx_avatar_1.AvatarModule,
                theme_picker_1.ThemePickerModule,
                core_module_1.CoreModule.forRoot(),
                auth_module_1.AuthModule.forRoot(),
                angular2_hotkeys_1.HotkeyModule.forRoot({
                    disableCheatSheet: true
                }),
                store_1.NgxsModule.forRoot([auth_state_1.AuthState, jobs_state_1.JobsState, data_providers_state_1.DataProvidersState, data_files_state_1.DataFilesState, workbench_file_states_state_1.WorkbenchFileStates, workbench_state_1.WorkbenchState, sources_state_1.SourcesState, phot_data_state_1.PhotDataState], { developmentMode: !environment_1.appConfig.production }),
                public_api_1.AfterglowStoragePluginModule.forRoot({
                    key: [
                        auth_state_1.AuthState,
                        jobs_state_1.JobsState,
                        data_providers_state_1.DataProvidersState,
                        data_files_state_1.DataFilesState,
                        workbench_file_states_state_1.WorkbenchFileStates,
                        workbench_state_1.WorkbenchState,
                        sources_state_1.SourcesState,
                        phot_data_state_1.PhotDataState
                    ],
                    sanitizations: [
                        {
                            key: data_files_state_1.DataFilesState,
                            sanitize: dataFileSanitizer
                        },
                        {
                            key: workbench_file_states_state_1.WorkbenchFileStates,
                            sanitize: imageFileStateSanitizer
                        }
                    ],
                    storage: 1 /* SessionStorage */
                }),
                router_plugin_1.NgxsRouterPluginModule.forRoot(),
                environment_1.appConfig.plugins
            ],
            declarations: [
                app_component_1.AppComponent
            ],
            providers: [
                wasm_service_1.WasmService,
                {
                    provide: http_2.HTTP_INTERCEPTORS,
                    useClass: token_interceptor_1.TokenInterceptor,
                    multi: true
                },
            ],
            bootstrap: [app_component_1.AppComponent]
        })
    ], AppModule);
    return AppModule;
}());
exports.AppModule = AppModule;
