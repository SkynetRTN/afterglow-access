import { Component, OnInit, Inject } from "@angular/core";
import {
  MatDialog,
  MatDialogRef,
  MAT_DIALOG_DATA
} from "@angular/material/dialog";

@Component({
  selector: "app-confirmation-dialog",
  templateUrl: "./confirmation-dialog.component.html",
  styleUrls: ["./confirmation-dialog.component.scss"]
})
export class ConfirmationDialogComponent implements OnInit {
  message: string;
  color: string = 'primary';
  btnLabel: string = 'Confirm';

  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.message = data.message;
    if(data.confirmationBtn) {
      if(data.confirmationBtn.color) this.color = data.confirmationBtn.color;
      if(data.confirmationBtn.label) this.btnLabel = data.confirmationBtn.label;
    }
  }

  ngOnInit() {}
}
