import { Component, OnInit, HostBinding, Input, ChangeDetectionStrategy } from '@angular/core';
import { Observable, combineLatest, BehaviorSubject, Subject } from 'rxjs';
import { map, tap, takeUntil, distinctUntilChanged, flatMap, withLatestFrom } from 'rxjs/operators';
import { StackFormData, WorkbenchTool, StackingPanelConfig } from '../../models/workbench-state';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { StackingJob, StackingJobResult } from '../../../jobs/models/stacking';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { WorkbenchState } from '../../workbench.state';
import { JobsState } from '../../../jobs/jobs.state';
import { SetActiveTool, CreateStackingJob, UpdateStackingPanelConfig } from '../../workbench.actions';
import { DataFile, ImageLayer } from '../../../data-files/models/data-file';
import { DataFilesState } from '../../../data-files/data-files.state';

@Component({
  selector: 'app-stacking-panel',
  templateUrl: './stacking-panel.component.html',
  styleUrls: ['./stacking-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StackerPanelComponent implements OnInit {
  @Input('layerIds')
  set layerIds(layerIds: string[]) {
    this.layerIds$.next(layerIds);
  }
  get layerIds() {
    return this.layerIds$.getValue();
  }
  private layerIds$ = new BehaviorSubject<string[]>(null);

  config$: Observable<StackingPanelConfig>;

  destroy$ = new Subject<boolean>();
  selectedLayers$: Observable<Array<ImageLayer>>;
  stackFormData$: Observable<StackFormData>;
  stackingJob$: Observable<StackingJob>;
  dataFileEntities$: Observable<{ [id: string]: DataFile }>;

  stackForm = new FormGroup({
    selectedLayerIds: new FormControl([], Validators.required),
    mode: new FormControl('average', Validators.required),
    scaling: new FormControl('none', Validators.required),
    rejection: new FormControl('none', Validators.required),
    smartStacking: new FormControl('none', Validators.required),
    percentile: new FormControl(50),
    low: new FormControl(''),
    high: new FormControl(''),
    propagateMask: new FormControl('')
  });

  constructor(private store: Store, private router: Router) {
    this.dataFileEntities$ = this.store.select(DataFilesState.getFileEntities);
    this.config$ = this.store.select(WorkbenchState.getStackingPanelConfig);

    this.layerIds$.pipe(takeUntil(this.destroy$), withLatestFrom(this.config$)).subscribe(([layerIds, config]) => {
      if (!layerIds || !config) return;
      let selectedLayerIds = config.stackFormData.selectedLayerIds.filter((layerId) => layerIds.includes(layerId));
      if (selectedLayerIds.length != config.stackFormData.selectedLayerIds.length) {
        setTimeout(() => {
          this.setSelectedLayerIds(selectedLayerIds);
        });
      }
    });

    this.stackForm
      .get('mode')
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        if (value == 'percentile') {
          this.stackForm.get('percentile').enable();
        } else {
          this.stackForm.get('percentile').disable();
        }
      });

    this.stackForm
      .get('rejection')
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        if (['iraf', 'minmax', 'sigclip', 'rcr', 'chauvenet'].includes(value)) {
          this.stackForm.get('high').enable({ emitEvent: false });
          this.stackForm.get('low').enable({ emitEvent: false });
        } else {
          this.stackForm.get('high').disable({ emitEvent: false });
          this.stackForm.get('low').disable({ emitEvent: false });
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
      store.select(JobsState.getJobEntities),
    ]).pipe(
      map(([state, jobEntities]) => {
        if (
          !state.stackingPanelConfig.currentStackingJobId ||
          !jobEntities[state.stackingPanelConfig.currentStackingJobId]
        ) {
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

  getLayerOptionLabel(layerId: string) {
    return this.store.select(DataFilesState.getLayerById(layerId)).pipe(
      map((layer) => layer?.name),
      distinctUntilChanged()
    );
  }

  setSelectedLayerIds(layerIds: string[]) {
    this.store.dispatch(
      new UpdateStackingPanelConfig({
        stackFormData: {
          ...this.stackForm.value,
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

  submit(data: StackFormData) {
    let selectedLayerIds: string[] = this.stackForm.controls.selectedLayerIds.value;
    this.store.dispatch(new CreateStackingJob(selectedLayerIds));
  }

  ngOnInit() { }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
