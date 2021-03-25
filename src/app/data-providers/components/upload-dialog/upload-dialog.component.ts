import { Component, OnInit, Inject, ViewChild, AfterViewInit, ElementRef, OnDestroy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DataProviderAsset } from '../../models/data-provider-asset';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { isValidFilename } from '../../../utils/validators';
import { Subject, concat, from, throwError, forkJoin, of } from 'rxjs';
import { AfterglowDataProviderService, UploadInfo } from '../../../workbench/services/afterglow-data-providers';
import { MatTableDataSource } from '@angular/material/table';
import { FileSystemItem } from '../file-manager/file-manager.component';
import { concatMap, tap, catchError, takeUntil } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

interface FileUploadItem {
  name: string;
  progress: number;
  error: string;
}

let CHUNK_SIZE = 1000000000; //Core does not support multi-part uploads

@Component({
  selector: 'app-upload-dialog',
  templateUrl: './upload-dialog.component.html',
  styleUrls: ['./upload-dialog.component.scss'],
})
export class UploadDialogComponent implements OnInit, AfterViewInit, OnDestroy {
  destroy$ = new Subject<boolean>();
  files: FileList;
  target: FileSystemItem;
  completed: boolean = false;

  dataSource = new MatTableDataSource<FileUploadItem>();
  displayedColumns = ['name', 'progress'];

  constructor(
    private dataProviderService: AfterglowDataProviderService,
    private dialogRef: MatDialogRef<UploadDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private data: any
  ) {
    this.files = data.files;
    this.target = data.target;

    let filesArray = Array.from(this.files);
    this.dataSource.data = filesArray.map((file) => ({ name: file.name, progress: 0, error: null }));

    let reqs = filesArray.map((file) => {
      let parentAssetPath = this.target.asset ? this.target.asset.assetPath : '';
      let chunkCount = Math.ceil(file.size / CHUNK_SIZE);
      let bytesUploaded = 0;
      let chunks: UploadInfo[] = [];
      for (let i = 0; i < chunkCount; i++) {
        let chunkSize = Math.min(file.size, bytesUploaded + CHUNK_SIZE);
        chunks.push({
          bytesUploaded: bytesUploaded,
          chunkCount: chunkCount,
          customData: null,
          chunkBlob: file.slice(bytesUploaded, chunkSize),
          chunkIndex: i,
        });
        bytesUploaded += chunkSize;
      }

      return from(chunks).pipe(
        concatMap((chunk) => {
          return this.dataProviderService
            .createAsset(this.target.dataProvider.id, `${parentAssetPath}/${file.name}`, file, chunk)
            .pipe(
              tap((v) => {
                this.dataSource.data.find((item) => item.name == file.name).progress =
                  (100.0 * (chunk.chunkIndex + 1)) / chunk.chunkCount;
              })
            );
        }),
        catchError((err) => {
          let innerError = (err as HttpErrorResponse).error;
          let message = 'Unexpected error';
          if (innerError.message) message = innerError.message;

          this.dataSource.data.find((item) => item.name == file.name).error = message;
          return of(null);
        })
      );
    });

    forkJoin(reqs)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (v) => {},
        (err) => {},
        () => {
          this.completed = true;
        }
      );
  }

  ngOnInit(): void {}

  ngAfterViewInit() {}

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  cancel() {
    this.dialogRef.close();
  }
}
