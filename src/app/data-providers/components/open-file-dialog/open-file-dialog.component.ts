import { Component, OnInit, Inject } from '@angular/core';
import {  DataProvidersState } from '../../data-providers.state';
import { LoadDataProviderAssets, SetCurrentFileSystemItem, ImportAssets, ImportAssetsCompleted } from '../../data-providers.actions';
import { Store, Actions, ofActionCompleted } from '@ngxs/store';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { dxFileManagerDetailsColumn } from 'devextreme/ui/file_manager';
import { map, distinctUntilChanged, tap, take } from 'rxjs/operators';
import { FileSystemItem } from '../../models/data-provider-asset';
import { LoadLibrary } from '../../../data-files/data-files.actions';
import { SelectDataFileListItem } from '../../../workbench/workbench.actions';
import { DataFilesState } from "../../../data-files/data-files.state";

@Component({
  selector: 'app-open-file-dialog',
  templateUrl: './open-file-dialog.component.html',
  styleUrls: ['./open-file-dialog.component.scss']
})
export class OpenFileDialogComponent implements OnInit {
  fileSystem$: Observable<FileSystemItem[]>;
  currentFileSystemPath$: Observable<string>;
  fileManagerDetailsColumns$: Observable<dxFileManagerDetailsColumn[]>;
  selectedFileSystemItems$ = new BehaviorSubject<FileSystemItem[]>([]);

  openBtnEnabled$: Observable<boolean>;

  constructor(private store: Store, private actions$: Actions, private dialogRef: MatDialogRef<OpenFileDialogComponent>, @Inject(MAT_DIALOG_DATA) private data: any) {
    this.fileSystem$ = store.select(DataProvidersState.getFileSystem);
    this.currentFileSystemPath$ = store.select(DataProvidersState.getCurrentFileSystemPath);
    
    let currentDataProvider$ = this.currentFileSystemPath$.pipe(
      map(path => {
        let dpName = path.split('/')[0];
        if(!dpName) {
          return null;
        }
        return this.store.selectSnapshot(DataProvidersState.getDataProviders).find(dp => dp.name == dpName)
      }),
      distinctUntilChanged()
    )

    this.fileManagerDetailsColumns$ = currentDataProvider$.pipe(
      map(dataProvider => {
        if(!dataProvider) {
          return [{
            dataField: 'metadata.description',
            caption: 'description',
          }];
        }
        return dataProvider.columns.map(column => {
          let result: dxFileManagerDetailsColumn = {
            dataField: 'metadata.' + column.fieldName,
            caption: column.name,
          }
          return result;
        })
      })
    )

    this.openBtnEnabled$ = this.selectedFileSystemItems$.pipe(
      map(items => items.every(item => !item.isDirectory) && items.length != 0)
    )
  }

  ngOnInit(): void {
  }

  onCurrentDirectoryChanged($event) {
    console.log($event);
    this.store.dispatch(new SetCurrentFileSystemItem($event.directory.dataItem))
  }

  onSelectionChange($event) {
    this.selectedFileSystemItems$.next($event.selectedItems.map(item => item.dataItem));
  }

  openFiles() {
    let selectedFileSystemItems = this.selectedFileSystemItems$.value;
    if(!selectedFileSystemItems || selectedFileSystemItems.length == 0) return;
    this.store.dispatch(new ImportAssets(selectedFileSystemItems));
    this.actions$.pipe(
      ofActionCompleted(ImportAssetsCompleted),
      take(1)
    ).subscribe((v) => {
      let action: ImportAssetsCompleted = v.action;

      this.store.dispatch(new LoadLibrary()).subscribe(() => {
        if(action.fileIds.length != 0) {
          let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[action.fileIds[0]]
          this.store.dispatch(new SelectDataFileListItem({fileId: hdu.fileId, hduId: hdu.id}))
        }
      });
      this.dialogRef.close();
    })
  }

}
