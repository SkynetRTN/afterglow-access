import {
  Component,
  Input,
  EventEmitter,
  Output,
  OnDestroy,
  ChangeDetectionStrategy,
  ViewChild,
  forwardRef,
  QueryList,
  Inject,
  ChangeDetectorRef,
  OnInit,
  ViewChildren,
} from '@angular/core';
import { DataFile, IHdu } from '../../../data-files/models/data-file';
import { Store } from '@ngxs/store';
import { HduType } from '../../../data-files/models/data-file-type';
import { BehaviorSubject, Observable, combineLatest, Subject } from 'rxjs';
import {
  map,
  switchMap,
  filter,
  distinctUntilChanged,
} from 'rxjs/operators';
import { DataFilesState } from '../../../data-files/data-files.state';
import { DataProvidersState } from '../../../data-providers/data-providers.state';
import {
  MatSelectionListChange,
  MatSelectionList,
} from '@angular/material/list';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { DataProvider } from '../../../data-providers/models/data-provider';
import {
  MatCheckbox,
  MAT_CHECKBOX_DEFAULT_OPTIONS,
  MatCheckboxDefaultOptions,
  MatCheckboxChange,
} from '@angular/material/checkbox';
import { ToggleFileSelection, SelectFile } from '../../workbench.actions';
import { Viewer } from '../../models/viewer';

@Component({
  selector: 'app-file-list-item',
  templateUrl: './file-list-item.component.html',
  host: {
    '(focus)': '_handleFocus()',
    '(blur)': '_handleBlur()',
    '(mouseenter)': '_handleMouseEnter()',
    '(mouseleave)': '_handleMouseLeave()',
  },
  providers: [
    {
      provide: MAT_CHECKBOX_DEFAULT_OPTIONS,
      useValue: {
        clickAction: 'noop',
        color: 'accent',
      } as MatCheckboxDefaultOptions,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileListItemComponent implements OnInit {
  @Input('file')
  set file(file: DataFile) {
    this.file$.next(file);
  }
  get file() {
    return this.file$.getValue();
  }
  private file$ = new BehaviorSubject<DataFile>(null);

  @Input() activeHduId: string = '';

  @Input() active: boolean = false;
  @Input() expanded: boolean = false;
  @Input() selected: boolean = false;
  @Input() autoHideCheckbox: boolean = false;

  @Output() onItemDoubleClick = new EventEmitter<{fileId: string, hduId: string}>();
  @Output() onToggleExpanded = new EventEmitter<string>();
  @Output() onToggleSelection = new EventEmitter<{
    file: DataFile;
    $event: MouseEvent;
  }>();
  @Output() onClose = new EventEmitter<string>();
  @Output() onSave = new EventEmitter<string>();

  @ViewChild(MatCheckbox) checkbox: MatCheckbox;

  HduType = HduType;
  mouseOver: boolean = false;
  hasFocus: boolean = false;
  hdus$: Observable<IHdu[]>;
  dataProvider$: Observable<DataProvider>;
  fileTooltip$: Observable<string>;
  modified$: Observable<boolean>;
  expandable$: Observable<boolean>;

  constructor(
    private store: Store,
    @Inject(forwardRef(() => WorkbenchDataFileListComponent))
    public fileList: WorkbenchDataFileListComponent,
    private _changeDetector: ChangeDetectorRef
  ) {
    this.hdus$ = this.file$.pipe(
      map((file) => file?.hduIds),
      distinctUntilChanged(
        (a, b) =>
          a?.length === b?.length &&
          a?.every((value, index) => b[index] === value)
      ),
      switchMap((hduIds) => {
        return combineLatest(
          hduIds.map((hduId) => {
            return this.store.select(DataFilesState.getHduById).pipe(
              map((fn) => fn(hduId)),
              filter((hdu) => hdu != null)
            );
          })
        ).pipe(
          map((hdus) => hdus.sort((a, b) => (a.order > b.order ? 1 : -1)))
        );
      })
    );

    this.expandable$ = this.hdus$.pipe(
      map(hdus => hdus.length > 1)
    )

    this.dataProvider$ = this.file$.pipe(
      map((file) => file?.dataProviderId),
      distinctUntilChanged(),
      switchMap((id) => {
        return this.store
          .select(DataProvidersState.getDataProviderById)
          .pipe(map((fn) => fn(id)));
      })
    );

    this.fileTooltip$ = combineLatest(this.file$, this.dataProvider$).pipe(
      map(([file, dataProvider]) => {
        if (!dataProvider || !file.assetPath) return file.name;
        return `${dataProvider.displayName}${file.assetPath}`;
      })
    );

    this.modified$ = this.hdus$.pipe(
      map((hdus) => hdus.some((hdu) => hdu.modified))
    );
  }

  ngOnInit(): void {}

  getHduLabel(hdu: IHdu, index: number) {
    if (hdu.name) return hdu.name;
    return hdu.name ? hdu.name : `Layer ${index}`;
  }

  handleToggleExpanded($event: MouseEvent) {
    $event.stopPropagation();
    this.onToggleExpanded.emit(this.file?.id);
  }

  handleToggleSelection($event: MouseEvent) {
    $event.stopPropagation();
    this.onToggleSelection.emit({ file: this.file, $event: $event });
  }

  handleSave($event: MouseEvent) {
    $event.stopPropagation();
    this.onSave.emit(this.file?.id);
  }

  handleClose($event: MouseEvent) {
    $event.stopPropagation();
    this.onClose.emit(this.file?.id);
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
}

export const WORKBENCH_FILE_LIST_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => WorkbenchDataFileListComponent),
  multi: true,
};

@Component({
  selector: 'app-workbench-data-file-list',
  templateUrl: './workbench-data-file-list.component.html',
  styleUrls: ['./workbench-data-file-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [WORKBENCH_FILE_LIST_VALUE_ACCESSOR],
})
export class WorkbenchDataFileListComponent implements OnDestroy {
  @Input('files')
  set files(files: DataFile[]) {
    this.files$.next(files);
  }
  get files() {
    return this.files$.getValue();
  }
  private files$ = new BehaviorSubject<DataFile[]>(null);

  @Input('focusedViewer')
  set focusedViewer(focusedViewer: Viewer) {
    this.focusedViewer$.next(focusedViewer);
  }
  get focusedViewer() {
    return this.focusedViewer$.getValue();
  }
  private focusedViewer$ = new BehaviorSubject<Viewer>(null);

  @Input('selectedFileIds')
  set selectedFileIds(selectedFileIds: string[]) {
    this.selectedFileIds$.next(selectedFileIds);
  }
  get selectedFileIds() {
    return this.selectedFileIds$.getValue();
  }
  private selectedFileIds$ = new BehaviorSubject<string[]>([]);

  @Output() onSelectedFileChange = new EventEmitter<string>();
  @Output() onCloseFile = new EventEmitter<string>();
  @Output() onSaveFile = new EventEmitter<string>();

  @ViewChild('selectionList', { static: true }) selectionList: MatSelectionList;
  @ViewChildren(FileListItemComponent) _items: QueryList<FileListItemComponent>;
  
  selectAllChecked$: Observable<boolean>;
  selectAllIndeterminate$: Observable<boolean>;
  destroy$: Subject<boolean> = new Subject<boolean>();
  HduType = HduType;
  collapsedFileIds: { [id: string]: boolean } = {};

  constructor(private store: Store) {
   
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  handleItemDoubleClick(value: {fileId: string, hduId: string}) {
    this.selectFile(value.fileId, value.hduId, true);
  }

  handleSelectionChange($event: MatSelectionListChange) {
    let value: {fileId: string, hduId: string} = $event.option.value;
    this.selectFile(value.fileId, value.hduId, false);
  }

  selectFile(fileId: string, hduId: string, keepOpen: boolean) {
    if (!hduId) {
      let file = this.store.selectSnapshot(DataFilesState.getFileById)(fileId);
      if (file && file.hduIds.length == 1) {
        //if a single-hdu file is selected,  automatically select the hdu
        hduId = file.hduIds[0];
      }
    }
    this.store.dispatch(new SelectFile(fileId, hduId, keepOpen));
  }

  handleToggleExpanded(fileId: string) {
    if (fileId in this.collapsedFileIds) {
      delete this.collapsedFileIds[fileId];
    } else {
      this.collapsedFileIds[fileId] = true;
    }
  }

  handleToggleSelection($event: { file: DataFile; $event: MouseEvent }) {
    //TODO handle multi-selection based on modifier keys
    this.store.dispatch(new ToggleFileSelection($event.file.id));
  }

  trackById(file: DataFile) {
    return file?.id;
  }

}
