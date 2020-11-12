import { Component, OnInit, HostBinding, Input } from "@angular/core";
import { Observable, combineLatest, BehaviorSubject, Subject } from "rxjs";
import { map, tap, takeUntil } from "rxjs/operators";
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
import { JobsState } from "../../../jobs/jobs.state";
import {
  SetActiveTool,
  CreateStackingJob,
  UpdateStackingPanelConfig,
} from "../../workbench.actions";
import { DataFile, ImageHdu } from '../../../data-files/models/data-file';

@Component({
  selector: "app-stacking-panel",
  templateUrl: "./stacking-panel.component.html",
  styleUrls: ["./stacking-panel.component.css"],
})
export class StackerPageComponent implements OnInit {
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

  @Input("dataFileEntities")
  set dataFileEntities(dataFileEntities: {[id: string]: DataFile}) {
    this.dataFileEntities$.next(dataFileEntities);
  }
  get dataFileEntities() {
    return this.dataFileEntities$.getValue();
  }
  private dataFileEntities$ = new BehaviorSubject<{[id: string]: DataFile}>(null);

  @Input("config")
  set config(config: StackingPanelConfig) {
    this.config$.next(config);
  }
  get config() {
    return this.config$.getValue();
  }
  private config$ = new BehaviorSubject<StackingPanelConfig>(null);

  destroy$: Subject<boolean> = new Subject<boolean>();

  selectedHdus$: Observable<Array<ImageHdu>>;
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

    this.selectedHdus$ = combineLatest(
      this.hdus$,
      this.stackFormData$
    ).pipe(
      map(([hdus, data]) =>
        data.selectedHduIds.map((id) =>
          hdus.find((f) => f.id == id)
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
          selectedHduIds: imageFiles.map((f) => f.id),
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
