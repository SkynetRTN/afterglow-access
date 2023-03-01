import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import { Observable, combineLatest, BehaviorSubject, Subject } from 'rxjs';
import { map, tap, takeUntil, distinctUntilChanged, flatMap, withLatestFrom } from 'rxjs/operators';
import { DataFilesState } from 'src/app/data-files/data-files.state';

import { ImageLayer } from 'src/app/data-files/models/data-file';
import { CosmeticCorrectionJob } from 'src/app/jobs/models/cosmetic-correction';
import { greaterThan, isNumber } from 'src/app/utils/validators';
import { SetSelectedLayerIds, UpdateSettings } from '../cosmetic-correction.actions';
import { CosmeticCorrectionState } from '../cosmetic-correction.state';

@Component({
  selector: 'app-cosmetic-correction-panel',
  templateUrl: './cosmetic-correction-panel.component.html',
  styleUrls: ['./cosmetic-correction-panel.component.scss']
})
export class CosmeticCorrectionPanelComponent implements OnInit {
  @Input('layerIds')
  set layerIds(layerIds: string[]) {
    this.layerIds$.next(layerIds);
  }
  get layerIds() {
    return this.layerIds$.getValue();
  }
  private layerIds$ = new BehaviorSubject<string[]>(null);

  destroy$ = new Subject<boolean>();
  selectedLayers$ = this.store.select(CosmeticCorrectionState.getSelectedLayerIds);
  job$ = this.store.select(CosmeticCorrectionState.getCurrentJob);

  // job$: Observable<CosmeticCorrectionJob>;

  form = this.fb.group({
    selectedLayerIds: this.fb.control('', { validators: [Validators.required], updateOn: 'change' }),
    mCol: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0, true)], updateOn: 'blur' }),
    nuCol: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0, true)], updateOn: 'blur' }),
    mPixel: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0, true)], updateOn: 'blur' }),
    mCorrCol: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0, true)], updateOn: 'blur' }),
    mCorrPixel: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0, true)], updateOn: 'blur' }),
    groupByInstrument: this.fb.control('', { updateOn: 'change' }),
    groupByFilter: this.fb.control('', { updateOn: 'change' }),
    groupByExpLength: this.fb.control('', { updateOn: 'change' }),
    maxGroupLen: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0, true)], updateOn: 'blur' }),
    maxGroupSpanHours: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0, true)], updateOn: 'blur' }),
    minGroupSepHours: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0, true)], updateOn: 'blur' }),

  })

  settings$ = this.store.select(CosmeticCorrectionState.getSettings)

  constructor(private store: Store, private fb: FormBuilder) {
    this.onSettingsChange();


    this.form.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.onFormChange());

    this.onFormChange();

    this.layerIds$.pipe(takeUntil(this.destroy$), withLatestFrom(this.selectedLayers$)).subscribe(([availableLayerIds, selectedLayerIds]) => {
      if (!availableLayerIds || !selectedLayerIds) return;
      let filteredLayerIds = selectedLayerIds.filter((layerId) => availableLayerIds.includes(layerId));
      if (filteredLayerIds.length != selectedLayerIds.length) {
        setTimeout(() => {
          this.setSelectedLayerIds(filteredLayerIds);
        });
      }
    });



  }

  ngOnInit(): void {
  }

  onFormChange() {
    this.store.dispatch(new SetSelectedLayerIds(this.form.controls.selectedLayerIds.value));
    this.store.dispatch(new UpdateSettings(this.form.value))
  }

  onSettingsChange() {
    let settings = this.store.selectSnapshot(CosmeticCorrectionState.getSettings)
    let selectedLayerIds = this.store.selectSnapshot(CosmeticCorrectionState.getSelectedLayerIds)
    this.form.patchValue({ selectedLayerIds: selectedLayerIds, ...settings }, { emitEvent: false })
  }

  getLayerOptionLabel(layerId: string) {
    return this.store.select(DataFilesState.getLayerById(layerId)).pipe(
      map((layer) => layer?.name),
      distinctUntilChanged()
    );
  }

  setSelectedLayerIds(layerIds: string[]) {
    this.store.dispatch(
      new SetSelectedLayerIds(layerIds)
    );
  }

  onSelectAllBtnClick() {
    this.setSelectedLayerIds(this.layerIds);
  }

  onClearSelectionBtnClick() {
    this.setSelectedLayerIds([]);
  }

  submit() {
  }

}
