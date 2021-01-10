import { Component, OnInit, Inject, ViewChild, OnDestroy, AfterViewInit, ElementRef } from '@angular/core';
import { ImportAssets, ImportAssetsCompleted } from '../../data-providers.actions';
import { Store, Actions, ofActionCompleted } from '@ngxs/store';
import { Observable, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { map, distinctUntilChanged, tap, take, takeUntil } from 'rxjs/operators';
import { LoadLibrary } from '../../../data-files/data-files.actions';
import { FocusFileListItem } from '../../../workbench/workbench.actions';
import { DataFilesState } from "../../../data-files/data-files.state";
import { DataProviderAsset } from '../../models/data-provider-asset';
import FileSystemItem from 'devextreme/file_management/file_system_item';
import { AfterglowDataProviderService } from '../../../workbench/services/afterglow-data-providers';
import { DataProvidersModule } from '../../data-providers.module';
import { DataProvidersState } from '../../data-providers.state';
import { DataProvider } from '../../models/data-provider';
import { FormControl, Validators } from '@angular/forms';
import { AlertDialogComponent } from '../../../workbench/components/alert-dialog/alert-dialog.component';
import { HttpErrorResponse } from '@angular/common/http';

export interface SaveDialogResult {
  dataProviderId: string;
  assetPath: string;
}

@Component({
  selector: 'app-save-dialog',
  templateUrl: './save-dialog.component.html',
  styleUrls: ['./save-dialog.component.scss']
})
export class SaveDialogComponent implements OnInit, OnDestroy, AfterViewInit {
  selectedAssets$ = new BehaviorSubject<DataProviderAsset[]>([]);
  destinationValid$: Observable<boolean>;
  destroy$: Subject<boolean> = new Subject<boolean>();
  currentDataProvider$: Observable<DataProvider>;

  @ViewChild('nameInput') nameInput: ElementRef


  nameFormControl = new FormControl('', [
    Validators.required,
    Validators.pattern(/^[\w\-. ]+/)
  ]);

  constructor(
    private store: Store,
    private actions$: Actions,
    private dataProviderService: AfterglowDataProviderService,
    private dialogRef: MatDialogRef<SaveDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private data: any,
    public dialog: MatDialog,
  ) {

    if (data && data.name) {
      this.nameFormControl.setValue(data.name);
    }
    this.currentDataProvider$ = this.store.select(DataProvidersState.getCurrentDataProvider).pipe(
      distinctUntilChanged()
    )
    let currentAssetPath$ = this.store.select(DataProvidersState.getCurrentAssetPath).pipe(
      distinctUntilChanged()
    )

    this.destinationValid$ = combineLatest([
      this.currentDataProvider$,
      currentAssetPath$
    ]).pipe(
      map(([destDataProvider, destAssetPath]) => {
        return destDataProvider && !destDataProvider.readonly && destAssetPath != null
      }),
      distinctUntilChanged()
    )

    this.selectedAssets$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(
      (selectedAssets => {
        if (selectedAssets.length != 1 || (selectedAssets[0] && selectedAssets[0].isDirectory)) return;
        this.nameFormControl.setValue(selectedAssets[0].name);
      })
    )
  }

  ngOnInit(): void {

  }

  ngAfterViewInit(): void {
    setTimeout(() => { // this will make the execution after the above boolean has changed
      this.nameInput.nativeElement.focus();
      this.nameInput.nativeElement.select();
    }, 0);

  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  onSelectedAssetOpened(asset: DataProviderAsset) {
    if (!asset || asset.isDirectory) return;

    // open confirmation

    this.nameFormControl.setValue(asset.name);

    this.saveAs(asset.dataProviderId, asset.assetPath)
  }

  onErrorOccurred($event) {
    console.log($event);
  }

  onSaveAsBtnClick() {
    let currentDataProvider = this.store.selectSnapshot(DataProvidersState.getCurrentDataProvider)
    let currentAssetPath = this.store.selectSnapshot(DataProvidersState.getCurrentAssetPath)

    let path = !currentAssetPath ? `/${this.nameFormControl.value}` : `/${currentAssetPath}/${this.nameFormControl.value}`;
    this.saveAs(currentDataProvider.id, path);
  }

  saveAs(dataProviderId: string, path: string) {
    let result: SaveDialogResult = { dataProviderId: dataProviderId, assetPath: path };
    this.dialogRef.close(result);
  }






}
