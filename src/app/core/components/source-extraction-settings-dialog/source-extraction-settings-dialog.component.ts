import { Component, OnInit, Inject } from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';

import { SourceExtractionSettings } from '../../models/source-extraction-settings';

@Component({
  selector: 'app-source-extraction-settings-dialog',
  templateUrl: './source-extraction-settings-dialog.component.html',
  styleUrls: ['./source-extraction-settings-dialog.component.scss']
})
export class SourceExtractionSettingsDialogComponent implements OnInit {

  private settings: SourceExtractionSettings;

  constructor(public dialogRef: MatDialogRef<SourceExtractionSettingsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) {

    this.settings = data;

  }

  private onDeblendChange($event) {
    this.settings.deblend = $event.checked;
  }

  private setFwhm(value) {
    this.settings.fwhm = value;
  }

  private setThreshold(value) {
    this.settings.threshold = value;
  }


  ngOnInit() {
  }

}
