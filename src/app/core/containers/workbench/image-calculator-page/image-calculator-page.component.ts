import {
  Component,
  OnInit,
  OnDestroy,
  HostBinding,
  Input
} from "@angular/core";
import { Observable, combineLatest } from "rxjs";
import { map, tap, filter, flatMap } from "rxjs/operators";
import { ImageFile } from "../../../../data-files/models/data-file";
import { ImageFileState } from "../../../models/image-file-state";
import { Store } from "@ngrx/store";

import * as fromRoot from "../../../../reducers";
import * as fromDataFiles from "../../../../data-files/reducers";
import * as fromCore from "../../../reducers";
import * as fromJobs from "../../../../jobs/reducers";

import * as workbenchActions from "../../../actions/workbench";
import * as jobActions from "../../../../jobs/actions/job";
import { DataFileType } from '../../../../data-files/models/data-file-type';
import { FormGroup, FormControl, Validators, ValidatorFn, ValidationErrors } from '@angular/forms';
import { JobType } from '../../../../jobs/models/job-types';
import { PixelOpsJob, PixelOpsJobResult } from '../../../../jobs/models/pixel-ops';
import { PixelOpsFormData, WorkbenchState, WorkbenchTool } from '../../../models/workbench-state';
import { Job } from '../../../../jobs/models/job';
import { JobResult } from '../../../../jobs/models/job-result';
import { MatDialog, MatTabChangeEvent } from '@angular/material';
import { PixelOpsJobsDialogComponent } from '../../../components/pixel-ops-jobs-dialog/pixel-ops-jobs-dialog.component';
import { Router } from '@angular/router';

interface PixelOpVariable {
  name: string,
  value: string
}

@Component({
  selector: "app-image-calculator-page",
  templateUrl: "./image-calculator-page.component.html",
  styleUrls: ["./image-calculator-page.component.css"]
})
export class ImageCalculatorPageComponent implements OnInit, OnDestroy {
  @HostBinding("class") @Input("class") classList: string =
    "fx-workbench-outlet";
    inFullScreenMode$: Observable<boolean>;
    fullScreenPanel$: Observable<'file' | 'viewer' | 'tool'>;
  activeImageFile$: Observable<ImageFile>;
  allImageFiles$: Observable<Array<ImageFile>>;
  selectedImageFiles$: Observable<Array<ImageFile>>;
  activeImageFileState$: Observable<ImageFileState>;
  pixelOpsJobRows$: Observable<{job: PixelOpsJob, result: PixelOpsJobResult}[]>;
  currentPixelOpsJobRow$: Observable<{job: PixelOpsJob, result: PixelOpsJobResult}>;
  showCurrentPixelOpsJobState$: Observable<boolean>;
  showConfig$: Observable<boolean>;
  pixelOpVariables$: Observable<Array<PixelOpVariable>>;
  pixelOpsFormData$: Observable<PixelOpsFormData>;
  panelOpenState: boolean;
  
  operands = [
    {label: 'Add', symbol: '+'},
    {label: 'Subtract', symbol: '-'},
    {label: 'Multiply', symbol: '*'},
    {label: 'Divide', symbol: '/'},
  ]

  modes = [
    {label: 'Scalar', value: 'scalar'},
    {label: 'Image', value: 'image'},
  ]


  divideByZero: ValidatorFn = (control: FormGroup): ValidationErrors | null => {
    const mode = control.get('mode');
    const scalarValue = control.get('scalarValue');
    const operand = control.get('operand')
    return mode && scalarValue && operand && mode.value == 'scalar' && operand.value == '/' && scalarValue.value == 0 ? { 'divideByZero': true } : null;
  };

  imageCalcForm = new FormGroup({
    operand: new FormControl('+', Validators.required),
    mode: new FormControl('image', Validators.required),
    imageFileIds: new FormControl([], Validators.required),
    auxImageFileId: new FormControl('', Validators.required),
    scalarValue: new FormControl({disabled: true, value: 0}, Validators.required),
    inPlace: new FormControl(false, Validators.required),
  }, {validators: this.divideByZero});

  imageCalcFormAdv = new FormGroup({
    opString: new FormControl('', Validators.required),
    imageFileIds: new FormControl([], Validators.required),
    auxImageFileIds: new FormControl([]),
    inPlace: new FormControl(false, Validators.required),
  });

  

  constructor(private store: Store<fromRoot.State>, public dialog: MatDialog, router: Router) {
    this.fullScreenPanel$ = this.store.select(fromCore.workbench.getFullScreenPanel);
    this.inFullScreenMode$ = this.store.select(fromCore.workbench.getInFullScreenMode);
    this.activeImageFile$ = store.select(fromCore.workbench.getActiveFile);
    this.activeImageFileState$ = store.select(
      fromCore.workbench.getActiveFileState
    );
    this.showConfig$ = store.select(fromCore.workbench.getShowConfig);

    this.allImageFiles$ = store.select(fromDataFiles.getAllDataFiles)
    .pipe(
      map(
        files =>
          files.filter(file => file.type == DataFileType.IMAGE) as Array<
            ImageFile
          >
      )
    );

    this.selectedImageFiles$ = store
      .select(fromCore.workbench.getSelectedFiles)
      .pipe(
        map(
          files =>
            files.filter(file => file.type == DataFileType.IMAGE) as Array<
              ImageFile
            >
        )
      );

      this.pixelOpsFormData$ = store.select(fromCore.getWorkbenchState).pipe(
        map(state => state.pixelOpsFormData),
        tap(data => {
          this.imageCalcForm.patchValue(data, {emitEvent: false});
          this.imageCalcFormAdv.patchValue(data, {emitEvent: false});
        })
      );

      this.pixelOpsFormData$.subscribe();

      this.imageCalcForm.get('mode').valueChanges.subscribe(value => {
        if (value == 'scalar') {
          this.imageCalcForm.get('scalarValue').enable();
          this.imageCalcForm.get('auxImageFileId').disable();
        } else {
          this.imageCalcForm.get('scalarValue').disable();
          this.imageCalcForm.get('auxImageFileId').enable();
        }
      });

      this.imageCalcForm.valueChanges.subscribe(value => {
        // if(this.imageCalcForm.valid) {
          this.store.dispatch(new workbenchActions.UpdatePixelOpsFormData({data: this.imageCalcForm.value}));
          this.store.dispatch(new workbenchActions.HideCurrentPixelOpsJobState());
        // }
      })

      this.imageCalcFormAdv.valueChanges.subscribe(value => {
        // if(this.imageCalcFormAdv.valid) {
          this.store.dispatch(new workbenchActions.UpdatePixelOpsFormData({data: this.imageCalcFormAdv.value}));
          this.store.dispatch(new workbenchActions.HideCurrentPixelOpsJobState());
        // }
      })



      let auxImageFiles$ = combineLatest(this.pixelOpsFormData$, this.allImageFiles$).pipe(
        map(([data, allImageFiles]) => data.auxImageFileIds
          .map(id => allImageFiles.find(f => f.id == id))
          .filter(f => f != null)
          .sort((a,b) => (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0))
      )

      let imageFiles$ = combineLatest(this.pixelOpsFormData$, this.allImageFiles$).pipe(
        map(([data, allImageFiles]) => data.imageFileIds
          .map(id => allImageFiles.find(f => f.id == id))
          .filter(f => f != null)
          .sort((a,b) => (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0))
      )

      this.pixelOpVariables$ = combineLatest(imageFiles$, auxImageFiles$).pipe(
        map( ([imageFiles, auxImageFiles]) => {
          return [
            {name: 'aux_img', value: auxImageFiles.length == 0 ? 'N/A' : auxImageFiles[0].name},
            {name: 'img', value: 'for each image file'},
            
            ...imageFiles.sort( (a,b) => (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0)
            .map((f, index) => {
              return {
                name: `imgs[${index}]`, value: f.name
              }
            }),
            ...auxImageFiles.sort( (a,b) => (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0).map((f, index) => {
              return {
                name: `aux_imgs[${index}]`, value: f.name
              }
            })
          ]
        })
      )
      this.pixelOpsJobRows$ = store.select(fromJobs.getAllJobs).pipe(
        map(allJobRows => allJobRows.filter(row => row.job.type == JobType.PixelOps) as {job: PixelOpsJob, result: PixelOpsJobResult}[])
      );

      this.currentPixelOpsJobRow$ = combineLatest(store.select(fromCore.getWorkbenchState), this.pixelOpsJobRows$).pipe(
        filter(([state, rows] : [WorkbenchState, {job: PixelOpsJob, result: PixelOpsJobResult}[]]) => (state.currentPixelOpsJobId != null && rows.find(r => r.job.id == state.currentPixelOpsJobId) != undefined)),
        map(([state, rows]) => rows.find(r => r.job.id == state.currentPixelOpsJobId))
      );

      this.showCurrentPixelOpsJobState$ =  store.select(fromCore.getWorkbenchState).pipe(
        map(state => state.showCurrentPixelOpsJobState)
      );

      this.store.dispatch(
        new workbenchActions.SetActiveTool({ tool: WorkbenchTool.IMAGE_CALC })
      );
  
      this.store.dispatch(
        new workbenchActions.SetLastRouterPath({path: router.url})
      )


      // this.extractionJobRows$ = combineLatest(
      //   store.select(fromJobs.getAllJobs).pipe(
      //     map(
      //       rows =>
      //         rows.filter(row => row.job.type == JobType.Photometry) as Array<{
      //           job: PhotometryJob;
      //           result: PhotometryJobResult;
      //         }>
      //     )
      //   ),
      //   this.activeImageFile$
      // ).pipe(
      //   map(([rows, activeImageFile]) =>
      //     activeImageFile
      //       ? rows
      //           .filter(row =>
      //             row.job.file_ids.includes(parseInt(activeImageFile.id))
      //           )
      //           .sort((a, b) => {
      //             if (a.job.id == b.job.id) return 0;
      //             return a.job.id > b.job.id ? -1 : 1;
      //           })
      //       : []
      //   )
      // );
  }

  ngOnInit() {
    this.store.dispatch(new workbenchActions.DisableMultiFileSelection());
  }

  ngOnDestroy() {}

  submit(v: any) {

    this.store.dispatch(new workbenchActions.CreatePixelOpsJob());
  }

  submitAdv(v: any) {
    this.store.dispatch(new workbenchActions.CreateAdvPixelOpsJob());
  }

  openPixelOpsJobsDialog() {
    let dialogRef = this.dialog.open(PixelOpsJobsDialogComponent, {
      width: "600px",
      data: {rows$: this.pixelOpsJobRows$, allImageFiles$: this.allImageFiles$}
    });

    // dialogRef.afterClosed().subscribe(result => {
    //   if (result) {
    //     this.store.dispatch(
    //       new workbenchActions.UpdateSourceExtractionSettings({
    //         changes: result
    //       })
    //     );
    //   }
    // });
  }

  onTabChange($event: MatTabChangeEvent) {
    this.store.dispatch(new workbenchActions.HideCurrentPixelOpsJobState());
  }
}
