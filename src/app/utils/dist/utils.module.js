"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.UtilsModule = exports.COMPONENTS = void 0;
var core_1 = require("@angular/core");
var common_1 = require("@angular/common");
var router_1 = require("@angular/router");
var forms_1 = require("@angular/forms");
//Angular Material
var material_1 = require("../material");
var cell_focuser_1 = require("./cell-focuser/cell-focuser");
var correlated_action_1 = require("./correlated-action");
exports.COMPONENTS = [
    cell_focuser_1.FocusableCell,
    cell_focuser_1.CellFocuser
];
var UtilsModule = /** @class */ (function () {
    function UtilsModule() {
    }
    UtilsModule_1 = UtilsModule;
    UtilsModule.forRoot = function () {
        return {
            ngModule: UtilsModule_1,
            providers: [
                correlated_action_1.CorrelationIdGenerator
            ]
        };
    };
    var UtilsModule_1;
    UtilsModule = UtilsModule_1 = __decorate([
        core_1.NgModule({
            imports: [
                router_1.RouterModule,
                common_1.CommonModule,
                forms_1.FormsModule,
                material_1.MaterialModule,
            ],
            declarations: exports.COMPONENTS,
            exports: exports.COMPONENTS
        })
    ], UtilsModule);
    return UtilsModule;
}());
exports.UtilsModule = UtilsModule;
