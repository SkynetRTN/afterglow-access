import {
  Component,
  Input,
  EventEmitter,
  Output,
  OnChanges,
  OnDestroy,
  SimpleChange,
  ChangeDetectionStrategy,
  ViewChild,
  forwardRef,
  ContentChildren,
  QueryList,
  Inject,
  ChangeDetectorRef,
  OnInit,
  ViewChildren,
} from "@angular/core";
import { DataFile, IHdu } from "../../../data-files/models/data-file";
import { Store } from "@ngxs/store";
import { HduType } from "../../../data-files/models/data-file-type";
import { BehaviorSubject, Observable, combineLatest, Subject } from "rxjs";
import { map, tap, switchMap, distinctUntilKeyChanged, filter, takeUntil, distinctUntilChanged } from "rxjs/operators";
import { DataFilesState } from "../../../data-files/data-files.state";
import { DataProvidersState } from "../../../data-providers/data-providers.state";
import { MatTreeFlatDataSource, MatTreeFlattener } from "@angular/material/tree";
import { SelectionModel } from "@angular/cdk/collections";
import { FlatTreeControl } from "@angular/cdk/tree";
import { MatSelectionListChange, MatSelectionList } from "@angular/material/list";
import { NG_VALUE_ACCESSOR } from "@angular/forms";
import { DataProvider } from "../../../data-providers/models/data-provider";
import { MatCheckbox, MAT_CHECKBOX_DEFAULT_OPTIONS, MatCheckboxDefaultOptions } from "@angular/material/checkbox";
import { coerceBooleanProperty } from "@angular/cdk/coercion";
import { ToggleFileSelection } from "../../workbench.actions";
import { WorkbenchState } from "../../workbench.state";

@Component({
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
      provide: MAT_CHECKBOX_DEFAULT_OPTIONS,
      useValue: { clickAction: "noop", color: "accent" } as MatCheckboxDefaultOptions,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileListItemComponent implements OnInit {
  @Input("fileId")
  set fileId(fileId: string) {
    this.fileId$.next(fileId);
  }
  get fileId() {
    return this.fileId$.getValue();
  }
  private fileId$ = new BehaviorSubject<string>(null);

  @Input() focusedItem: { fileId: string; hduId: string } = null;
  @Input() expanded: boolean = false;
  @Input() selected: boolean = false;
  @Input() autoHideCheckbox: boolean = false;

  @Output() onSelectionChange = new EventEmitter<boolean>();
  @Output() onItemDoubleClick = new EventEmitter<{ fileId: string; hduId: string }>();
  @Output() onToggleExpanded = new EventEmitter<string>();
  @Output() onToggleSelection = new EventEmitter<{ fileId: string; shiftKey: boolean; ctrlKey: boolean }>();
  @Output() onClose = new EventEmitter<string>();
  @Output() onSave = new EventEmitter<string>();

  @ViewChild(MatCheckbox) checkbox: MatCheckbox;

  HduType = HduType;
  mouseOver: boolean = false;
  hasFocus: boolean = false;
  file$: Observable<DataFile>;
  hdus$: Observable<IHdu[]>;
  dataProvider$: Observable<DataProvider>;
  fileTooltip$: Observable<string>;
  modified$: Observable<boolean>;

  constructor(
    private store: Store,
    @Inject(forwardRef(() => WorkbenchDataFileListComponent)) public fileList: WorkbenchDataFileListComponent,
    private _changeDetector: ChangeDetectorRef
  ) {
    this.file$ = this.fileId$.pipe(
      distinctUntilChanged(),
      switchMap((fileId) => {
        return this.store.select(DataFilesState.getFileById).pipe(
          map((fn) => fn(fileId)),
          filter((file) => file != null)
        );
      })
    );

    this.hdus$ = this.file$.pipe(
      map((file) => file.hduIds),
      distinctUntilChanged(),
      switchMap((hduIds) => {
        return combineLatest(
          hduIds.map((hduId) => {
            return this.store.select(DataFilesState.getHduById).pipe(
              map((fn) => fn(hduId)),
              filter((hdu) => hdu != null)
            );
          })
        ).pipe(map((hdus) => hdus.sort((a, b) => (a.order > b.order ? 1 : -1))));
      })
    );

    this.dataProvider$ = this.file$.pipe(
      map((file) => file.dataProviderId),
      distinctUntilChanged(),
      switchMap((id) => {
        return this.store.select(DataProvidersState.getDataProviderById).pipe(map((fn) => fn(id)));
      })
    );

    this.fileTooltip$ = combineLatest(this.file$, this.dataProvider$).pipe(
      map(([file, dataProvider]) => {
        if (!dataProvider || !file.assetPath) return file.name;
        return `${dataProvider.name}${file.assetPath}`;
      })
    );

    this.modified$ = this.hdus$.pipe(map((hdus) => hdus.some((hdu) => hdu.modified)));
  }

  ngOnInit(): void {}

  toggleExpanded($event: MouseEvent) {
    $event.stopPropagation();
    this.onToggleExpanded.emit(this.fileId);
  }

  save($event: MouseEvent) {
    $event.stopPropagation();
    this.onSave.emit(this.fileId);
  }

  close($event: MouseEvent) {
    $event.stopPropagation();
    this.onClose.emit(this.fileId);
  }

  private _handleFocus() {
    this.hasFocus = true;
  }

  private _handleBlur() {
    this.hasFocus = false;
  }

  private _handleMouseEnter() {
    this._handleFocus();
    this.mouseOver = true;
  }

  private _handleMouseLeave() {
    this._handleBlur();
    this.mouseOver = false;
  }

  toggleCheckbox($event: MouseEvent) {
    $event.stopPropagation();
    this.onToggleSelection.emit({ fileId: this.fileId, shiftKey: $event.shiftKey, ctrlKey: $event.ctrlKey });
  }
}

export const WORKBENCH_FILE_LIST_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => WorkbenchDataFileListComponent),
  multi: true,
};

@Component({
  selector: "app-workbench-data-file-list",
  templateUrl: "./workbench-data-file-list.component.html",
  styleUrls: ["./workbench-data-file-list.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [WORKBENCH_FILE_LIST_VALUE_ACCESSOR],
})
export class WorkbenchDataFileListComponent implements OnDestroy {
  @Input("focusedItem")
  set focusedItem(item: { fileId: string; hduId: string }) {
    this.focusedItem$.next(item);
  }
  get focusedItem() {
    return this.focusedItem$.getValue();
  }
  private focusedItem$ = new BehaviorSubject<{ fileId: string; hduId: string }>(null);

  @Input("files")
  set files(files: DataFile[]) {
    this.files$.next(files);
  }
  get files() {
    return this.files$.getValue();
  }
  private files$ = new BehaviorSubject<DataFile[]>(null);

  @Input("selectedFileIds")
  set selectedFileIds(selectedFileIds: string[]) {
    this.selectedFileIds$.next(selectedFileIds);
  }
  get selectedFileIds() {
    return this.selectedFileIds$.getValue();
  }
  private selectedFileIds$ = new BehaviorSubject<string[]>([]);

  // @Output() onSelectionChange = new EventEmitter<{
  //   item: FileListItem;
  // }>();

  @Output() onFocusedItemChange = new EventEmitter<{
    item: { fileId: string; hduId: string };
  }>();

  @Output() onItemDoubleClick = new EventEmitter<{
    item: { fileId: string; hduId: string };
  }>();

  @Output() onCloseFile = new EventEmitter<string>();

  @Output() onSaveFile = new EventEmitter<string>();

  @ViewChild("selectionList", { static: true }) selectionList: MatSelectionList;
  @ViewChildren(FileListItemComponent) _items: QueryList<FileListItemComponent>;

  destroy$: Subject<boolean> = new Subject<boolean>();
  HduType = HduType;
  collapsedFileIds: { [id: string]: boolean } = {};

  constructor(private store: Store) {}

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  onToggleExpanded(fileId: string) {
    if (fileId in this.collapsedFileIds) {
      delete this.collapsedFileIds[fileId];
    } else {
      this.collapsedFileIds[fileId] = true;
    }
  }

  onToggleSelection($event: { fileId: string; shiftKey: boolean; ctrlKey: boolean }) {
    //TODO handle multi selection based on modifier keys
    this.store.dispatch(new ToggleFileSelection($event.fileId));
  }

  saveFile($event: MouseEvent, fileId: string) {
    $event.preventDefault();
    $event.stopImmediatePropagation();
    this.onSaveFile.emit(fileId);
  }

  closeFile($event: MouseEvent, fileId: string) {
    $event.preventDefault();
    $event.stopImmediatePropagation();
    this.onCloseFile.emit(fileId);
  }
}
