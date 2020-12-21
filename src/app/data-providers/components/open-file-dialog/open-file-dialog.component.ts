import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import { ImportAssets, ImportAssetsCompleted } from '../../data-providers.actions';
import { Store, Actions, ofActionCompleted } from '@ngxs/store';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { map, distinctUntilChanged, tap, take } from 'rxjs/operators';
import { LoadLibrary } from '../../../data-files/data-files.actions';
import { SelectDataFileListItem } from '../../../workbench/workbench.actions';
import { DataFilesState } from "../../../data-files/data-files.state";
import { DataProviderAsset } from '../../models/data-provider-asset';
import FileSystemItem from 'devextreme/file_management/file_system_item';
import { AfterglowDataProviderService } from '../../../workbench/services/afterglow-data-providers';

@Component({
  selector: 'app-open-file-dialog',
  templateUrl: './open-file-dialog.component.html',
  styleUrls: ['./open-file-dialog.component.scss']
})
export class OpenFileDialogComponent implements OnInit {
  selectedAssets$ = new BehaviorSubject<DataProviderAsset[]>([]);
  openBtnEnabled$: Observable<boolean>;

  constructor(
    private store: Store,
    private actions$: Actions,
    private dataProviderService: AfterglowDataProviderService,
    private dialogRef: MatDialogRef<OpenFileDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private data: any
  ) {
    this.openBtnEnabled$ = this.selectedAssets$.pipe(
      map(items => items && items.every(item => !item.isDirectory) && items.length != 0),
      distinctUntilChanged()
    )
  }

  ngOnInit(): void {
  }


  onSelectedFileOpened($event) {
    let fileSystemItem: FileSystemItem = $event.file;
    if (!fileSystemItem) return;

    let asset: DataProviderAsset = fileSystemItem.dataItem;
    if (!asset || asset.isDirectory) return;
    
    this.dialogRef.close([asset])
  }

  onErrorOccurred($event) {
    console.log($event);
  }

  openSelectedAssets() {
    let selectedAssets = this.selectedAssets$.value;
    if (!selectedAssets) return;
    selectedAssets = selectedAssets.filter(asset => !asset.isDirectory);
    if (selectedAssets.length == 0) return;

    this.dialogRef.close(selectedAssets);
  }






}
