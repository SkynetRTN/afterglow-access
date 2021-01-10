import { Component, OnInit, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { PhotometrySettings } from "../../models/photometry-settings";

@Component({
  selector: "app-phot-settings-dialog",
  templateUrl: "./phot-settings-dialog.component.html",
  styleUrls: ["./phot-settings-dialog.component.scss"],
})
export class PhotSettingsDialogComponent implements OnInit {
  settings: PhotometrySettings;

  constructor(
    public dialogRef: MatDialogRef<PhotSettingsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PhotometrySettings
  ) {
    this.settings = data;
  }

  setCentroidRadius(value) {
    this.settings.centroidRadius = value;
  }

  ngOnInit() {}
}
