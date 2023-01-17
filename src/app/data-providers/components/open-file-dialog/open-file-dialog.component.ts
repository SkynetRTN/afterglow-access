import { Component, OnInit, Inject, ViewChild, OnDestroy } from '@angular/core';
import {
  ImportAssets,
  ImportAssetsCompleted,
  ImportAssetsStatusUpdated,
  SetCurrentPath,
} from '../../data-providers.actions';
import { Store, Actions, ofActionCompleted, ofActionDispatched } from '@ngxs/store';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { map, distinctUntilChanged, tap, take, takeUntil } from 'rxjs/operators';
import { LoadLibrary } from '../../../data-files/data-files.actions';
import { SelectFile } from '../../../workbench/workbench.actions';
import { DataFilesState } from '../../../data-files/data-files.state';
import { DataProviderAsset } from '../../models/data-provider-asset';
import { AfterglowDataProviderService } from '../../../workbench/services/afterglow-data-providers';
import { BatchImportJob } from '../../../jobs/models/batch-import';
import { DataProvidersState, DataProviderPath } from '../../data-providers.state';
import { FileSystemItem, FileManagerComponent } from '../file-manager/file-manager.component';

@Component({
  selector: 'app-open-file-dialog',
  templateUrl: './open-file-dialog.component.html',
  styleUrls: ['./open-file-dialog.component.scss'],
})
export class OpenFileDialogComponent implements OnInit, OnDestroy {
  @ViewChild('fileManager') fileManager: FileManagerComponent;
  lastPath$: Observable<DataProviderPath>;
  selectedFileSystemItems$ = new BehaviorSubject<FileSystemItem[]>([]);
  selectionIsValid$: Observable<boolean>;
  destroy$ = new Subject<boolean>();
  loading: boolean = false;
  progress: number = 0;
  allowedFileExtensions = ['.fits,.fit'];

  constructor(
    private store: Store,
    private actions$: Actions,
    private dataProviderService: AfterglowDataProviderService,
    private dialogRef: MatDialogRef<OpenFileDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private data: any
  ) {
    this.selectionIsValid$ = this.selectedFileSystemItems$.pipe(
      map(
        (items) =>
          (items && items.length == 1 && items[0].isDirectory) ||
          (items.every((item) => !item.isDirectory) && items.length != 0)
      ),
      distinctUntilChanged()
    );

    this.lastPath$ = this.store.select(DataProvidersState.getLastPath);
  }

  ngOnInit(): void { }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  onPathChange(path: DataProviderPath) {
    this.store.dispatch(new SetCurrentPath(path));
  }

  openSelectedAssets() {
    let selectedItems = this.selectedFileSystemItems$.value;
    if (!selectedItems) return;

    if (selectedItems.length == 1 && selectedItems[0].isDirectory) {
      this.fileManager.navigateToChildItem(selectedItems[0]);
      return;
    }

    let selectedAssets = selectedItems.filter((item) => !item.isDirectory && item.asset).map((item) => item.asset);
    if (selectedAssets.length == 0) return;

    this.open(selectedAssets);
  }

  open(assets: DataProviderAsset[]) {
    if (assets && assets.length != 0) {
      let importCompleted$ = this.actions$.pipe(
        ofActionCompleted(ImportAssetsCompleted),
        takeUntil(this.destroy$),
        take(1)
      );

      let importStatusUpdated$: Observable<ImportAssetsStatusUpdated> = this.actions$.pipe(
        ofActionDispatched(ImportAssetsStatusUpdated),
        takeUntil(importCompleted$),
        takeUntil(this.destroy$)
      );

      importStatusUpdated$.subscribe((action) => {
        let job: BatchImportJob = action.job;
        this.progress = job.state.progress;
        if (job.state.status == 'pending' || job.state.status == 'in_progress') {
          this.progress = job.state.progress;
        }
      });

      importCompleted$.subscribe((v) => {
        let action: ImportAssetsCompleted = v.action;

        this.store.dispatch(new LoadLibrary()).subscribe(() => {
          if (action.fileIds.length != 0) {
            let layer = this.store.selectSnapshot(DataFilesState.getLayerEntities)[action.fileIds[0]];
            this.store.dispatch(new SelectFile(layer.fileId, layer.id));
          }
        });
        this.dialogRef.close();
      });

      this.progress = 0;
      this.loading = true;
      this.store.dispatch(new ImportAssets(assets));
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
