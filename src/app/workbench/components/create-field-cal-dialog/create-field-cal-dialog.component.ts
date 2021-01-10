import { Component, OnInit, Inject } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";

@Component({
  selector: "app-create-field-cal-dialog",
  templateUrl: "./create-field-cal-dialog.component.html",
  styleUrls: ["./create-field-cal-dialog.component.scss"],
})
export class CreateFieldCalDialogComponent implements OnInit {
  createForm = new FormGroup({
    name: new FormControl("", Validators.required),
  });

  constructor(public dialogRef: MatDialogRef<CreateFieldCalDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit() {}
}
