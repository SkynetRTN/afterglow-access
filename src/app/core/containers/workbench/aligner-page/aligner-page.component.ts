import { Component, OnInit, HostBinding, Input } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';

import { map, tap } from "rxjs/operators";
import { ImageFile } from '../../../../data-files/models/data-file';
import { WorkbenchFileState } from '../../../models/workbench-file-state';
import { DataFileType } from '../../../../data-files/models/data-file-type';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { AlignFormData, WorkbenchTool } from '../../../models/workbench-state';
import { MatSelectChange } from '@angular/material/select';
import { AlignmentJob, AlignmentJobResult } from '../../../../jobs/models/alignment';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { WorkbenchState } from '../../../workbench.state';
import { DataFilesState } from '../../../../data-files/data-files.state';
import { SetActiveTool, SelectDataFile, CreateAlignmentJob, UpdateAligningPageSettings } from '../../../workbench.actions';
import { JobsState } from '../../../../jobs/jobs.state';
import { WorkbenchPageBaseComponent } from '../workbench-page-base/workbench-page-base.component';

@Component({
  selector: 'app-aligner-page',
  templateUrl: './aligner-page.component.html',
  styleUrls: ['./aligner-page.component.css']
})
export class AlignerPageComponent extends WorkbenchPageBaseComponent implements OnInit {
  @HostBinding('class') @Input('class') classList: string = 'fx-workbench-outlet';
  selectedImageFiles$: Observable<Array<ImageFile>>;
  alignFormData$: Observable<AlignFormData>;
  activeImageIsSelected$: Observable<boolean>;
  activeImageHasWcs$: Observable<boolean>;
  alignmentJobRow$: Observable<{ job: AlignmentJob, result: AlignmentJobResult }>;

  alignForm = new FormGroup({
    selectedImageFileIds: new FormControl([], Validators.required),
    mode: new FormControl('', Validators.required),
    inPlace: new FormControl(false, Validators.required)
  });

  constructor(store: Store, router: Router) {
    super(store, router);
    this.alignFormData$ = store.select(WorkbenchState.getState).pipe(
      map(state => state.aligningPageSettings.alignFormData),
      tap(data => {
        this.alignForm.patchValue(data, { emitEvent: false });
      })
    );

    this.alignFormData$.subscribe();



    this.selectedImageFiles$ = combineLatest(this.allImageFiles$, this.alignFormData$).pipe(
      map(([allImageFiles, alignFormData]) => alignFormData.selectedImageFileIds.map(id => allImageFiles.find(f => f.id == id)))
    )

    this.alignForm.valueChanges.subscribe(value => {
      // if(this.imageCalcForm.valid) {
      this.store.dispatch(new UpdateAligningPageSettings({ alignFormData: this.alignForm.value }));
      // }
    })

    this.activeImageIsSelected$ = combineLatest(this.activeImageFile$, this.selectedImageFiles$).pipe(
      map(([activeImageFile, selectedImageFiles]) => {
        return selectedImageFiles.find(f => activeImageFile && f.id == activeImageFile.id) != undefined;
      })
    )

    this.activeImageHasWcs$ = this.activeImageFile$.pipe(
      map(imageFile => imageFile != null && imageFile.headerLoaded && imageFile.wcs.isValid())
    )

    this.alignmentJobRow$ = combineLatest(store.select(WorkbenchState.getState), store.select(JobsState.getEntities)).pipe(
      map(([state, jobRowLookup]) => {
        if (!state.aligningPageSettings.currentAlignmentJobId || !jobRowLookup[state.aligningPageSettings.currentAlignmentJobId]) return null;
        return jobRowLookup[state.aligningPageSettings.currentAlignmentJobId] as { job: AlignmentJob, result: AlignmentJobResult };
      })

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
    this.store.dispatch(new UpdateAligningPageSettings(
      {
        alignFormData: {
          ...this.alignForm.value,
          selectedImageFileIds: imageFiles.map(f => f.id)
        }
      }));
  }

  submit(data: AlignFormData) {
    this.store.dispatch(new CreateAlignmentJob())
  }
}
