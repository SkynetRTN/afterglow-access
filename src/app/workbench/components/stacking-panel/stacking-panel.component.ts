import { Component, OnInit, HostBinding, Input } from "@angular/core";
import { Observable, combineLatest, BehaviorSubject, Subject } from "rxjs";
import { map, tap, takeUntil } from "rxjs/operators";
import { WorkbenchDataFileState } from "../../models/workbench-file-state";
import {
  StackFormData,
  WorkbenchTool,
  StackingPanelConfig,
} from "../../models/workbench-state";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import {
  StackingJob,
  StackingJobResult,
} from "../../../jobs/models/stacking";
import { Router } from "@angular/router";
import { Store } from "@ngxs/store";
import { WorkbenchState } from "../../workbench.state";
import { DataFilesState } from "../../../data-files/data-files.state";
import { JobsState } from "../../../jobs/jobs.state";
import {
  SetActiveTool,
  CreateStackingJob,
  UpdateStackingPanelConfig,
} from "../../workbench.actions";
import { DataFile } from '../../../data-files/models/data-file';

@Component({
  selector: "app-stacking-panel",
  templateUrl: "./stacking-panel.component.html",
  styleUrls: ["./stacking-panel.component.css"],
})
export class StackerPageComponent implements OnInit {
  @Input("selectedFile")
  set selectedFile(selectedFile: DataFile) {
    this.selectedFile$.next(selectedFile);
  }
  get selectedFile() {
    return this.selectedFile$.getValue();
  }
  private selectedFile$ = new BehaviorSubject<DataFile>(null);

  @Input("files")
  set files(files: DataFile[]) {
    this.files$.next(files);
  }
  get files() {
    return this.files$.getValue();
  }
  private files$ = new BehaviorSubject<DataFile[]>(null);

  @Input("config")
  set config(config: StackingPanelConfig) {
    this.config$.next(config);
  }
  get config() {
    return this.config$.getValue();
  }
  private config$ = new BehaviorSubject<StackingPanelConfig>(null);

  destroy$: Subject<boolean> = new Subject<boolean>();

  selectedImageFiles$: Observable<Array<DataFile>>;
  stackFormData$: Observable<StackFormData>;
  stackJobRow$: Observable<{ job: StackingJob; result: StackingJobResult }>;

  stackForm = new FormGroup({
    selectedImageFileIds: new FormControl([], Validators.required),
    mode: new FormControl("average", Validators.required),
    scaling: new FormControl("none", Validators.required),
    rejection: new FormControl("none", Validators.required),
    percentile: new FormControl(50),
    low: new FormControl(""),
    high: new FormControl(""),
  });

  constructor(private store: Store, private router: Router) {
    this.stackForm
      .get("mode")
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        if (value == "percentile") {
          this.stackForm.get("percentile").enable();
        } else {
          this.stackForm.get("percentile").disable();
        }
      });

    this.stackForm
      .get("rejection")
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        if (["iraf", "minmax", "sigclip"].includes(value)) {
          this.stackForm.get("high").enable();
          this.stackForm.get("low").enable();
        } else {
          this.stackForm.get("high").disable();
          this.stackForm.get("low").disable();
        }
      });

    this.stackFormData$ = store.select(WorkbenchState.getState).pipe(
      map((state) => state.stackingPanelConfig.stackFormData),
      takeUntil(this.destroy$)
    );

    this.stackFormData$.subscribe((data) => {
      this.stackForm.patchValue(data, { emitEvent: false });
    });

    this.selectedImageFiles$ = combineLatest(
      this.files$,
      this.stackFormData$
    ).pipe(
      map(([allImageFiles, data]) =>
        data.selectedImageFileIds.map((id) =>
          allImageFiles.find((f) => f.id == id)
        )
      )
    );

    this.stackJobRow$ = combineLatest(
      store.select(WorkbenchState.getState),
      store.select(JobsState.getEntities)
    ).pipe(
      map(([state, jobRowLookup]) => {
        if (
          !state.stackingPanelConfig.currentStackingJobId ||
          !jobRowLookup[state.stackingPanelConfig.currentStackingJobId]
        )
          return null;
        return jobRowLookup[state.stackingPanelConfig.currentStackingJobId] as {
          job: StackingJob;
          result: StackingJobResult;
        };
      })
    );

    this.stackForm.valueChanges.subscribe((value) => {
      // if(this.imageCalcForm.valid) {
      this.store.dispatch(
        new UpdateStackingPanelConfig({ stackFormData: this.stackForm.value })
      );
      // }
    });
  }

  selectImageFiles(imageFiles: DataFile[]) {
    this.store.dispatch(
      new UpdateStackingPanelConfig({
        stackFormData: {
          ...this.stackForm.value,
          selectedImageFileIds: imageFiles.map((f) => f.id),
        },
      })
    );
  }

  submit(data: StackFormData) {
    this.store.dispatch(new CreateStackingJob());
  }

  ngOnInit() {}

  ngOnDestroy() {}
}
