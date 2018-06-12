import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

import { PhotSettings } from '../../models/phot-settings';
import { CentroidSettings } from '../../models/centroid-settings';

@Component({
  selector: 'app-phot-settings-dialog',
  templateUrl: './phot-settings-dialog.component.html',
  styleUrls: ['./phot-settings-dialog.component.scss']
})
export class PhotSettingsDialogComponent implements OnInit {

  private settings: {phot: PhotSettings, centroid: CentroidSettings};

  constructor(public dialogRef: MatDialogRef<PhotSettingsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {phot: PhotSettings, centroid: CentroidSettings}) {

    this.settings = data;

  }

  private onCentroidChange($event) {
    this.settings.phot.centroid = $event.checked;
  }

  private setAperture(value) {
    this.settings.phot.aperture = value;
  }

  private setCenteringBoxWidth(value) {
    this.settings.centroid.psfCentroiderSettings.centeringBoxWidth = value;
  }

  ngOnInit() {
  }

}
