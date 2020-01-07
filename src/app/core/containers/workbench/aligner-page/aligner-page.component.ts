import { Component, OnInit, HostBinding, Input } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';

import { map, tap } from "rxjs/operators";
import { ImageFile } from '../../../../data-files/models/data-file';
import { ImageFileState } from '../../../models/image-file-state';
import { DataFileType } from '../../../../data-files/models/data-file-type';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { AlignFormData, WorkbenchTool } from '../../../models/workbench-state';
import { MatSelectChange } from '@angular/material/select';
import { AlignmentJob, AlignmentJobResult } from '../../../../jobs/models/alignment';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { WorkbenchState } from '../../../workbench.state';
import { DataFilesState } from '../../../../data-files/data-files.state';
import { UpdateAlignFormData, SetActiveTool, SetLastRouterPath, SelectDataFile, CreateAlignmentJob } from '../../../workbench.actions';
import { JobsState } from '../../../../jobs/jobs.state';

@Component({
  selector: 'app-aligner-page',
  templateUrl: './aligner-page.component.html',
  styleUrls: ['./aligner-page.component.css']
})
export class AlignerPageComponent implements OnInit {
  @HostBinding('class') @Input('class') classList: string = 'fx-workbench-outlet';
  inFullScreenMode$: Observable<boolean>;
  fullScreenPanel$: Observable<'file' | 'viewer' | 'tool'>;
  activeImageFile$: Observable<ImageFile>;
  activeImageFileState$: Observable<ImageFileState>;
  showConfig$: Observable<boolean>;
  allImageFiles$: Observable<Array<ImageFile>>;
  selectedImageFiles$: Observable<Array<ImageFile>>;
  alignFormData$: Observable<AlignFormData>;
  activeImageIsSelected$: Observable<boolean>;
  activeImageHasWcs$: Observable<boolean>;
  alignmentJobRow$: Observable<{job: AlignmentJob, result: AlignmentJobResult}>;

  alignForm = new FormGroup({
    selectedImageFileIds: new FormControl([], Validators.required),
    mode: new FormControl('', Validators.required),
    inPlace: new FormControl(false, Validators.required)
  });

  constructor(private store: Store, router: Router) {
    this.fullScreenPanel$ = this.store.select(WorkbenchState.getFullScreenPanel);
    this.inFullScreenMode$ = this.store.select(WorkbenchState.getInFullScreenMode);
    this.activeImageFile$ = store.select(WorkbenchState.getActiveImageFile);
    this.activeImageFileState$ = store.select(WorkbenchState.getActiveImageFileState);
    this.showConfig$ = store.select(WorkbenchState.getShowConfig);
    

    this.allImageFiles$ = store.select(DataFilesState.getDataFiles)
    .pipe(
      map(
        files =>
          files.filter(file => file.type == DataFileType.IMAGE) as Array<
            ImageFile
          >
      )
    );

    

    this.alignFormData$ = store.select(WorkbenchState.getState).pipe(
      map(state => state.alignFormData),
      tap(data => {
        this.alignForm.patchValue(data, {emitEvent: false});
      })
    );

    this.alignFormData$.subscribe();



    this.selectedImageFiles$ = combineLatest(this.allImageFiles$, this.alignFormData$).pipe(
      map(([allImageFiles, alignFormData]) => alignFormData.selectedImageFileIds.map(id => allImageFiles.find(f => f.id == id)))
    )

    this.alignForm.valueChanges.subscribe(value => {
      // if(this.imageCalcForm.valid) {
        this.store.dispatch(new UpdateAlignFormData(this.alignForm.value));
      // }
    })

    this.activeImageIsSelected$ = combineLatest(this.activeImageFile$, this.selectedImageFiles$).pipe(
      map(([activeImageFile, selectedImageFiles]) => {
        return selectedImageFiles.find(f => f.id == activeImageFile.id) != undefined;
      })
    )

    this.activeImageHasWcs$ = this.activeImageFile$.pipe(
      map(imageFile => imageFile != null && imageFile.headerLoaded && imageFile.wcs.isValid())
    )

    this.alignmentJobRow$ = combineLatest(store.select(WorkbenchState.getState), store.select(JobsState.getJobs)).pipe(
      map(([state, jobRowLookup]) => {
        if(!state.currentAlignmentJobId || !jobRowLookup[state.currentAlignmentJobId]) return null;
        return jobRowLookup[state.currentAlignmentJobId] as {job: AlignmentJob, result: AlignmentJobResult};
      })
      
    )

    this.store.dispatch(
      new SetActiveTool(WorkbenchTool.ALIGNER)
    );

    this.store.dispatch(
      new SetLastRouterPath(router.url)
    )


  }

  ngOnInit() {
  }

  ngOnDestroy() {
    
  }

  onActiveImageChange($event: MatSelectChange) {
    this.store.dispatch(new SelectDataFile($event.value));
  }
  
  selectImageFiles(imageFiles: ImageFile[]) {
    this.store.dispatch(new UpdateAlignFormData(
      {
      ...this.alignForm.value,
      selectedImageFileIds: imageFiles.map(f => f.id)
    }));
  }

  submit(data: AlignFormData) {
    this.store.dispatch(new CreateAlignmentJob())
  }
}
