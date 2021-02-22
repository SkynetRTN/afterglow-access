import { Component, OnInit, Inject, ViewChild, AfterViewInit, ElementRef } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { DataProviderAsset } from "../../models/data-provider-asset";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { isValidFilename } from "../../../utils/validators";
import { DataProviderPath } from "../../data-providers.state";
import { FileSystemItem } from "../file-manager/file-manager.component";
import { Subject } from 'rxjs';

@Component({
  selector: "app-target-dialog",
  templateUrl: "./target-dialog.component.html",
  styleUrls: ["./target-dialog.component.scss"],
})
export class TargetDialogComponent implements OnInit, AfterViewInit {
  title = "";
  action = "Submit";
  target: FileSystemItem;
  source: FileSystemItem;
  path: DataProviderPath;

  targetIsReadonly: boolean;
  targetIsSource: boolean;

  constructor(private dialogRef: MatDialogRef<TargetDialogComponent>, @Inject(MAT_DIALOG_DATA) private data: any) {
    this.title = data.title;
    this.path = data.path;
    this.action = data.action;
    this.source = data.source;
  }

  ngOnInit(): void {}

  ngAfterViewInit() {}

  onPathChange(path: DataProviderPath) {
    this.path = path;
  }

  onCurrentDirectoryChange(parent: FileSystemItem) {
    this.target = parent;
    this.targetIsSource = this.source && this.target && this.source.id == this.target.id;
    this.targetIsReadonly = !this.target || this.target.dataProvider.readonly
  }

  submit() {
    this.dialogRef.close({ target: this.target, path: this.path });
  }

  cancel() {
    this.dialogRef.close();
  }
}
