import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';


@Component({
  selector: 'app-tour-dialog',
  templateUrl: './tour-dialog.component.html',
  styleUrls: ['./tour-dialog.component.scss']
})
export class TourDialogComponent implements OnInit {

  constructor(public dialogRef: MatDialogRef<TourDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) {


  }

  ngOnInit() {
  }

}
