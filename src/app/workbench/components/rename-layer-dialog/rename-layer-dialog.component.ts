import { Component, OnInit, Inject, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { isValidFilename } from '../../../utils/validators';
import { IHdu } from 'src/app/data-files/models/data-file';
import { AfterglowDataFileService } from '../../services/afterglow-data-files';
import { DataFilesState } from 'src/app/data-files/data-files.state';
import { Store } from '@ngxs/store';

@Component({
  selector: 'app-rename-layer-dialog',
  templateUrl: './rename-layer-dialog.component.html',
  styleUrls: ['./rename-layer-dialog.component.scss'],
})
export class RenameHduDialogComponent implements OnInit, AfterViewInit {
  @ViewChild('nameInput')
  nameInput: ElementRef;
  nameForm = new FormGroup({
    name: new FormControl('', [Validators.required, isValidFilename()]),
  });

  constructor(private dialogRef: MatDialogRef<RenameHduDialogComponent>, @Inject(MAT_DIALOG_DATA) private layer: IHdu, private dataFileService: AfterglowDataFileService, private store: Store) {

    this.nameForm.get('name').setValue(layer.name);
    this.nameForm.updateValueAndValidity();
  }

  ngOnInit(): void { }

  ngAfterViewInit() {
    setTimeout(() => (this.nameInput.nativeElement as HTMLInputElement).select());
  }

  save() {
    if (!this.nameForm.valid) return;

    let file = this.store.selectSnapshot(DataFilesState.getFileByHduId(this.layer.id));


    let name = this.nameForm.get('name').value;
    this.dataFileService.updateFile(this.layer.id, { name: name, groupName: file.layerIds.length == 1 ? name : file.name }).subscribe(() => {
      this.dialogRef.close({
        ...this.layer,
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
