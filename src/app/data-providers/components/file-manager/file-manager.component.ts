import { Component, OnInit, Inject, ViewChild, Output, EventEmitter, Input, AfterViewInit } from "@angular/core";
import { DataProvidersState, DataProviderPath } from "../../data-providers.state";
import { SetCurrentPath } from "../../data-providers.actions";
import { Store, Actions, ofActionDispatched } from "@ngxs/store";
import { Observable, of, merge, Subject, combineLatest, BehaviorSubject, zip } from "rxjs";
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
  shareReplay,
  throttleTime,
  buffer,
  debounceTime,
  delay,
  startWith,
} from "rxjs/operators";
import { DataProviderAsset } from "../../models/data-provider-asset";
import { AfterglowDataProviderService } from "../../../workbench/services/afterglow-data-providers";
import { saveAs } from "file-saver/dist/FileSaver";
import { HttpErrorResponse } from "@angular/common/http";
import { BatchAssetDownloadJob } from "../../../jobs/models/batch-asset-download";
import { JobType } from "../../../jobs/models/job-types";
import { CorrelationIdGenerator } from "../../../utils/correlated-action";
import {
  JobProgressDialogConfig,
  JobProgressDialogComponent,
} from "../../../workbench/components/job-progress-dialog/job-progress-dialog.component";
import { JobsState } from "../../../jobs/jobs.state";
import { MatDialog } from "@angular/material/dialog";
import { JobService } from "../../../jobs/services/jobs";
import { CreateJobSuccess, CreateJobFail, CreateJob } from "../../../jobs/jobs.actions";
import { DataProvider } from "../../models/data-provider";
import { SelectionModel } from "@angular/cdk/collections";
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

export interface FileSystemItem {
  id: string;
  name: string;
  isDirectory: boolean;
  metadata: { [key: string]: any };
  dataProvider: DataProvider,
  asset: DataProviderAsset,
}

export interface FileSystemDetailsColumn {
  dataField: string;
  caption: string;
}



@Component({
  selector: "app-file-manager",
  templateUrl: "./file-manager.component.html",
  styleUrls: ["./file-manager.component.scss"],
})
export class FileManagerComponent implements OnInit, AfterViewInit {
  @Input("path")
  set path(path: DataProviderPath) {
    this.path$.next(path);
  }
  get path() {
    return this.path$.getValue();
  }
  private path$ = new BehaviorSubject<DataProviderPath>(null);

  @Input()
  selectionMode: "single" | "multiple" = "multiple";

  @Input()
  showToolbar: boolean = true;

  @Input("allowCreate")
  set allowCreate(allow: boolean) {
    this.allowCreate$.next(allow);
  }
  get allowCreate() {
    return this.allowCreate$.getValue();
  }
  private allowCreate$ = new BehaviorSubject<boolean>(null);

  @Input("allowCopy")
  set allowCopy(allow: boolean) {
    this.allowCopy$.next(allow);
  }
  get allowCopy() {
    return this.allowCopy$.getValue();
  }
  private allowCopy$ = new BehaviorSubject<boolean>(null);

  @Input("allowMove")
  set allowMove(allow: boolean) {
    this.allowMove$.next(allow);
  }
  get allowMove() {
    return this.allowMove$.getValue();
  }
  private allowMove$ = new BehaviorSubject<boolean>(null);

  @Input("allowDelete")
  set allowDelete(allow: boolean) {
    this.allowDelete$.next(allow);
  }
  get allowDelete() {
    return this.allowDelete$.getValue();
  }
  private allowDelete$ = new BehaviorSubject<boolean>(null);

  @Input("allowRename")
  set allowRename(allow: boolean) {
    this.allowRename$.next(allow);
  }
  get allowRename() {
    return this.allowRename$.getValue();
  }
  private allowRename$ = new BehaviorSubject<boolean>(null);

  @Input("allowUpload")
  set allowUpload(allow: boolean) {
    this.allowUpload$.next(allow);
  }
  get allowUpload() {
    return this.allowUpload$.getValue();
  }
  private allowUpload$ = new BehaviorSubject<boolean>(null);

  @Input("allowDownload")
  set allowDownload(allow: boolean) {
    this.allowDownload$.next(allow);
  }
  get allowDownload() {
    return this.allowDownload$.getValue();
  }
  private allowDownload$ = new BehaviorSubject<boolean>(null);

  @Input()
  allowedFileExtensions: string[] = [];

  @Output()
  readonly onSelectedAssetOpened: EventEmitter<DataProviderAsset> = new EventEmitter<DataProviderAsset>();

  @Output()
  readonly onAssetSelectionChange: EventEmitter<DataProviderAsset[]> = new EventEmitter<DataProviderAsset[]>();

  @Output()
  readonly onPathChange: EventEmitter<DataProviderPath> = new EventEmitter<DataProviderPath>();

  destroy$: Subject<boolean> = new Subject<boolean>();

  parent$: Observable<FileSystemItem>;
  parentDataProvider$: Observable<DataProvider>;
  refresh$ = new BehaviorSubject<boolean>(null);
  items$ = new Subject<FileSystemItem[]>();
  isLoading: boolean = false;
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
  
  resolvePath = (object, path, defaultValue) => path.split(".").reduce((o, p) => (o ? o[p] : defaultValue), object);
  @ViewChild(MatSort) sort: MatSort;
  dataSource = new MatTableDataSource<FileSystemItem>()
  showCreate$: Observable<boolean>;
  showCopy$: Observable<boolean>;
  showMove$: Observable<boolean>;
  showDelete$: Observable<boolean>;
  showRename$: Observable<boolean>;
  showUpload$: Observable<boolean>;
  showDownload$: Observable<boolean>;

  constructor(
    private store: Store,
    private actions$: Actions,
    private dataProviderService: AfterglowDataProviderService,
    private corrGen: CorrelationIdGenerator,
    public dialog: MatDialog,
    private jobService: JobService
  ) {
    let selectionChange$ = this.selection.changed.pipe(startWith(null))

    this.parent$ = this.path$.pipe(
      map(path => {
        if(!path) {
          //root file system item
          return null;
        }

        let dataProvider = this.store.selectSnapshot(DataProvidersState.getDataProviderEntities)[path.dataProviderId];
        
        if(path.assets.length == 0) {
          //data provider root
          return this.providerToFileSystemItem(dataProvider);
        }

        return this.assetToFileSystemItem(path.assets[path.assets.length-1])
      })
    )

    combineLatest(
      this.parent$.pipe(
        distinctUntilChanged((a,b) => a && b && a.id == b.id)
      ),
      this.refresh$
    ).pipe(
      takeUntil(this.destroy$),
      switchMap(([parent]) => {
        this.selection.clear();
        this.isLoading = true;
        if (!parent) {
          return this.dataProviderService.getDataProviders().pipe(
            // delay(50000),
            map(dataProviders => dataProviders.map(dataProvider => this.providerToFileSystemItem(dataProvider))),
            tap((v) => (this.isLoading = false))
          );
        } else {
          return this.dataProviderService
            .getAssets(parent.dataProvider.id, parent.asset ? parent.asset.assetPath : '')
            .pipe(
              map(assets => assets.map(asset => this.assetToFileSystemItem(asset))),
              tap((v) => (this.isLoading = false))
            );
        }
      })
    ).subscribe((items) => this.items$.next(items));

    this.parentDataProvider$ = this.parent$.pipe(
      map(parent => parent ? parent.dataProvider.id : null),
      distinctUntilChanged(),
      switchMap(id => {
        if(!id) return of(null);
        return this.store.select(DataProvidersState.getDataProviderById).pipe(
          map(fn => fn(id))
        )
      })
    )

    this.isWriteable$ = this.parentDataProvider$.pipe(
      map((dataProvider) => dataProvider && !dataProvider.readonly),
      distinctUntilChanged()
    );

    this.columns$ = this.parentDataProvider$.pipe(
      map((dataProvider) => {
        if (!dataProvider) {
          return [
            {
              dataField: "metadata.description",
              caption: "description",
            },
            {
              dataField: "metadata.permissions",
              caption: "permissions",
            },
          ];
        }
        return dataProvider.columns.map((column) => {
          let result: FileSystemDetailsColumn = {
            dataField: "metadata." + column.fieldName,
            caption: column.name,
          };
          return result;
        });
      })
    );

    this.displayedColumns$ = this.columns$.pipe(
      map((columns) => ["select", "name"].concat(columns.map((column) => column.caption)))
    );

    this.isAllSelected$ = combineLatest(this.items$, selectionChange$).pipe(
      map(([items, selectionChange]) => {
        const numSelected = this.selection.selected.length;
        const numRows = items.length;
        return numSelected === numRows;
      })
    );

    this.isIndeterminate$ = combineLatest(this.isAllSelected$, selectionChange$).pipe(
      map(([isAllSelected, selectionChange]) => {
        return this.selection.selected.length != 0 && !isAllSelected;
      })
    );

    this.onToggle$
      .pipe(takeUntil(this.destroy$), withLatestFrom(this.isAllSelected$, this.items$))
      .subscribe(([toggle, isAllSelected, items]) => {
        isAllSelected ? this.selection.clear() : items.forEach((row) => this.selection.select(row));
      });

    this.onRowDblClick$
      .pipe(takeUntil(this.destroy$), withLatestFrom(this.items$))
      .subscribe(([{ $event, item }, items]) => {
        //double click
        if(item.isDirectory) {
          this.navigateTo(item.dataProvider.id, item.asset ? this.path.assets.concat(item.asset) : [])
        }
        else {

        }
      });

    this.onRowClick$
      .pipe(takeUntil(this.destroy$), withLatestFrom(this.items$))
      .subscribe(([{ $event, item }, items]) => {
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
          let index1 = items.indexOf(this.lastSelectedItem);
          let index2 = items.indexOf(item);
          let selection = items
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

      this.showCreate$ = combineLatest(this.allowCreate$, this.isWriteable$).pipe(
        map(([allowCreate, isWriteable])=> {
          return allowCreate && isWriteable
        })
      )

      this.showCopy$ = combineLatest(this.allowCopy$, selectionChange$).pipe(
        map(([allowCopy])=> {
          if(!allowCopy) return false;
          let selected = this.selection.selected;
          //disallow copying the entire data provider
          if(selected.length == 0 || selected.some(v => !v.asset)) return false;
          return true;
        })
      )

      this.showMove$ = combineLatest(this.allowMove$, this.showCopy$, this.isWriteable$).pipe(
        map(([allowMove, showCopy, isWriteable]) => allowMove && showCopy && isWriteable)
      )

      this.showDelete$ = combineLatest(this.allowDelete$, this.showMove$).pipe(
        map(([allowDelete, showMove]) => allowDelete && showMove)
      )

      this.showRename$ = combineLatest(this.allowRename$, this.isWriteable$, selectionChange$).pipe(
        map(([allowRename, isWriteable]) => {
          return allowRename && isWriteable && this.selection.selected.length == 1
        })
      )

      this.showUpload$ = this.allowUpload$;

      this.showDownload$ = combineLatest(this.allowDownload$, selectionChange$).pipe(
        map(()=> {
          if(!this.allowDownload) return false;
          let selected = this.selection.selected;
          if(selected.length == 0 || selected.some(v => v.isDirectory)) return false;
          return true;
        })
      )



  }

  providerToFileSystemItem(dataProvider: DataProvider): FileSystemItem {
    return {
      id: dataProvider.id,
      name: dataProvider.name,
      dataProvider: dataProvider,
      asset: null,
      isDirectory: true,
      metadata: {
        description: dataProvider.description,
        permissions: dataProvider.readonly ? "readonly" : "",
      }
    }
  }
  
  assetToFileSystemItem(asset: DataProviderAsset): FileSystemItem {
    let dataProvider = this.store.selectSnapshot(DataProvidersState.getDataProviderEntities)[asset.dataProviderId];
    return {
      id: `${asset.dataProviderId}:${asset.assetPath}`,
      name: asset.name,
      dataProvider: dataProvider,
      asset: asset,
      isDirectory: asset.isDirectory,
      metadata: asset.metadata
    }
  }

  navigateToRoot() {
    this.path$.next(null)
    this.onPathChange.emit(null);
  }
  navigateTo(dataProviderId: string, assets: DataProviderAsset[]) {
    this.path = {
      dataProviderId: dataProviderId,
      assets: assets
    }

    this.onPathChange.emit(this.path)
  }

  onCreateClick() {

  }

  onCopyClick() {

  }

  onMoveClick() {

  }

  onDeleteClick() {

  }

  onRenameClick() {

  }

  onUploadClick() {

  }

  onDownloadClick() {

  }

  ngOnInit(): void {}

  ngAfterViewInit() {
    this.items$.subscribe(items => {
      this.dataSource.data = items;
      this.dataSource.sort = this.sort
    })
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  masterToggle() {
    this.onToggle$.next(true);
  }

  checkboxLabel(item: FileSystemItem): string {
    return `${this.selection.isSelected(item) ? "deselect" : "select"}`;
  }

  onCurrentDirectoryChanged($event) {
    // let fileSystemItem: FileSystemItem = $event.directory;
    // this.store.dispatch(new SetCurrentPath(fileSystemItem.path));
    // let asset: DataProviderAsset = fileSystemItem.dataItem;
    // if (!asset) {
    //   asset = null;
    // }
    // this.store.dispatch(new NavigateToCollectionAsset(asset))
    // this.onCurrentAssetChanged.emit(asset);
  }

  onSelectionChange($event) {
    // this.onAssetSelectionChange.emit($event.selectedItems.map((item) => item.dataItem));
  }

  onSelectedFileOpened($event) {
    // let fileSystemItem: FileSystemItem = $event.file;
    // if (!fileSystemItem) return;
    // let asset: DataProviderAsset = fileSystemItem.dataItem;
    // if (!asset) return;
    // this.onSelectedAssetOpened.emit(asset);
  }

  onErrorOccurred($event) {
    console.log($event);
  }

  /**
   * File System
   */

  // handleErrorResponse(resp: HttpErrorResponse) {
  //   // https://js.devexpress.com/Documentation/20_1/ApiReference/UI_Widgets/dxFileManager/Configuration/#onErrorOccurred
  //   let errorMessage = resp.error.message;
  //   let errorCode = 32767;
  //   switch (resp.error.exception) {
  //     case "AssetAlreadyExistsError": {
  //       errorCode = 3;
  //       errorMessage = "Directory exists";
  //     }
  //   }
  //   throw { errorCode: errorCode, errorText: errorMessage };
  // }

  /**
   * A function that cancels the file upload.
   */
  // abortFileUpload(file: File, uploadInfo: UploadInfo, destinationDirectory: FileSystemItem) {}

  /**
   * A function that copies files or folders.
   */
  // copyItem(item: FileSystemItem, destinationDirectory: FileSystemItem, keepOriginal = true) {
  //   let destinationAsset: DataProviderAsset = destinationDirectory.dataItem;
  //   if (!destinationAsset) {
  //     return Promise.reject({ errorCode: 32767, errorText: "Invalid destination" });
  //   }

  //   let asset: DataProviderAsset = item.dataItem;
  //   if (!asset) {
  //     return Promise.reject({ errorCode: 32767, errorText: "Invalid file" });
  //   }

  //   let newAssetPath = `${destinationAsset.assetPath}/${asset.name}`;

  //   let destinationProvider = this.store.selectSnapshot(DataProvidersState.getDataProviderEntities)[
  //     destinationAsset.dataProviderId
  //   ];
  //   if (!destinationProvider) {
  //     return Promise.reject({ errorCode: 32767, errorText: "Invalid destination" });
  //   }

  //   if (destinationProvider.readonly) {
  //     return Promise.reject({ errorCode: 32767, errorText: "Destination is readonly" });
  //   }
  //   let newDataProviderId = destinationProvider.id;

  //   let provider = this.store.selectSnapshot(DataProvidersState.getDataProviderEntities)[asset.dataProviderId];
  //   if (!provider) {
  //     return Promise.reject({ errorCode: 32767, errorText: "Invalid file" });
  //   }

  //   if (!keepOriginal && provider.readonly) {
  //     return Promise.reject({ errorCode: 32767, errorText: "Source is readonly" });
  //   }

  //   return this.dataProviderService
  //     .copyAsset(asset.dataProviderId, asset.assetPath, newDataProviderId, newAssetPath, keepOriginal)
  //     .pipe(take(1))
  //     .toPromise()
  //     .catch((resp) => this.handleErrorResponse(resp));
  // }

  /**
   * A function that creates a directory.
   */
  // createDirectory(parentDirectory: FileSystemItem, name: string) {
  //   let parentAsset: DataProviderAsset = parentDirectory.dataItem;
  //   let path = `${parentAsset.assetPath}/${name}`;

  //   return this.dataProviderService
  //     .createCollectionAsset(parentAsset.dataProviderId, path)
  //     .pipe(take(1))
  //     .toPromise()
  //     .catch((resp) => this.handleErrorResponse(resp));
  // }

  /**
   * A function that deletes a file or folder.
   */
  // deleteItem(item: FileSystemItem) {
  //   let asset: DataProviderAsset = item.dataItem;
  //   return this.dataProviderService.deleteAsset(asset.dataProviderId, asset.assetPath, true).pipe(take(1)).toPromise();
  // }

  /**
   * A function that downloads files.
   */
  // downloadItems(items: Array<FileSystemItem>) {
  //   let assets = items.map((item) => item.dataItem as DataProviderAsset).filter((asset) => asset && asset.assetPath);
  //   if (assets.length == 0) return;

  //   let dataProviderId = assets[0].dataProviderId;
  //   //only assets from the same data provider can be downloaded
  //   assets = assets.filter((asset) => asset.dataProviderId == dataProviderId);

  //   let job: BatchAssetDownloadJob = {
  //     type: JobType.BatchAssetDownload,
  //     id: null,
  //     provider_id: parseInt(dataProviderId),
  //     paths: assets.map((asset) => asset.assetPath),
  //   };

  //   let corrId = this.corrGen.next();
  //   let onCreateJobSuccess$ = this.actions$.pipe(
  //     ofActionDispatched(CreateJobSuccess),
  //     filter((action) => (action as CreateJobSuccess).correlationId == corrId),
  //     take(1),
  //     flatMap((action) => {
  //       let jobId = (action as CreateJobSuccess).job.id;
  //       let dialogConfig: JobProgressDialogConfig = {
  //         title: "Preparing download",
  //         message: `Please wait while we prepare the files for download.`,
  //         progressMode: "indeterminate",
  //         job$: this.store.select(JobsState.getJobById).pipe(map((fn) => fn(jobId))),
  //       };
  //       let dialogRef = this.dialog.open(JobProgressDialogComponent, {
  //         width: "400px",
  //         data: dialogConfig,
  //         disableClose: true,
  //       });

  //       return dialogRef.afterClosed().pipe(
  //         flatMap((result) => {
  //           if (!result) {
  //             return of(null);
  //           }

  //           return this.jobService.getJobResultFile(jobId, "download").pipe(
  //             tap((data) => {
  //               saveAs(data, assets.length == 1 ? assets[0].name : "afterglow-files.zip");
  //             })
  //           );
  //         })
  //       );
  //     })
  //   );

  //   let onCreateJobFail$ = this.actions$.pipe(
  //     ofActionDispatched(CreateJobFail),
  //     filter((action) => (action as CreateJobFail).correlationId == corrId),
  //     take(1)
  //   );

  //   this.store.dispatch(new CreateJob(job, 1000, corrId));

  //   return merge(onCreateJobSuccess$, onCreateJobFail$).pipe(take(1)).toPromise();
  // }

  /**
   * A function that gets file system items.
   */
  // getItems(parentDirectory: FileSystemItem): Promise<DataProviderAsset[]> {
  //   let asset: DataProviderAsset = parentDirectory.dataItem;
  //   if (!asset) {
  //     //root
  //     let dataProviders = this.store.selectSnapshot(DataProvidersState.getDataProviders);
  //     return Promise.resolve(
  //       dataProviders.map((dataProvider) => {
  //         return {
  //           assetPath: "",
  //           dataProviderId: dataProvider.id,

  //           name: dataProvider.name,
  //         };
  //       })
  //     );
  //   } else {
  //     return this.dataProviderService.getAssets(asset.dataProviderId, asset.assetPath).pipe(take(1)).toPromise();
  //   }
  // }

  /**
   * A function that get items content.
   */
  // getItemsContent(items: Array<FileSystemItem>) {}

  /**
   * A function or the name of a data source field that provides information on whether a file or folder contains sub directories.
   */
  hasSubDirectoriesExpr = "hasSubDirectories";

  /**
   * A function that moves files and folders.
   */
  // moveItem(item: FileSystemItem, destinationDirectory: FileSystemItem) {
  //   return this.copyItem(item, destinationDirectory, false);
  // }

  /**
   * A function that renames files and folders.
   */
  // renameItem(item: FileSystemItem, newName: string) {
  //   let asset: DataProviderAsset = item.dataItem;
  //   return this.dataProviderService.renameAsset(asset.dataProviderId, asset.assetPath, newName).pipe(take(1)).toPromise();
  // }

  /**
   * A function that uploads a file in chunks.
   */
  // uploadFileChunk(file: File, uploadInfo: UploadInfo, destinationDirectory: FileSystemItem) {
  //   let destinationAsset: DataProviderAsset = destinationDirectory.dataItem;
  //   let path = `${destinationAsset.assetPath}/${file.name}`;
  //   return this.dataProviderService
  //     .createAsset(destinationAsset.dataProviderId, path, file, uploadInfo)
  //     .pipe(take(1))
  //     .toPromise();
  // }
}
