"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.WorkbenchDataFileListComponent = void 0;
var core_1 = require("@angular/core");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var data_files_state_1 = require("../../../data-files/data-files.state");
var WorkbenchDataFileListComponent = /** @class */ (function () {
    function WorkbenchDataFileListComponent(store) {
        var _this = this;
        this.store = store;
        this.onSelectionChange = new core_1.EventEmitter();
        this.options = {};
        this.dataFiles$ = this.store.select(data_files_state_1.DataFilesState.getDataFiles);
        this.dataFileEntities$ = this.store.select(data_files_state_1.DataFilesState.getDataFileEntities);
        this.hduEntities$ = this.store.select(data_files_state_1.DataFilesState.getHduEntities);
        this.rows$ = this.dataFiles$.pipe(operators_1.map(function (dataFiles) {
            var result = [];
            dataFiles.forEach(function (file) {
                result.push({
                    id: file.id,
                    type: 'file',
                    name: file.name,
                    data: file
                });
                if (file.hduIds.length > 1) {
                    var hduEntities_1 = _this.store.selectSnapshot(data_files_state_1.DataFilesState.getHduEntities);
                    file.hduIds.map(function (hduId) { return hduEntities_1[hduId]; })
                        .sort(function (a, b) { return (a.order > b.order) ? 1 : -1; }).forEach(function (hdu, index) {
                        result.push({
                            id: hdu.id,
                            type: 'hdu',
                            name: "Channel " + index,
                            data: hdu
                        });
                    });
                }
            });
            return result;
        }));
        this.nodes$ = rxjs_1.combineLatest(this.store.select(data_files_state_1.DataFilesState.getDataFileEntities), this.store.select(data_files_state_1.DataFilesState.getHduEntities)).pipe(operators_1.map(function (_a) {
            var fileEntities = _a[0], hduEntities = _a[1];
            return Object.values(fileEntities)
                .sort(function (a, b) { return (a.name > b.name) ? 1 : -1; })
                .map(function (file) {
                var hdus = Object.values(hduEntities).filter(function (hdu) { return hdu.fileId == file.id; });
                if (hdus.length > 1) {
                    return {
                        id: file.id,
                        name: file.name,
                        children: hdus.map(function (hdu, index) {
                            return {
                                id: hdu.id,
                                name: "Channel " + index
                            };
                        })
                    };
                }
                else {
                    var hdu = hdus[0];
                    return {
                        id: hdu.id,
                        name: file.name
                    };
                }
            });
        }));
    }
    WorkbenchDataFileListComponent.prototype.trackByFn = function (index, value) {
        return value.id;
    };
    WorkbenchDataFileListComponent.prototype.onRowClick = function (item) {
        if (this.selectedItem.type == item.type && this.selectedItem.id == item.id)
            return;
        this.selectedItem = item;
        this.onSelectionChange.emit({ item: item, doubleClick: false });
    };
    WorkbenchDataFileListComponent.prototype.onRowDoubleClick = function (item) {
        if (this.selectedItem.type == item.type && this.selectedItem.id == item.id)
            return;
        this.selectedItem = item;
        this.onSelectionChange.emit({ item: item, doubleClick: true });
    };
    __decorate([
        core_1.Input()
    ], WorkbenchDataFileListComponent.prototype, "selectedItem");
    __decorate([
        core_1.Output()
    ], WorkbenchDataFileListComponent.prototype, "onSelectionChange");
    WorkbenchDataFileListComponent = __decorate([
        core_1.Component({
            selector: 'app-workbench-data-file-list',
            templateUrl: './workbench-data-file-list.component.html',
            styleUrls: ['./workbench-data-file-list.component.css']
        })
    ], WorkbenchDataFileListComponent);
    return WorkbenchDataFileListComponent;
}());
exports.WorkbenchDataFileListComponent = WorkbenchDataFileListComponent;
