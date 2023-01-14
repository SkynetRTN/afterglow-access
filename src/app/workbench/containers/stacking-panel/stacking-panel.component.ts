import { Component, OnInit, HostBinding, Input, ChangeDetectionStrategy } from '@angular/core';
import { Observable, combineLatest, BehaviorSubject, Subject } from 'rxjs';
import { map, tap, takeUntil, distinctUntilChanged, flatMap, withLatestFrom } from 'rxjs/operators';
import { StackFormData, WorkbenchTool, StackingPanelConfig } from '../../models/workbench-state';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { StackingJob, StackingJobResult, StackSettings } from '../../../jobs/models/stacking';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { WorkbenchState } from '../../workbench.state';
import { JobsState } from '../../../jobs/jobs.state';
import { SetActiveTool, CreateStackingJob, UpdateStackingPanelConfig } from '../../workbench.actions';
import { DataFile, ImageLayer } from '../../../data-files/models/data-file';
import { DataFilesState } from '../../../data-files/data-files.state';
import { greaterThan, isNumber } from 'src/app/utils/validators';
import { getLongestCommonStartingSubstring, isNotEmpty } from 'src/app/utils/utils';

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
  showPropagateMask$ = new BehaviorSubject<boolean>(false);

  stackForm = new FormGroup({
    selectedLayerIds: new FormControl([], Validators.required),
    mode: new FormControl('average', Validators.required),
    scaling: new FormControl('none', Validators.required),
    rejection: new FormControl('none', Validators.required),
    smartStacking: new FormControl('none', Validators.required),
    percentile: new FormControl(50, { validators: [Validators.required, isNumber, greaterThan(0)] }),
    low: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0, true)] }),
    high: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0, true)] }),
    propagateMask: new FormControl(''),
    equalizeAdditive: new FormControl(''),
    equalizeOrder: new FormControl('', { validators: [Validators.required, isNumber, greaterThan(0, true)] }),
    equalizeMultiplicative: new FormControl(''),
    equalizeGlobal: new FormControl(''),
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

    this.store.select(WorkbenchState.getAligningPanelConfig).pipe(
      takeUntil(this.destroy$),
      map(config => !config?.mosaicMode)
    ).subscribe(value => this.showPropagateMask$.next(value))

    this.stackForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.onStackSettingsFormChange());

    this.stackForm
      .get('equalizeAdditive')
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        if (value) {
          this.stackForm.get('equalizeGlobal').setValue(true);
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


    this.onStackSettingsFormChange();
  }

  onStackSettingsFormChange() {

    let rejection = this.stackForm.get('rejection').value

    if (['iraf', 'minmax', 'sigclip', 'rcr', 'chauvenet'].includes(rejection)) {
      this.stackForm.get('high').enable({ emitEvent: false });
      this.stackForm.get('low').enable({ emitEvent: false });
    } else {
      this.stackForm.get('high').disable({ emitEvent: false });
      this.stackForm.get('low').disable({ emitEvent: false });
    }

    let equalizeAdditive = this.stackForm.get('equalizeAdditive').value;
    if (equalizeAdditive) {
      this.stackForm.get('equalizeOrder').enable({ emitEvent: false });
    } else {
      this.stackForm.get('equalizeOrder').disable({ emitEvent: false });
    }

    let mode = this.stackForm.get('mode').value;
    if (mode == 'percentile') {
      this.stackForm.get('percentile').enable({ emitEvent: false });
    } else {
      this.stackForm.get('percentile').disable({ emitEvent: false });
    }

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

  submit() {
    let showPropagateMask = this.showPropagateMask$.value;
    let selectedLayerIds: string[] = this.stackForm.controls.selectedLayerIds.value;
    let state = this.store.selectSnapshot(WorkbenchState.getState)
    let data = state.stackingPanelConfig.stackFormData;
    let layerEntities = this.store.selectSnapshot(DataFilesState.getLayerEntities);

    let dataFileEntities = this.store.selectSnapshot(DataFilesState.getFileEntities);
    selectedLayerIds = selectedLayerIds.filter((id) => isNotEmpty(layerEntities[id]));
    selectedLayerIds = selectedLayerIds.sort((a, b) => {
      let aFile = dataFileEntities[layerEntities[a].fileId];
      let bFile = dataFileEntities[layerEntities[b].fileId];
      return aFile.name < bFile.name
        ? -1
        : aFile.name > bFile.name
          ? 1
          : 0
    })





    let settings: StackSettings = {
      mode: data.mode,
      scaling: data.scaling == 'none' ? null : data.scaling,
      rejection: data.rejection == 'none' ? null : data.rejection,
      percentile: data.percentile,
      smartStacking: data.smartStacking,
      lo: data.low,
      hi: data.high,
      propagateMask: showPropagateMask ? data.propagateMask : false,
      equalizeAdditive: data.equalizeAdditive,
      equalizeOrder: data.equalizeOrder,
      equalizeMultiplicative: data.equalizeMultiplicative,
      equalizeGlobal: data.equalizeGlobal
    }




    this.store.dispatch(new CreateStackingJob(selectedLayerIds, settings, null));
  }

  ngOnInit() { }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
