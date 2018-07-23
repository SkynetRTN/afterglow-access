import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import { Store } from '@ngrx/store';
import * as fromRoot from '../../../reducers';
import * as fromCore from '../../reducers';
import * as fromDataFiles from '../../../data-files/reducers';
import { Source, PosType } from '../../models/source';
import { ImageFile, DataFile, getCenterTime, getHasWcs, getWcs } from '../../../data-files/models/data-file';
import { Dictionary } from '@ngrx/entity/src/models';

@Component({
  selector: 'app-proper-motion-dialog',
  templateUrl: './proper-motion-dialog.component.html',
  styleUrls: ['./proper-motion-dialog.component.scss']
})
export class ProperMotionDialogComponent implements OnInit {
  pixelCoordView: 'pixel' | 'sky' = 'pixel';
  private source: Source;
  subs: Subscription[] = [];

  constructor(public dialogRef: MatDialogRef<ProperMotionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private store: Store<fromRoot.State>) {

    this.source = data.source;

    if(this.source.posType == PosType.SKY) {
      this.pixelCoordView = 'sky';
    }

  }

  ngOnInit() {
  }

  ngOnDestroy() {
    this.subs.forEach(sub => sub.unsubscribe());
  }


}
