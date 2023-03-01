import { Component, OnInit, OnDestroy, HostBinding, Input, ChangeDetectionStrategy, AfterViewInit } from '@angular/core';
import { Observable, combineLatest, BehaviorSubject, Subscription, Subject, of } from 'rxjs';
import { map, tap, filter, flatMap, takeUntil, distinctUntilChanged, switchMap, withLatestFrom } from 'rxjs/operators';
import { FormGroup, FormControl, Validators, ValidatorFn, ValidationErrors, AbstractControl } from '@angular/forms';

import { MatDialog } from '@angular/material/dialog';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { KernelFilter, PixelOpsFormData, SIGMA_KERNELS, SIZE_KERNELS } from '../models/pixel-ops-form-data';
import { greaterThan, isNumber, lessThan } from 'src/app/utils/validators';
import { PixelOpsState, PixelOpsStateModel } from '../pixel-ops.state';
import { WorkbenchState } from 'src/app/workbench/workbench.state';
import { DataFilesState } from 'src/app/data-files/data-files.state';
import { CreateAdvPixelOpsJob, CreatePixelOpsJob, HideCurrentPixelOpsJobState, UpdateFormData } from '../pixel-ops.actions';
import { PixelOpsJob } from 'src/app/jobs/models/pixel-ops';
import { JobsState } from 'src/app/jobs/jobs.state';
import { JobType } from 'src/app/jobs/models/job-types';

interface PixelOpVariable {
  name: string;
  value: string;
}

@Component({
  selector: 'app-pixel-ops-panel',
  templateUrl: './pixel-ops-panel.component.html',
  styleUrls: ['./pixel-ops-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PixelOpsPanelComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input('viewerId')
  set viewerId(viewerId: string) {
    this.viewerId$.next(viewerId);
  }
  get viewerId() {
    return this.viewerId$.getValue();
  }
  private viewerId$ = new BehaviorSubject<string>(null);

  @Input('availableLayerIds')
  set availableLayerIds(layerIds: string[]) {
    this.availableLayerIds$.next(layerIds);
  }
  get availableLayerIds() {
    return this.availableLayerIds$.getValue();
  }
  private availableLayerIds$ = new BehaviorSubject<string[]>(null);

  destroy$ = new Subject<boolean>();
  config$: Observable<PixelOpsStateModel>;
  formData$ = this.store.select(PixelOpsState.getFormData);
  selectedLayerIds$: Observable<string[]>;
  pixelOpsJobs$: Observable<PixelOpsJob[]>;
  currentPixelOpsJob$: Observable<PixelOpsJob>;
  showCurrentPixelOpsJobState$: Observable<boolean>;
  pixelOpVariables$: Observable<Array<PixelOpVariable>>;
  pixelOpsFormData$: Observable<PixelOpsFormData>;
  panelOpenState: boolean;

  operands = [
    { label: 'Add', symbol: '+' },
    { label: 'Subtract', symbol: '-' },
    { label: 'Multiply', symbol: '*' },
    { label: 'Divide', symbol: '/' },
  ];

  modes = [
    { label: 'Scalar', value: 'scalar' },
    { label: 'Image', value: 'image' },
    { label: 'Kernel Filter', value: 'kernel' },
  ];

  kernelFilters = [
    { label: 'Gaussian', value: KernelFilter.GAUSSIAN_FILTER },
    { label: 'Gaussian Gradient Magnitude', value: KernelFilter.GAUSSIAN_GRADIENT_MAGNITUDE },
    { label: 'Gaussian Laplace', value: KernelFilter.GAUSSIAN_LAPLACE },
    { label: 'Grey Closing', value: KernelFilter.GREY_CLOSING },
    { label: 'Grey Dilation', value: KernelFilter.GREY_DILATION },
    { label: 'Grey Erosion', value: KernelFilter.GREY_EROSION },
    { label: 'Grey Opening', value: KernelFilter.GREY_OPENING },
    { label: 'Laplace', value: KernelFilter.LAPLACE },
    { label: 'Maximum', value: KernelFilter.MAXIMUM_FILTER },
    { label: 'Median', value: KernelFilter.MEDIAN_FILTER },
    { label: 'Minimum', value: KernelFilter.MINIMUM_FILTER },
    { label: 'Morphological Gradient', value: KernelFilter.MORPHOLOGICAL_GRADIENT },
    { label: 'Morphological Laplace', value: KernelFilter.MORPHOLOGICAL_LAPLACE },
    { label: 'Prewitt', value: KernelFilter.PREWITT },
    { label: 'Sobel', value: KernelFilter.SOBEL },
    { label: 'Uniform', value: KernelFilter.UNIFORM_FILTER },
  ];

  kernelSizes = [
    { label: '3 x 3', value: 3 },
    { label: '5 x 5', value: 5 },
  ];

  divideByZero(control: AbstractControl): ValidationErrors | null {
    const mode = control.get('mode');
    const scalarValue = control.get('scalarValue');
    const operand = control.get('operand');
    return mode && scalarValue && operand && mode.value == 'scalar' && operand.value == '/' && scalarValue.value == 0
      ? { divideByZero: true }
      : null;
  }

  imageCalcForm = new FormGroup(
    {
      operand: new FormControl('+', Validators.required),
      mode: new FormControl('image', Validators.required),
      selectedLayerIds: new FormControl({ value: '', disabled: true }, Validators.required),
      primaryLayerIds: new FormControl([]),
      auxLayerId: new FormControl(''),
      scalarValue: new FormControl('', [Validators.required, isNumber]),
      inPlace: new FormControl(false, Validators.required),
      kernelFilter: new FormControl('', Validators.required),
      kernelSize: new FormControl('', [Validators.required, isNumber]),
      kernelSigma: new FormControl('', [Validators.required, isNumber, lessThan(10), greaterThan(0)]),
    },
    { validators: this.divideByZero }
  );

  imageCalcFormAdv = new FormGroup({
    opString: new FormControl('', Validators.required),
    selectedLayerIds: new FormControl({ value: '', disabled: true }, Validators.required),
    primaryLayerIds: new FormControl([]),
    auxLayerIds: new FormControl([]),
    inPlace: new FormControl(false, Validators.required),
  });

  constructor(public dialog: MatDialog, private store: Store, private router: Router) {
    this.config$ = this.store.select(PixelOpsState.getState);

    let viewer$ = this.viewerId$.pipe(
      switchMap(viewerId => this.store.select(WorkbenchState.getViewerById(viewerId))
      ))

    this.selectedLayerIds$ = viewer$.pipe(
      switchMap(viewer => {
        if (!viewer) return of([]);
        if (viewer.layerId) return of([viewer.layerId])
        return this.store.select(DataFilesState.getFileById(viewer.fileId)).pipe(
          map(file => file.layerIds),
          distinctUntilChanged()
        )
      })
    )



    combineLatest([this.selectedLayerIds$, this.availableLayerIds$]).pipe(takeUntil(this.destroy$), withLatestFrom(this.formData$)).subscribe(([[selectedLayerIds, availableLayerIds], formData]) => {
      if (!availableLayerIds || !formData || !selectedLayerIds) return;

      let updateRequired = (a: any[], b: any[]) => {
        return a.length != b.length || a.some(value => !b.includes(value))
      }
      let primaryLayerIds = formData.primaryLayerIds.filter((layerId) => availableLayerIds.includes(layerId) && !selectedLayerIds.includes(layerId));
      let auxLayerIds = formData.auxLayerIds.filter((layerId) => availableLayerIds.includes(layerId) && !selectedLayerIds.includes(layerId));
      let auxLayerId = formData.auxLayerId;
      if (!availableLayerIds.includes(auxLayerId)) {
        auxLayerId = null;
      }
      if (
        updateRequired(formData.selectedLayerIds, selectedLayerIds) ||
        updateRequired(primaryLayerIds, formData.primaryLayerIds) ||
        updateRequired(auxLayerIds, formData.auxLayerIds) ||
        auxLayerId != formData.auxLayerId
      ) {
        setTimeout(() => {
          this.store.dispatch(
            new UpdateFormData({
              selectedLayerIds: selectedLayerIds,
              primaryLayerIds: primaryLayerIds,
              auxLayerIds: auxLayerIds,
              auxLayerId: auxLayerId,
            })
          );
        });
      }
    });

    this.pixelOpsFormData$ = this.store.select(PixelOpsState.getFormData)

    this.pixelOpsFormData$.subscribe((data) => {
      this.imageCalcForm.patchValue(data, { emitEvent: false });
      this.imageCalcFormAdv.patchValue(data, { emitEvent: false });
    });

    this.imageCalcForm
      .get('mode')
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        this.updateSimpleFormUI();
      });

    this.imageCalcForm
      .get('kernelFilter')
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        this.updateSimpleFormUI();
      });

    this.imageCalcForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      // if(this.imageCalcForm.valid) {
      this.store.dispatch(
        new UpdateFormData(this.imageCalcForm.value)
      );
      this.store.dispatch(new HideCurrentPixelOpsJobState());
      // }
    });

    this.imageCalcFormAdv.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      // if(this.imageCalcFormAdv.valid) {
      this.store.dispatch(
        new UpdateFormData(this.imageCalcFormAdv.value)
      );
      this.store.dispatch(new HideCurrentPixelOpsJobState());
      // }
    });

    let auxLayersVars$ = this.pixelOpsFormData$.pipe(
      map((formData) => formData.auxLayerIds),
      switchMap((layerIds) => {
        if (layerIds.length == 0) return of([]);
        return combineLatest(layerIds.map((layerId) => this.getLayerOptionLabel(layerId)));
      })
    );

    let primaryLayersVars$ = this.pixelOpsFormData$.pipe(
      map((formData) => [...formData.selectedLayerIds, ...formData.primaryLayerIds]),
      switchMap((layerIds) => {
        if (layerIds.length == 0) return of([]);
        return combineLatest(layerIds.map((layerId) => this.getLayerOptionLabel(layerId)));
      })
    );

    this.pixelOpVariables$ = combineLatest([primaryLayersVars$, auxLayersVars$]).pipe(
      map(([primaryLayerVars, auxLayerVars]) => {
        let dataFiles = this.store.selectSnapshot(DataFilesState.getFileEntities);
        return [
          {
            name: 'aux_img',
            value: auxLayerVars.length == 0 ? 'N/A' : auxLayerVars[0],
          },
          { name: 'img', value: 'for each image file' },
          ...primaryLayerVars.map((value, index) => {
            return {
              name: `imgs[${index}]`,
              value: value,
            };
          }),
          ...auxLayerVars.map((value, index) => {
            return {
              name: `aux_imgs[${index}]`,
              value: value,
            };
          }),
        ];
      })
    );

    this.pixelOpsJobs$ = store
      .select(JobsState.getJobs)
      .pipe(map((allJobRows) => allJobRows.filter((row) => row.type == JobType.PixelOps) as PixelOpsJob[]));

    this.currentPixelOpsJob$ = this.store.select(PixelOpsState.getCurrentJob)

    this.showCurrentPixelOpsJobState$ = store
      .select(PixelOpsState.getState)
      .pipe(map((state) => state.showCurrentPixelOpsJobState));

    // this.extractionJobRows$ = combineLatest(
    //   store.select(JobsState.getAllJobs).pipe(
    //     map(
    //       rows =>
    //         rows.filter(row => row.job.type == JobType.Photometry) as Array<{
    //           job: PhotometryJob;
    //           result: PhotometryJobResult;
    //         }>
    //     )
    //   ),
    //   this.activeImageFile$
    // ).pipe(
    //   map(([rows, activeImageFile]) =>
    //     activeImageFile
    //       ? rows
    //           .filter(row =>
    //             row.job.file_ids.includes(parseInt(activeImageFile.id))
    //           )
    //           .sort((a, b) => {
    //             if (a.job.id == b.job.id) return 0;
    //             return a.job.id > b.job.id ? -1 : 1;
    //           })
    //       : []
    //   )
    // );

    this.updateSimpleFormUI();
  }

  updateSimpleFormUI() {
    let value = this.imageCalcForm.get('mode').value;

    if (value == 'scalar') {
      this.imageCalcForm.get('scalarValue').enable({ emitEvent: false });
      this.imageCalcForm.get('auxLayerId').disable({ emitEvent: false });
      this.imageCalcForm.get('kernelFilter').disable({ emitEvent: false });
      this.imageCalcForm.get('kernelSize').disable({ emitEvent: false });
      this.imageCalcForm.get('kernelSigma').disable({ emitEvent: false });
    } else if (value == 'image') {
      this.imageCalcForm.get('scalarValue').disable({ emitEvent: false });
      this.imageCalcForm.get('auxLayerId').enable({ emitEvent: false });
      this.imageCalcForm.get('kernelFilter').disable({ emitEvent: false });
      this.imageCalcForm.get('kernelSize').disable({ emitEvent: false });
      this.imageCalcForm.get('kernelSigma').disable({ emitEvent: false });
    } else if (value == 'kernel') {
      this.imageCalcForm.get('scalarValue').disable({ emitEvent: false });
      this.imageCalcForm.get('auxLayerId').disable({ emitEvent: false });
      this.imageCalcForm.get('kernelFilter').enable({ emitEvent: false });
      if (this.kernelSizeEnabled) {
        this.imageCalcForm.get('kernelSize').enable({ emitEvent: false });
      }
      else {
        this.imageCalcForm.get('kernelSize').disable({ emitEvent: false });
      }

      if (this.kernelSigmaEnabled) {
        this.imageCalcForm.get('kernelSigma').enable({ emitEvent: false });
      }
      else {
        this.imageCalcForm.get('kernelSigma').disable({ emitEvent: false });
      }
    }
  }

  get kernelSigmaEnabled() {
    let mode = this.imageCalcForm.get('mode').value;
    let kernelFilter = this.imageCalcForm.get('kernelFilter').value
    return mode == 'kernel' && SIGMA_KERNELS.includes(kernelFilter)
  }

  get kernelSizeEnabled() {
    let mode = this.imageCalcForm.get('mode').value;
    let kernelFilter = this.imageCalcForm.get('kernelFilter').value
    return mode == 'kernel' && SIZE_KERNELS.includes(kernelFilter)
  }

  ngOnInit() { }

  ngAfterViewInit() {

  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  submit(v: any) {
    this.store.dispatch(new CreatePixelOpsJob());
  }

  submitAdv(v: any) {
    this.store.dispatch(new CreateAdvPixelOpsJob());
  }

  // openPixelOpsJobsDialog() {
  //   console.log(this.imageCalcForm.valid, this.imageCalcForm.errors)


  //   // let dialogRef = this.dialog.open(PixelOpsJobsDialogComponent, {
  //   //   width: '600px',
  //   //   data: {
  //   //     rows$: this.pixelOpsJobs$,
  //   //     allImageFiles$: this.store.select(DataFilesState.getLayers),
  //   //   },
  //   // });

  //   // dialogRef.afterClosed().subscribe(result => {
  //   //   if (result) {
  //   //     this.store.dispatch(
  //   //       new UpdateSourceExtractionSettings({
  //   //         changes: result
  //   //       })
  //   //     );
  //   //   }
  //   // });
  // }

  onTabChange($event: MatTabChangeEvent) {
    this.store.dispatch(new HideCurrentPixelOpsJobState());
  }

  setAuxLayerIds(layerIds: string[]) {
    this.store.dispatch(
      new UpdateFormData({ auxLayerIds: layerIds })
    );
  }

  getLayerOptionLabel(layerId: string) {
    return this.store.select(DataFilesState.getLayerById(layerId)).pipe(
      map((layer) => layer?.name),
      distinctUntilChanged()
    );
  }

  onSelectAllPrimaryLayersBtnClick() {
    this.setSelectedPrimaryLayerIds(this.availableLayerIds);
  }

  onClearPrimaryLayersSelectionBtnClick() {
    this.setSelectedPrimaryLayerIds([]);
  }

  setSelectedPrimaryLayerIds(layerIds: string[]) {
    this.store.dispatch(
      new UpdateFormData({
        ...this.imageCalcFormAdv.value,
        primaryLayerIds: layerIds,
      },
      )
    );
    this.store.dispatch(new HideCurrentPixelOpsJobState());
  }

  onSelectAllAuxLayersBtnClick() {
    this.setSelectedAuxLayerIds(this.availableLayerIds);
  }

  onClearAuxLayersSelectionBtnClick() {
    this.setSelectedAuxLayerIds([]);
  }

  setSelectedAuxLayerIds(layerIds: string[]) {
    this.store.dispatch(
      new UpdateFormData({
        ...this.imageCalcFormAdv.value,
        auxLayerIds: layerIds,
      })
    );
    this.store.dispatch(new HideCurrentPixelOpsJobState());
  }
}
