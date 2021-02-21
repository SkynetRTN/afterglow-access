import { Component, OnInit, Inject, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DataProviderAsset } from '../../models/data-provider-asset';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { isValidFilename } from '../../../utils/validators';

@Component({
  selector: 'app-name-dialog',
  templateUrl: './name-dialog.component.html',
  styleUrls: ['./name-dialog.component.scss']
})
export class RenameDialogComponent implements OnInit, AfterViewInit {
  @ViewChild('nameInput')
  nameInput: ElementRef;
  title = '';
  nameForm = new FormGroup(
    {
      name: new FormControl('', [Validators.required, isValidFilename()])
    }
  )

  constructor(private dialogRef: MatDialogRef<RenameDialogComponent>, @Inject(MAT_DIALOG_DATA) private data: any) {
    this.title = data.title;
    this.nameForm.get('name').setValue(data.name);
    this.nameForm.updateValueAndValidity();
  }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    setTimeout(() => (this.nameInput.nativeElement as HTMLInputElement).select())
    
  }

  save() {
    this.dialogRef.close(this.nameForm.get('name').value)
  }

  cancel() {
    this.dialogRef.close()
  }

}
