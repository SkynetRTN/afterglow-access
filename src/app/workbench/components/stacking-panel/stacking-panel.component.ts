import { Component, OnInit, HostBinding, Input, ChangeDetectionStrategy } from "@angular/core";
import { Observable, combineLatest, BehaviorSubject, Subject } from "rxjs";
import { map, tap, takeUntil, distinctUntilChanged, flatMap, withLatestFrom } from "rxjs/operators";
import { StackFormData, WorkbenchTool, StackingPanelConfig } from "../../models/workbench-state";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { StackingJob, StackingJobResult } from "../../../jobs/models/stacking";
import { Router } from "@angular/router";
import { Store } from "@ngxs/store";
import { WorkbenchState } from "../../workbench.state";
import { JobsState } from "../../../jobs/jobs.state";
import { SetActiveTool, CreateStackingJob, UpdateStackingPanelConfig } from "../../workbench.actions";
import { DataFile, ImageHdu } from "../../../data-files/models/data-file";
import { DataFilesState } from "../../../data-files/data-files.state";

@Component({
  selector: "app-stacking-panel",
  templateUrl: "./stacking-panel.component.html",
  styleUrls: ["./stacking-panel.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StackerPanelComponent implements OnInit {
  @Input("hduIds")
  set hduIds(hduIds: string[]) {
    this.hduIds$.next(hduIds);
  }
  get hduIds() {
    return this.hduIds$.getValue();
  }
  private hduIds$ = new BehaviorSubject<string[]>(null);

  config$: Observable<StackingPanelConfig>;

  destroy$: Subject<boolean> = new Subject<boolean>();
  selectedHdus$: Observable<Array<ImageHdu>>;
  stackFormData$: Observable<StackFormData>;
  stackingJob$: Observable<StackingJob>;
  dataFileEntities$: Observable<{ [id: string]: DataFile }>;

  stackForm = new FormGroup({
    selectedHduIds: new FormControl([], Validators.required),
    mode: new FormControl("average", Validators.required),
    scaling: new FormControl("none", Validators.required),
    rejection: new FormControl("none", Validators.required),
    percentile: new FormControl(50),
    low: new FormControl(""),
    high: new FormControl(""),
  });

  constructor(private store: Store, private router: Router) {
    this.dataFileEntities$ = this.store.select(DataFilesState.getFileEntities);
    this.config$ = this.store.select(WorkbenchState.getStackingPanelConfig);

    this.hduIds$.pipe(
      takeUntil(this.destroy$),
      withLatestFrom(this.config$)
    ).subscribe(([hduIds, config]) => {
      if (!hduIds || !config) return;
      let selectedHduIds = config.stackFormData.selectedHduIds.filter((hduId) => hduIds.includes(hduId));
      if (selectedHduIds.length != config.stackFormData.selectedHduIds.length) {
        setTimeout(() => {
          this.setSelectedHduIds(selectedHduIds);
        });
      }
    });

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
      takeUntil(this.destroy$),
      map((state) => state.stackingPanelConfig.stackFormData),
      takeUntil(this.destroy$)
    );

    this.stackFormData$.subscribe((data) => {
      this.stackForm.patchValue(data, { emitEvent: false });
    });

    this.stackingJob$ = combineLatest([
      store.select(WorkbenchState.getState),
      store.select(JobsState.getJobEntities)
    ]).pipe(
      map(([state, jobEntities]) => {
        if (!state.stackingPanelConfig.currentStackingJobId || !jobEntities[state.stackingPanelConfig.currentStackingJobId]) {
          return null;
        }
        return jobEntities[state.stackingPanelConfig.currentStackingJobId] as StackingJob;
      })
    );

    this.stackForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      // if(this.imageCalcForm.valid) {
      this.store.dispatch(new UpdateStackingPanelConfig({ stackFormData: this.stackForm.value }));
      // }
    });
  }

  getHduOptionLabel(hduId: string) {
    return this.store.select(DataFilesState.getHduById).pipe(
      map(fn => fn(hduId)?.name),
      distinctUntilChanged(),
    )
  }

  setSelectedHduIds(hduIds: string[]) {
    this.store.dispatch(
      new UpdateStackingPanelConfig({
        stackFormData: {
          ...this.stackForm.value,
          selectedHduIds: hduIds,
        },
      })
    );
  }

  onSelectAllBtnClick() {
    this.setSelectedHduIds(this.hduIds);
  }

  onClearSelectionBtnClick() {
    this.setSelectedHduIds([]);
  }

  submit(data: StackFormData) {
    let selectedHduIds: string[] = this.stackForm.controls.selectedHduIds.value;
    this.store.dispatch(new CreateStackingJob(selectedHduIds));
  }

  ngOnInit() { }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
