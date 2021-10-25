import {
  Component,
  OnInit,
  ViewChild,
  Output,
  EventEmitter,
  Input,
  AfterViewInit,
  ElementRef,
  ViewEncapsulation,
} from '@angular/core';
import { DataProvidersState, DataProviderPath } from '../../data-providers.state';
import { Store, Actions, ofActionDispatched } from '@ngxs/store';
import { Observable, of, merge, Subject, combineLatest, BehaviorSubject, forkJoin } from 'rxjs';
import {
  map,
  distinctUntilChanged,
  tap,
  take,
  filter,
  flatMap,
  switchMap,
  takeUntil,
  withLatestFrom,
  debounceTime,
  startWith,
  catchError,
  share,
  finalize,
} from 'rxjs/operators';
import { DataProviderAsset } from '../../models/data-provider-asset';
import { AfterglowDataProviderService } from '../../../workbench/services/afterglow-data-providers';
import { HttpErrorResponse } from '@angular/common/http';
import { BatchAssetDownloadJob } from '../../../jobs/models/batch-asset-download';
import { JobType } from '../../../jobs/models/job-types';
import { CorrelationIdGenerator } from '../../../utils/correlated-action';
import {
  JobProgressDialogConfig,
  JobProgressDialogComponent,
} from '../../../workbench/components/job-progress-dialog/job-progress-dialog.component';
import { JobsState } from '../../../jobs/jobs.state';
import { MatDialog } from '@angular/material/dialog';
import { JobService } from '../../../jobs/services/jobs';
import { CreateJobSuccess, CreateJobFail, CreateJob } from '../../../jobs/jobs.actions';
import { DataProvider } from '../../models/data-provider';
import { CollectionViewer, DataSource, SelectionModel } from '@angular/cdk/collections';
import { MatSort, Sort, SortDirection } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { NameDialogComponent } from '../name-dialog/name-dialog.component';
import { AlertDialogConfig, AlertDialogComponent } from '../../../utils/alert-dialog/alert-dialog.component';
import { TargetDialogComponent } from '../target-dialog/target-dialog.component';
import { UploadDialogComponent } from '../upload-dialog/upload-dialog.component';
import { saveAs } from 'file-saver/dist/FileSaver';
import { UpdateDefaultSort } from '../../data-providers.actions';
import { MatPaginator } from '@angular/material/paginator';
import { PaginationLinks } from '../../../utils/core-api-response';

export interface FileSystemItem {
  id: string;
  name: string;
  isDirectory: boolean;
  metadata: { [key: string]: number | string | Date };
  dataProvider: DataProvider;
  asset: DataProviderAsset;
}

export interface FileSystemDetailsColumn {
  dataField: string;
  caption: string;
  sortable: boolean;
}

export interface FileSystemItemsResponse {
  pagination?: PaginationLinks;
  items: FileSystemItem[];
}

export class FileSystemItemsDataSource implements DataSource<FileSystemItem> {
  private fileSystemItemsSubject = new BehaviorSubject<FileSystemItem[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private writeableSubject = new BehaviorSubject<boolean>(false);
  private firstLinkSubject = new BehaviorSubject<string>('');
  private prevLinkSubject = new BehaviorSubject<string>('');
  private nextLinkSubject = new BehaviorSubject<string>('');
  private lastLinkSubject = new BehaviorSubject<string>('');

  private currentPath: DataProviderPath;

  public loading$ = this.loadingSubject.asObservable();
  public writeable$ = this.writeableSubject.asObservable();
  public items$ = this.fileSystemItemsSubject.asObservable();
  public firstLink$ = this.firstLinkSubject.asObservable();
  public prevLink$ = this.prevLinkSubject.asObservable();
  public nextLink$ = this.nextLinkSubject.asObservable();
  public lastLink$ = this.lastLinkSubject.asObservable();

  constructor(private dataProviderService: AfterglowDataProviderService, private store: Store) {}

  connect(collectionViewer: CollectionViewer): Observable<FileSystemItem[]> {
    return this.items$;
  }

  disconnect(collectionViewer: CollectionViewer): void {
    this.fileSystemItemsSubject.complete();
    this.loadingSubject.complete();
  }

  parseProviderResponse(resp: {
    data: DataProvider[];
    links: { pagination: PaginationLinks };
  }): FileSystemItemsResponse {
    let dataProviders = resp.data;
    return {
      pagination: resp.links.pagination,
      items: dataProviders
        .filter((dataProvider) => dataProvider.browseable)
        .map((dataProvider) => this.providerToFileSystemItem(dataProvider)),
    };
  }

  providerToFileSystemItem(dataProvider: DataProvider): FileSystemItem {
    return {
      id: dataProvider.id,
      name: dataProvider.displayName,
      dataProvider: dataProvider,
      asset: null,
      isDirectory: true,
      metadata: {
        description: dataProvider.description,
        permissions: dataProvider.readonly ? 'readonly' : '',
      },
    };
  }

  parseAssetsResponse(resp: {
    data: DataProviderAsset[];
    links: { pagination: PaginationLinks };
  }): FileSystemItemsResponse {
    return {
      pagination: resp.links.pagination,
      items: resp.data.map((asset) => this.assetToFileSystemItem(asset)),
    };
  }

  assetToFileSystemItem(asset: DataProviderAsset): FileSystemItem {
    const dataProvider = this.store.selectSnapshot(DataProvidersState.getDataProviderEntities)[asset.dataProviderId];
    return {
      id: `${asset.dataProviderId}:${asset.assetPath}`,
      name: asset.name,
      dataProvider: dataProvider,
      asset: asset,
      isDirectory: asset.isDirectory,
      metadata: asset.metadata,
    };
  }

  get items() {
    return this.fileSystemItemsSubject.value;
  }

  first() {
    if (this.firstLinkSubject.value) this.loadFileSystemItemsByLink(this.firstLinkSubject.value);
  }

  previous() {
    if (this.prevLinkSubject.value) this.loadFileSystemItemsByLink(this.prevLinkSubject.value);
  }

  next() {
    if (this.nextLinkSubject.value) this.loadFileSystemItemsByLink(this.nextLinkSubject.value);
  }

  last() {
    if (this.lastLinkSubject.value) this.loadFileSystemItemsByLink(this.lastLinkSubject.value);
  }

  private loadFileSystemItemsByLink(link: string) {
    let result$: Observable<FileSystemItemsResponse>;

    if (!this.currentPath) {
      result$ = this.dataProviderService
        .getDataProvidersByLink(link)
        .pipe(map((resp) => this.parseProviderResponse(resp)));
    } else {
      result$ = this.dataProviderService
        .getAssetsByLink(this.currentPath.dataProviderId, link)
        .pipe(map((resp) => this.parseAssetsResponse(resp)));
    }

    this.loadingSubject.next(true);

    result$
      .pipe(
        catchError(() => of({ items: [] } as FileSystemItemsResponse)),
        finalize(() => this.loadingSubject.next(false))
      )
      .subscribe((result) => {
        this.firstLinkSubject.next(result.pagination?.first);
        this.prevLinkSubject.next(result.pagination?.prev);
        this.nextLinkSubject.next(result.pagination?.next);
        this.lastLinkSubject.next(result.pagination?.last);
        this.fileSystemItemsSubject.next(result.items);
      });
  }

  loadFileSystemItems(
    path: DataProviderPath,
    nameFilter: string,
    sortField: string,
    sortDirection: '' | 'asc' | 'desc',
    pageSize: number
  ) {
    this.loadingSubject.next(true);

    let result$: Observable<FileSystemItemsResponse>;

    if (!path) {
      result$ = this.dataProviderService.getDataProviders().pipe(map((resp) => this.parseProviderResponse(resp)));
    } else {
      result$ = this.dataProviderService
        .getAssets(
          path.dataProviderId,
          path.assets?.length != 0 ? path.assets[path.assets.length - 1].assetPath : '',
          pageSize,
          sortField,
          sortDirection,
          nameFilter
        )
        .pipe(map((resp) => this.parseAssetsResponse(resp)));
    }

    result$
      .pipe(
        catchError(() => of({ items: [] } as FileSystemItemsResponse)),
        finalize(() => this.loadingSubject.next(false))
      )
      .subscribe((result) => {
        this.currentPath = path;
        this.firstLinkSubject.next(result.pagination?.first);
        this.prevLinkSubject.next(result.pagination?.prev);
        this.nextLinkSubject.next(result.pagination?.next);
        this.lastLinkSubject.next(result.pagination?.last);
        this.fileSystemItemsSubject.next(result.items);
      });
  }
}

@Component({
  selector: 'app-file-manager',
  templateUrl: './file-manager.component.html',
  styleUrls: ['./file-manager.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class FileManagerComponent implements OnInit, AfterViewInit {
  @Input('path')
  set path(path: DataProviderPath) {
    this.path$.next(path);
  }
  get path() {
    return this.path$.getValue();
  }
  private path$ = new BehaviorSubject<DataProviderPath>(null);

  @Input()
  selectionMode: 'none' | 'single' | 'multiple' = 'multiple';

  @Input()
  showToolbar = true;

  @Input()
  showNameFilter = true;

  @Input()
  showMetadataColumns = true;

  @Input('allowCreate')
  set allowCreate(allow: boolean) {
    this.allowCreate$.next(allow);
  }
  get allowCreate() {
    return this.allowCreate$.getValue();
  }
  private allowCreate$ = new BehaviorSubject<boolean>(null);

  @Input('allowCopy')
  set allowCopy(allow: boolean) {
    this.allowCopy$.next(allow);
  }
  get allowCopy() {
    return this.allowCopy$.getValue();
  }
  private allowCopy$ = new BehaviorSubject<boolean>(null);

  @Input('allowMove')
  set allowMove(allow: boolean) {
    this.allowMove$.next(allow);
  }
  get allowMove() {
    return this.allowMove$.getValue();
  }
  private allowMove$ = new BehaviorSubject<boolean>(null);

  @Input('allowDelete')
  set allowDelete(allow: boolean) {
    this.allowDelete$.next(allow);
  }
  get allowDelete() {
    return this.allowDelete$.getValue();
  }
  private allowDelete$ = new BehaviorSubject<boolean>(null);

  @Input('allowRename')
  set allowRename(allow: boolean) {
    this.allowRename$.next(allow);
  }
  get allowRename() {
    return this.allowRename$.getValue();
  }
  private allowRename$ = new BehaviorSubject<boolean>(null);

  @Input('allowUpload')
  set allowUpload(allow: boolean) {
    this.allowUpload$.next(allow);
  }
  get allowUpload() {
    return this.allowUpload$.getValue();
  }
  private allowUpload$ = new BehaviorSubject<boolean>(null);

  @Input('allowDownload')
  set allowDownload(allow: boolean) {
    this.allowDownload$.next(allow);
  }
  get allowDownload() {
    return this.allowDownload$.getValue();
  }
  private allowDownload$ = new BehaviorSubject<boolean>(null);

  @Input()
  allowedFileExtensions: string[] = ['image/*'];

  @Input()
  maxUploadSize: number = null;

  @Output()
  readonly onSelectedAssetOpened: EventEmitter<DataProviderAsset> = new EventEmitter<DataProviderAsset>();

  @Output()
  readonly onPathChange: EventEmitter<DataProviderPath> = new EventEmitter<DataProviderPath>();

  @Output()
  readonly onSelectionChange: EventEmitter<FileSystemItem[]> = new EventEmitter<FileSystemItem[]>();

  @Output()
  readonly onCurrentDirectoryChange: EventEmitter<FileSystemItem> = new EventEmitter<FileSystemItem>();

  @Output() pageSizeChange = new EventEmitter<number>();

  destroy$ = new Subject<boolean>();

  dataSource: FileSystemItemsDataSource;
  currentDirectory$: Observable<FileSystemItem>;
  currentDirectory: FileSystemItem;
  parentDataProvider$: Observable<DataProvider>;
  parentDataProvider: DataProvider;
  refresh$ = new Subject<boolean>();
  // items$: Observable<FileSystemItem[]>;
  isLoading = false;
  selection = new SelectionModel<FileSystemItem>(true, []);
  isAllSelected$: Observable<boolean>;
  isIndeterminate$: Observable<boolean>;
  onToggle$ = new Subject<boolean>();
  onRowClick$ = new Subject<{ $event: MouseEvent; item: FileSystemItem }>();
  onRowDblClick$ = new Subject<{ $event: MouseEvent; item: FileSystemItem }>();
  lastSelectedItem: FileSystemItem = null;
  checkboxLabel$: Observable<string>;
  columns$: Observable<FileSystemDetailsColumn[]>;
  displayedColumns$: Observable<string[]>;
  isWriteable$: Observable<boolean>;
  error$ = new BehaviorSubject<string>(null);
  uploadFile: File = null;
  @ViewChild('fileUpload') fileUpload: ElementRef;

  @ViewChild(MatSort) sort: MatSort;
  pageSize = 100;
  pageSizeOptions = [50, 100, 250, 500];
  nameFilter: string = '';
  nameFilterChange$ = new Subject<string>();
  showCreate$: Observable<boolean>;
  showCopy$: Observable<boolean>;
  showMove$: Observable<boolean>;
  showDelete$: Observable<boolean>;
  showRename$: Observable<boolean>;
  showUpload$: Observable<boolean>;
  showDownload$: Observable<boolean>;

  showFirstLastButtons = true;
  constructor(
    private store: Store,
    private actions$: Actions,
    private dataProviderService: AfterglowDataProviderService,
    private corrGen: CorrelationIdGenerator,
    public dialog: MatDialog,
    private jobService: JobService
  ) {
    const selectionChange$ = this.selection.changed.pipe(startWith(null));

    this.dataSource = new FileSystemItemsDataSource(this.dataProviderService, this.store);

    this.selection.changed
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.onSelectionChange.emit(this.selection.selected));

    this.error$.pipe(takeUntil(this.destroy$), debounceTime(3000)).subscribe((e) => {
      if (!e) return;
      this.error$.next(null);
    });

    this.currentDirectory$ = this.path$.pipe(
      map((path) => {
        if (!path) {
          //root file system item
          return null;
        }

        const dataProvider = this.store.selectSnapshot(DataProvidersState.getDataProviderEntities)[path.dataProviderId];

        if (path.assets.length === 0) {
          //data provider root
          return this.dataSource.providerToFileSystemItem(dataProvider);
        }

        return this.dataSource.assetToFileSystemItem(path.assets[path.assets.length - 1]);
      }),
      distinctUntilChanged((a, b) => {
        return a && b && a.id === b.id;
      })
    );

    this.currentDirectory$.pipe(takeUntil(this.destroy$)).subscribe((parent) => {
      this.currentDirectory = parent;
      this.onCurrentDirectoryChange.emit(parent);
    });

    this.parentDataProvider$ = this.currentDirectory$.pipe(
      map((parent) => (parent ? parent.dataProvider.id : null)),
      distinctUntilChanged(),
      switchMap((id) => {
        if (!id) return of(null);
        return this.store.select(DataProvidersState.getDataProviderById).pipe(map((fn) => fn(id)));
      })
    );

    this.parentDataProvider$.pipe(takeUntil(this.destroy$)).subscribe((dp) => (this.parentDataProvider = dp));

    this.isWriteable$ = this.parentDataProvider$.pipe(
      map((dataProvider) => dataProvider && !dataProvider.readonly),
      distinctUntilChanged()
    );

    this.columns$ = this.parentDataProvider$.pipe(
      map((dataProvider) => {
        if (!dataProvider) {
          return [
            {
              dataField: 'description',
              caption: 'description',
              sortable: false,
            },
            {
              dataField: 'permissions',
              caption: 'permissions',
              sortable: false,
            },
          ];
        }
        return dataProvider.columns.map((column) => {
          const result: FileSystemDetailsColumn = {
            dataField: column.fieldName,
            caption: column.name,
            sortable: column.sortable,
          };
          return result;
        });
      })
    );

    this.displayedColumns$ = this.columns$.pipe(
      map((columns) => {
        let result = [];
        if (this.selectionMode !== 'none') result.push('select');
        result.push('name');
        if (this.showMetadataColumns) result = result.concat(columns.map((column) => column.caption));
        return result;
      })
    );
  }

  ngOnInit(): void {}

  ngAfterViewInit() {
    setTimeout(() => {
      const selectionChange$ = this.selection.changed.pipe(startWith(null));

      combineLatest([
        this.path$.pipe(distinctUntilChanged()),
        this.pageSizeChange.pipe(startWith(this.pageSize)),
        this.sort.sortChange.pipe(startWith({ active: this.sort.active, direction: this.sort.direction })),
        this.nameFilterChange$.pipe(startWith(''), debounceTime(500), distinctUntilChanged()),
        this.refresh$.pipe(startWith(true)),
      ])
        .pipe(takeUntil(this.destroy$))
        .subscribe(([path, pageSize, sort]) => {
          this.selection.clear();
          this.dataSource.loadFileSystemItems(path, this.nameFilter, sort.active, sort.direction, pageSize);
        });

      this.onRowDblClick$.pipe(takeUntil(this.destroy$)).subscribe(({ $event, item }) => {
        //double click
        if (item.isDirectory) {
          this.navigateToChildItem(item);
        } else {
          this.onSelectedAssetOpened.emit(item.asset);
        }
      });
      this.onRowClick$.pipe(takeUntil(this.destroy$)).subscribe(({ $event, item }) => {
        let items = this.dataSource.items;
        if (this.selectionMode === 'none') return;
        if (
          !this.selection.isMultipleSelection() ||
          (!$event.shiftKey && !$event.ctrlKey && this.selection.selected.length <= 1)
        ) {
          this.lastSelectedItem = item;
          //single-selection mode
          if (this.selection.isSelected(item)) return;
          this.selection.clear();
          this.selection.select(item);
          return;
        }
        if ($event.shiftKey) {
          if (!this.lastSelectedItem) this.lastSelectedItem = item;
          const index1 = items.indexOf(this.lastSelectedItem);
          const index2 = items.indexOf(item);
          const selection = items
            .slice(Math.min(index1, index2), Math.max(index1, index2) + 1)
            .filter((item) => !this.selection.isSelected(item));
          this.selection.select(...selection);
          this.lastSelectedItem = item;
          return;
        }
        this.selection.toggle(item);
        this.lastSelectedItem = this.selection.isSelected(item) ? item : null;
        return;
      });

      this.isAllSelected$ = combineLatest(this.dataSource.items$, selectionChange$).pipe(
        map(([items]) => {
          const numSelected = this.selection.selected.length;
          const numRows = items.length;
          return numSelected === numRows;
        })
      );
      this.isIndeterminate$ = combineLatest(this.isAllSelected$, selectionChange$).pipe(
        map(([isAllSelected]) => {
          return this.selection.selected.length !== 0 && !isAllSelected;
        })
      );
      this.onToggle$
        .pipe(takeUntil(this.destroy$), withLatestFrom(this.isAllSelected$, this.dataSource.items$))
        .subscribe(([toggle, isAllSelected, items]) => {
          isAllSelected ? this.selection.clear() : items.forEach((row) => this.selection.select(row));
        });

      this.showCreate$ = combineLatest(this.allowCreate$, this.isWriteable$).pipe(
        map(([allowCreate, isWriteable]) => {
          return allowCreate && isWriteable;
        })
      );
      this.showCopy$ = combineLatest(this.allowCopy$, selectionChange$).pipe(
        map(([allowCopy]) => {
          if (!allowCopy) return false;
          const selected = this.selection.selected;
          //disallow copying the entire data provider
          if (selected.length === 0 || selected.some((v) => !v.asset)) return false;
          return true;
        })
      );
      this.showMove$ = combineLatest(this.allowMove$, this.showCopy$, this.isWriteable$).pipe(
        map(([allowMove, showCopy, isWriteable]) => allowMove && showCopy && isWriteable)
      );
      this.showDelete$ = combineLatest(this.allowDelete$, this.showMove$).pipe(
        map(([allowDelete, showMove]) => allowDelete && showMove)
      );
      this.showRename$ = combineLatest(this.allowRename$, this.isWriteable$, selectionChange$).pipe(
        map(([allowRename, isWriteable]) => {
          return allowRename && isWriteable && this.selection.selected.length === 1;
        })
      );
      this.showUpload$ = combineLatest(this.allowUpload$, this.isWriteable$).pipe(
        map(([allowUpload, isWriteable]) => {
          return allowUpload && isWriteable;
        })
      );
      this.showDownload$ = combineLatest(this.allowDownload$, selectionChange$).pipe(
        map(() => {
          if (!this.allowDownload) return false;
          const selected = this.selection.selected;
          if (selected.length === 0 || selected.some((v) => v.isDirectory)) return false;
          return true;
        })
      );
    });

    // this.paginator.keyChange
    //   .pipe(
    //     takeUntil(this.destroy$),
    //     distinctUntilChanged(),
    //     filter((key) => key !== undefined)
    //   )
    //   .subscribe((link) => this.dataSource.loadFileSystemItemsByLink(link));

    setTimeout(() => {
      // this.items$ = merge(
      //   this.currentDirectory$,
      //   this.refresh$,
      //   this.sort.sortChange,
      //   this.paginator.pageSizeChange
      // ).pipe(
      //   withLatestFrom(this.currentDirectory$),
      //   switchMap(([v, parent]) => {
      //     this.isLoading = true;
      //     let result$: Observable<{
      //       pagination?: {
      //         first: string;
      //         prev: string;
      //         next: string;
      //         last: string;
      //         pageSize: number;
      //         totalPages: number;
      //         sort: string;
      //       };
      //       items: FileSystemItem[];
      //     }>;
      //     let key$ = this.paginator.keyChange.pipe(
      //       distinctUntilChanged(),
      //       filter((key) => key !== undefined)
      //     );
      //     if (!parent) {
      //       result$ = merge(
      //         this.dataProviderService.getDataProviders(),
      //         key$.pipe(switchMap((key) => this.dataProviderService.getDataProvidersByLink(key)))
      //       ).pipe(
      //         // delay(50000),
      //         map((resp) => {
      //           let dataProviders = resp.data;
      //           return {
      //             links: resp.links.pagination,
      //             items: dataProviders
      //               .filter((dataProvider) => dataProvider.browseable)
      //               .map((dataProvider) => this.providerToFileSystemItem(dataProvider)),
      //           };
      //         }),
      //         catchError((error) => {
      //           this.isLoading = false;
      //           this.error$.next((error as HttpErrorResponse).error.message);
      //           this.navigateToRoot(false);
      //           return of({ items: [] });
      //         })
      //       );
      //     } else {
      //       result$ = merge(
      //         this.dataProviderService.getAssets(
      //           parent.dataProvider.id,
      //           parent.asset ? parent.asset.assetPath : '',
      //           this.paginator.pageSize
      //         ),
      //         key$.pipe(switchMap((key) => this.dataProviderService.getAssetsByLink(parent.dataProvider.id, key)))
      //       ).pipe(
      //         map((resp) => {
      //           return {
      //             links: resp.links.pagination,
      //             items: resp.assets.map((asset) => this.assetToFileSystemItem(asset)),
      //           };
      //         }),
      //         catchError((error) => {
      //           this.isLoading = false;
      //           this.error$.next((error as HttpErrorResponse).error.message);
      //           this.navigateToRoot(false);
      //           return of({ items: [] });
      //         })
      //       );
      //     }
      //     return result$.pipe(
      //       takeUntil(this.destroy$),
      //       map((result) => {
      //         this.paginator.first = result.pagination?.first;
      //         this.paginator.last = result.pagination?.last;
      //         this.paginator.next = result.pagination?.next;
      //         this.paginator.previous = result.pagination?.prev;
      //         if (!result.pagination?.sort) {
      //           this.sort.direction = '';
      //         } else {
      //           let direction = 'asc';
      //           let column = result.pagination.sort;
      //           if (column[0] == '-') {
      //             direction = 'desc';
      //             column = column.substr(1);
      //           }
      //         }
      //         let items = result.items;
      //         this.isLoading = false;
      //         const selectedIds = this.selection.selected.map((item) => item.id);
      //         this.selection.clear();
      //         this.selection.select(...items.filter((item) => selectedIds.includes(item.id)));
      //         return items;
      //         // return items.sort((a, b) => {
      //         //   if (a.isDirectory === b.isDirectory) {
      //         //     return a.name.toLowerCase() < b.name.toLowerCase()
      //         //       ? -1
      //         //       : a.name.toLowerCase() > b.name.toLowerCase()
      //         //       ? 1
      //         //       : 0;
      //         //   } else {
      //         //     return a.isDirectory ? -1 : 1;
      //         //   }
      //         // });
      //       })
      //     );
      //   }),
      //   share()
      // );
      // this.items$.subscribe((items) => {
      //   this.dataSource.data = items;
      //   this.dataSource.sort = this.sort;
      //   // if(!this.dataSource.paginator && this.paginator) {
      //   //   this.dataSource.paginator = this.paginator;
      //   // }
      //   this.dataSource.sortingDataAccessor = (item, property) => {
      //     if (property === 'name') {
      //       return item.name;
      //     } else {
      //       return this.resolvePath(item, property);
      //     }
      //   };
      // });
    });
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  onSortChange($event: Sort) {
    if (!this.parentDataProvider) return;
    this.store.dispatch(
      new UpdateDefaultSort(this.parentDataProvider.id, { field: $event.active, direction: $event.direction })
    );
  }

  resolvePath(object: Object, path: string) {
    return path.split('.').reduce((o, p) => (o ? o[p] : null), object);
  }

  clearError() {
    this.error$.next(null);
  }

  public navigateToRoot(clearError = true) {
    if (clearError) this.clearError();
    this.path$.next(null);
    this.onPathChange.emit(null);
  }

  public navigateToChildItem(item: FileSystemItem) {
    this.navigateTo(item.dataProvider.id, item.asset ? this.path.assets.concat(item.asset) : []);
  }

  public navigateTo(dataProviderId: string, assets: DataProviderAsset[], clearError = true) {
    if (clearError) this.clearError();
    this.nameFilter = '';
    this.path = {
      dataProviderId: dataProviderId,
      assets: assets,
    };

    this.onPathChange.emit(this.path);
  }

  onCreateClick() {
    const dialogRef = this.dialog.open(NameDialogComponent, {
      width: '350px',
      disableClose: true,
      data: {
        title: 'New Directory',
        name: '',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(withLatestFrom(this.currentDirectory$))
      .subscribe(([result, parent]) => {
        if (result) {
          this.isLoading = true;
          const parentAssetPath = parent.asset ? parent.asset.assetPath : '';
          this.dataProviderService
            .createCollectionAsset(parent.dataProvider.id, `${parentAssetPath}${result}`)
            .pipe(take(1))
            .subscribe(
              () => {
                this.refresh$.next(true);
              },
              (err) => {},
              () => {
                this.isLoading = false;
              }
            );
        }
      });
  }

  handleMove(keepOriginal = false) {
    const actionName = keepOriginal ? 'Copy' : 'Move';
    const selectedItems = [...this.selection.selected];
    const dialogRef = this.dialog.open(TargetDialogComponent, {
      width: '500px',
      disableClose: true,
      data: {
        title: `${actionName} to`,
        action: actionName,
        path: this.path,
        source: this.currentDirectory,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.isLoading = true;
        const path = result.path as DataProviderPath;
        const target = result.target as FileSystemItem;
        const assets = selectedItems.map((item) => item.asset).filter((asset) => asset !== null);
        const parentAssetPath = target.asset ? target.asset.assetPath : '';
        const reqs = assets.map((asset) => {
          const newAssetPath = `${parentAssetPath}/${asset.name}`;
          return this.dataProviderService
            .copyAsset(asset.dataProviderId, asset.assetPath, target.dataProvider.id, newAssetPath, keepOriginal)
            .pipe(
              take(1),
              map((result) => ({ asset: asset, error: null })),
              catchError((err) => of({ asset: asset, error: err as HttpErrorResponse }))
            );
        });
        forkJoin(reqs).subscribe(
          (result) => {
            const errors = result.filter((result) => result.error);

            if (errors.length !== 0) {
              const dialogConfig: Partial<AlertDialogConfig> = {
                title: 'Error',
                message: `Unable to ${actionName.toLowerCase()} ${
                  errors.length
                } of the selected files/folders. ${errors.map((error) => error.asset.name).join(', ')}`,
                buttons: [
                  {
                    color: null,
                    value: false,
                    label: 'Close',
                  },
                ],
              };
              this.dialog.open(AlertDialogComponent, {
                width: '450px',
                data: dialogConfig,
              });
            } else if (errors.length !== assets.length) {
              this.navigateTo(path.dataProviderId, path.assets);
            }
          },
          (err) => {},
          () => {
            this.isLoading = false;
          }
        );
      }
    });
  }

  onCopyClick() {
    return this.handleMove(true);
  }

  onMoveClick() {
    return this.handleMove();
  }

  onDeleteClick() {
    const dialogConfig: Partial<AlertDialogConfig> = {
      title: 'Delete Files',
      message: 'Are you sure you want to delete the selected files?',
      buttons: [
        {
          color: null,
          value: true,
          label: 'Delete',
        },
        {
          color: null,
          value: false,
          label: 'Cancel',
        },
      ],
    };
    const dialogRef = this.dialog.open(AlertDialogComponent, {
      width: '450px',
      data: dialogConfig,
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.isLoading = true;
        const assets = this.selection.selected.map((item) => item.asset).filter((asset) => asset !== null);
        const reqs = assets.map((asset) =>
          this.dataProviderService.deleteAsset(asset.dataProviderId, asset.assetPath, true).pipe(
            take(1),
            map((result) => ({ asset: asset, error: null })),
            catchError((err) => of({ asset: asset, error: err as HttpErrorResponse }))
          )
        );
        forkJoin(reqs).subscribe(
          (result) => {
            const errors = result.filter((result) => result.error);

            if (errors.length !== 0) {
              const dialogConfig: Partial<AlertDialogConfig> = {
                title: 'Error',
                message: `Unable to delete ${errors.length} of the selected files/folders. ${errors
                  .map((error) => error.asset.name)
                  .join(', ')}`,
                buttons: [
                  {
                    color: null,
                    value: false,
                    label: 'Close',
                  },
                ],
              };
              this.dialog.open(AlertDialogComponent, {
                width: '450px',
                data: dialogConfig,
              });
            }

            this.refresh$.next(true);
          },
          (err) => {},
          () => {
            this.isLoading = false;
          }
        );
      }
    });
  }

  onRenameClick() {
    const asset = this.selection.selected[0].asset;
    const dialogRef = this.dialog.open(NameDialogComponent, {
      width: '350px',
      disableClose: true,
      data: {
        title: 'Rename File',
        name: asset.name,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.isLoading = true;
        this.dataProviderService
          .renameAsset(asset.dataProviderId, asset.assetPath, result)
          .pipe(take(1))
          .subscribe(
            () => {
              this.refresh$.next(true);
            },
            (err) => {},
            () => {
              this.isLoading = false;
            }
          );
      }
    });
  }

  onUploadClick() {
    this.fileUpload.nativeElement.click();
  }

  onUploadChange(files: FileList) {
    if (files.length === 0) return;
    const maxSize = Math.max(...Array.from(files).map((file) => file.size));
    if (this.maxUploadSize !== null && maxSize > this.maxUploadSize) {
      const dialogConfig: Partial<AlertDialogConfig> = {
        title: 'Exceeds Maximum Allowed Size',
        message: `The maximum allowed size for each file is ${
          Math.round((100 * this.maxUploadSize) / 1000000) / 100
        } Mb.`,
        buttons: [
          {
            color: null,
            value: false,
            label: 'Close',
          },
        ],
      };
      this.dialog.open(AlertDialogComponent, {
        width: '450px',
        data: dialogConfig,
      });
      return;
    }

    const dialogRef = this.dialog.open(UploadDialogComponent, {
      width: '550px',
      disableClose: true,
      data: {
        files: files,
        target: this.currentDirectory,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      this.fileUpload.nativeElement.value = '';
      this.refresh$.next(true);
    });
  }

  onDownloadClick() {
    let assets = this.selection.selected.map((item) => item.asset).filter((asset) => asset !== null);
    if (assets.length === 0) {
      return;
    }

    const dataProviderId = assets[0].dataProviderId;
    //only assets from the same data provider can be downloaded
    assets = assets.filter((asset) => asset.dataProviderId === dataProviderId);

    const job: BatchAssetDownloadJob = {
      type: JobType.BatchAssetDownload,
      id: null,
      providerId: dataProviderId,
      paths: assets.map((asset) => asset.assetPath),
      state: null,
      result: null,
    };

    const corrId = this.corrGen.next();
    const onCreateJobSuccess$ = this.actions$.pipe(
      ofActionDispatched(CreateJobSuccess),
      filter((action) => (action as CreateJobSuccess).correlationId === corrId),
      take(1),
      flatMap((action) => {
        const jobId = (action as CreateJobSuccess).job.id;
        const dialogConfig: JobProgressDialogConfig = {
          title: 'Preparing download',
          message: 'Please wait while we prepare the files for download.',
          progressMode: 'indeterminate',
          job$: this.store.select(JobsState.getJobById).pipe(map((fn) => fn(jobId))),
        };
        const dialogRef = this.dialog.open(JobProgressDialogComponent, {
          width: '400px',
          data: dialogConfig,
          disableClose: true,
        });

        return dialogRef.afterClosed().pipe(
          flatMap((result) => {
            if (!result) {
              return of(null);
            }

            return this.jobService.getJobResultFile(jobId, 'download').pipe(
              tap((data) => {
                saveAs(data, assets.length === 1 ? assets[0].name : 'afterglow-files.zip');
              })
            );
          })
        );
      })
    );

    const onCreateJobFail$ = this.actions$.pipe(
      ofActionDispatched(CreateJobFail),
      filter((action) => (action as CreateJobFail).correlationId === corrId),
      take(1)
    );

    this.store.dispatch(new CreateJob(job, 1000, corrId));

    merge(onCreateJobSuccess$, onCreateJobFail$)
      .pipe(take(1))
      .subscribe(() => {});
  }

  masterToggle() {
    this.onToggle$.next(true);
  }

  checkboxLabel(item: FileSystemItem): string {
    return `${this.selection.isSelected(item) ? 'deselect' : 'select'}`;
  }

  handleUploadFilesChange($event: Event) {
    this.onUploadChange(($event.target as HTMLInputElement).files);
  }

  onPaginationLinkClick() {}

  _changePageSize(pageSize: number) {
    // Current page needs to be updated to reflect the new page size. Navigate to the page
    this.pageSize = pageSize;
    this.pageSizeChange.emit(this.pageSize);
  }

  onNameFilterChange(value: string) {
    this.nameFilter = value;
    this.nameFilterChange$.next(value);
  }
}
