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
var WorkbenchDataFileListComponent = /** @class */ (function () {
    function WorkbenchDataFileListComponent() {
        this.files$ = new rxjs_1.BehaviorSubject(null);
        this.onSelectionChange = new core_1.EventEmitter();
        this.nodes = [
            {
                id: 1,
                name: 'root1',
                children: [
                    { id: 2, name: 'child1' },
                    { id: 3, name: 'child2' }
                ]
            },
            {
                id: 4,
                name: 'root2',
                children: [
                    { id: 5, name: 'child2.1' },
                    {
                        id: 6,
                        name: 'child2.2',
                        children: [
                            { id: 7, name: 'subsub' }
                        ]
                    }
                ]
            }
        ];
        this.options = {};
    }
    Object.defineProperty(WorkbenchDataFileListComponent.prototype, "files", {
        get: function () {
            return this.files$.getValue();
        },
        set: function (files) {
            this.files$.next(files);
        },
        enumerable: false,
        configurable: true
    });
    WorkbenchDataFileListComponent.prototype.trackByFn = function (index, value) {
        return value.id;
    };
    WorkbenchDataFileListComponent.prototype.onRowClick = function (file, hdu) {
        if (file.id == this.selectedFileId)
            return;
        this.selectedFileId = file.id;
        this.onSelectionChange.emit({ file: file, doubleClick: false });
        // this.preventSingleClick = false;
        //  const delay = 200;
        //   this.timer = setTimeout(() => {
        //     if (!this.preventSingleClick) {
        //       this.selectedFileId = file.id;
        //       this.onSelectionChange.emit({file: file, doubleClick: false});
        //     }
        //   }, delay);
    };
    WorkbenchDataFileListComponent.prototype.onRowDoubleClick = function (file, hdu) {
        // this.preventSingleClick = true;
        // clearTimeout(this.timer);
        this.selectedFileId = file.id;
        this.onSelectionChange.emit({ file: file, doubleClick: true });
    };
    __decorate([
        core_1.Input()
    ], WorkbenchDataFileListComponent.prototype, "selectedFileId");
    __decorate([
        core_1.Input()
    ], WorkbenchDataFileListComponent.prototype, "selectedHduIndex");
    __decorate([
        core_1.Input("files")
    ], WorkbenchDataFileListComponent.prototype, "files");
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
