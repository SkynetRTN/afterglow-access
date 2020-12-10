import { Component, OnInit, Inject } from "@angular/core";
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";

export interface ConfirmationDialogConfig {
  message: string;
  description: string;
  buttons: Array<{
    label: string;
    value: any;
    color: string;
  }>;
}

@Component({
  selector: "app-confirmation-dialog",
  templateUrl: "./confirmation-dialog.component.html",
  styleUrls: ["./confirmation-dialog.component.scss"],
})
export class ConfirmationDialogComponent implements OnInit {
  config: ConfirmationDialogConfig;

  constructor(public dialogRef: MatDialogRef<ConfirmationDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogConfig) {
    this.config = data;
  }

  ngOnInit() {}
}
