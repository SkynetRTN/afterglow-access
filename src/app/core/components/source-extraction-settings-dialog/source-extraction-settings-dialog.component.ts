import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { SourceExtractionSettings } from '../../../jobs/models/source-extraction';


@Component({
  selector: 'app-source-extraction-settings-dialog',
  templateUrl: './source-extraction-settings-dialog.component.html',
  styleUrls: ['./source-extraction-settings-dialog.component.scss']
})
export class SourceExtractionSettingsDialogComponent implements OnInit {

  settings: SourceExtractionSettings;

  constructor(public dialogRef: MatDialogRef<SourceExtractionSettingsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) {

    this.settings = data;

  }

  onDeblendChange($event) {
    this.settings.deblend = $event.checked;
  }

  setFwhm(value) {
    this.settings.fwhm = value;
  }

  setThreshold(value) {
    this.settings.threshold = value;
  }


  ngOnInit() {
  }

}
