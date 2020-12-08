"use strict";
var __assign =
  (this && this.__assign) ||
  function () {
    __assign =
      Object.assign ||
      function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
    return __assign.apply(this, arguments);
  };
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r = c < 3 ? target : desc === null ? (desc = Object.getOwnPropertyDescriptor(target, key)) : desc,
      d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i])) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
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
var WorkbenchDataFileListComponent = /** @class */ (function () {
  function WorkbenchDataFileListComponent(store) {
    var _a;
    var _this = this;
    this.store = store;
    this.selectedItem$ = new rxjs_1.BehaviorSubject(null);
    this.files$ = new rxjs_1.BehaviorSubject(null);
    this.onSelectionChange = new core_1.EventEmitter();
    this.HduType = data_file_type_1.HduType;
    this.actionMapping = {
      mouse: {
        click: function (tree, node, $event) {
          return _this.onItemClick(tree, node, $event);
        },
        dblClick: function (tree, node, $event) {
          return _this.onItemDblClick(tree, node, $event);
        },
      },
      keys:
        ((_a = {}),
        (_a[angular_tree_component_1.KEYS.SPACE] = function (tree, node, $event) {
          return _this.onItemClick(tree, node, $event);
        }),
        (_a[angular_tree_component_1.KEYS.ENTER] = function (tree, node, $event) {
          return _this.onItemClick(tree, node, $event);
        }),
        _a),
    };
    this.options = {
      actionMapping: this.actionMapping,
    };
    this.nodes$ = this.files$.pipe(
      operators_1.distinctUntilChanged(function (a, b) {
        return (
          a &&
          b &&
          a.length == b.length &&
          a.every(function (value, index) {
            return b[index].id == value.id;
          })
        );
      }),
      operators_1.switchMap(function (files) {
        var hduEntities = _this.store.selectSnapshot(data_files_state_1.DataFilesState.getHduEntities);
        return rxjs_1.combineLatest.apply(
          void 0,
          files.map(function (file) {
            return _this.store.select(data_files_state_1.DataFilesState.getDataFileById).pipe(
              operators_1.map(function (fn) {
                return fn(file.id);
              }),
              operators_1.distinctUntilChanged(function (a, b) {
                return a && b && a.name == b.name && a.hduIds == b.hduIds;
              }),
              operators_1.map(function (file) {
                var result;
                if (file.hduIds.length > 1) {
                  result = {
                    id: file.id,
                    name: file.name,
                    children: file.hduIds.map(function (hduId, index) {
                      return {
                        id: file.id + "-" + hduId,
                        name: "Channel " + index,
                        children: [],
                        hasChildren: false,
                        isExpanded: false,
                        fileId: file.id,
                        hduId: hduId,
                        icon: hduEntities[hduId].hduType == data_file_type_1.HduType.IMAGE ? "insert_photo" : "toc",
                      };
                    }),
                    hasChildren: true,
                    isExpanded: true,
                    fileId: file.id,
                    hduId: null,
                    // icon: 'insert_drive_file'
                    icon: null,
                  };
                } else {
                  var hduId = file.hduIds[0];
                  result = {
                    id: file.id + "-" + hduId,
                    name: file.name,
                    children: [],
                    hasChildren: false,
                    isExpanded: false,
                    fileId: file.id,
                    hduId: hduId,
                    icon: hduEntities[hduId].hduType == data_file_type_1.HduType.IMAGE ? "insert_photo" : "toc",
                  };
                }
                return result;
              })
            );
          })
        );
      })
    );
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
    configurable: true,
  });
  Object.defineProperty(WorkbenchDataFileListComponent.prototype, "files", {
    get: function () {
      return this.files$.getValue();
    },
    set: function (files) {
      this.files$.next(files);
    },
    enumerable: false,
    configurable: true,
  });
  WorkbenchDataFileListComponent.prototype.trackByFn = function (index, value) {
    if (!value) return null;
    return value.type + "-" + value.id;
  };
  WorkbenchDataFileListComponent.prototype.onItemClick = function (tree, node, $event) {
    this.onSelectionChange.emit({ item: { fileId: node.data.fileId, hduId: node.data.hduId }, doubleClick: false });
    return angular_tree_component_1.TREE_ACTIONS.SELECT(tree, node, $event);
  };
  WorkbenchDataFileListComponent.prototype.onItemDblClick = function (tree, node, $event) {
    this.onSelectionChange.emit({ item: { fileId: node.data.fileId, hduId: node.data.hduId }, doubleClick: true });
    return angular_tree_component_1.TREE_ACTIONS.SELECT(tree, node, $event);
  };
  __decorate([core_1.Input("selectedItem")], WorkbenchDataFileListComponent.prototype, "selectedItem");
  __decorate([core_1.Input("files")], WorkbenchDataFileListComponent.prototype, "files");
  __decorate([core_1.Output()], WorkbenchDataFileListComponent.prototype, "onSelectionChange");
  WorkbenchDataFileListComponent = __decorate(
    [
      core_1.Component({
        selector: "app-workbench-data-file-list",
        templateUrl: "./workbench-data-file-list.component.html",
        styleUrls: ["./workbench-data-file-list.component.css"],
      }),
    ],
    WorkbenchDataFileListComponent
  );
  return WorkbenchDataFileListComponent;
})();
exports.WorkbenchDataFileListComponent = WorkbenchDataFileListComponent;
