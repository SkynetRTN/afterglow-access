import { Component, OnInit, HostBinding, Input } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map, tap } from "rxjs/operators";
import { ImageFile } from '../../../../data-files/models/data-file';
import { WorkbenchFileState } from '../../../models/workbench-file-state';
import { DataFileType } from '../../../../data-files/models/data-file-type';
import { StackFormData, WorkbenchTool } from '../../../models/workbench-state';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { StackingJob, StackingJobResult } from '../../../../jobs/models/stacking';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { WorkbenchState } from '../../../workbench.state';
import { DataFilesState } from '../../../../data-files/data-files.state';
import { JobsState } from '../../../../jobs/jobs.state';
import { SetActiveTool, CreateStackingJob, UpdateStackingPageSettings } from '../../../workbench.actions';
import { WorkbenchPageBaseComponent } from '../workbench-page-base/workbench-page-base.component';

@Component({
  selector: 'app-stacker-page',
  templateUrl: './stacker-page.component.html',
  styleUrls: ['./stacker-page.component.css']
})
export class StackerPageComponent extends WorkbenchPageBaseComponent implements OnInit {
  @HostBinding('class') @Input('class') classList: string = 'fx-workbench-outlet';
  selectedImageFiles$: Observable<Array<ImageFile>>;
  stackFormData$: Observable<StackFormData>;
  stackJobRow$: Observable<{ job: StackingJob, result: StackingJobResult }>;

  stackForm = new FormGroup({
    selectedImageFileIds: new FormControl([], Validators.required),
    mode: new FormControl('average', Validators.required),
    scaling: new FormControl('none', Validators.required),
    rejection: new FormControl('none', Validators.required),
    percentile: new FormControl(50),
    low: new FormControl(''),
    high: new FormControl(''),
  });

  constructor(store: Store, router: Router) {
    super(store, router);
    this.stackForm.get('mode').valueChanges.subscribe(value => {
      if (value == 'percentile') {
        this.stackForm.get('percentile').enable();
      } else {
        this.stackForm.get('percentile').disable();
      }
    });

    this.stackForm.get('rejection').valueChanges.subscribe(value => {
      if (['iraf', 'minmax', 'sigclip'].includes(value)) {
        this.stackForm.get('high').enable();
        this.stackForm.get('low').enable();
      } else {
        this.stackForm.get('high').disable();
        this.stackForm.get('low').disable();
      }
    });

    this.stackFormData$ = store.select(WorkbenchState.getState).pipe(
      map(state => state.stackingPageSettings.stackFormData),
      tap(data => {
        // console.log("patching values: ", data.selectedImageFileIds)
        this.stackForm.patchValue(data, { emitEvent: false });
      })
    );

    this.stackFormData$.subscribe();

    this.selectedImageFiles$ = combineLatest(this.allImageFiles$, this.stackFormData$).pipe(
      map(([allImageFiles, data]) => data.selectedImageFileIds.map(id => allImageFiles.find(f => f.id == id)))
    )

    this.stackJobRow$ = combineLatest(store.select(WorkbenchState.getState), store.select(JobsState.getEntities)).pipe(
      map(([state, jobRowLookup]) => {
        if (!state.stackingPageSettings.currentStackingJobId || !jobRowLookup[state.stackingPageSettings.currentStackingJobId]) return null;
        return jobRowLookup[state.stackingPageSettings.currentStackingJobId] as { job: StackingJob, result: StackingJobResult };
      })

    )


    this.stackForm.valueChanges.subscribe(value => {
      // if(this.imageCalcForm.valid) {
      this.store.dispatch(new UpdateStackingPageSettings({ stackFormData: this.stackForm.value }));
      // }
    })


  }

  selectImageFiles(imageFiles: ImageFile[]) {
    this.store.dispatch(new UpdateStackingPageSettings({
      stackFormData: {
        ...this.stackForm.value,
        selectedImageFileIds: imageFiles.map(f => f.id)
      }
    }));
  }

  submit(data: StackFormData) {
    this.store.dispatch(new CreateStackingJob());
  }

  ngOnInit() {
  }

  ngOnDestroy() {

  }

}
