import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface AlertDialogConfig {
  title: string;
  message: string;
  description: string;
  buttons: Array<{
    label: string;
    value: any;
    color: string;
  }>;
}

@Component({
  selector: 'app-alert-dialog',
  templateUrl: './alert-dialog.component.html',
  styleUrls: ['./alert-dialog.component.scss'],
})
export class AlertDialogComponent implements OnInit {
  config: AlertDialogConfig;

  constructor(
    public dialogRef: MatDialogRef<AlertDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Partial<AlertDialogConfig>
  ) {
    this.config = {
      title: 'Confirm',
      message: '',
      description: '',
      buttons: [
        {
          color: null,
          value: false,
          label: 'Close',
        },
      ],
      ...data,
    };
  }

  ngOnInit() {}
}
