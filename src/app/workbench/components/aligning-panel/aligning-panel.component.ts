import { Component, OnInit, HostBinding, Input } from "@angular/core";
import { Observable, combineLatest, BehaviorSubject, Subject } from "rxjs";

import { map, takeUntil } from "rxjs/operators";
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

@Component({
  selector: "app-aligning-panel",
  templateUrl: "./aligning-panel.component.html",
  styleUrls: ["./aligning-panel.component.css"],
})
export class AlignerPageComponent implements OnInit {
  @Input("primaryHdu")
  set primaryHdu(primaryHdu: ImageHdu) {
    this.primaryHdu$.next(primaryHdu);
  }
  get primaryHdu() {
    return this.primaryHdu$.getValue();
  }
  private primaryHdu$ = new BehaviorSubject<ImageHdu>(null);

  @Input("primaryHeader")
  set primaryHeader(primaryHeader: Header) {
    this.primaryHeader$.next(primaryHeader);
  }
  get primaryHeader() {
    return this.primaryHeader$.getValue();
  }
  private primaryHeader$ = new BehaviorSubject<Header>(null);

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
  alignFormData$: Observable<AlignFormData>;
  primaryHduIsSelected$: Observable<boolean>;
  primaryHduHasWcs$: Observable<boolean>;
  alignmentJobRow$: Observable<{ job: AlignmentJob; result: AlignmentJobResult }>;

  alignForm = new FormGroup({
    selectedHduIds: new FormControl([], Validators.required),
    mode: new FormControl("", Validators.required),
    inPlace: new FormControl(false, Validators.required),
  });

  constructor(private store: Store, private router: Router) {
    this.alignFormData$ = store.select(WorkbenchState.getState).pipe(
      map((state) => state.aligningPanelConfig.alignFormData),
      takeUntil(this.destroy$)
    );

    this.alignFormData$.subscribe((data) => {
      this.alignForm.patchValue(data, { emitEvent: false });
    });

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

    this.primaryHduIsSelected$ = combineLatest(this.primaryHdu$, this.selectedHdus$).pipe(
      map(([primaryHdu, selectedHdus]) => {
        return selectedHdus.find((f) => primaryHdu && f.id == primaryHdu.id) != undefined;
      })
    );

    // TODO: LAYER
    this.primaryHduHasWcs$ = this.primaryHeader$.pipe(
      map((header) => header != null && header.loaded && header.wcs.isValid())
    );

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

  onPrimaryHduChange($event: MatSelectChange) {
    let hduId: string = $event.value;
    let hdu = this.hdus.find((hdu) => hdu.id == hduId);
    if (!hdu) return;

    this.store.dispatch(new SelectDataFileListItem({ hduId: hduId, fileId: hdu.fileId }));
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
