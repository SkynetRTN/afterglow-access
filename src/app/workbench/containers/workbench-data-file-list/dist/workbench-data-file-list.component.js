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
exports.WorkbenchDataFileListComponent = void 0;
var core_1 = require("@angular/core");
var data_file_type_1 = require("../../../data-files/models/data-file-type");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var data_files_state_1 = require("../../../data-files/data-files.state");
var angular_tree_component_1 = require("@circlon/angular-tree-component");
var data_providers_state_1 = require("../../../data-providers/data-providers.state");
var WorkbenchDataFileListComponent = /** @class */ (function () {
    function WorkbenchDataFileListComponent(store) {
        var _a;
        var _this = this;
        this.store = store;
        this.selectedItem$ = new rxjs_1.BehaviorSubject(null);
        this.files$ = new rxjs_1.BehaviorSubject(null);
        this.onSelectionChange = new core_1.EventEmitter();
        this.onItemDoubleClick = new core_1.EventEmitter();
        this.onCloseFile = new core_1.EventEmitter();
        this.onSaveFile = new core_1.EventEmitter();
        this.HduType = data_file_type_1.HduType;
        this.treeFocused = false;
        this.hoverNodeId = null;
        this.actionMapping = {
            mouse: {
                click: function (tree, node, $event) { return _this.onItemClick(tree, node, $event); },
                dblClick: function (tree, node, $event) { return _this.onItemDblClick(tree, node, $event); }
            },
            keys: (_a = {},
                _a[angular_tree_component_1.KEYS.SPACE] = function (tree, node, $event) { return _this.onItemClick(tree, node, $event); },
                _a[angular_tree_component_1.KEYS.ENTER] = function (tree, node, $event) { return _this.onItemClick(tree, node, $event); },
                _a)
        };
        this.options = {
            actionMapping: this.actionMapping
        };
        this.nodes$ = this.store.select(data_files_state_1.DataFilesState.getFileIds).pipe(operators_1.switchMap(function (fileIds) {
            return rxjs_1.combineLatest.apply(void 0, fileIds.map(function (fileId) {
                var file$ = _this.store.select(data_files_state_1.DataFilesState.getFileById).pipe(operators_1.map(function (fn) { return fn(fileId); }), operators_1.filter(function (f) { return f != null; }), operators_1.distinctUntilKeyChanged('id'), operators_1.distinctUntilKeyChanged('name'), operators_1.distinctUntilKeyChanged('hduIds'), operators_1.distinctUntilKeyChanged('name'));
                var hdus$ = file$.pipe(operators_1.switchMap(function (file) {
                    return rxjs_1.combineLatest(file.hduIds.map(function (hduId) { return _this.store.select(data_files_state_1.DataFilesState.getHduById).pipe(operators_1.map(function (fn) { return fn(hduId); }), operators_1.filter(function (f) { return f != null; }), operators_1.distinctUntilKeyChanged('id'), operators_1.distinctUntilKeyChanged('modified'), operators_1.distinctUntilKeyChanged('hduType')); }));
                }));
                return rxjs_1.combineLatest(file$, hdus$).pipe(operators_1.map(function (_a) {
                    var file = _a[0], hdus = _a[1];
                    var dataProvider = _this.store.selectSnapshot(data_providers_state_1.DataProvidersState.getDataProviderEntities)[file.dataProviderId];
                    var result = null;
                    var tooltip = file.name;
                    if (dataProvider && file.assetPath != null) {
                        tooltip = "" + dataProvider.name + file.assetPath;
                    }
                    if (hdus.length > 1) {
                        result = {
                            id: file.id,
                            name: file.name,
                            tooltip: tooltip,
                            children: hdus.map(function (hdu, index) { return ({
                                id: file.id + "-" + hdu.id,
                                name: "Channel " + index,
                                children: [],
                                hasChildren: false,
                                isExpanded: false,
                                fileId: file.id,
                                hduId: hdu.id,
                                showButtonBar: false,
                                icon: hdu.hduType == data_file_type_1.HduType.IMAGE ? "insert_photo" : "toc",
                                tooltip: tooltip + " - Channel " + index,
                                modified: null
                            }); }),
                            hasChildren: true,
                            isExpanded: true,
                            fileId: file.id,
                            hduId: null,
                            showButtonBar: true,
                            icon: null,
                            modified: hdus.map(function (hdu) { return hdu.modified; }).some(function (v) { return v; })
                        };
                    }
                    else if (hdus.length == 1) {
                        var hdu = hdus[0];
                        result = {
                            id: file.id + "-" + hdu.id,
                            name: file.name,
                            tooltip: tooltip,
                            children: [],
                            hasChildren: false,
                            isExpanded: false,
                            fileId: file.id,
                            hduId: hdu.id,
                            showButtonBar: true,
                            icon: hdu.hduType == data_file_type_1.HduType.IMAGE ? "insert_photo" : "toc",
                            modified: hdu.modified
                        };
                    }
                    return result;
                }));
            }));
        }));
        this.selectedItem$.subscribe(function (selectedItem) {
            var selectedNodeIds = {};
            var selectedItemId = null;
            if (selectedItem) {
                selectedItemId = selectedItem.fileId;
                if (selectedItem.hduId) {
                    selectedItemId = selectedItemId.concat("-" + selectedItem.hduId);
                }
                selectedNodeIds[selectedItemId] = true;
            }
            _this.state = __assign(__assign({}, _this.state), { activeNodeIds: selectedNodeIds, focusedNodeId: selectedItemId });
        });
    }
    Object.defineProperty(WorkbenchDataFileListComponent.prototype, "selectedItem", {
        get: function () {
            return this.selectedItem$.getValue();
        },
        set: function (files) {
            this.selectedItem$.next(files);
        },
        enumerable: false,
        configurable: true
    });
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
    WorkbenchDataFileListComponent.prototype.onItemClick = function (tree, node, $event) {
        if (!tree.focusedNode || tree.focusedNode.data.id != node.data.id) {
            this.onSelectionChange.emit({ item: { fileId: node.data.fileId, hduId: node.data.hduId } });
            return angular_tree_component_1.TREE_ACTIONS.SELECT(tree, node, $event);
        }
    };
    WorkbenchDataFileListComponent.prototype.onItemDblClick = function (tree, node, $event) {
        this.onItemDoubleClick.emit({ item: { fileId: node.data.fileId, hduId: node.data.hduId } });
        // return TREE_ACTIONS.SELECT(tree, node, $event);
    };
    WorkbenchDataFileListComponent.prototype.onFocus = function () {
        this.treeFocused = true;
    };
    WorkbenchDataFileListComponent.prototype.onBlur = function () {
        this.treeFocused = false;
    };
    WorkbenchDataFileListComponent.prototype.saveFile = function ($event, data) {
        $event.preventDefault();
        $event.stopImmediatePropagation();
        this.onSaveFile.emit(data.fileId);
    };
    WorkbenchDataFileListComponent.prototype.closeFile = function ($event, data) {
        $event.preventDefault();
        $event.stopImmediatePropagation();
        this.onCloseFile.emit(data.fileId);
    };
    WorkbenchDataFileListComponent.prototype.onMouseEnterNode = function (node) {
        this.hoverNodeId = node.id;
    };
    WorkbenchDataFileListComponent.prototype.onMouseLeaveNode = function (node) {
        this.hoverNodeId = null;
    };
    __decorate([
        core_1.Input("selectedItem")
    ], WorkbenchDataFileListComponent.prototype, "selectedItem");
    __decorate([
        core_1.Input("files")
    ], WorkbenchDataFileListComponent.prototype, "files");
    __decorate([
        core_1.Output()
    ], WorkbenchDataFileListComponent.prototype, "onSelectionChange");
    __decorate([
        core_1.Output()
    ], WorkbenchDataFileListComponent.prototype, "onItemDoubleClick");
    __decorate([
        core_1.Output()
    ], WorkbenchDataFileListComponent.prototype, "onCloseFile");
    __decorate([
        core_1.Output()
    ], WorkbenchDataFileListComponent.prototype, "onSaveFile");
    WorkbenchDataFileListComponent = __decorate([
        core_1.Component({
            selector: "app-workbench-data-file-list",
            templateUrl: "./workbench-data-file-list.component.html",
            styleUrls: ["./workbench-data-file-list.component.css"],
            changeDetection: core_1.ChangeDetectionStrategy.OnPush
        })
    ], WorkbenchDataFileListComponent);
    return WorkbenchDataFileListComponent;
}());
exports.WorkbenchDataFileListComponent = WorkbenchDataFileListComponent;
