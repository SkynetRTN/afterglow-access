"use strict";
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
var __param =
  (this && this.__param) ||
  function (paramIndex, decorator) {
    return function (target, key) {
      decorator(target, key, paramIndex);
    };
  };
exports.__esModule = true;
exports.WorkbenchDataFileListComponent = exports.WORKBENCH_FILE_LIST_VALUE_ACCESSOR = exports.FileListItemComponent = void 0;
var core_1 = require("@angular/core");
var data_file_type_1 = require("../../../data-files/models/data-file-type");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var data_files_state_1 = require("../../../data-files/data-files.state");
var data_providers_state_1 = require("../../../data-providers/data-providers.state");
var forms_1 = require("@angular/forms");
var checkbox_1 = require("@angular/material/checkbox");
var workbench_actions_1 = require("../../workbench.actions");
var FileListItemComponent = /** @class */ (function () {
  function FileListItemComponent(store, fileList, _changeDetector) {
    var _this = this;
    this.store = store;
    this.fileList = fileList;
    this._changeDetector = _changeDetector;
    this.fileId$ = new rxjs_1.BehaviorSubject(null);
    this.focusedItem = null;
    this.expanded = false;
    this.selected = false;
    this.autoHideCheckbox = false;
    this.onSelectionChange = new core_1.EventEmitter();
    this.onItemDoubleClick = new core_1.EventEmitter();
    this.onToggleExpanded = new core_1.EventEmitter();
    this.onToggleSelection = new core_1.EventEmitter();
    this.onClose = new core_1.EventEmitter();
    this.onSave = new core_1.EventEmitter();
    this.HduType = data_file_type_1.HduType;
    this.mouseOver = false;
    this.hasFocus = false;
    this.file$ = this.fileId$.pipe(
      operators_1.distinctUntilChanged(),
      operators_1.switchMap(function (fileId) {
        return _this.store.select(data_files_state_1.DataFilesState.getFileById).pipe(
          operators_1.map(function (fn) {
            return fn(fileId);
          }),
          operators_1.filter(function (file) {
            return file != null;
          })
        );
      })
    );
    this.hdus$ = this.file$.pipe(
      operators_1.map(function (file) {
        return file.hduIds;
      }),
      operators_1.distinctUntilChanged(),
      operators_1.switchMap(function (hduIds) {
        return rxjs_1.combineLatest(
          hduIds.map(function (hduId) {
            return _this.store.select(data_files_state_1.DataFilesState.getHduById).pipe(
              operators_1.map(function (fn) {
                return fn(hduId);
              }),
              operators_1.filter(function (hdu) {
                return hdu != null;
              })
            );
          })
        );
      })
    );
    this.dataProvider$ = this.file$.pipe(
      operators_1.map(function (file) {
        return file.dataProviderId;
      }),
      operators_1.distinctUntilChanged(),
      operators_1.switchMap(function (id) {
        return _this.store.select(data_providers_state_1.DataProvidersState.getDataProviderById).pipe(
          operators_1.map(function (fn) {
            return fn(id);
          })
        );
      })
    );
    this.fileTooltip$ = rxjs_1.combineLatest(this.file$, this.dataProvider$).pipe(
      operators_1.map(function (_a) {
        var file = _a[0],
          dataProvider = _a[1];
        if (!dataProvider || !file.assetPath) return file.name;
        return "" + dataProvider.name + file.assetPath;
      })
    );
    this.modified$ = this.hdus$.pipe(
      operators_1.map(function (hdus) {
        return hdus.some(function (hdu) {
          return hdu.modified;
        });
      })
    );
  }
  Object.defineProperty(FileListItemComponent.prototype, "fileId", {
    get: function () {
      return this.fileId$.getValue();
    },
    set: function (fileId) {
      this.fileId$.next(fileId);
    },
    enumerable: false,
    configurable: true,
  });
  FileListItemComponent.prototype.ngOnInit = function () {};
  FileListItemComponent.prototype.toggleExpanded = function ($event) {
    $event.stopPropagation();
    this.onToggleExpanded.emit(this.fileId);
  };
  FileListItemComponent.prototype.save = function ($event) {
    $event.stopPropagation();
    this.onSave.emit(this.fileId);
  };
  FileListItemComponent.prototype.close = function ($event) {
    $event.stopPropagation();
    this.onClose.emit(this.fileId);
  };
  FileListItemComponent.prototype._handleFocus = function () {
    this.hasFocus = true;
  };
  FileListItemComponent.prototype._handleBlur = function () {
    this.hasFocus = false;
  };
  FileListItemComponent.prototype._handleMouseEnter = function () {
    this._handleFocus();
    this.mouseOver = true;
  };
  FileListItemComponent.prototype._handleMouseLeave = function () {
    this._handleBlur();
    this.mouseOver = false;
  };
  FileListItemComponent.prototype.toggleCheckbox = function ($event) {
    $event.stopPropagation();
    this.onToggleSelection.emit({ fileId: this.fileId, shiftKey: $event.shiftKey, ctrlKey: $event.ctrlKey });
  };
  __decorate([core_1.Input("fileId")], FileListItemComponent.prototype, "fileId");
  __decorate([core_1.Input()], FileListItemComponent.prototype, "focusedItem");
  __decorate([core_1.Input()], FileListItemComponent.prototype, "expanded");
  __decorate([core_1.Input()], FileListItemComponent.prototype, "selected");
  __decorate([core_1.Input()], FileListItemComponent.prototype, "autoHideCheckbox");
  __decorate([core_1.Output()], FileListItemComponent.prototype, "onSelectionChange");
  __decorate([core_1.Output()], FileListItemComponent.prototype, "onItemDoubleClick");
  __decorate([core_1.Output()], FileListItemComponent.prototype, "onToggleExpanded");
  __decorate([core_1.Output()], FileListItemComponent.prototype, "onToggleSelection");
  __decorate([core_1.Output()], FileListItemComponent.prototype, "onClose");
  __decorate([core_1.Output()], FileListItemComponent.prototype, "onSave");
  __decorate([core_1.ViewChild(checkbox_1.MatCheckbox)], FileListItemComponent.prototype, "checkbox");
  FileListItemComponent = __decorate(
    [
      core_1.Component({
        selector: "app-file-list-item",
        templateUrl: "./file-list-item.component.html",
        host: {
          "(focus)": "_handleFocus()",
          "(blur)": "_handleBlur()",
          "(mouseenter)": "_handleMouseEnter()",
          "(mouseleave)": "_handleMouseLeave()",
        },
        providers: [
          {
            provide: checkbox_1.MAT_CHECKBOX_DEFAULT_OPTIONS,
            useValue: { clickAction: "noop", color: "accent" },
          },
        ],
      }),
      __param(
        1,
        core_1.Inject(
          core_1.forwardRef(function () {
            return WorkbenchDataFileListComponent;
          })
        )
      ),
    ],
    FileListItemComponent
  );
  return FileListItemComponent;
})();
exports.FileListItemComponent = FileListItemComponent;
exports.WORKBENCH_FILE_LIST_VALUE_ACCESSOR = {
  provide: forms_1.NG_VALUE_ACCESSOR,
  useExisting: core_1.forwardRef(function () {
    return WorkbenchDataFileListComponent;
  }),
  multi: true,
};
var WorkbenchDataFileListComponent = /** @class */ (function () {
  function WorkbenchDataFileListComponent(store) {
    this.store = store;
    this.focusedItem$ = new rxjs_1.BehaviorSubject(null);
    this.files$ = new rxjs_1.BehaviorSubject(null);
    this.selectedFileIds$ = new rxjs_1.BehaviorSubject([]);
    // @Output() onSelectionChange = new EventEmitter<{
    //   item: FileListItem;
    // }>();
    this.onFocusedItemChange = new core_1.EventEmitter();
    this.onItemDoubleClick = new core_1.EventEmitter();
    this.onCloseFile = new core_1.EventEmitter();
    this.onSaveFile = new core_1.EventEmitter();
    this.destroy$ = new rxjs_1.Subject();
    this.HduType = data_file_type_1.HduType;
    this.collapsedFileIds = {};
  }
  Object.defineProperty(WorkbenchDataFileListComponent.prototype, "focusedItem", {
    get: function () {
      return this.focusedItem$.getValue();
    },
    set: function (item) {
      this.focusedItem$.next(item);
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
  Object.defineProperty(WorkbenchDataFileListComponent.prototype, "selectedFileIds", {
    get: function () {
      return this.selectedFileIds$.getValue();
    },
    set: function (selectedFileIds) {
      this.selectedFileIds$.next(selectedFileIds);
    },
    enumerable: false,
    configurable: true,
  });
  WorkbenchDataFileListComponent.prototype.ngOnDestroy = function () {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  };
  WorkbenchDataFileListComponent.prototype.onToggleExpanded = function (fileId) {
    if (fileId in this.collapsedFileIds) {
      delete this.collapsedFileIds[fileId];
    } else {
      this.collapsedFileIds[fileId] = true;
    }
  };
  WorkbenchDataFileListComponent.prototype.onToggleSelection = function ($event) {
    //TODO handle multi selection based on modifier keys
    this.store.dispatch(new workbench_actions_1.ToggleFileSelection($event.fileId));
  };
  WorkbenchDataFileListComponent.prototype.saveFile = function ($event, fileId) {
    $event.preventDefault();
    $event.stopImmediatePropagation();
    this.onSaveFile.emit(fileId);
  };
  WorkbenchDataFileListComponent.prototype.closeFile = function ($event, fileId) {
    $event.preventDefault();
    $event.stopImmediatePropagation();
    this.onCloseFile.emit(fileId);
  };
  __decorate([core_1.Input("focusedItem")], WorkbenchDataFileListComponent.prototype, "focusedItem");
  __decorate([core_1.Input("files")], WorkbenchDataFileListComponent.prototype, "files");
  __decorate([core_1.Input("selectedFileIds")], WorkbenchDataFileListComponent.prototype, "selectedFileIds");
  __decorate([core_1.Output()], WorkbenchDataFileListComponent.prototype, "onFocusedItemChange");
  __decorate([core_1.Output()], WorkbenchDataFileListComponent.prototype, "onItemDoubleClick");
  __decorate([core_1.Output()], WorkbenchDataFileListComponent.prototype, "onCloseFile");
  __decorate([core_1.Output()], WorkbenchDataFileListComponent.prototype, "onSaveFile");
  __decorate(
    [core_1.ViewChild("selectionList", { static: true })],
    WorkbenchDataFileListComponent.prototype,
    "selectionList"
  );
  __decorate([core_1.ViewChildren(FileListItemComponent)], WorkbenchDataFileListComponent.prototype, "_items");
  WorkbenchDataFileListComponent = __decorate(
    [
      core_1.Component({
        selector: "app-workbench-data-file-list",
        templateUrl: "./workbench-data-file-list.component.html",
        styleUrls: ["./workbench-data-file-list.component.css"],
        changeDetection: core_1.ChangeDetectionStrategy.OnPush,
        providers: [exports.WORKBENCH_FILE_LIST_VALUE_ACCESSOR],
      }),
    ],
    WorkbenchDataFileListComponent
  );
  return WorkbenchDataFileListComponent;
})();
exports.WorkbenchDataFileListComponent = WorkbenchDataFileListComponent;
