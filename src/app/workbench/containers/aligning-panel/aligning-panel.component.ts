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
import { ImageLayer, DataFile, Header } from '../../../data-files/models/data-file';
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

  selectedLayerIds$: Observable<string[]>;
  refLayerId$: Observable<string>;
  refLayer$: Observable<ImageLayer>;
  refHeader$: Observable<Header>;
  refLayerHasWcs$: Observable<boolean>;
  alignFormData$: Observable<AlignFormData>;
  alignmentJob$: Observable<AlignmentJob>;
  manualSourceOptions$: Observable<Source[]>;

  alignForm = new FormGroup({
    selectedLayerIds: new FormControl([], Validators.required),
    refLayerId: new FormControl('', Validators.required),
    crop: new FormControl('', Validators.required),
    mode: new FormControl('', Validators.required),
    manualSources: new FormControl('', Validators.required),
  });

  constructor(private store: Store, private router: Router) {
    this.config$ = this.store.select(WorkbenchState.getAligningPanelConfig);

    this.layerIds$.pipe(takeUntil(this.destroy$), withLatestFrom(this.config$)).subscribe(([layerIds, config]) => {
      if (!layerIds || !config) return;
      let selectedLayerIds = config.alignFormData.selectedLayerIds.filter((layerId) => layerIds.includes(layerId));
      if (selectedLayerIds.length != config.alignFormData.selectedLayerIds.length) {
        setTimeout(() => {
          this.setSelectedLayerIds(selectedLayerIds);
        });
      }
    });

    this.alignFormData$ = this.config$.pipe(
      map((config) => config && config.alignFormData),
      distinctUntilChanged()
    );



    this.refLayerId$ = this.alignFormData$.pipe(
      map((data) => (data && data.refLayerId && data.selectedLayerIds.includes(data.refLayerId)) ? data.refLayerId : null),
      distinctUntilChanged()
    );

    this.manualSourceOptions$ = combineLatest(this.store.select(SourcesState.getEntities), this.refLayerId$).pipe(
      map(([sourcesById, refLayerId]) => {
        return Object.values(sourcesById).filter(source => !refLayerId || source.layerId == refLayerId)
      })
    )


    combineLatest(this.alignFormData$, this.refLayerId$).subscribe(([data, refLayerId]) => {
      if (!data) return;
      this.alignForm.patchValue({ ...data, refLayerId: refLayerId }, { emitEvent: false });
    });



    this.refLayer$ = this.refLayerId$.pipe(
      switchMap((layerId) => {
        return this.store.select(DataFilesState.getLayerById(layerId)).pipe(
          map((layer) => layer as ImageLayer),
          distinctUntilChanged()
        );
      })
    );

    this.refHeader$ = this.refLayer$.pipe(
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

    combineLatest(this.refLayerId$, refHeaderLoaded$, refHeaderLoading$)
      .pipe(takeUntil(this.destroy$))
      .subscribe(([refLayerId, headerLoaded, headerLoading]) => {
        if (refLayerId && headerLoaded != null && !headerLoaded && headerLoading != null && !headerLoading) {
          setTimeout(() => {
            this.store.dispatch(new LoadLayerHeader(refLayerId));
          });
        }
      });

    this.refLayerHasWcs$ = this.refHeader$.pipe(
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

  getLayerOptionLabel(layerId: string) {
    return this.store.select(DataFilesState.getLayerById(layerId)).pipe(
      map((layer) => layer?.name),
      distinctUntilChanged()
    );
  }

  setSelectedLayerIds(layerIds: string[]) {
    this.store.dispatch(
      new UpdateAligningPanelConfig({
        alignFormData: {
          ...this.alignForm.value,
          selectedLayerIds: layerIds,
        },
      })
    );
  }

  onSelectAllBtnClick() {
    this.setSelectedLayerIds(this.layerIds);
  }

  onClearSelectionBtnClick() {
    this.setSelectedLayerIds([]);
  }

  submit(data: AlignFormData) {
    let selectedLayerIds: string[] = this.alignForm.controls.selectedLayerIds.value;
    this.store.dispatch(new CreateAlignmentJob(selectedLayerIds));
  }
}
