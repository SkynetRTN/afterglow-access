import { Component, OnInit, Inject, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DataProviderAsset } from '../../models/data-provider-asset';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { isValidFilename } from '../../../utils/validators';

@Component({
  selector: 'app-rename-dialog',
  templateUrl: './rename-dialog.component.html',
  styleUrls: ['./rename-dialog.component.scss']
})
export class RenameDialogComponent implements OnInit, AfterViewInit {
  @ViewChild('nameInput')
  nameInput: ElementRef;

  asset: DataProviderAsset;
  renameForm = new FormGroup(
    {
      name: new FormControl('', [Validators.required, isValidFilename()])
    }
  )

  constructor(private dialogRef: MatDialogRef<RenameDialogComponent>, @Inject(MAT_DIALOG_DATA) private data: any) {
    this.asset = data.asset;
    this.renameForm.get('name').setValue(this.asset.name);
    this.renameForm.updateValueAndValidity();
    

  }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    (this.nameInput.nativeElement as HTMLInputElement).select()
  }

  save() {
    this.dialogRef.close(this.renameForm.get('name').value)
  }

  cancel() {
    this.dialogRef.close()
  }

}
