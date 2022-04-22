import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Store } from '@ngxs/store';
import { LogMessage as NgxLogMessage } from 'ngx-log-monitor';
import { timer } from 'rxjs';
import { map, take } from 'rxjs/operators';

@Component({
  selector: 'app-photometric-color-balance-dialog',
  templateUrl: './photometric-color-balance-dialog.component.html',
  styleUrls: ['./photometric-color-balance-dialog.component.scss']
})
export class PhotometricColorBalanceDialogComponent implements OnInit {
  logs: NgxLogMessage[] = [
    { message: 'A simple log message' },
    { message: 'A success message', type: 'SUCCESS' },
    { message: 'A warning message', type: 'WARN' },
    { message: 'An error message', type: 'ERR' },
    { message: 'An info message', type: 'INFO' },
    { message: 'A simple log message' },
    { message: 'A success message', type: 'SUCCESS' },
    { message: 'A warning message', type: 'WARN' },
    { message: 'An error message', type: 'ERR' },
    { message: 'An info message', type: 'INFO' },
    { message: 'A simple log message' },
    { message: 'A success message', type: 'SUCCESS' },
    { message: 'A warning message', type: 'WARN' },
    { message: 'An error message', type: 'ERR' },
    { message: 'An info message', type: 'INFO' },
    { message: 'A simple log message' },
    { message: 'A success message', type: 'SUCCESS' },
    { message: 'A warning message', type: 'WARN' },
    { message: 'An error message', type: 'ERR' },
    { message: 'An info message', type: 'INFO' },
  ];

  logStream$ = timer(0, 1000).pipe(
    take(this.logs.length),
    map(i => this.logs[i])
  );

  constructor(public dialogRef: MatDialogRef<PhotometricColorBalanceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public layerIds: string[],
    private store: Store) { }

  ngOnInit(): void {

  }

}
