import { Component, OnInit, HostBinding, Input } from "@angular/core";
import { Observable, combineLatest, BehaviorSubject, Subject } from "rxjs";

import { map, takeUntil, distinctUntilChanged, switchMap, tap, flatMap, filter } from "rxjs/operators";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { AlignFormData, AligningPanelConfig } from "../../models/workbench-state";
import { MatSelectChange } from "@angular/material/select";
import { AlignmentJob, AlignmentJobResult } from "../../../jobs/models/alignment";
import { Router } from "@angular/router";
import { Store } from "@ngxs/store";
import { WorkbenchState } from "../../workbench.state";
import { CreateAlignmentJob, UpdateAligningPanelConfig, FocusFileListItem } from "../../workbench.actions";
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
  @Input("hduIds")
  set hduIds(hduIds: string[]) {
    this.hduIds$.next(hduIds);
  }
  get hduIds() {
    return this.hduIds$.getValue();
  }
  private hduIds$ = new BehaviorSubject<string[]>(null);

  @Input("config")
  set config(config: AligningPanelConfig) {
    this.config$.next(config);
  }
  get config() {
    return this.config$.getValue();
  }
  private config$ = new BehaviorSubject<AligningPanelConfig>(null);

  destroy$: Subject<boolean> = new Subject<boolean>();

  selectedHduIds$: Observable<string[]>;
  refHduId$: Observable<string>;
  refHdu$: Observable<ImageHdu>;
  refHeader$: Observable<Header>;
  refHduHasWcs$: Observable<boolean>;
  alignFormData$: Observable<AlignFormData>;
  alignmentJob$: Observable<AlignmentJob>;

  alignForm = new FormGroup({
    selectedHduIds: new FormControl([], Validators.required),
    refHduId: new FormControl("", Validators.required),
    mode: new FormControl("", Validators.required),
  });

  constructor(private store: Store, private router: Router) {
    this.hduIds$.pipe(takeUntil(this.destroy$)).subscribe((hduIds) => {
      if (!hduIds || !this.config) return;
      let selectedHduIds = this.config.alignFormData.selectedHduIds.filter((hduId) => hduIds.includes(hduId));
      if (selectedHduIds.length != this.config.alignFormData.selectedHduIds.length) {
        setTimeout(() => {
          this.setSelectedHduIds(selectedHduIds);
        });
      }
    });

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
      map((header) => header && header.loaded),
      distinctUntilChanged()
    );

    let refHeaderLoading$ = this.refHeader$.pipe(
      map((header) => header && header.loading),
      distinctUntilChanged()
    );

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

    this.alignForm.valueChanges.subscribe((value) => {
      // if(this.imageCalcForm.valid) {
      this.store.dispatch(new UpdateAligningPanelConfig({ alignFormData: this.alignForm.value }));
      // }
    });

    this.alignmentJob$ = combineLatest(store.select(WorkbenchState.getState), store.select(JobsState.getJobEntities)).pipe(
      map(([state, jobEntities]) => {
        if (
          !state.aligningPanelConfig.currentAlignmentJobId ||
          !jobEntities[state.aligningPanelConfig.currentAlignmentJobId]
        ) {
          return null;
        }

        return jobEntities[state.aligningPanelConfig.currentAlignmentJobId] as AlignmentJob;
      })
    );
  }

  ngOnInit() { }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
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
          filter((hdu) => hdu != null)
        );
      })
    );

    return combineLatest(hdu$, file$).pipe(
      map(([hdu, file]) => {
        if (!hdu || !file) return "???";
        if (file.hduIds.length > 1) {
          return `${file.name} - Channel ${file.hduIds.indexOf(hdu.id)}`;
        }
        return file.name;
      })
    );
  }

  setSelectedHduIds(hduIds: string[]) {
    this.store.dispatch(
      new UpdateAligningPanelConfig({
        alignFormData: {
          ...this.alignForm.value,
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

  submit(data: AlignFormData) {
    let selectedHduIds: string[] = this.alignForm.controls.selectedHduIds.value;
    this.store.dispatch(new CreateAlignmentJob(selectedHduIds));
  }
}
