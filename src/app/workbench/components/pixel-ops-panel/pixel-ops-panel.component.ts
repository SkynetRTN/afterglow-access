import {
  Component,
  OnInit,
  OnDestroy,
  HostBinding,
  Input,
} from "@angular/core";
import {
  Observable,
  combineLatest,
  BehaviorSubject,
  Subscription,
  Subject,
} from "rxjs";
import { map, tap, filter, flatMap, takeUntil } from "rxjs/operators";
import {
  FormGroup,
  FormControl,
  Validators,
  ValidatorFn,
  ValidationErrors,
} from "@angular/forms";
import { JobType } from "../../../jobs/models/job-types";
import {
  PixelOpsJob,
  PixelOpsJobResult,
} from "../../../jobs/models/pixel-ops";
import {
  PixelOpsFormData,
  WorkbenchStateModel,
  WorkbenchTool,
  PixelOpsPanelConfig,
} from "../../models/workbench-state";
import { MatDialog } from "@angular/material/dialog";
import { MatTabChangeEvent } from "@angular/material/tabs";
import { PixelOpsJobsDialogComponent } from "../pixel-ops-jobs-dialog/pixel-ops-jobs-dialog.component";
import { Router } from "@angular/router";
import { Store } from "@ngxs/store";
import { WorkbenchState } from "../../workbench.state";
import { HdusState } from "../../../data-files/hdus.state";
import {
  HideCurrentPixelOpsJobState,
  SetActiveTool,
  CreatePixelOpsJob,
  CreateAdvPixelOpsJob,
  UpdatePixelOpsPageSettings,
} from "../../workbench.actions";
import { JobsState } from "../../../jobs/jobs.state";
import { DataFile, ImageHdu } from '../../../data-files/models/data-file';
import { DataFilesState } from '../../../data-files/data-files.state';

interface PixelOpVariable {
  name: string;
  value: string;
}

@Component({
  selector: "app-pixel-ops-panel",
  templateUrl: "./pixel-ops-panel.component.html",
  styleUrls: ["./pixel-ops-panel.component.css"],
})
export class ImageCalculatorPageComponent implements OnInit, OnDestroy {
  @Input("primaryHdu")
  set primaryHdu(primaryHdu: ImageHdu) {
    this.primaryHdu$.next(primaryHdu);
  }
  get primaryHdu() {
    return this.primaryHdu$.getValue();
  }
  private primaryHdu$ = new BehaviorSubject<ImageHdu>(null);

  @Input("hdus")
  set hdus(hdus: ImageHdu[]) {
    this.hdus$.next(hdus);
  }
  get hdus() {
    return this.hdus$.getValue();
  }
  private hdus$ = new BehaviorSubject<ImageHdu[]>(null);

  @Input("config")
  set config(config: PixelOpsPanelConfig) {
    this.config$.next(config);
  }
  get config() {
    return this.config$.getValue();
  }
  private config$ = new BehaviorSubject<PixelOpsPanelConfig>(null);

  pixelOpsJobRows$: Observable<
    { job: PixelOpsJob; result: PixelOpsJobResult }[]
  >;
  currentPixelOpsJobRow$: Observable<{
    job: PixelOpsJob;
    result: PixelOpsJobResult;
  }>;
  showCurrentPixelOpsJobState$: Observable<boolean>;
  pixelOpVariables$: Observable<Array<PixelOpVariable>>;
  pixelOpsFormData$: Observable<PixelOpsFormData>;
  panelOpenState: boolean;

  destroy$: Subject<boolean> = new Subject<boolean>();

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
    return mode &&
      scalarValue &&
      operand &&
      mode.value == "scalar" &&
      operand.value == "/" &&
      scalarValue.value == 0
      ? { divideByZero: true }
      : null;
  };

  imageCalcForm = new FormGroup(
    {
      operand: new FormControl("+", Validators.required),
      mode: new FormControl("image", Validators.required),
      imageFileIds: new FormControl([], Validators.required),
      auxImageFileId: new FormControl("", Validators.required),
      scalarValue: new FormControl(
        { disabled: true, value: 0 },
        Validators.required
      ),
      inPlace: new FormControl(false, Validators.required),
    },
    { validators: this.divideByZero }
  );

  imageCalcFormAdv = new FormGroup({
    opString: new FormControl("", Validators.required),
    imageFileIds: new FormControl([], Validators.required),
    auxImageFileIds: new FormControl([]),
    inPlace: new FormControl(false, Validators.required),
  });

  constructor(
    public dialog: MatDialog,
    private store: Store,
    private router: Router
  ) {
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
      .valueChanges.pipe(
        takeUntil(this.destroy$))
      .subscribe((value) => {
        if (value == "scalar") {
          this.imageCalcForm.get("scalarValue").enable();
          this.imageCalcForm.get("auxImageFileId").disable();
        } else {
          this.imageCalcForm.get("scalarValue").disable();
          this.imageCalcForm.get("auxImageFileId").enable();
        }
      });

    this.imageCalcForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        // if(this.imageCalcForm.valid) {
        this.store.dispatch(
          new UpdatePixelOpsPageSettings({
            pixelOpsFormData: this.imageCalcForm.value,
          })
        );
        this.store.dispatch(new HideCurrentPixelOpsJobState());
        // }
      });

    this.imageCalcFormAdv.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        // if(this.imageCalcFormAdv.valid) {
        this.store.dispatch(
          new UpdatePixelOpsPageSettings({
            pixelOpsFormData: this.imageCalcFormAdv.value,
          })
        );
        this.store.dispatch(new HideCurrentPixelOpsJobState());
        // }
      });

    let auxImageHdus$ = combineLatest(
      this.pixelOpsFormData$,
      this.hdus$
    ).pipe(
      filter(([data, hdus]) => hdus != null),
      map(([data, hdus]) => {
        let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
        return data.auxHduIds
          .map((id) => hdus.find((f) => f.id == id))
          .filter((f) => f != null)
          .sort((a, b) => (dataFiles[a.fileId].name < dataFiles[b.fileId].name ? -1 : dataFiles[a.fileId].name > dataFiles[b.fileId].name ? 1 : 0));
      })
    );

    let imageHdus$ = combineLatest(this.pixelOpsFormData$, this.hdus$).pipe(
      filter(([data, hdus]) => hdus != null),
      map(([data, hdus]) => {
        let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
        return data.hduIds
          .map((id) => hdus.find((f) => f.id == id))
          .filter((f) => f != null)
          .sort((a, b) => (dataFiles[a.fileId].name < dataFiles[b.fileId].name ? -1 : dataFiles[a.fileId].name > dataFiles[b.fileId].name ? 1 : 0));
      })
    );

    this.pixelOpVariables$ = combineLatest(imageHdus$, auxImageHdus$).pipe(
      map(([imageFiles, auxImageHdus]) => {
        let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
        return [
          {
            name: "aux_img",
            value: auxImageHdus.length == 0 ? "N/A" : dataFiles[auxImageHdus[0].fileId].name,
          },
          { name: "img", value: "for each image file" },

          ...imageFiles
            .sort((a, b) => (dataFiles[a.fileId].name < dataFiles[b.fileId].name ? -1 : dataFiles[a.fileId].name > dataFiles[b.fileId].name ? 1 : 0))
            .map((f, index) => {
              return {
                name: `imgs[${index}]`,
                value: dataFiles[f.fileId].name,
              };
            }),
          ...auxImageHdus
            .sort((a, b) => (dataFiles[a.fileId].name < dataFiles[b.fileId].name ? -1 : dataFiles[a.fileId].name > dataFiles[b.fileId].name ? 1 : 0))
            .map((f, index) => {
              return {
                name: `aux_imgs[${index}]`,
                value: dataFiles[f.fileId].name,
              };
            }),
        ];
      })
    );
    this.pixelOpsJobRows$ = store.select(JobsState.getJobs).pipe(
      map(
        (allJobRows) =>
          allJobRows.filter((row) => row.job.type == JobType.PixelOps) as {
            job: PixelOpsJob;
            result: PixelOpsJobResult;
          }[]
      )
    );

    this.currentPixelOpsJobRow$ = combineLatest(
      store.select(WorkbenchState.getState),
      this.pixelOpsJobRows$
    ).pipe(
      filter(
        ([state, rows]: [
          WorkbenchStateModel,
          { job: PixelOpsJob; result: PixelOpsJobResult }[]
        ]) =>
          state.pixelOpsPanelConfig.currentPixelOpsJobId != null &&
          rows.find(
            (r) => r.job.id == state.pixelOpsPanelConfig.currentPixelOpsJobId
          ) != undefined
      ),
      map(([state, rows]) =>
        rows.find(
          (r) => r.job.id == state.pixelOpsPanelConfig.currentPixelOpsJobId
        )
      )
    );

    this.showCurrentPixelOpsJobState$ = store
      .select(WorkbenchState.getState)
      .pipe(
        map((state) => state.pixelOpsPanelConfig.showCurrentPixelOpsJobState)
      );

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
        rows$: this.pixelOpsJobRows$,
        allImageFiles$: this.hdus$,
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
}
