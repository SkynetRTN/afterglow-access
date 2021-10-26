import { Component, OnInit, OnDestroy, HostBinding, Input, ChangeDetectionStrategy, AfterViewInit } from '@angular/core';
import { Observable, combineLatest, BehaviorSubject, Subscription, Subject, of } from 'rxjs';
import { map, tap, filter, flatMap, takeUntil, distinctUntilChanged, switchMap, withLatestFrom } from 'rxjs/operators';
import { FormGroup, FormControl, Validators, ValidatorFn, ValidationErrors, AbstractControl } from '@angular/forms';
import { JobType } from '../../../jobs/models/job-types';
import { PixelOpsJob, PixelOpsJobResult } from '../../../jobs/models/pixel-ops';
import {
  PixelOpsFormData,
  WorkbenchStateModel,
  WorkbenchTool,
  PixelOpsPanelConfig,
  KernelFilter,
  SIGMA_KERNELS,
  SIZE_KERNELS,
} from '../../models/workbench-state';
import { MatDialog } from '@angular/material/dialog';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { PixelOpsJobsDialogComponent } from '../../components/pixel-ops-jobs-dialog/pixel-ops-jobs-dialog.component';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { WorkbenchState } from '../../workbench.state';
import {
  HideCurrentPixelOpsJobState,
  SetActiveTool,
  CreatePixelOpsJob,
  CreateAdvPixelOpsJob,
  UpdatePixelOpsPageSettings,
} from '../../workbench.actions';
import { JobsState } from '../../../jobs/jobs.state';
import { DataFile, ImageHdu } from '../../../data-files/models/data-file';
import { DataFilesState } from '../../../data-files/data-files.state';
import { isNumber, lessThan, greaterThan } from '../../../utils/validators';
import { Viewer } from '../../models/viewer';

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
export class ImageCalculatorPageComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input('viewerId')
  set viewerId(viewerId: string) {
    this.viewerId$.next(viewerId);
  }
  get viewerId() {
    return this.viewerId$.getValue();
  }
  private viewerId$ = new BehaviorSubject<string>(null);

  @Input('availableHduIds')
  set availableHduIds(hduIds: string[]) {
    this.availableHduIds$.next(hduIds);
  }
  get availableHduIds() {
    return this.availableHduIds$.getValue();
  }
  private availableHduIds$ = new BehaviorSubject<string[]>(null);

  destroy$ = new Subject<boolean>();
  config$: Observable<PixelOpsPanelConfig>;
  selectedHduIds$: Observable<string[]>;
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
      selectedHduIds: new FormControl({value: '', disabled: true}, Validators.required),
      primaryHduIds: new FormControl([]),
      auxHduId: new FormControl('', Validators.required),
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
    selectedHduIds: new FormControl({value: '', disabled: true}, Validators.required),
    primaryHduIds: new FormControl([], Validators.required),
    auxHduIds: new FormControl([]),
    inPlace: new FormControl(false, Validators.required),
  });

  constructor(public dialog: MatDialog, private store: Store, private router: Router) {
    this.config$ = this.store.select(WorkbenchState.getPixelOpsPanelConfig);

    let viewer$ = this.viewerId$.pipe(
      switchMap(viewerId => this.store.select(WorkbenchState.getViewerById(viewerId))
      ))

    this.selectedHduIds$ = viewer$.pipe(
      switchMap(viewer => {
        if(!viewer) return of([]);
        if(viewer.hduId) return of([viewer.hduId])
        return this.store.select(DataFilesState.getFileById(viewer.fileId)).pipe(
          map(file => file.hduIds),
          distinctUntilChanged()
        )
      })
    )

   

    combineLatest([this.selectedHduIds$, this.availableHduIds$]).pipe(takeUntil(this.destroy$), withLatestFrom(this.config$)).subscribe(([[selectedHduIds, availableHduIds], config]) => {
      if (!availableHduIds || !config || !selectedHduIds) return;

      let updateRequired = (a: any[], b: any[]) => {
        return a.length != b.length || a.some(value => !b.includes(value))
      }
      let formData = config.pixelOpsFormData;
      let primaryHduIds = formData.primaryHduIds.filter((hduId) => availableHduIds.includes(hduId) && !selectedHduIds.includes(hduId) );
      let auxHduIds = formData.auxHduIds.filter((hduId) => availableHduIds.includes(hduId) &&  !selectedHduIds.includes(hduId));
      let auxHduId = formData.auxHduId;
      if (!availableHduIds.includes(auxHduId)) {
        auxHduId = null;
      }
      if (
        updateRequired(formData.selectedHduIds,selectedHduIds) ||
        updateRequired(primaryHduIds, formData.primaryHduIds) ||
        updateRequired(auxHduIds, formData.auxHduIds) ||
        auxHduId != formData.auxHduId
      ) {
        setTimeout(() => {
          this.store.dispatch(
            new UpdatePixelOpsPageSettings({
              pixelOpsFormData: {
                ...formData,
                selectedHduIds: selectedHduIds,
                primaryHduIds: primaryHduIds,
                auxHduIds: auxHduIds,
                auxHduId: auxHduId,
              },
            })
          );
        });
      }
    });

    this.pixelOpsFormData$ = this.config$.pipe(
      filter((config) => config !== null),
      map((config) => config.pixelOpsFormData),
      takeUntil(this.destroy$)
    );

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
        new UpdatePixelOpsPageSettings({
          pixelOpsFormData: this.imageCalcForm.value,
        })
      );
      this.store.dispatch(new HideCurrentPixelOpsJobState());
      // }
    });

    this.imageCalcFormAdv.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      // if(this.imageCalcFormAdv.valid) {
      this.store.dispatch(
        new UpdatePixelOpsPageSettings({
          pixelOpsFormData: this.imageCalcFormAdv.value,
        })
      );
      this.store.dispatch(new HideCurrentPixelOpsJobState());
      // }
    });

    let auxHdusVars$ = this.pixelOpsFormData$.pipe(
      map((formData) => formData.auxHduIds),
      switchMap((hduIds) => {
        if (hduIds.length == 0) return of([]);
        return combineLatest(hduIds.map((hduId) => this.getHduOptionLabel(hduId)));
      })
    );

    let primaryHdusVars$ = this.pixelOpsFormData$.pipe(
      map((formData) => formData.primaryHduIds),
      switchMap((hduIds) => {
        if (hduIds.length == 0) return of([]);
        return combineLatest(hduIds.map((hduId) => this.getHduOptionLabel(hduId)));
      })
    );

    this.pixelOpVariables$ = combineLatest([primaryHdusVars$, auxHdusVars$]).pipe(
      map(([primaryHduVars, auxHduVars]) => {
        let dataFiles = this.store.selectSnapshot(DataFilesState.getFileEntities);
        return [
          {
            name: 'aux_img',
            value: auxHduVars.length == 0 ? 'N/A' : auxHduVars[0],
          },
          { name: 'img', value: 'for each image file' },
          ...primaryHduVars.map((value, index) => {
            return {
              name: `imgs[${index}]`,
              value: value,
            };
          }),
          ...auxHduVars.map((value, index) => {
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

    this.currentPixelOpsJob$ = combineLatest([store.select(WorkbenchState.getState), this.pixelOpsJobs$]).pipe(
      filter(
        ([state, jobs]: [WorkbenchStateModel, PixelOpsJob[]]) =>
          state.pixelOpsPanelConfig.currentPixelOpsJobId != null &&
          jobs.find((job) => job.id == state.pixelOpsPanelConfig.currentPixelOpsJobId) != undefined
      ),
      map(([state, rows]) => rows.find((job) => job.id == state.pixelOpsPanelConfig.currentPixelOpsJobId))
    );

    this.showCurrentPixelOpsJobState$ = store
      .select(WorkbenchState.getState)
      .pipe(map((state) => state.pixelOpsPanelConfig.showCurrentPixelOpsJobState));

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
      this.imageCalcForm.get('scalarValue').enable({emitEvent: false});
      this.imageCalcForm.get('auxHduId').disable({emitEvent: false});
      this.imageCalcForm.get('kernelFilter').disable({emitEvent: false});
      this.imageCalcForm.get('kernelSize').disable({emitEvent: false});
      this.imageCalcForm.get('kernelSigma').disable({emitEvent: false});
    } else if (value == 'image') {
      this.imageCalcForm.get('scalarValue').disable({emitEvent: false});
      this.imageCalcForm.get('auxHduId').enable({emitEvent: false});
      this.imageCalcForm.get('kernelFilter').disable({emitEvent: false});
      this.imageCalcForm.get('kernelSize').disable({emitEvent: false});
      this.imageCalcForm.get('kernelSigma').disable({emitEvent: false});
    } else if (value == 'kernel') {
      this.imageCalcForm.get('scalarValue').disable({emitEvent: false});
      this.imageCalcForm.get('auxHduId').disable({emitEvent: false});
      this.imageCalcForm.get('kernelFilter').enable({emitEvent: false});
      if(this.kernelSizeEnabled) {
        this.imageCalcForm.get('kernelSize').enable({emitEvent: false});
      }
      else {
        this.imageCalcForm.get('kernelSize').disable({emitEvent: false});
      }
      
      if(this.kernelSigmaEnabled) {
        this.imageCalcForm.get('kernelSigma').enable({emitEvent: false});
      }
      else {
        this.imageCalcForm.get('kernelSigma').disable({emitEvent: false});
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

  ngOnInit() {}

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
  //   //     allImageFiles$: this.store.select(DataFilesState.getHdus),
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

  setAuxHduIds(hduIds: string[]) {
    this.store.dispatch(
      new UpdatePixelOpsPageSettings({
        pixelOpsFormData: {
          ...this.imageCalcFormAdv.value,
          auxHduIds: hduIds,
        },
      })
    );
  }

  getHduOptionLabel(hduId: string) {
    return this.store.select(DataFilesState.getHduById(hduId)).pipe(
      map((hdu) => hdu?.name),
      distinctUntilChanged()
    );
  }

  onSelectAllPrimaryHdusBtnClick() {
    this.setSelectedPrimaryHduIds(this.availableHduIds);
  }

  onClearPrimaryHdusSelectionBtnClick() {
    this.setSelectedPrimaryHduIds([]);
  }

  setSelectedPrimaryHduIds(hduIds: string[]) {
    this.store.dispatch(
      new UpdatePixelOpsPageSettings({
        pixelOpsFormData: {
          ...this.imageCalcFormAdv.value,
          primaryHduIds: hduIds,
        },
      })
    );
    this.store.dispatch(new HideCurrentPixelOpsJobState());
  }

  onSelectAllAuxHdusBtnClick() {
    this.setSelectedAuxHduIds(this.availableHduIds);
  }

  onClearAuxHdusSelectionBtnClick() {
    this.setSelectedAuxHduIds([]);
  }

  setSelectedAuxHduIds(hduIds: string[]) {
    this.store.dispatch(
      new UpdatePixelOpsPageSettings({
        pixelOpsFormData: {
          ...this.imageCalcFormAdv.value,
          auxHduIds: hduIds,
        },
      })
    );
    this.store.dispatch(new HideCurrentPixelOpsJobState());
  }
}
