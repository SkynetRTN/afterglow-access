import { Component, OnInit, Inject, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { isValidFilename } from '../../../utils/validators';
import { IHdu } from 'src/app/data-files/models/data-file';
import { AfterglowDataFileService } from '../../services/afterglow-data-files';

@Component({
  selector: 'app-rename-hdu-dialog',
  templateUrl: './rename-hdu-dialog.component.html',
  styleUrls: ['./rename-hdu-dialog.component.scss'],
})
export class RenameHduDialogComponent implements OnInit, AfterViewInit {
  @ViewChild('nameInput')
  nameInput: ElementRef;
  nameForm = new FormGroup({
    name: new FormControl('', [Validators.required, isValidFilename()]),
  });

  constructor(private dialogRef: MatDialogRef<RenameHduDialogComponent>, @Inject(MAT_DIALOG_DATA) private hdu: IHdu, private dataFileService: AfterglowDataFileService) {

    this.nameForm.get('name').setValue(hdu.name);
    this.nameForm.updateValueAndValidity();
  }

  ngOnInit(): void { }

  ngAfterViewInit() {
    setTimeout(() => (this.nameInput.nativeElement as HTMLInputElement).select());
  }

  save() {
    if (!this.nameForm.valid) return;

    let name = this.nameForm.get('name').value;
    this.dataFileService.updateFile(this.hdu.id, { name: name }).subscribe(() => {
      this.dialogRef.close({
        ...this.hdu,
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
