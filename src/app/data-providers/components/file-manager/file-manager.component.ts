import { Component, OnInit, Inject, ViewChild, Output, EventEmitter, Input } from "@angular/core";
import { DataProvidersState } from "../../data-providers.state";
import { SetCurrentPath } from "../../data-providers.actions";
import { Store, Actions, ofActionDispatched } from "@ngxs/store";
import { Observable, of, merge } from "rxjs";
import CustomFileSystemProvider from "devextreme/file_management/custom_provider";
import { map, distinctUntilChanged, tap, take, filter, flatMap } from "rxjs/operators";
import { DataProviderAsset } from "../../models/data-provider-asset";
import FileSystemItem from "devextreme/file_management/file_system_item";
import { dxFileManagerDetailsColumn } from "devextreme/ui/file_manager";
import UploadInfo from "devextreme/file_management/upload_info";
import { AfterglowDataProviderService } from "../../../workbench/services/afterglow-data-providers";
import { saveAs } from "file-saver/dist/FileSaver";
import { DxFileManagerComponent } from "devextreme-angular";
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

@Component({
  selector: "app-file-manager",
  templateUrl: "./file-manager.component.html",
  styleUrls: ["./file-manager.component.scss"],
})
export class FileManagerComponent implements OnInit {
  @Input()
  selectionMode: string = "single";

  @Input()
  create: boolean = false;

  @Input()
  copy: boolean = false;

  @Input()
  move: boolean = false;

  @Input()
  delete: boolean = false;

  @Input()
  rename: boolean = false;

  @Input()
  upload: boolean = false;

  @Input()
  download: boolean = false;

  @Input()
  allowedFileExtensions: string[] = [];

  @Output()
  readonly onSelectedAssetOpened: EventEmitter<DataProviderAsset> = new EventEmitter<DataProviderAsset>();

  @Output()
  readonly onAssetSelectionChange: EventEmitter<DataProviderAsset[]> = new EventEmitter<DataProviderAsset[]>();

  @Output()
  readonly onCurrentAssetChanged: EventEmitter<DataProviderAsset> = new EventEmitter<DataProviderAsset>();

  @ViewChild(DxFileManagerComponent, { static: false }) fileManager: DxFileManagerComponent;

  customFileSystemProvider: CustomFileSystemProvider;
  currentFileSystemPath$: Observable<string>;
  fileManagerDetailsColumns$: Observable<dxFileManagerDetailsColumn[]>;
  isWriteable$: Observable<boolean>;

  constructor(
    private store: Store,
    private actions$: Actions,
    private dataProviderService: AfterglowDataProviderService,
    private corrGen: CorrelationIdGenerator,
    public dialog: MatDialog,
    private jobService: JobService
  ) {
    this.customFileSystemProvider = new CustomFileSystemProvider({
      abortFileUpload: this.abortFileUpload.bind(this),
      copyItem: this.copyItem.bind(this),
      createDirectory: this.createDirectory.bind(this),
      deleteItem: this.deleteItem.bind(this),
      downloadItems: this.downloadItems.bind(this),
      getItems: this.getItems.bind(this),
      getItemsContent: this.getItemsContent.bind(this),
      moveItem: this.moveItem.bind(this),
      renameItem: this.renameItem.bind(this),
      uploadFileChunk: this.uploadFileChunk.bind(this),
    });

    this.currentFileSystemPath$ = store.select(DataProvidersState.getCurrentFileSystemPath).pipe(distinctUntilChanged());

    let currentDataProvider$ = store.select(DataProvidersState.getCurrentDataProvider).pipe(distinctUntilChanged());

    this.isWriteable$ = currentDataProvider$.pipe(
      map((provider) => provider && !provider.readonly),
      distinctUntilChanged()
    );

    this.fileManagerDetailsColumns$ = currentDataProvider$.pipe(
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
          let result: dxFileManagerDetailsColumn = {
            dataField: "metadata." + column.fieldName,
            caption: column.name,
          };
          return result;
        });
      })
    );
  }

  ngOnInit(): void {}

  onCurrentDirectoryChanged($event) {
    let fileSystemItem: FileSystemItem = $event.directory;
    this.store.dispatch(new SetCurrentPath(fileSystemItem.path));

    let asset: DataProviderAsset = fileSystemItem.dataItem;
    if (!asset) {
      asset = null;
    }

    this.onCurrentAssetChanged.emit(asset);
  }

  onSelectionChange($event) {
    this.onAssetSelectionChange.emit($event.selectedItems.map((item) => item.dataItem));
  }

  onSelectedFileOpened($event) {
    let fileSystemItem: FileSystemItem = $event.file;
    if (!fileSystemItem) return;

    let asset: DataProviderAsset = fileSystemItem.dataItem;
    if (!asset) return;

    this.onSelectedAssetOpened.emit(asset);
  }

  onErrorOccurred($event) {
    console.log($event);
  }

  /**
   * File System
   */

  handleErrorResponse(resp: HttpErrorResponse) {
    // https://js.devexpress.com/Documentation/20_1/ApiReference/UI_Widgets/dxFileManager/Configuration/#onErrorOccurred
    let errorMessage = resp.error.message;
    let errorCode = 32767;
    switch (resp.error.exception) {
      case "AssetAlreadyExistsError": {
        errorCode = 3;
        errorMessage = "Directory exists";
      }
    }
    throw { errorCode: errorCode, errorText: errorMessage };
  }

  /**
   * A function that cancels the file upload.
   */
  abortFileUpload(file: File, uploadInfo: UploadInfo, destinationDirectory: FileSystemItem) {}

  /**
   * A function that copies files or folders.
   */
  copyItem(item: FileSystemItem, destinationDirectory: FileSystemItem, keepOriginal = true) {
    let destinationAsset: DataProviderAsset = destinationDirectory.dataItem;
    if (!destinationAsset) {
      return Promise.reject({ errorCode: 32767, errorText: "Invalid destination" });
    }

    let asset: DataProviderAsset = item.dataItem;
    if (!asset) {
      return Promise.reject({ errorCode: 32767, errorText: "Invalid file" });
    }

    let newAssetPath = `${destinationAsset.assetPath}/${asset.name}`;

    let destinationProvider = this.store.selectSnapshot(DataProvidersState.getDataProviderEntities)[
      destinationAsset.dataProviderId
    ];
    if (!destinationProvider) {
      return Promise.reject({ errorCode: 32767, errorText: "Invalid destination" });
    }

    if (destinationProvider.readonly) {
      return Promise.reject({ errorCode: 32767, errorText: "Destination is readonly" });
    }
    let newDataProviderId = destinationProvider.id;

    let provider = this.store.selectSnapshot(DataProvidersState.getDataProviderEntities)[asset.dataProviderId];
    if (!provider) {
      return Promise.reject({ errorCode: 32767, errorText: "Invalid file" });
    }

    if (!keepOriginal && provider.readonly) {
      return Promise.reject({ errorCode: 32767, errorText: "Source is readonly" });
    }

    return this.dataProviderService
      .copyAsset(asset.dataProviderId, asset.assetPath, newDataProviderId, newAssetPath, keepOriginal)
      .pipe(take(1))
      .toPromise()
      .catch((resp) => this.handleErrorResponse(resp));
  }

  /**
   * A function that creates a directory.
   */
  createDirectory(parentDirectory: FileSystemItem, name: string) {
    let parentAsset: DataProviderAsset = parentDirectory.dataItem;
    let path = `${parentAsset.assetPath}/${name}`;

    return this.dataProviderService
      .createCollectionAsset(parentAsset.dataProviderId, path)
      .pipe(take(1))
      .toPromise()
      .catch((resp) => this.handleErrorResponse(resp));
  }

  /**
   * A function that deletes a file or folder.
   */
  deleteItem(item: FileSystemItem) {
    let asset: DataProviderAsset = item.dataItem;
    return this.dataProviderService.deleteAsset(asset.dataProviderId, asset.assetPath, true).pipe(take(1)).toPromise();
  }

  /**
   * A function that downloads files.
   */
  downloadItems(items: Array<FileSystemItem>) {
    let assets = items.map((item) => item.dataItem as DataProviderAsset).filter((asset) => asset && asset.assetPath);
    if (assets.length == 0) return;

    let dataProviderId = assets[0].dataProviderId;
    //only assets from the same data provider can be downloaded
    assets = assets.filter((asset) => asset.dataProviderId == dataProviderId);

    let job: BatchAssetDownloadJob = {
      type: JobType.BatchAssetDownload,
      id: null,
      provider_id: parseInt(dataProviderId),
      paths: assets.map((asset) => asset.assetPath),
    };

    let corrId = this.corrGen.next();
    let onCreateJobSuccess$ = this.actions$.pipe(
      ofActionDispatched(CreateJobSuccess),
      filter((action) => (action as CreateJobSuccess).correlationId == corrId),
      take(1),
      flatMap((action) => {
        let jobId = (action as CreateJobSuccess).job.id;
        let dialogConfig: JobProgressDialogConfig = {
          title: "Preparing download",
          message: `Please wait while we prepare the files for download.`,
          progressMode: "indeterminate",
          job$: this.store.select(JobsState.getJobById).pipe(map((fn) => fn(jobId).job)),
        };
        let dialogRef = this.dialog.open(JobProgressDialogComponent, {
          width: "400px",
          data: dialogConfig,
          disableClose: true,
        });

        return dialogRef.afterClosed().pipe(
          flatMap((result) => {
            if (!result) {
              return of(null);
            }

            return this.jobService.getJobResultFile(jobId, "download").pipe(
              tap((data) => {
                saveAs(data, assets.length == 1 ? assets[0].name : "afterglow-files.zip");
              })
            );
          })
        );
      })
    );

    let onCreateJobFail$ = this.actions$.pipe(
      ofActionDispatched(CreateJobFail),
      filter((action) => (action as CreateJobFail).correlationId == corrId),
      take(1)
    );

    this.store.dispatch(new CreateJob(job, 1000, corrId));

    return merge(onCreateJobSuccess$, onCreateJobFail$).pipe(take(1)).toPromise();
  }

  /**
   * A function that gets file system items.
   */
  getItems(parentDirectory: FileSystemItem): Promise<DataProviderAsset[]> {
    let asset: DataProviderAsset = parentDirectory.dataItem;
    if (!asset) {
      //root
      let dataProviders = this.store.selectSnapshot(DataProvidersState.getDataProviders);
      return Promise.resolve(
        dataProviders.map((dataProvider) => {
          return {
            assetPath: "",
            dataProviderId: dataProvider.id,
            isDirectory: true,
            metadata: { description: dataProvider.description, permissions: dataProvider.readonly ? "readonly" : "" },
            name: dataProvider.name,
          };
        })
      );
    } else {
      return this.dataProviderService.getAssets(asset.dataProviderId, asset.assetPath).pipe(take(1)).toPromise();
    }
  }

  /**
   * A function that get items content.
   */
  getItemsContent(items: Array<FileSystemItem>) {}

  /**
   * A function or the name of a data source field that provides information on whether a file or folder contains sub directories.
   */
  hasSubDirectoriesExpr = "hasSubDirectories";

  /**
   * A function that moves files and folders.
   */
  moveItem(item: FileSystemItem, destinationDirectory: FileSystemItem) {
    return this.copyItem(item, destinationDirectory, false);
  }

  /**
   * A function that renames files and folders.
   */
  renameItem(item: FileSystemItem, newName: string) {
    let asset: DataProviderAsset = item.dataItem;
    return this.dataProviderService.renameAsset(asset.dataProviderId, asset.assetPath, newName).pipe(take(1)).toPromise();
  }

  /**
   * A function that uploads a file in chunks.
   */
  uploadFileChunk(file: File, uploadInfo: UploadInfo, destinationDirectory: FileSystemItem) {
    let destinationAsset: DataProviderAsset = destinationDirectory.dataItem;
    let path = `${destinationAsset.assetPath}/${file.name}`;
    return this.dataProviderService
      .createAsset(destinationAsset.dataProviderId, path, file, uploadInfo)
      .pipe(take(1))
      .toPromise();
  }
}
