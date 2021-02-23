import { Component, OnInit, OnDestroy, HostBinding, Input, ChangeDetectionStrategy } from "@angular/core";
import { Observable, combineLatest, BehaviorSubject, Subscription, Subject, of } from "rxjs";
import { map, tap, filter, flatMap, takeUntil, distinctUntilChanged, switchMap } from "rxjs/operators";
import { FormGroup, FormControl, Validators, ValidatorFn, ValidationErrors } from "@angular/forms";
import { JobType } from "../../../jobs/models/job-types";
import { PixelOpsJob, PixelOpsJobResult } from "../../../jobs/models/pixel-ops";
import { PixelOpsFormData, WorkbenchStateModel, WorkbenchTool, PixelOpsPanelConfig } from "../../models/workbench-state";
import { MatDialog } from "@angular/material/dialog";
import { MatTabChangeEvent } from "@angular/material/tabs";
import { PixelOpsJobsDialogComponent } from "../pixel-ops-jobs-dialog/pixel-ops-jobs-dialog.component";
import { Router } from "@angular/router";
import { Store } from "@ngxs/store";
import { WorkbenchState } from "../../workbench.state";
import {
  HideCurrentPixelOpsJobState,
  SetActiveTool,
  CreatePixelOpsJob,
  CreateAdvPixelOpsJob,
  UpdatePixelOpsPageSettings,
} from "../../workbench.actions";
import { JobsState } from "../../../jobs/jobs.state";
import { DataFile, ImageHdu } from "../../../data-files/models/data-file";
import { DataFilesState } from "../../../data-files/data-files.state";

interface PixelOpVariable {
  name: string;
  value: string;
}

@Component({
  selector: "app-pixel-ops-panel",
  templateUrl: "./pixel-ops-panel.component.html",
  styleUrls: ["./pixel-ops-panel.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageCalculatorPageComponent implements OnInit, OnDestroy {
  @Input("hduIds")
  set hduIds(hduIds: string[]) {
    this.hduIds$.next(hduIds);
  }
  get hduIds() {
    return this.hduIds$.getValue();
  }
  private hduIds$ = new BehaviorSubject<string[]>(null);

  @Input("config")
  set config(config: PixelOpsPanelConfig) {
    this.config$.next(config);
  }
  get config() {
    return this.config$.getValue();
  }
  private config$ = new BehaviorSubject<PixelOpsPanelConfig>(null);

  destroy$: Subject<boolean> = new Subject<boolean>();

  selectedHduIds$: Observable<string[]>;

  pixelOpsJobs$: Observable<PixelOpsJob[]>;
  currentPixelOpsJob$: Observable<PixelOpsJob>;
  showCurrentPixelOpsJobState$: Observable<boolean>;
  pixelOpVariables$: Observable<Array<PixelOpVariable>>;
  pixelOpsFormData$: Observable<PixelOpsFormData>;
  panelOpenState: boolean;

  operands = [
    { label: "Add", symbol: "+" },
    { label: "Subtract", symbol: "-" },
    { label: "Multiply", symbol: "*" },
    { label: "Divide", symbol: "/" },
  ];

  modes = [
    { label: "Scalar", value: "scalar" },
    { label: "Image", value: "image" },
  ];

  divideByZero: ValidatorFn = (control: FormGroup): ValidationErrors | null => {
    const mode = control.get("mode");
    const scalarValue = control.get("scalarValue");
    const operand = control.get("operand");
    return mode && scalarValue && operand && mode.value == "scalar" && operand.value == "/" && scalarValue.value == 0
      ? { divideByZero: true }
      : null;
  };

  imageCalcForm = new FormGroup(
    {
      operand: new FormControl("+", Validators.required),
      mode: new FormControl("image", Validators.required),
      primaryHduIds: new FormControl([], Validators.required),
      auxHduId: new FormControl("", Validators.required),
      scalarValue: new FormControl({ disabled: true, value: 0 }, Validators.required),
      inPlace: new FormControl(false, Validators.required),
    },
    { validators: this.divideByZero }
  );

  imageCalcFormAdv = new FormGroup({
    opString: new FormControl("", Validators.required),
    primaryHduIds: new FormControl([], Validators.required),
    auxHduIds: new FormControl([]),
    inPlace: new FormControl(false, Validators.required),
  });

  constructor(public dialog: MatDialog, private store: Store, private router: Router) {
    this.hduIds$.pipe(takeUntil(this.destroy$)).subscribe((hduIds) => {
      if (!hduIds || !this.config) return;
      let formData = this.config.pixelOpsFormData;
      let primaryHduIds = formData.primaryHduIds.filter((hduId) => hduIds.includes(hduId));
      let auxHduIds = formData.auxHduIds.filter((hduId) => hduIds.includes(hduId));
      let auxHduId = formData.auxHduId;
      if (!hduIds.includes(auxHduId)) {
        auxHduId = null;
      }
      if (
        primaryHduIds.length != formData.primaryHduIds.length ||
        auxHduIds.length != formData.auxHduIds.length ||
        auxHduId != formData.auxHduId
      ) {
        setTimeout(() => {
          this.store.dispatch(
            new UpdatePixelOpsPageSettings({
              pixelOpsFormData: {
                ...formData,
                primaryHduIds: primaryHduIds,
                auxHduIds: auxHduIds,
                auxHduId: auxHduId,
              },
            })
          );
        });
      }
    });

    this.pixelOpsFormData$ = this.config$.pipe(
      filter((config) => config !== null),
      map((config) => config.pixelOpsFormData),
      takeUntil(this.destroy$)
    );

    this.pixelOpsFormData$.subscribe((data) => {
      this.imageCalcForm.patchValue(data, { emitEvent: false });
      this.imageCalcFormAdv.patchValue(data, { emitEvent: false });
    });

    this.imageCalcForm
      .get("mode")
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        if (value == "scalar") {
          this.imageCalcForm.get("scalarValue").enable();
          this.imageCalcForm.get("auxImageFileId").disable();
        } else {
          this.imageCalcForm.get("scalarValue").disable();
          this.imageCalcForm.get("auxImageFileId").enable();
        }
      });

    this.imageCalcForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      // if(this.imageCalcForm.valid) {
      this.store.dispatch(
        new UpdatePixelOpsPageSettings({
          pixelOpsFormData: this.imageCalcForm.value,
        })
      );
      this.store.dispatch(new HideCurrentPixelOpsJobState());
      // }
    });

    this.imageCalcFormAdv.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      // if(this.imageCalcFormAdv.valid) {
      this.store.dispatch(
        new UpdatePixelOpsPageSettings({
          pixelOpsFormData: this.imageCalcFormAdv.value,
        })
      );
      this.store.dispatch(new HideCurrentPixelOpsJobState());
      // }
    });

    let auxHdusVars$ = this.pixelOpsFormData$.pipe(
      map((formData) => formData.auxHduIds),
      switchMap((hduIds) => {
        if (hduIds.length == 0) return of([]);
        return combineLatest(hduIds.map((hduId) => this.getHduOptionLabel(hduId)));
      })
    );

    let primaryHdusVars$ = this.pixelOpsFormData$.pipe(
      map((formData) => formData.primaryHduIds),
      switchMap((hduIds) => {
        if (hduIds.length == 0) return of([]);
        return combineLatest(hduIds.map((hduId) => this.getHduOptionLabel(hduId)));
      })
    );

    this.pixelOpVariables$ = combineLatest([primaryHdusVars$, auxHdusVars$]).pipe(
      map(([primaryHduVars, auxHduVars]) => {
        let dataFiles = this.store.selectSnapshot(DataFilesState.getFileEntities);
        return [
          {
            name: "aux_img",
            value: auxHduVars.length == 0 ? "N/A" : auxHduVars[0],
          },
          { name: "img", value: "for each image file" },
          ...primaryHduVars.map((value, index) => {
            return {
              name: `imgs[${index}]`,
              value: value,
            };
          }),
          ...auxHduVars.map((value, index) => {
            return {
              name: `aux_imgs[${index}]`,
              value: value,
            };
          }),
        ];
      })
    );

    this.pixelOpsJobs$ = store.select(JobsState.getJobs).pipe(
      map(allJobRows => allJobRows.filter((row) => row.type == JobType.PixelOps) as PixelOpsJob[])
    );

    this.currentPixelOpsJob$ = combineLatest([store.select(WorkbenchState.getState), this.pixelOpsJobs$]).pipe(
      filter(
        ([state, jobs]: [WorkbenchStateModel, PixelOpsJob[]]) =>
          state.pixelOpsPanelConfig.currentPixelOpsJobId != null &&
          jobs.find((job) => job.id == state.pixelOpsPanelConfig.currentPixelOpsJobId) != undefined
      ),
      map(([state, rows]) => rows.find((job) => job.id == state.pixelOpsPanelConfig.currentPixelOpsJobId))
    );

    this.showCurrentPixelOpsJobState$ = store
      .select(WorkbenchState.getState)
      .pipe(map((state) => state.pixelOpsPanelConfig.showCurrentPixelOpsJobState));

    // this.extractionJobRows$ = combineLatest(
    //   store.select(JobsState.getAllJobs).pipe(
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

  ngOnInit() { }

  ngOnDestroy() {
    this.destroy$.next(true);
    // Now let's also unsubscribe from the subject itself:
    this.destroy$.unsubscribe();
  }

  submit(v: any) {
    this.store.dispatch(new CreatePixelOpsJob());
  }

  submitAdv(v: any) {
    this.store.dispatch(new CreateAdvPixelOpsJob());
  }

  openPixelOpsJobsDialog() {
    let dialogRef = this.dialog.open(PixelOpsJobsDialogComponent, {
      width: "600px",
      data: {
        rows$: this.pixelOpsJobs$,
        allImageFiles$: this.store.select(DataFilesState.getHdus),
      },
    });

    // dialogRef.afterClosed().subscribe(result => {
    //   if (result) {
    //     this.store.dispatch(
    //       new UpdateSourceExtractionSettings({
    //         changes: result
    //       })
    //     );
    //   }
    // });
  }

  onTabChange($event: MatTabChangeEvent) {
    this.store.dispatch(new HideCurrentPixelOpsJobState());
  }

  setAuxHduIds(hduIds: string[]) {
    this.store.dispatch(
      new UpdatePixelOpsPageSettings({
        pixelOpsFormData: {
          ...this.imageCalcFormAdv.value,
          auxHduIds: hduIds,
        },
      })
    );
  }

  getHduOptionLabel(hduId: string) {
    let hdu$ = this.store.select(DataFilesState.getHduById).pipe(
      map((fn) => fn(hduId)),
      filter((hdu) => hdu != null)
    );

    let file$ = hdu$.pipe(
      map((hdu) => hdu.fileId),
      distinctUntilChanged(),
      flatMap((fileId) => {
        return this.store.select(DataFilesState.getFileById).pipe(
          map((fn) => fn(fileId)),
          filter((file) => file != null)
        );
      })
    );

    return combineLatest(hdu$, file$).pipe(
      map(([hdu, file]) => {
        if (!hdu || !file) return "???";
        if (file.hduIds.length > 1) {
          return hdu.name ? hdu.name : `${file.name} - Layer ${file.hduIds.indexOf(hdu.id)}`
        }
        return file.name;
      }),

      distinctUntilChanged()
    );
  }

  onSelectAllPrimaryHdusBtnClick() {
    this.setSelectedPrimaryHduIds(this.hduIds);
  }

  onClearPrimaryHdusSelectionBtnClick() {
    this.setSelectedPrimaryHduIds([]);
  }

  setSelectedPrimaryHduIds(hduIds: string[]) {
    this.store.dispatch(
      new UpdatePixelOpsPageSettings({
        pixelOpsFormData: {
          ...this.imageCalcFormAdv.value,
          primaryHduIds: hduIds,
        },
      })
    );
    this.store.dispatch(new HideCurrentPixelOpsJobState());
  }

  onSelectAllAuxHdusBtnClick() {
    this.setSelectedAuxHduIds(this.hduIds);
  }

  onClearAuxHdusSelectionBtnClick() {
    this.setSelectedAuxHduIds([]);
  }

  setSelectedAuxHduIds(hduIds: string[]) {
    this.store.dispatch(
      new UpdatePixelOpsPageSettings({
        pixelOpsFormData: {
          ...this.imageCalcFormAdv.value,
          auxHduIds: hduIds,
        },
      })
    );
    this.store.dispatch(new HideCurrentPixelOpsJobState());
  }
}
