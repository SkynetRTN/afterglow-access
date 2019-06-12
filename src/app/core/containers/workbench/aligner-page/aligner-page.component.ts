import { Component, OnInit, HostBinding, Input } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';

import { map, tap } from "rxjs/operators";
import { ImageFile, getHasWcs } from '../../../../data-files/models/data-file';
import { ImageFileState } from '../../../models/image-file-state';
import { Store } from '@ngrx/store';

import * as fromRoot from '../../../../reducers';
import * as fromDataFiles from '../../../../data-files/reducers';
import * as fromCore from '../../../reducers';
import * as fromJobs from '../../../../jobs/reducers';

import * as workbenchActions from '../../../actions/workbench';
import { DataFileType } from '../../../../data-files/models/data-file-type';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { AlignFormData } from '../../../models/workbench-state';
import { MatSelectChange } from '@angular/material';
import { AlignmentJob, AlignmentJobResult } from '../../../../jobs/models/alignment';

@Component({
  selector: 'app-aligner-page',
  templateUrl: './aligner-page.component.html',
  styleUrls: ['./aligner-page.component.css']
})
export class AlignerPageComponent implements OnInit {
  @HostBinding('class') @Input('class') classList: string = 'fx-workbench-outlet';
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

  constructor(private store: Store<fromRoot.State>) {
    this.activeImageFile$ = store.select(fromCore.workbench.getActiveFile);
    
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

    

    this.alignFormData$ = store.select(fromCore.getWorkbenchState).pipe(
      map(state => state.alignFormData),
      tap(data => {
        this.alignForm.patchValue(data, {emitEvent: false});
      })
    );



    this.selectedImageFiles$ = combineLatest(this.allImageFiles$, this.alignFormData$).pipe(
      map(([allImageFiles, alignFormData]) => alignFormData.selectedImageFileIds.map(id => allImageFiles.find(f => f.id == id)))
    )

    this.alignForm.valueChanges.subscribe(value => {
      // if(this.imageCalcForm.valid) {
        this.store.dispatch(new workbenchActions.UpdateAlignFormData({data: this.alignForm.value}));
      // }
    })

    this.activeImageIsSelected$ = combineLatest(this.activeImageFile$, this.selectedImageFiles$).pipe(
      map(([activeImageFile, selectedImageFiles]) => {
        return selectedImageFiles.find(f => f.id == activeImageFile.id) != undefined;
      })
    )

    this.activeImageHasWcs$ = this.activeImageFile$.pipe(
      map(imageFile => imageFile != null && imageFile.headerLoaded && getHasWcs(imageFile))
    )

    this.alignmentJobRow$ = combineLatest(store.select(fromCore.getWorkbenchState), store.select(fromJobs.getJobs)).pipe(
      map(([state, jobRowLookup]) => {
        if(!state.currentAlignmentJobId || !jobRowLookup[state.currentAlignmentJobId]) return null;
        return jobRowLookup[state.currentAlignmentJobId] as {job: AlignmentJob, result: AlignmentJobResult};
      })
      
    )


  }

  ngOnInit() {
    this.store.dispatch(new workbenchActions.DisableMultiFileSelection());
  }

  ngOnDestroy() {
    
  }

  onActiveImageChange($event: MatSelectChange) {
    this.store.dispatch(new workbenchActions.SelectDataFile({fileId: $event.value}));
  }
  
  selectImageFiles(imageFiles: ImageFile[]) {
    this.store.dispatch(new workbenchActions.UpdateAlignFormData({data: {
      ...this.alignForm.value,
      selectedImageFileIds: imageFiles.map(f => f.id)
    }}));
  }

  submit(data: AlignFormData) {
    this.store.dispatch(new workbenchActions.CreateAlignmentJob())
  }
}
