"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.FileInfoToolsetComponent = void 0;
var core_1 = require("@angular/core");
var data_file_1 = require("../../../data-files/models/data-file");
var skynet_astro_1 = require("../../../utils/skynet-astro");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var FileInfoToolsetComponent = /** @class */ (function () {
    function FileInfoToolsetComponent(decimalPipe, datePipe, store, router) {
        var _this = this;
        this.decimalPipe = decimalPipe;
        this.datePipe = datePipe;
        this.file$ = new rxjs_1.BehaviorSubject(null);
        this.config$ = new rxjs_1.BehaviorSubject(null);
        this.configChange = new core_1.EventEmitter();
        this.columnsDisplayed = ["key", "value", "comment"];
        var header$ = this.file$.pipe(operators_1.filter(function (file) { return file != null; }), operators_1.map(function (file) { return file.header; }), operators_1.distinctUntilChanged());
        this.headerSummary$ = rxjs_1.combineLatest(header$, this.config$).pipe(operators_1.map(function (_a) {
            var header = _a[0], config = _a[1];
            if (!header)
                return [];
            var result = [];
            var width = data_file_1.getWidth(_this.file);
            var height = data_file_1.getHeight(_this.file);
            var hasWcs = _this.file.wcs.isValid();
            var degsPerPixel = data_file_1.getDegsPerPixel(_this.file);
            var startTime = data_file_1.getStartTime(_this.file);
            var expLength = data_file_1.getExpLength(_this.file);
            var centerTime = data_file_1.getCenterTime(_this.file);
            var telescope = data_file_1.getTelescope(_this.file);
            var object = data_file_1.getObject(_this.file);
            var filter = data_file_1.getFilter(_this.file);
            var systemTimeZone = new Date().getTimezoneOffset().toString();
            result.push({
                key: "ID",
                value: "" + _this.file.id,
                comment: ""
            });
            if (width && height) {
                result.push({
                    key: "Size",
                    value: width + " x " + height + " pixels",
                    comment: ""
                });
                if (degsPerPixel) {
                    var fovX = width * degsPerPixel;
                    var fovY = height * degsPerPixel;
                    var units = "degs";
                    if (fovX < 1 && fovY < 1) {
                        units = "arcmins";
                        fovX *= 60;
                        fovY *= 60;
                    }
                    result.push({
                        key: "FOV",
                        value: _this.decimalPipe.transform(fovX, "1.0-1") + " x " + _this.decimalPipe.transform(fovY, "1.0-1") + " " + units,
                        comment: ""
                    });
                    if (startTime) {
                        result.push({
                            key: "Start Time",
                            value: "" + _this.datePipe.transform(startTime, "yyyy-MM-dd HH:mm:ss z", _this.config.useSystemTime ? systemTimeZone : "UTC"),
                            comment: ""
                        });
                        result.push({
                            key: "Start JD",
                            value: skynet_astro_1.datetimeToJd(startTime) + " JD",
                            comment: ""
                        });
                    }
                    if (centerTime) {
                        result.push({
                            key: "Center Time",
                            value: "" + _this.datePipe.transform(centerTime, "yyyy-MM-dd HH:mm:ss z", _this.config.useSystemTime ? systemTimeZone : "UTC"),
                            comment: ""
                        });
                        result.push({
                            key: "Center JD",
                            value: skynet_astro_1.datetimeToJd(centerTime) + " JD",
                            comment: ""
                        });
                    }
                    if (telescope) {
                        result.push({
                            key: "Telescope",
                            value: "" + telescope,
                            comment: ""
                        });
                    }
                    if (filter) {
                        result.push({
                            key: "Filter",
                            value: "" + filter,
                            comment: ""
                        });
                    }
                    if (expLength !== undefined) {
                        result.push({
                            key: "Exp Length",
                            value: "" + expLength,
                            comment: ""
                        });
                    }
                }
            }
            result.push({
                key: "WCS",
                value: hasWcs,
                comment: ""
            });
            return result;
        }));
    }
    Object.defineProperty(FileInfoToolsetComponent.prototype, "file", {
        get: function () {
            return this.file$.getValue();
        },
        set: function (file) {
            this.file$.next(file);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FileInfoToolsetComponent.prototype, "config", {
        get: function () {
            return this.config$.getValue();
        },
        set: function (config) {
            this.config$.next(config);
        },
        enumerable: false,
        configurable: true
    });
    FileInfoToolsetComponent.prototype.ngOnInit = function () { };
    FileInfoToolsetComponent.prototype.ngOnDestroy = function () { };
    FileInfoToolsetComponent.prototype.ngAfterViewInit = function () { };
    FileInfoToolsetComponent.prototype.onShowRawHeaderChange = function ($event) {
        this.configChange.emit({ showRawHeader: $event.checked });
    };
    FileInfoToolsetComponent.prototype.onUseSystemTimeChange = function ($event) {
        this.configChange.emit({ useSystemTime: $event.checked });
    };
    __decorate([
        core_1.Input("file")
    ], FileInfoToolsetComponent.prototype, "file");
    __decorate([
        core_1.Input("config")
    ], FileInfoToolsetComponent.prototype, "config");
    __decorate([
        core_1.Output()
    ], FileInfoToolsetComponent.prototype, "configChange");
    FileInfoToolsetComponent = __decorate([
        core_1.Component({
            selector: "app-file-info-panel",
            templateUrl: "./file-info-panel.component.html",
            styleUrls: ["./file-info-panel.component.css"]
        })
    ], FileInfoToolsetComponent);
    return FileInfoToolsetComponent;
}());
exports.FileInfoToolsetComponent = FileInfoToolsetComponent;
