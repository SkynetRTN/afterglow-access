import { Component, OnInit, Inject } from "@angular/core";

import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { PixelOpsJob, PixelOpsJobResult } from "../../../jobs/models/pixel-ops";
import { Observable, combineLatest } from "rxjs";

import { map, tap, filter, flatMap } from "rxjs/operators";
import { DataFile } from "../../../data-files/models/data-file";

@Component({
  selector: "app-pixel-ops-jobs-dialog",
  templateUrl: "./pixel-ops-jobs-dialog.component.html",
  styleUrls: ["./pixel-ops-jobs-dialog.component.scss"],
})
export class PixelOpsJobsDialogComponent implements OnInit {
  filenameLookup$: Observable<{ [fileId: string]: string }>;

  constructor(
    public dialogRef: MatDialogRef<PixelOpsJobsDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      rows$: Observable<{ job: PixelOpsJob; result: PixelOpsJobResult }[]>;
      allImageFiles$: Observable<DataFile[]>;
    }
  ) {
    this.filenameLookup$ = this.data.allImageFiles$.pipe(
      map((allImageFiles) => {
        let result = {};
        allImageFiles.forEach((f) => {
          result[f.id] = f.name;
        });
        return result;
      })
    );
  }

  ngOnInit() {}
}
