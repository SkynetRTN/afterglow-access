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
import { LoadLayerHeader } from '../../../data-files/data-files.actions';
import { Source } from '../../models/source';
import { SourcesState } from '../../sources.state';

enum AlignMode {
  ASTROMETRIC = 'astrometric',
  SOURCE_MANUAL = 'source: manual',
  SOURCE_PROPER_MOTION = 'source: proper motion',
  SOURCE_REFINE = 'source: refine'
}

@Component({
  selector: 'app-aligning-panel',
  templateUrl: './aligning-panel.component.html',
  styleUrls: ['./aligning-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlignerPageComponent implements OnInit {
  @Input('layerIds')
  set layerIds(layerIds: string[]) {
    this.layerIds$.next(layerIds);
  }
  get layerIds() {
    return this.layerIds$.getValue();
  }
  private layerIds$ = new BehaviorSubject<string[]>(null);

  AlignMode = AlignMode;
  config$: Observable<AligningPanelConfig>;

  destroy$ = new Subject<boolean>();

  selectedHduIds$: Observable<string[]>;
  refHduId$: Observable<string>;
  refHdu$: Observable<ImageHdu>;
  refHeader$: Observable<Header>;
  refHduHasWcs$: Observable<boolean>;
  alignFormData$: Observable<AlignFormData>;
  alignmentJob$: Observable<AlignmentJob>;
  manualSourceOptions$: Observable<Source[]>;

  alignForm = new FormGroup({
    selectedHduIds: new FormControl([], Validators.required),
    refHduId: new FormControl('', Validators.required),
    crop: new FormControl('', Validators.required),
    mode: new FormControl('', Validators.required),
    manualSources: new FormControl('', Validators.required),
  });

  constructor(private store: Store, private router: Router) {
    this.config$ = this.store.select(WorkbenchState.getAligningPanelConfig);

    this.layerIds$.pipe(takeUntil(this.destroy$), withLatestFrom(this.config$)).subscribe(([layerIds, config]) => {
      if (!layerIds || !config) return;
      let selectedHduIds = config.alignFormData.selectedHduIds.filter((layerId) => layerIds.includes(layerId));
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



    this.refHduId$ = this.alignFormData$.pipe(
      map((data) => (data && data.refHduId && data.selectedHduIds.includes(data.refHduId)) ? data.refHduId : null),
      distinctUntilChanged()
    );

    this.manualSourceOptions$ = combineLatest(this.store.select(SourcesState.getEntities), this.refHduId$).pipe(
      map(([sourcesById, refHduId]) => {
        return Object.values(sourcesById).filter(source => !refHduId || source.layerId == refHduId)
      })
    )


    combineLatest(this.alignFormData$, this.refHduId$).subscribe(([data, refHduId]) => {
      if (!data) return;
      this.alignForm.patchValue({ ...data, refHduId: refHduId }, { emitEvent: false });
    });



    this.refHdu$ = this.refHduId$.pipe(
      switchMap((layerId) => {
        return this.store.select(DataFilesState.getHduById(layerId)).pipe(
          map((layer) => layer as ImageHdu),
          distinctUntilChanged()
        );
      })
    );

    this.refHeader$ = this.refHdu$.pipe(
      map((layer) => layer && layer.headerId),
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
            this.store.dispatch(new LoadLayerHeader(refHduId));
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

  ngOnInit() { }

  getHduOptionLabel(layerId: string) {
    return this.store.select(DataFilesState.getHduById(layerId)).pipe(
      map((layer) => layer?.name),
      distinctUntilChanged()
    );
  }

  setSelectedHduIds(layerIds: string[]) {
    this.store.dispatch(
      new UpdateAligningPanelConfig({
        alignFormData: {
          ...this.alignForm.value,
          selectedHduIds: layerIds,
        },
      })
    );
  }

  onSelectAllBtnClick() {
    this.setSelectedHduIds(this.layerIds);
  }

  onClearSelectionBtnClick() {
    this.setSelectedHduIds([]);
  }

  submit(data: AlignFormData) {
    let selectedHduIds: string[] = this.alignForm.controls.selectedHduIds.value;
    this.store.dispatch(new CreateAlignmentJob(selectedHduIds));
  }
}
