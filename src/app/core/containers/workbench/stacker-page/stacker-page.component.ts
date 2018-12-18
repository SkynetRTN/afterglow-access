import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { ImageFile } from '../../../../data-files/models/data-file';
import { ImageFileState } from '../../../models/image-file-state';
import { Store } from '@ngrx/store';

import * as fromRoot from '../../../../reducers';
import * as fromDataFiles from '../../../../data-files/reducers';
import * as fromCore from '../../../reducers';

import * as workbenchActions from '../../../actions/workbench';

@Component({
  selector: 'app-stacker-page',
  templateUrl: './stacker-page.component.html',
  styleUrls: ['./stacker-page.component.css']
})
export class StackerPageComponent implements OnInit {
  activeImageFile$: Observable<ImageFile>;
  activeImageFileState$: Observable<ImageFileState>;
  showConfig$: Observable<boolean>;

  constructor(private store: Store<fromRoot.State>) {
    this.activeImageFile$ = store.select(fromCore.workbench.getActiveFile)
    this.activeImageFileState$ = store.select(fromCore.workbench.getActiveFileState);
    this.showConfig$ = store.select(fromCore.workbench.getShowConfig);
  }

  ngOnInit() {
    this.store.dispatch(new workbenchActions.EnableMultiFileSelection());
  }

  ngOnDestroy() {
    
  }

}
