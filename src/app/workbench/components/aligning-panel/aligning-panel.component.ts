import { Component, OnInit, HostBinding, Input, ChangeDetectionStrategy } from '@angular/core';
import { Observable, combineLatest, BehaviorSubject, Subject } from 'rxjs';

import { map, takeUntil, distinctUntilChanged, switchMap, tap, flatMap, filter, withLatestFrom } from 'rxjs/operators';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { AlignFormData, AligningPanelConfig } from '../../models/workbench-state';
import { MatSelectChange } from '@angular/material/select';
import { AlignmentJob, AlignmentJobResult } from '../../../jobs/models/alignment';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { WorkbenchState } from '../../workbench.state';
import { CreateAlignmentJob, UpdateAligningPanelConfig, SelectFile } from '../../workbench.actions';
import { JobsState } from '../../../jobs/jobs.state';
import { ImageHdu, DataFile, Header } from '../../../data-files/models/data-file';
import { DataFilesState } from '../../../data-files/data-files.state';
import { LoadHduHeader } from '../../../data-files/data-files.actions';

@Component({
  selector: 'app-aligning-panel',
  templateUrl: './aligning-panel.component.html',
  styleUrls: ['./aligning-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlignerPageComponent implements OnInit {
  @Input('hduIds')
  set hduIds(hduIds: string[]) {
    this.hduIds$.next(hduIds);
  }
  get hduIds() {
    return this.hduIds$.getValue();
  }
  private hduIds$ = new BehaviorSubject<string[]>(null);

  config$: Observable<AligningPanelConfig>;

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
    refHduId: new FormControl('', Validators.required),
    mode: new FormControl('', Validators.required),
    crop: new FormControl('', Validators.required),
  });

  constructor(private store: Store, private router: Router) {
    this.config$ = this.store.select(WorkbenchState.getAligningPanelConfig);

    this.hduIds$.pipe(takeUntil(this.destroy$), withLatestFrom(this.config$)).subscribe(([hduIds, config]) => {
      if (!hduIds || !config) return;
      let selectedHduIds = config.alignFormData.selectedHduIds.filter((hduId) => hduIds.includes(hduId));
      if (selectedHduIds.length != config.alignFormData.selectedHduIds.length) {
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
        return this.store.select(DataFilesState.getHduById(hduId)).pipe(
          map((hdu) => hdu as ImageHdu),
          distinctUntilChanged()
        );
      })
    );

    this.refHeader$ = this.refHdu$.pipe(
      map((hdu) => hdu && hdu.headerId),
      distinctUntilChanged(),
      switchMap((headerId) => {
        return this.store.select(DataFilesState.getHeaderById(headerId));
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

    this.alignmentJob$ = combineLatest(
      store.select(WorkbenchState.getState),
      store.select(JobsState.getJobEntities)
    ).pipe(
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

  ngOnInit() {}

  getHduOptionLabel(hduId: string) {
    return this.store.select(DataFilesState.getHduById(hduId)).pipe(
      map((hdu) => hdu?.name),
      distinctUntilChanged()
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
