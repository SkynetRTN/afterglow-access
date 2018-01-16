import { Component, OnInit, Inject } from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';

import { PhotSettings } from '../../models/phot-settings';
import { CentroidMethod } from '../../models/centroid-settings';

@Component({
  selector: 'app-phot-settings-dialog',
  templateUrl: './phot-settings-dialog.component.html',
  styleUrls: ['./phot-settings-dialog.component.scss']
})
export class PhotSettingsDialogComponent implements OnInit {

  private settings: PhotSettings;

  private centroidMethodOptions = [
    {label: 'Center of Mass', value: CentroidMethod.COM},
    {label: '1D Gaussian', value: CentroidMethod.GAUSSIAN_1D},
    {label: '2D Gaussian', value: CentroidMethod.GAUSSIAN_2D},
  ]

  constructor(public dialogRef: MatDialogRef<PhotSettingsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) {

    this.settings = data;

  }

  private onCentroidChange($event) {
    this.settings.centroid = $event.checked;
  }

  private setAperture(value) {
    this.settings.aperture = value;
  }

  private setCentroidRadius(value) {
    this.settings.centroidRadius = value;
  }

  ngOnInit() {
  }

}
