import { Component, OnInit, HostBinding, Input } from "@angular/core";
import { Observable, combineLatest, BehaviorSubject, Subject } from "rxjs";

import { map, takeUntil, distinctUntilChanged, switchMap, tap } from "rxjs/operators";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { AlignFormData, AligningPanelConfig } from "../../models/workbench-state";
import { MatSelectChange } from "@angular/material/select";
import { AlignmentJob, AlignmentJobResult } from "../../../jobs/models/alignment";
import { Router } from "@angular/router";
import { Store } from "@ngxs/store";
import { WorkbenchState } from "../../workbench.state";
import { CreateAlignmentJob, UpdateAligningPanelConfig, SelectDataFileListItem } from "../../workbench.actions";
import { JobsState } from "../../../jobs/jobs.state";
import { ImageHdu, DataFile, Header } from "../../../data-files/models/data-file";
import { DataFilesState } from "../../../data-files/data-files.state";
import { LoadHduHeader } from "../../../data-files/data-files.actions";

@Component({
  selector: "app-aligning-panel",
  templateUrl: "./aligning-panel.component.html",
  styleUrls: ["./aligning-panel.component.css"],
})
export class AlignerPageComponent implements OnInit {
  @Input("hdus")
  set hdus(hdus: ImageHdu[]) {
    this.hdus$.next(hdus);
  }
  get hdus() {
    return this.hdus$.getValue();
  }
  private hdus$ = new BehaviorSubject<ImageHdu[]>(null);

  @Input("fileEntities")
  set fileEntities(fileEntities: { [id: string]: DataFile }) {
    this.fileEntities$.next(fileEntities);
  }
  get fileEntities() {
    return this.fileEntities$.getValue();
  }
  private fileEntities$ = new BehaviorSubject<{ [id: string]: DataFile }>(null);

  @Input("config")
  set config(config: AligningPanelConfig) {
    this.config$.next(config);
  }
  get config() {
    return this.config$.getValue();
  }
  private config$ = new BehaviorSubject<AligningPanelConfig>(null);

  destroy$: Subject<boolean> = new Subject<boolean>();

  selectedHdus$: Observable<Array<ImageHdu>>;
  refHduId$: Observable<string>;
  refHdu$: Observable<ImageHdu>;
  refHeader$: Observable<Header>;
  refHduHasWcs$: Observable<boolean>;
  alignFormData$: Observable<AlignFormData>;
  alignmentJobRow$: Observable<{ job: AlignmentJob; result: AlignmentJobResult }>;

  alignForm = new FormGroup({
    selectedHduIds: new FormControl([], Validators.required),
    refHduId: new FormControl("", Validators.required),
    mode: new FormControl("", Validators.required),
  });

  constructor(private store: Store, private router: Router) {
    this.alignFormData$ = this.config$.pipe(
      map((config) => config && config.alignFormData),
      distinctUntilChanged()
    );

    this.alignFormData$.subscribe((data) => {
      if (!data) return;
      this.alignForm.patchValue(data, { emitEvent: false });
    });

    this.refHduId$ = this.alignFormData$.pipe(
      map((data) => data && data.refHduId),
      distinctUntilChanged()
    );

    this.refHdu$ = this.refHduId$.pipe(
      switchMap((hduId) => {
        return this.store.select(DataFilesState.getHduById).pipe(
          map((fn) => fn(hduId) as ImageHdu),
          distinctUntilChanged()
        );
      })
    );

    this.refHeader$ = this.refHdu$.pipe(
      map((hdu) => hdu && hdu.headerId),
      distinctUntilChanged(),
      switchMap((headerId) => {
        return this.store.select(DataFilesState.getHeaderById).pipe(map((fn) => fn(headerId)));
      })
    );

    let refHeaderLoaded$ = this.refHeader$.pipe(
      map(header => header && header.loaded),
      distinctUntilChanged()
    )

    let refHeaderLoading$ = this.refHeader$.pipe(
      map(header => header && header.loading),
      distinctUntilChanged()
    )

    combineLatest(this.refHduId$, refHeaderLoaded$, refHeaderLoading$)
      .pipe(takeUntil(this.destroy$))
      .subscribe(([refHduId, headerLoaded, headerLoading]) => {
        
        if (refHduId && headerLoaded != null && !headerLoaded && headerLoading != null && !headerLoading) {
          setTimeout(() => {
            this.store.dispatch(new LoadHduHeader(refHduId));
          });
        }
      });

    this.refHduHasWcs$ = this.refHeader$.pipe(
      map((header) => header && header.wcs && header.wcs.isValid()),
      distinctUntilChanged()
    );

    this.selectedHdus$ = combineLatest(this.hdus$, this.alignFormData$).pipe(
      map(([allImageFiles, alignFormData]) =>
        alignFormData.selectedHduIds.map((id) => allImageFiles.find((f) => f.id == id))
      )
    );

    this.alignForm.valueChanges.subscribe((value) => {
      // if(this.imageCalcForm.valid) {
      this.store.dispatch(new UpdateAligningPanelConfig({ alignFormData: this.alignForm.value }));
      // }
    });

    this.alignmentJobRow$ = combineLatest(store.select(WorkbenchState.getState), store.select(JobsState.getEntities)).pipe(
      map(([state, jobRowLookup]) => {
        if (
          !state.aligningPanelConfig.currentAlignmentJobId ||
          !jobRowLookup[state.aligningPanelConfig.currentAlignmentJobId]
        )
          return null;
        return jobRowLookup[state.aligningPanelConfig.currentAlignmentJobId] as {
          job: AlignmentJob;
          result: AlignmentJobResult;
        };
      })
    );
  }

  ngOnInit() {}

  ngOnDestroy() {
    this.destroy$.next(true);
    // Now let's also unsubscribe from the subject itself:
    this.destroy$.unsubscribe();
  }
  selectHdus(hdus: ImageHdu[]) {
    this.store.dispatch(
      new UpdateAligningPanelConfig({
        alignFormData: {
          ...this.alignForm.value,
          selectedHduIds: hdus.map((f) => f.id),
        },
      })
    );
  }

  submit(data: AlignFormData) {
    this.store.dispatch(new CreateAlignmentJob());
  }
}
