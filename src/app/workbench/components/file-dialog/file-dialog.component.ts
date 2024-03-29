import { Component, OnInit, Inject, OnDestroy, AfterViewInit } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DataFile } from '../../../data-files/models/data-file';
import { Store, Actions, ofActionDispatched } from '@ngxs/store';
import { DataFilesState } from '../../../data-files/data-files.state';
import { DataProvidersState } from '../../../data-providers/data-providers.state';
import { CloseDataFile, CloseDataFileSuccess, CloseDataFileFail } from '../../../data-files/data-files.actions';
import { tap, take, map, catchError, flatMap, filter, takeUntil, switchMap, takeWhile } from 'rxjs/operators';
import { Observable, throwError, of, merge, Subject, BehaviorSubject } from 'rxjs';
import { AfterglowDataProviderService } from '../../services/afterglow-data-providers';
import {
  SaveDialogComponent,
  SaveDialogResult,
} from '../../../data-providers/components/save-dialog/save-dialog.component';
import { DataProviderAsset } from '../../../data-providers/models/data-provider-asset';
import { HttpErrorResponse } from '@angular/common/http';
import { AlertDialogConfig, AlertDialogComponent } from '../../../utils/alert-dialog/alert-dialog.component';
import { CoreErrorCode } from '../../models/core-error-code';
import { CoreApiError } from 'src/app/utils/core-api-response';

export interface FileDialogConfig {
  files: DataFile[];
  mode: 'close' | 'save';
}

export interface SaveChangesDialogResult {
  value: any;
  repeat: boolean;
}

interface SaveFileResult {
  fileId: string;
  dataProviderId: string;
  assetPath: string;
}

enum FileDialogAction {
  discard,
  save,
  close,
}

@Component({
  selector: 'app-file-dialog',
  templateUrl: './file-dialog.component.html',
  styleUrls: ['./file-dialog.component.scss'],
})
export class SaveChangesDialogComponent implements OnDestroy {
  autoSave: boolean = null;
  lastSaveResult: SaveFileResult = null;
  autoDiscard: boolean = null;
  index$ = new BehaviorSubject<number>(0);
  waitingForUserInput: boolean = false;
  destroy$ = new Subject<boolean>();
  action$: Subject<FileDialogAction> = new Subject<FileDialogAction>();

  constructor(
    public dialogRef: MatDialogRef<SaveChangesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public config: FileDialogConfig,
    public store: Store,
    public dataProviderService: AfterglowDataProviderService,
    public dialog: MatDialog,
    public actions$: Actions
  ) {
    this.action$
      .pipe(
        takeUntil(this.destroy$),
        flatMap((input) => {
          this.waitingForUserInput = false;

          let next$: Observable<boolean>;
          if (input == FileDialogAction.discard) {
            next$ = this.discard();
          } else if (input == FileDialogAction.save) {
            next$ = this.save();
          } else if (input == FileDialogAction.close) {
            next$ = of(true);
          } else {
            return throwError('Unexpected user input');
          }

          return next$.pipe(
            flatMap((success) => {
              if (success && this.config.mode == 'close') {
                return this.close();
              }
              return of(success);
            })
          );
        })
      )
      .subscribe((success) => {
        if (success) {
          this.index$.next(this.index$.getValue() + 1);
        } else if (this.config.mode == 'save') {
          this.dialogRef.close();
        } else {
          this.dialogRef.close();
        }
      });

    this.index$
      .pipe(
        takeUntil(this.destroy$),
        takeWhile((value) => value < this.config.files.length)
      )
      .subscribe(
        (index) => {
          this.waitingForUserInput = false;
          let layerEntities = this.store.selectSnapshot(DataFilesState.getLayerEntities);
          let file = this.config.files[index];
          let modified = file.layerIds.map((layerId) => layerEntities[layerId].modified).some((v) => v);
          if (this.config.mode == 'save') {
            if (modified || this.isReadOnly) {
              this.action$.next(FileDialogAction.save);
            } else {
              //skip
              this.index$.next(this.index$.getValue() + 1);
            }
          } else {
            if (modified) {
              if (this.autoSave && this.lastSaveResult) {
                this.action$.next(FileDialogAction.save);
              } else if (this.autoDiscard) {
                this.action$.next(FileDialogAction.discard);
              } else {
                this.waitingForUserInput = true;
              }
            } else {
              this.action$.next(FileDialogAction.close);
            }
          }
        },
        (err) => { },
        () => {
          this.dialogRef.close();
        }
      );
  }

  get currentFile(): DataFile {
    return !this.config.files || this.index$.getValue() >= this.config.files.length
      ? null
      : this.config.files[this.index$.getValue()];
  }

  get isReadOnly(): boolean {
    let dataProviderEntities = this.store.selectSnapshot(DataProvidersState.getDataProviderEntities);

    let dataProvider = dataProviderEntities[this.currentFile.dataProviderId];
    let readOnly = !dataProvider || dataProvider.readonly;
    return readOnly;
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  close() {
    let file = this.currentFile;
    this.store.dispatch(new CloseDataFile(file.id));
    let success$ = this.actions$.pipe(
      ofActionDispatched(CloseDataFileSuccess),
      filter((action) => (action as CloseDataFileSuccess).fileId == file.id)
    );
    let failure$ = this.actions$.pipe(
      ofActionDispatched(CloseDataFileFail),
      filter((action) => (action as CloseDataFileFail).fileId == file.id),
      map((action) => throwError('Failed to close file'))
    );

    return merge(success$, failure$).pipe(take(1));
  }

  discard() {
    let file = this.currentFile;
    let layerEntities = this.store.selectSnapshot(DataFilesState.getLayerEntities);
    let modifiedFiles = this.config.files.slice(this.index$.getValue() + 1).filter((file) => {
      return file.layerIds.map((layerId) => layerEntities[layerId].modified).some((v) => v);
    });

    if (modifiedFiles.length > 1 && this.autoDiscard === null) {
      let dialogConfig: Partial<AlertDialogConfig> = {
        title: 'Discard all changes?',
        message: `Do you want to discard changes for the ${modifiedFiles.length} remaining files which have been modified?`,
        buttons: [
          {
            color: null,
            value: true,
            label: 'Discard all changes',
          },
          {
            color: null,
            value: false,
            label: 'Let me decide for each file',
          },
        ],
      };
      let dialogRef = this.dialog.open(AlertDialogComponent, {
        width: '600px',
        data: dialogConfig,
      });

      return dialogRef.afterClosed().pipe(
        map((result) => {
          if (result) {
            this.autoDiscard = true;
          } else {
            this.autoDiscard = false;
          }
          return true;
        })
      );
    }
    return of(true);
  }

  save() {
    let file = this.currentFile;
    let readOnly = this.isReadOnly;

    let dataProviderId = file.dataProviderId;
    let assetPath = file.assetPath;
    if (this.autoSave && this.lastSaveResult && readOnly) {
      dataProviderId = this.lastSaveResult.dataProviderId;
      let parentAssetPath = this.lastSaveResult.assetPath.slice(0, this.lastSaveResult.assetPath.lastIndexOf('/'));
      assetPath = `${parentAssetPath}/${file.name}`;
    }

    let dataProviderEntities = this.store.selectSnapshot(DataProvidersState.getDataProviderEntities);
    let dataProvider = dataProviderEntities[dataProviderId];

    let next$: Observable<SaveDialogResult>;
    if (dataProvider && !dataProvider.readonly && assetPath) {
      // do not open save dialog if data provider is writeable and asset path is valid
      next$ = of({ dataProviderId: dataProviderId, assetPath: assetPath });
    } else {
      let saveDialogRef = this.dialog.open(SaveDialogComponent, {
        width: '80vw',
        maxWidth: '1200px',
        data: {
          name: file.name,
        },
      });

      next$ = saveDialogRef.afterClosed();
    }

    let handleError = (error) => {
      let errorDialog = this.dialog.open(AlertDialogComponent, {
        width: '400px',
        data: {
          title: 'Error',
          message: 'An unexpected error was encountered when attempting to save the file.',
        },
      });
      return errorDialog.afterClosed().pipe(map((v) => false));
    };

    return next$.pipe(
      flatMap((saveDialogResult) => {
        if (saveDialogResult) {
          let dataProviderId = saveDialogResult.dataProviderId;
          let assetPath = saveDialogResult.assetPath;

          let createSaveRequest = (overwrite: boolean) => {
            return this.dataProviderService.saveFile(file.id, dataProviderId, assetPath, !overwrite).pipe(
              take(1),
              map((v) => {
                let result: SaveFileResult = {
                  fileId: file.id,
                  assetPath: assetPath,
                  dataProviderId: dataProviderId,
                };
                return result;
              }),
              catchError((error) => handleError(error))
            );
          };

          //send GET request to determine whether asset already exists
          return this.dataProviderService.getAssets(dataProviderId, assetPath).pipe(
            take(1),
            flatMap((resp) => {
              if (resp.data.length != 1) {
                //is collection
                return throwError('Cannot save to chosen path.  Existing asset is a collection.');
              } else {
                //exists
                if (dataProviderId == file.dataProviderId && assetPath == file.assetPath) {
                  //saving file to original location -- overwrite without confirmations
                  return createSaveRequest(true);
                }
                let dialogRef = this.dialog.open(AlertDialogComponent, {
                  width: '400px',
                  data: {
                    message: `Overwrite existing file? '${dataProvider.displayName}${assetPath}'?`,
                    buttons: [
                      {
                        color: null,
                        value: true,
                        label: 'Overwrite',
                      },
                      {
                        color: null,
                        value: false,
                        label: 'Cancel',
                      },
                    ],
                  },
                });

                return dialogRef.afterClosed().pipe(
                  flatMap((overwrite) => {
                    if (!overwrite) {
                      return of(false);
                    }
                    return createSaveRequest(true);
                  })
                );
              }
            }),
            catchError((httpErrorResp: HttpErrorResponse) => {
              let errorResp: CoreApiError = httpErrorResp.error;
              if (errorResp.error.id == 'AssetNotFoundError') {
                return createSaveRequest(false);
              } else {
                // unknown error
                console.log(httpErrorResp);
                return handleError(httpErrorResp);
              }
            })
          );
        }
        return of(null);
      }),

      flatMap((saveFileResult) => {
        if (!saveFileResult) {
          this.autoSave = false;
          return of(false);
        }

        this.lastSaveResult = saveFileResult;

        if (readOnly) {
          let readOnlyFiles = this.config.files.slice(this.index$.getValue() + 1).filter((file) => {
            let dataProvider = dataProviderEntities[this.currentFile.dataProviderId];
            return !dataProvider || dataProvider.readonly;
          });

          if (readOnlyFiles.length != 0 && this.autoSave === null) {
            let dialogConfig: Partial<AlertDialogConfig> = {
              title: 'Auto-Save Remaining Files',
              message: `Would you like to automatically save the remaining ${readOnlyFiles.length} read-only files to the same location?`,
              buttons: [
                {
                  color: null,
                  value: true,
                  label: 'Auto-save to same location',
                },
                {
                  color: null,
                  value: false,
                  label: 'Change the filename and/or location for each file',
                },
              ],
            };
            let dialogRef = this.dialog.open(AlertDialogComponent, {
              width: '600px',
              data: dialogConfig,
            });

            return dialogRef.afterClosed().pipe(
              map((result) => {
                if (result) {
                  this.autoSave = true;
                } else {
                  this.autoSave = false;
                }
                return true;
              })
            );
          }
        }

        return of(true);
      })
    );
  }

  onSaveBtnClick() {
    this.action$.next(FileDialogAction.save);
  }

  onDiscardBtnClick() {
    this.action$.next(FileDialogAction.discard);
  }

  onCancelBtnClick() {
    this.dialogRef.close();
  }
}
