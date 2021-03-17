import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SourceExtractionRegionOption, SourceExtractionSettings } from '../../models/source-extraction-settings';

@Component({
  selector: 'app-source-extraction-dialog',
  templateUrl: './source-extraction-dialog.component.html',
  styleUrls: ['./source-extraction-dialog.component.scss'],
})
export class SourceExtractionDialogComponent implements OnInit {
  settings: SourceExtractionSettings;
  SourceExtractionRegionOption = SourceExtractionRegionOption;

  regionOptions = [
    { label: 'Entire Image', value: SourceExtractionRegionOption.ENTIRE_IMAGE },
    { label: 'Current View', value: SourceExtractionRegionOption.VIEWPORT },
    { label: 'Sonification Region', value: SourceExtractionRegionOption.SONIFIER_REGION },
  ];

  constructor(
    public dialogRef: MatDialogRef<SourceExtractionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
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

  setRegion(value) {
    this.settings.region = value;
  }

  ngOnInit() {}
}
