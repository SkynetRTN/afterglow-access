import { Component, OnInit, HostBinding, Input } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map, tap } from "rxjs/operators";
import { ImageFile } from '../../../../data-files/models/data-file';
import { ImageFileState } from '../../../models/image-file-state';
import { Store } from '@ngrx/store';

import * as fromRoot from '../../../../reducers';
import * as fromDataFiles from '../../../../data-files/reducers';
import * as fromCore from '../../../reducers';
import * as fromJobs from '../../../../jobs/reducers';

import * as workbenchActions from '../../../actions/workbench';
import { DataFileType } from '../../../../data-files/models/data-file-type';
import { StackFormData, WorkbenchTool } from '../../../models/workbench-state';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { StackingJob, StackingJobResult } from '../../../../jobs/models/stacking';
import { Router } from '@angular/router';

@Component({
  selector: 'app-stacker-page',
  templateUrl: './stacker-page.component.html',
  styleUrls: ['./stacker-page.component.css']
})
export class StackerPageComponent implements OnInit {
  @HostBinding('class') @Input('class') classList: string = 'fx-workbench-outlet';
  inFullScreenMode$: Observable<boolean>;
  fullScreenPanel$: Observable<'file' | 'viewer' | 'tool'>;
  activeImageFile$: Observable<ImageFile>;
  activeImageFileState$: Observable<ImageFileState>;
  allImageFiles$: Observable<Array<ImageFile>>;
  selectedImageFiles$: Observable<Array<ImageFile>>;
  stackFormData$: Observable<StackFormData>;
  showConfig$: Observable<boolean>;
  stackJobRow$: Observable<{job: StackingJob, result: StackingJobResult}>;

  stackForm = new FormGroup({
    selectedImageFileIds: new FormControl([], Validators.required),
    mode: new FormControl('average', Validators.required),
    scaling: new FormControl('none', Validators.required),
    rejection: new FormControl('none', Validators.required),
    percentile: new FormControl(50),
    low: new FormControl(''),
    high: new FormControl(''),
  });

  constructor(private store: Store<fromRoot.State>, router: Router) {
    this.fullScreenPanel$ = this.store.select(fromCore.workbench.getFullScreenPanel);
    this.inFullScreenMode$ = this.store.select(fromCore.workbench.getInFullScreenMode);
    this.activeImageFile$ = store.select(fromCore.workbench.getActiveFile)
    this.activeImageFileState$ = store.select(fromCore.workbench.getActiveFileState);
    this.showConfig$ = store.select(fromCore.workbench.getShowConfig);

    

    this.allImageFiles$ = store.select(fromDataFiles.getAllDataFiles)
    .pipe(
      map(
        files =>
          files.filter(file => file.type == DataFileType.IMAGE) as Array<
            ImageFile
          >
      )
    );

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

    this.stackFormData$ = store.select(fromCore.getWorkbenchState).pipe(
      map(state => state.stackFormData),
      tap(data => {
        console.log("patching values: ", data.selectedImageFileIds)
        this.stackForm.patchValue(data, {emitEvent: false});
      })
    );

    this.stackFormData$.subscribe();

    this.selectedImageFiles$ = combineLatest(this.allImageFiles$, this.stackFormData$).pipe(
      map(([allImageFiles, data]) => data.selectedImageFileIds.map(id => allImageFiles.find(f => f.id == id)))
    )

    this.stackJobRow$ = combineLatest(store.select(fromCore.getWorkbenchState), store.select(fromJobs.getJobs)).pipe(
      map(([state, jobRowLookup]) => {
        if(!state.currentStackingJobId || !jobRowLookup[state.currentStackingJobId]) return null;
        return jobRowLookup[state.currentStackingJobId] as {job: StackingJob, result: StackingJobResult};
      })
      
    )


    this.stackForm.valueChanges.subscribe(value => {
      // if(this.imageCalcForm.valid) {
        this.store.dispatch(new workbenchActions.UpdateStackFormData({data: this.stackForm.value}));
      // }
    })

    this.store.dispatch(
      new workbenchActions.SetActiveTool({ tool: WorkbenchTool.STACKER })
    );

    this.store.dispatch(
      new workbenchActions.SetLastRouterPath({path: router.url})
    )


  }

  selectImageFiles(imageFiles: ImageFile[]) {
    this.store.dispatch(new workbenchActions.UpdateStackFormData({data: {
      ...this.stackForm.value,
      selectedImageFileIds: imageFiles.map(f => f.id)
    }}));
  }

  submit(data: StackFormData) {
    this.store.dispatch(new workbenchActions.CreateStackingJob());
  }

  ngOnInit() {
    this.store.dispatch(new workbenchActions.DisableMultiFileSelection());
  }

  ngOnDestroy() {
    
  }

}
