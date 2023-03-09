import { Component, OnInit, HostBinding, Input, ChangeDetectionStrategy } from '@angular/core';
import { Observable, combineLatest, BehaviorSubject, Subject } from 'rxjs';

import { map, takeUntil, distinctUntilChanged, switchMap, tap, flatMap, filter, withLatestFrom } from 'rxjs/operators';
import { FormGroup, FormControl, Validators, FormBuilder, AbstractControl } from '@angular/forms';
import { MatSelectChange } from '@angular/material/select';
import {
  AKAZEFeatureAlignmentSettings, AlignmentJob, AlignmentJobResult, AlignmentJobSettings,
  AlignmentJobSettingsBase, AlignmentMode, AutoSourceAlignmentSettings, BRISKFeatureAlignmentSettings,
  FeatureAlignmentAlgorithm, FeatureAlignmentSettings, KAZEFeatureAlignmentSettings, ManualSourceAlignmentSettings,
  ORBFeatureAlignmentSettings, PixelAlignmentSettings, SIFTFeatureAlignmentSettings, SourceAlignmentSettings, SURFFeatureAlignmentSettings,
  WcsAlignmentSettings
} from '../../../../jobs/models/alignment';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { WorkbenchState } from '../../../workbench.state';
import { JobsState } from '../../../../jobs/jobs.state';
import { ImageLayer, Header } from '../../../../data-files/models/data-file';
import { DataFilesState } from '../../../../data-files/data-files.state';
import { LoadLayerHeader } from '../../../../data-files/data-files.actions';
import { Source, sourceToAstrometryData } from '../../../models/source';
import { SourcesState } from '../../../sources.state';

import * as objectPath from 'object-path';
import { greaterThan, isNumber } from 'src/app/utils/validators';
import { toSourceExtractionJobSettings } from '../../../models/global-settings';
import { SourceExtractionData } from 'src/app/jobs/models/source-extraction';
import { AligningState, AligningStateModel } from '../aligning.state';
import { CreateAligningJob, SetCurrentJobId, UpdateFormData } from '../aligning.actions';
import { UpdateAlignmentSettings } from 'src/app/workbench/workbench.actions';
import { AlignmentSettings, defaults } from 'src/app/workbench/models/alignment-settings';
import { AligningFormData } from '../models/aligning-form-data';


@Component({
  selector: 'app-aligning-panel',
  templateUrl: './aligning-panel.component.html',
  styleUrls: ['./aligning-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AligningPanelComponent implements OnInit {
  @Input('layerIds')
  set layerIds(layerIds: string[]) {
    this.layerIds$.next(layerIds);
  }
  get layerIds() {
    return this.layerIds$.getValue();
  }
  private layerIds$ = new BehaviorSubject<string[]>(null);

  AlignmentMode = AlignmentMode;
  FeatureAlignmentAlgorithm = FeatureAlignmentAlgorithm;

  formData$: Observable<AligningFormData>;

  destroy$ = new Subject<boolean>();


  selectedLayerIds$: Observable<string[]>;
  refLayerId$: Observable<string>;
  refLayer$: Observable<ImageLayer>;
  refHeader$: Observable<Header>;
  refLayerHasWcs$: Observable<boolean>;
  alignmentJob$: Observable<AlignmentJob>;
  manualSourceOptions$: Observable<Source[]>;
  manualSourceWarnings$: Observable<string[]>;

  alignmentSettingsForm = this.fb.group({
    crop: this.fb.control('', { updateOn: 'change' }),
    enableRot: this.fb.control('', { updateOn: 'change' }),
    enableScale: this.fb.control('', { updateOn: 'change' }),
    enableSkew: this.fb.control('', { updateOn: 'change' }),
    mode: this.fb.control('', { updateOn: 'change' }),
    wcsModeSettings: this.fb.group({
      wcsGridPoints: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(1, true)], updateOn: 'blur' }),
    }),
    sourceModeSettings: this.fb.group({
      scaleInvariant: this.fb.control('', { updateOn: 'change' }),
      matchTol: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0, true)], updateOn: 'blur' }),
      minEdge: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
      ratioLimit: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
      confidence: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
      maxSources: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
      manualModeSettings: this.fb.group({
        sourceIds: this.fb.control('', Validators.required),
      }),
    }),
    featureModeSettings: this.fb.group({
      algorithm: this.fb.control('', { updateOn: 'change' }),
      ratioThreshold: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
      detectEdges: this.fb.control('', { updateOn: 'change' }),
      percentileMin: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
      percentileMax: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
      akazeAlgorithmSettings: this.fb.group({
        descriptorType: this.fb.control('', { validators: [Validators.required], updateOn: 'blur' }),
        descriptorSize: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0, true)], updateOn: 'blur' }),
        descriptorChannels: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
        threshold: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
        octaves: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
        octaveLayers: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
        diffusivity: this.fb.control('', { validators: [Validators.required], updateOn: 'blur' }),
      }),
      briskAlgorithmSettings: this.fb.group({
        threshold: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
        octaves: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
        patternScale: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
      }),
      kazeAlgorithmSettings: this.fb.group({
        extended: this.fb.control('', { updateOn: 'change' }),
        upright: this.fb.control('', { updateOn: 'change' }),
        threshold: this.fb.control('', { updateOn: 'change' }),
        octaves: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
        octaveLayers: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
        diffusivity: this.fb.control('', { validators: [Validators.required], updateOn: 'blur' }),
      }),
      orbAlgorithmSettings: this.fb.group({
        nfeatures: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
        scaleFactor: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
        nlevels: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
        edgeThreshold: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
        firstLevel: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0, true)], updateOn: 'blur' }),
        wtaK: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
        scoreType: this.fb.control('', { validators: [Validators.required], updateOn: 'blur' }),
        patchSize: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
        fastThreshold: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
      }),
      siftAlgorithmSettings: this.fb.group({
        nfeatures: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0, true)], updateOn: 'blur' }),
        octaveLayers: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
        contrastThreshold: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
        edgeThreshold: this.fb.control('', Validators.required),
        sigma: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
        descriptorType: this.fb.control('', { validators: [Validators.required], updateOn: 'blur' })
      }),
      surfAlgorithmSettings: this.fb.group({
        hessianThreshold: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
        octaves: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
        octaveLayers: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
        extended: this.fb.control('', { updateOn: 'change' }),
        upright: this.fb.control('', { updateOn: 'change' })
      })
    }),
    pixelModeSettings: this.fb.group({
      detectEdges: this.fb.control('', { updateOn: 'change' }),
    }),
  })

  layerSelectionForm = this.fb.group({
    selectedLayerIds: this.fb.control([], Validators.required),
    mosaicMode: this.fb.control('', { validators: Validators.required, updateOn: 'change' }),
    mosaicSearchRadius: this.fb.control('', { validators: [Validators.required, isNumber, greaterThan(0)], updateOn: 'blur' }),
    refLayerId: this.fb.control('', Validators.required),
  })

  alignForm = this.fb.group({
    layerSelectionForm: this.layerSelectionForm,
    alignmentSettingsForm: this.alignmentSettingsForm

  });
  alignmentSettings$ = this.store.select(WorkbenchState.getAlignmentSettings)

  constructor(private store: Store, private router: Router, private fb: FormBuilder) {
    this.formData$ = this.store.select(AligningState.getFormData);

    this.layerSelectionForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.onLayerSelectionFormChange());

    this.formData$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(config => this.onLayerSelectionSettingsChange(config))

    this.onLayerSelectionSettingsChange(this.store.selectSnapshot(AligningState.getFormData));
    this.onLayerSelectionFormChange();

    this.alignmentSettingsForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.onAlignmentSettingsFormChange());

    this.alignmentSettings$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(settings => this.onAlignmentSettingsChange(settings))

    //init
    this.onAlignmentSettingsChange(this.store.selectSnapshot(WorkbenchState.getAlignmentSettings));
    this.onAlignmentSettingsFormChange();

    this.layerIds$.pipe(takeUntil(this.destroy$), withLatestFrom(this.formData$)).subscribe(([layerIds, config]) => {
      if (!layerIds || !config) return;
      let selectedLayerIds = config.selectedLayerIds.filter((layerId) => layerIds.includes(layerId));
      if (selectedLayerIds.length != config.selectedLayerIds.length) {
        setTimeout(() => {
          this.setSelectedLayerIds(selectedLayerIds);
        });
      }
    });


    this.refLayerId$ = this.formData$.pipe(
      map((data) => (data && data.refLayerId && data.selectedLayerIds.includes(data.refLayerId)) ? data.refLayerId : null),
      distinctUntilChanged()
    );

    this.manualSourceOptions$ = combineLatest(this.store.select(SourcesState.getEntities), this.refLayerId$).pipe(
      map(([sourcesById, refLayerId]) => {
        if (!refLayerId) return [];
        let sources = Object.values(sourcesById).filter(source => source.layerId == refLayerId);
        return sources;
      })
    )

    let selectedSourceIds$ = this.alignmentSettings$.pipe(
      map(settings => settings.sourceModeSettings.manualModeSettings.sourceIds),
      distinctUntilChanged()
    )

    this.selectedLayerIds$ = this.formData$.pipe(
      map(config => config.selectedLayerIds),
      distinctUntilChanged()
    )


    this.manualSourceWarnings$ = combineLatest(this.refLayerId$, selectedSourceIds$, this.selectedLayerIds$).pipe(
      map(([refLayerId, selectedSourceIds, selectedLayerIds]) => {
        let warnings: string[] = [];
        let sourceById = this.store.selectSnapshot(SourcesState.getEntities);
        let sources = Object.values(sourceById);
        selectedSourceIds.forEach(selectedSourceId => {
          let selectedSource = sourceById[selectedSourceId];
          warnings = warnings.concat(selectedLayerIds.filter(layerId => {
            if (layerId == refLayerId) return false;
            return !sources.find(s => s.layerId == layerId && s.label == selectedSource.label)
          }).map(layerId => {
            let layerName = this.store.selectSnapshot(DataFilesState.getLayerById(layerId))?.name
            return `Source '${selectedSource.label}' is missing from layer ${layerName}`
          }))
        })

        return warnings;
      })
    )


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

    // this.alignForm.valueChanges.subscribe((value) => {
    //   // if(this.imageCalcForm.valid) {
    //   this.store.dispatch(new UpdateAligningPanelConfig({ alignFormData: this.alignForm.value }));
    //   // }
    // });

    this.alignmentJob$ = this.store.select(AligningState.getCurrentJob);
  }

  ngOnInit() { }

  getValidFormFields(group: FormGroup) {
    let result: string[] = [];
    let controls = group.controls
    Object.keys(controls).forEach(key => {
      if (controls[key] instanceof FormGroup) {
        result = result.concat(this.getValidFormFields(controls[key] as FormGroup).map(field => `${key}.${field}`))
      }
      else if (controls[key].enabled && (controls[key].untouched || controls[key].valid)) {
        result.push(key)
      }
    })
    // let result = Object.keys(controls).filter(key => controls[key] instanceof FormGroup || (controls[key].enabled && (controls[key].untouched || controls[key].valid)));
    return result;
  }

  onLayerSelectionSettingsChange(settings: { selectedLayerIds: string[], refLayerId: string, mosaicMode: boolean }) {
    this.layerSelectionForm.patchValue(settings, { emitEvent: false })
  }

  onLayerSelectionFormChange() {
    let controls = this.layerSelectionForm.controls;
    let mosaicMode: boolean = controls.mosaicMode.value;

    if (mosaicMode) {
      this.layerSelectionForm.controls['refLayerId'].disable({ emitEvent: false });
      this.layerSelectionForm.controls['mosaicSearchRadius'].enable({ emitEvent: false });
    }
    else {
      this.layerSelectionForm.controls['refLayerId'].enable({ emitEvent: false });
      this.layerSelectionForm.controls['mosaicSearchRadius'].disable({ emitEvent: false });
    }

    this.store.dispatch(new UpdateFormData(this.layerSelectionForm.value))
  }

  onAlignmentSettingsChange(settings: AlignmentSettings) {
    let value = {};
    this.getValidFormFields(this.alignmentSettingsForm).forEach(key => objectPath.set(value, key, objectPath.get(settings, key)))
    this.alignmentSettingsForm.patchValue(value, { emitEvent: false })
  }

  onAlignmentSettingsFormChange() {
    let controls = this.alignmentSettingsForm.controls;
    let mode: AlignmentMode = controls.mode.value;

    this.alignmentSettingsForm.controls['wcsModeSettings'].disable({ emitEvent: false });
    this.alignmentSettingsForm.controls['sourceModeSettings'].disable({ emitEvent: false });
    this.alignmentSettingsForm.controls['featureModeSettings'].disable({ emitEvent: false });
    this.alignmentSettingsForm.controls['pixelModeSettings'].disable({ emitEvent: false });


    if (mode == AlignmentMode.wcs) {
      this.alignmentSettingsForm.controls['wcsModeSettings'].enable({ emitEvent: false });
    }
    else if (mode == AlignmentMode.sources_manual) {
      this.alignmentSettingsForm.controls['sourceModeSettings'].enable({ emitEvent: false });
      this.alignmentSettingsForm.get('sourceModeSettings.manualModeSettings').enable({ emitEvent: false });
      // this.alignmentSettingsForm.get('sourceModeSettings.autoModeSettings').disable({ emitEvent: false });
    }
    else if (mode == AlignmentMode.sources_auto) {
      this.alignmentSettingsForm.controls['sourceModeSettings'].enable({ emitEvent: false });
      this.alignmentSettingsForm.get('sourceModeSettings.manualModeSettings').disable({ emitEvent: false });
      // this.alignmentSettingsForm.get('sourceModeSettings.autoModeSettings').enable({ emitEvent: false });
    }
    else if (mode == AlignmentMode.features) {
      this.alignmentSettingsForm.controls['featureModeSettings'].enable({ emitEvent: false });

      let algorithm: FeatureAlignmentAlgorithm = this.alignmentSettingsForm.get('featureModeSettings.algorithm').value;

      this.alignmentSettingsForm.get('featureModeSettings.akazeAlgorithmSettings').disable({ emitEvent: false });
      this.alignmentSettingsForm.get('featureModeSettings.briskAlgorithmSettings').disable({ emitEvent: false });
      this.alignmentSettingsForm.get('featureModeSettings.kazeAlgorithmSettings').disable({ emitEvent: false });
      this.alignmentSettingsForm.get('featureModeSettings.orbAlgorithmSettings').disable({ emitEvent: false });
      this.alignmentSettingsForm.get('featureModeSettings.siftAlgorithmSettings').disable({ emitEvent: false });
      this.alignmentSettingsForm.get('featureModeSettings.surfAlgorithmSettings').disable({ emitEvent: false });

      if (algorithm == FeatureAlignmentAlgorithm.AKAZE) {
        this.alignmentSettingsForm.get('featureModeSettings.akazeAlgorithmSettings').enable({ emitEvent: false });
      }
      else if (algorithm == FeatureAlignmentAlgorithm.BRISK) {
        this.alignmentSettingsForm.get('featureModeSettings.briskAlgorithmSettings').enable({ emitEvent: false });
      }
      else if (algorithm == FeatureAlignmentAlgorithm.KAZE) {
        this.alignmentSettingsForm.get('featureModeSettings.kazeAlgorithmSettings').enable({ emitEvent: false });
      }
      else if (algorithm == FeatureAlignmentAlgorithm.ORB) {
        this.alignmentSettingsForm.get('featureModeSettings.orbAlgorithmSettings').enable({ emitEvent: false });
      }
      else if (algorithm == FeatureAlignmentAlgorithm.SIFT) {
        this.alignmentSettingsForm.get('featureModeSettings.siftAlgorithmSettings').enable({ emitEvent: false });
      }
      else if (algorithm == FeatureAlignmentAlgorithm.SURF) {
        this.alignmentSettingsForm.get('featureModeSettings.surfAlgorithmSettings').enable({ emitEvent: false });
      }
    }
    else if (mode == AlignmentMode.pixels) {
      this.alignmentSettingsForm.controls['pixelModeSettings'].enable({ emitEvent: false });
    }

    let value = {};
    this.getValidFormFields(this.alignmentSettingsForm).forEach(key => {
      objectPath.set(value, key, this.alignmentSettingsForm.get(key).value)
    })

    this.store.dispatch(new UpdateAlignmentSettings(value))
  }

  getLayerOptionLabel(layerId: string) {
    return this.store.select(DataFilesState.getLayerById(layerId)).pipe(
      map((layer) => layer?.name),
      distinctUntilChanged()
    );
  }

  setSelectedLayerIds(layerIds: string[]) {
    this.store.dispatch(
      new UpdateFormData({
        ...this.layerSelectionForm.value,
        selectedLayerIds: layerIds
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
    this.store.dispatch(new SetCurrentJobId(null));

    let formData = this.store.selectSnapshot(AligningState.getFormData);
    let settings = this.store.selectSnapshot(WorkbenchState.getAlignmentSettings);
    let sourceExtractionSettings = toSourceExtractionJobSettings(this.store.selectSnapshot(WorkbenchState.getSettings));
    let jobSettingsBase: AlignmentJobSettingsBase = {
      refImage: formData.mosaicMode ? null : parseInt(formData.refLayerId),
      mosaicSearchRadius: formData.mosaicSearchRadius,
      enableRot: settings.enableRot,
      enableScale: settings.enableScale,
      enableSkew: settings.enableSkew,
    }
    let jobSettings: AlignmentJobSettings;
    if (settings.mode == AlignmentMode.wcs) {
      let s: WcsAlignmentSettings = {
        ...jobSettingsBase,
        mode: AlignmentMode.wcs,
        ...settings.wcsModeSettings,
      }
      jobSettings = s;
    }
    else if (settings.mode == AlignmentMode.sources_manual) {

      //reconstruct source extraction data from sources
      let sourcesById = this.store.selectSnapshot(SourcesState.getEntities);
      let sources = Object.values(sourcesById);
      let selectedSources: Source[] = [];
      settings.sourceModeSettings.manualModeSettings.sourceIds.forEach(refSourceId => {
        let refSource = sourcesById[refSourceId];
        selectedSources.push({ ...refSource, id: refSource.label })
        let matchingSources = sources.filter(s => s.id != refSource.id && s.label == refSource.label).map(s => {
          return { ...s, id: refSource.label }
        })
        selectedSources = selectedSources.concat(matchingSources)
      })


      let selectedSourceExtractionData: SourceExtractionData[] = selectedSources.map(source => {
        return {
          ...sourceToAstrometryData(source),
          fileId: source.layerId,
          time: null,
          filter: null,
          telescope: null,
          expLength: null
        }
      })




      let s: ManualSourceAlignmentSettings = {
        ...jobSettingsBase,
        mode: AlignmentMode.sources_manual,
        scaleInvariant: settings.sourceModeSettings.scaleInvariant,
        matchTol: settings.sourceModeSettings.matchTol,
        minEdge: settings.sourceModeSettings.minEdge,
        ratioLimit: settings.sourceModeSettings.ratioLimit,
        confidence: settings.sourceModeSettings.confidence,
        sources: selectedSourceExtractionData,
        maxSources: settings.sourceModeSettings.maxSources
      }
      jobSettings = s;
    }
    else if (settings.mode == AlignmentMode.sources_auto) {
      let s: AutoSourceAlignmentSettings = {
        ...jobSettingsBase,
        mode: AlignmentMode.sources_auto,
        scaleInvariant: settings.sourceModeSettings.scaleInvariant,
        matchTol: settings.sourceModeSettings.matchTol,
        minEdge: settings.sourceModeSettings.minEdge,
        ratioLimit: settings.sourceModeSettings.ratioLimit,
        confidence: settings.sourceModeSettings.confidence,
        ...settings.sourceModeSettings.autoModeSettings,
        sourceExtractionSettings: {
          ...sourceExtractionSettings,
          maxSources: settings.sourceModeSettings.maxSources
        }
      }
      jobSettings = s;
    }
    else if (settings.mode == AlignmentMode.features) {
      let sf: FeatureAlignmentSettings = {
        ...jobSettingsBase,
        mode: AlignmentMode.features,
        detectEdges: settings.featureModeSettings.detectEdges,
        ratioThreshold: settings.featureModeSettings.ratioThreshold,
        percentileMax: settings.featureModeSettings.percentileMax,
        percentileMin: settings.featureModeSettings.percentileMin
      }
      if (settings.featureModeSettings.algorithm == FeatureAlignmentAlgorithm.AKAZE) {
        let alg: AKAZEFeatureAlignmentSettings = {
          algorithm: FeatureAlignmentAlgorithm.AKAZE,
          ...sf,
          ...settings.featureModeSettings.akazeAlgorithmSettings
        }
        jobSettings = alg;
      }
      else if (settings.featureModeSettings.algorithm == FeatureAlignmentAlgorithm.BRISK) {
        let alg: BRISKFeatureAlignmentSettings = {
          algorithm: FeatureAlignmentAlgorithm.BRISK,
          ...sf,
          ...settings.featureModeSettings.briskAlgorithmSettings
        }
        jobSettings = alg;
      }
      else if (settings.featureModeSettings.algorithm == FeatureAlignmentAlgorithm.KAZE) {
        let alg: KAZEFeatureAlignmentSettings = {
          algorithm: FeatureAlignmentAlgorithm.KAZE,
          ...sf,
          ...settings.featureModeSettings.kazeAlgorithmSettings
        }
        jobSettings = alg;
      }
      else if (settings.featureModeSettings.algorithm == FeatureAlignmentAlgorithm.ORB) {
        let alg: ORBFeatureAlignmentSettings = {
          algorithm: FeatureAlignmentAlgorithm.ORB,
          ...sf,
          ...settings.featureModeSettings.orbAlgorithmSettings
        }
        jobSettings = alg;
      }
      else if (settings.featureModeSettings.algorithm == FeatureAlignmentAlgorithm.SIFT) {
        let alg: SIFTFeatureAlignmentSettings = {
          algorithm: FeatureAlignmentAlgorithm.SIFT,
          ...sf,
          ...settings.featureModeSettings.siftAlgorithmSettings
        }
        jobSettings = alg;
      }
      else if (settings.featureModeSettings.algorithm == FeatureAlignmentAlgorithm.SURF) {
        let alg: SURFFeatureAlignmentSettings = {
          algorithm: FeatureAlignmentAlgorithm.SURF,
          ...sf,
          ...settings.featureModeSettings.surfAlgorithmSettings
        }
        jobSettings = alg;
      }
    }
    else if (settings.mode == AlignmentMode.pixels) {
      let s: PixelAlignmentSettings = {
        ...jobSettingsBase,
        mode: AlignmentMode.pixels,
        ...settings.pixelModeSettings
      }
      jobSettings = s;
    }
    if (jobSettings) this.store.dispatch(new CreateAligningJob(formData.selectedLayerIds, formData.mosaicMode ? false : settings.crop, jobSettings));
  }

  restoreDefaults() {
    this.alignmentSettingsForm.markAsUntouched({ onlySelf: false });
    this.store.dispatch(new UpdateAlignmentSettings({
      ...defaults
    }))
  }
}
