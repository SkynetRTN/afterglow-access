import { Component, OnInit, Inject, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { isValidFilename } from '../../../utils/validators';
import { DataFile, IHdu } from 'src/app/data-files/models/data-file';
import { AfterglowDataFileService } from '../../services/afterglow-data-files';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-rename-file-dialog',
  templateUrl: './rename-file-dialog.component.html',
  styleUrls: ['./rename-file-dialog.component.scss'],
})
export class RenameFileDialogComponent implements OnInit, AfterViewInit {
  @ViewChild('nameInput')
  nameInput: ElementRef;
  nameForm = new FormGroup({
    name: new FormControl('', [Validators.required, isValidFilename()]),
  });

  constructor(private dialogRef: MatDialogRef<RenameFileDialogComponent>, @Inject(MAT_DIALOG_DATA) private file: DataFile, private dataFileService: AfterglowDataFileService) {
    this.nameForm.get('name').setValue(file.name);
    this.nameForm.updateValueAndValidity();
  }

  ngOnInit(): void { }

  ngAfterViewInit() {
    setTimeout(() => (this.nameInput.nativeElement as HTMLInputElement).select());
  }

  save() {
    if (!this.nameForm.valid) return;

    let name = this.nameForm.get('name').value;
    forkJoin(this.file.hduIds.map(hduId => this.dataFileService.updateFile(hduId, { groupName: name })))
      .subscribe(() => {
        this.dialogRef.close({
          ...this.file,
          name: name
        })
      },
        () => {
          //handle error
          this.dialogRef.close()
        })
  }

  cancel() {
    this.dialogRef.close();
  }
}
