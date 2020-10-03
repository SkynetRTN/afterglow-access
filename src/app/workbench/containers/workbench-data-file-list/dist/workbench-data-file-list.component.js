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
var data_files_state_1 = require("../../../data-files/data-files.state");
var WorkbenchDataFileListComponent = /** @class */ (function () {
    function WorkbenchDataFileListComponent(store) {
        this.store = store;
        this.onSelectionChange = new core_1.EventEmitter();
    }
    WorkbenchDataFileListComponent.prototype.trackByFn = function (index, value) {
        return value.id && value.type;
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
    WorkbenchDataFileListComponent.prototype.getHduName = function (hdu) {
        var fileEntities = this.store.selectSnapshot(data_files_state_1.DataFilesState.getDataFileEntities);
        var file = fileEntities[hdu.fileId];
        if (!file)
            return '???????';
        return file.hduIds.length > 1 ? "Channel " + file.hduIds.indexOf(hdu.id) : file.name;
    };
    __decorate([
        core_1.Input()
    ], WorkbenchDataFileListComponent.prototype, "selectedItem");
    __decorate([
        core_1.Input()
    ], WorkbenchDataFileListComponent.prototype, "items");
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
