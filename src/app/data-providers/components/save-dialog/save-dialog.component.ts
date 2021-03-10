import { Component, OnInit, Inject, ViewChild, OnDestroy, AfterViewInit, ElementRef } from "@angular/core";
import { ImportAssets, ImportAssetsCompleted } from "../../data-providers.actions";
import { Store, Actions, ofActionCompleted } from "@ngxs/store";
import { Observable, Subject, BehaviorSubject, combineLatest } from "rxjs";
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { map, distinctUntilChanged, tap, take, takeUntil, withLatestFrom } from "rxjs/operators";
import { LoadLibrary } from "../../../data-files/data-files.actions";
import { SelectFile } from "../../../workbench/workbench.actions";
import { DataFilesState } from "../../../data-files/data-files.state";
import { DataProviderAsset } from "../../models/data-provider-asset";
import { AfterglowDataProviderService } from "../../../workbench/services/afterglow-data-providers";
import { DataProvidersModule } from "../../data-providers.module";
import { DataProvidersState, DataProviderPath } from "../../data-providers.state";
import { DataProvider } from "../../models/data-provider";
import { FormControl, Validators } from "@angular/forms";
import { HttpErrorResponse } from "@angular/common/http";
import { FileSystemItem, FileManagerComponent } from "../file-manager/file-manager.component";

export interface SaveDialogResult {
  dataProviderId: string;
  assetPath: string;
}

@Component({
  selector: "app-save-dialog",
  templateUrl: "./save-dialog.component.html",
  styleUrls: ["./save-dialog.component.scss"],
})
export class SaveDialogComponent implements OnInit, OnDestroy, AfterViewInit {
  selectedAssets$ = new Subject<FileSystemItem[]>();
  currentDirectory$ = new BehaviorSubject<FileSystemItem>(null);
  onSaveClick$ = new Subject<boolean>();
  destinationValid$: Observable<boolean>;
  destroy$: Subject<boolean> = new Subject<boolean>();

  @ViewChild("nameInput") nameInput: ElementRef;
  @ViewChild("fileManager") fileManager: FileManagerComponent;
  nameFormControl = new FormControl("", [Validators.required, Validators.pattern(/^[\w\-. ]+/)]);
  lastPath$: Observable<DataProviderPath>;

  constructor(
    private store: Store,
    private actions$: Actions,
    private dataProviderService: AfterglowDataProviderService,
    private dialogRef: MatDialogRef<SaveDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private data: any,
    public dialog: MatDialog
  ) {
    this.lastPath$ = this.store.select(DataProvidersState.getLastPath);

    if (data && data.name) {
      this.nameFormControl.setValue(data.name);
    }

    this.destinationValid$ = this.currentDirectory$.pipe(
      map((cwd) => {
        return cwd && cwd.dataProvider && !cwd.dataProvider.readonly;
      }),
      distinctUntilChanged()
    );

    this.selectedAssets$.pipe(takeUntil(this.destroy$)).subscribe((selectedAssets) => {
      if (selectedAssets.length != 1 || (selectedAssets[0] && selectedAssets[0].isDirectory)) return;
      this.nameFormControl.setValue(selectedAssets[0].name);
    });

    this.onSaveClick$.pipe(takeUntil(this.destroy$), withLatestFrom(this.currentDirectory$)).subscribe(([v, cwd]) => {
      let currentDataProvider = cwd.dataProvider;
      let parentAssetPath = cwd.asset ? cwd.asset.assetPath : "";
      this.saveAs(currentDataProvider.id, `${parentAssetPath}/${this.nameFormControl.value}`);
    });
  }

  saveAs(dataProviderId: string, path: string) {
    let result: SaveDialogResult = { dataProviderId: dataProviderId, assetPath: path };
    this.dialogRef.close(result);
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    setTimeout(() => {
      // this will make the execution after the above boolean has changed
      this.nameInput.nativeElement.focus();
      this.nameInput.nativeElement.select();
    }, 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  onCurrentDirectoryChange(item: FileSystemItem) {
    this.currentDirectory$.next(item);
  }

  onSelectedAssetOpened(asset: DataProviderAsset) {
    if (!asset || asset.isDirectory) return;

    // open confirmation

    this.nameFormControl.setValue(asset.name);

    this.saveAs(asset.dataProviderId, asset.assetPath);
  }
}
