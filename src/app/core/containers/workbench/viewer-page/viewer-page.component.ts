import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, Input,
  ChangeDetectionStrategy } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Store } from '@ngrx/store';

declare let d3: any;

import { Subscription } from 'rxjs/Subscription';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/distinctUntilChanged';

import { calcLevels } from '../../../../data-files/models/image-hist';
import { ImageFile } from '../../../../data-files/models/data-file';

import { ViewerFileState } from '../../../models/viewer-file-state';
import { ColorMap } from '../../../models/color-map';
import { StretchMode } from '../../../models/stretch-mode';

import * as fromCore from '../../../reducers';
import * as fromRoot from '../../../../reducers';
import * as fromDataFiles from '../../../../data-files/reducers';
import * as workbenchActions from '../../../actions/workbench';
import * as viewerActions from '../../../actions/viewer';
import * as dataFileActions from '../../../../data-files/actions/data-file';
import * as imageFileActions from '../../../../data-files/actions/image-file';


// import { DataFile, ImageFile } from '../../../models'
// import { DataFileLibraryStore } from '../../../stores/data-file-library.store'
// import { ImageViewerComponent } from '../../../components/image-viewer/image-viewer.component'

@Component({
  selector: 'app-viewer-page',
  templateUrl: './viewer-page.component.html',
  styleUrls: ['./viewer-page.component.css'],
  //changeDetection: ChangeDetectionStrategy.OnPush
})
export class ViewerPageComponent implements OnInit, AfterViewInit, OnDestroy {
  imageFile$: Observable<ImageFile>;
  viewerState$: Observable<ViewerFileState>;
  showConfig$: Observable<boolean>;
  lastImageFile: ImageFile;
  lastViewerState: ViewerFileState;
  subs: Subscription[] = [];

  levels$: Subject<{background: number, peak: number}> = new Subject<{background: number, peak: number}>();
  backgroundLevel$: Subject<number> = new Subject<number>();
  peakLevel$: Subject<number> = new Subject<number>();
  
  constructor(private store: Store<fromRoot.State>) {
    this.imageFile$ = store.select(fromCore.workbench.getImageFile)
    this.viewerState$ = store.select(fromCore.workbench.getViewerFileState);
    this.showConfig$ = store.select(fromCore.workbench.getShowConfig);
    
    this.subs.push(this.imageFile$.subscribe(imageFile => {
      this.lastImageFile = imageFile;
    }));

    this.subs.push(this.viewerState$.subscribe(viewerState => {
      this.lastViewerState = viewerState;
    }));

    this.levels$
    .debounceTime(50) // wait 300ms after the last event before emitting last event
    .subscribe(value => {
      this.store.dispatch(new viewerActions.UpdateNormalizer({file: this.lastImageFile, changes: {backgroundLevel: value.background, peakLevel: value.peak}}) );
    });


    this.backgroundLevel$
    .debounceTime(50) // wait 300ms after the last event before emitting last event
    .subscribe(value => {
      this.store.dispatch(new viewerActions.UpdateNormalizer({file: this.lastImageFile, changes: {backgroundLevel: value}}) );
    });

    this.peakLevel$
    .debounceTime(50) // wait 300ms after the last event before emitting last event
    .subscribe(value => {
      this.store.dispatch(new viewerActions.UpdateNormalizer({file: this.lastImageFile, changes: {peakLevel: value}}) );
    });
  }

  onBackgroundLevelChange(value: number) {
    this.backgroundLevel$.next(value);
  }

  onPeakLevelChange(value: number) {
    this.peakLevel$.next(value);
  }

  onColorMapChange(value: ColorMap) {
    this.store.dispatch(new viewerActions.UpdateNormalizer({file: this.lastImageFile, changes: {colorMap: value}}) )
  }

  onStretchModeChange(value: StretchMode) {
    this.store.dispatch(new viewerActions.UpdateNormalizer({file: this.lastImageFile, changes: {stretchMode: value}}) )
  }

  onMinMaxClick() {
    let result = calcLevels(this.lastImageFile.hist, 10.0, 99.9999)
    this.store.dispatch(new viewerActions.UpdateNormalizer({file: this.lastImageFile, changes: {backgroundLevel: result.backgroundLevel, peakLevel: result.peakLevel}}) );
  }

  onZScaleClick() {
    let result = calcLevels(this.lastImageFile.hist, 10.0, 99.0);
    this.store.dispatch(new viewerActions.UpdateNormalizer({file: this.lastImageFile, changes: {backgroundLevel: result.backgroundLevel, peakLevel: result.peakLevel}}) );
  }

  onInvertClick() {
    this.store.dispatch(new viewerActions.UpdateNormalizer({file: this.lastImageFile, changes: {
      backgroundLevel: this.lastViewerState.normalizer.peakLevel,
      peakLevel: this.lastViewerState.normalizer.backgroundLevel
    }}) );
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    this.subs.forEach(sub => sub.unsubscribe());
  }

  ngAfterViewInit() {
   
  }
}
