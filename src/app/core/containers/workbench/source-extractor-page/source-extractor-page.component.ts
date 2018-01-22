import { Component, AfterViewInit, ViewChild, OnDestroy, OnChanges} from '@angular/core';

import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import { ITdDataTableColumn, ITdDataTableSelectEvent, ITdDataTableSelectAllEvent } from '@covalent/core';
import {VgAPI} from 'videogular2/core';
import { Store } from '@ngrx/store';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import 'rxjs/add/observable/combineLatest';
import 'rxjs/add/operator/do';

import * as fromRoot from '../../../../reducers';
import * as fromDataFiles from '../../../../data-files/reducers';
import * as fromCore from '../../../reducers';
import * as fromWorkbench from '../../../reducers/workbench'
import * as fromSourceExtractor from '../../../reducers/source-extractor';
import * as workbenchActions from '../../../actions/workbench';
import * as sourceExtractorActions from '../../../actions/source-extractor';
import * as dataFileActions from '../../../../data-files/actions/data-file';
import * as imageFileActions from '../../../../data-files/actions/image-file';

import { ViewerFileState } from '../../../models/viewer-file-state';
import { calcLevels } from '../../../../data-files/models/image-hist';
import { ImageFile } from '../../../../data-files/models/data-file';
import { DmsPipe } from '../../../../pipes/dms.pipe'
import { SourceExtractorFileState, SourceExtractorRegionOption } from '../../../models/source-extractor-file-state';
import { SourceExtractorModeOption } from '../../../models/source-extractor-mode-option';
import { PhotSettingsDialogComponent } from '../../../components/phot-settings-dialog/phot-settings-dialog.component';
import { SourceExtractionSettingsDialogComponent } from '../../../components/source-extraction-settings-dialog/source-extraction-settings-dialog.component';
import { ViewportChangeEvent, ViewerMouseEvent } from '../../../components/pan-zoom-viewer/pan-zoom-viewer.component';
import { Source } from '../../../models/source';
import { Region } from '../../../models/region';


@Component({
  selector: 'app-source-extractor-page',
  templateUrl: './source-extractor-page.component.html',
  styleUrls: ['./source-extractor-page.component.css']
})
export class SourceExtractorPageComponent implements AfterViewInit, OnDestroy, OnChanges {
  imageFile$: Observable<ImageFile>;
  viewerState$: Observable<ViewerFileState>;
  sourceExtractorState$: Observable<SourceExtractorFileState>;
  sourceExtractorGlobalState$: Observable<fromSourceExtractor.State>;
  region$: Observable<Region> = null;
  filteredSources$: Observable<Source[]>;
  selectedSources$: Observable<Source[]>;
  selectedSources: Array<Source> = [];
  lastImageFile: ImageFile;
  lastViewerState: ViewerFileState;
  lastSourceExtractorState: SourceExtractorFileState;
  lastSourceExtractorGlobalState: fromSourceExtractor.State;
  lastWorkbenchState: fromWorkbench.State;
  SourceExtractorModeOption = SourceExtractorModeOption;
  subs: Subscription[] = [];

  pixelCoordView: string = 'pixel';
  NUMBER_FORMAT: (v: any) => any = (v: number) => v ? v : 'N/A';
  DECIMAL_FORMAT: (v: any) => any = (v: number) => v ? v.toFixed(2) : 'N/A';
  SEXAGESIMAL_FORMAT: (v: any) => any = (v: number) => v ? this.dmsPipe.transform(v) : 'N/A';

  private regionOptions = [
    {label: "Entire Image",  value: SourceExtractorRegionOption.ENTIRE_IMAGE},
    {label: "Current View",  value: SourceExtractorRegionOption.VIEWPORT},
    {label: "Sonification Region",  value: SourceExtractorRegionOption.SONIFIER_REGION}
  ];

      

  constructor(private store: Store<fromRoot.State>, public dialog: MatDialog, private dmsPipe: DmsPipe) {
    this.imageFile$ = store.select(fromCore.workbench.getImageFile);
    this.viewerState$ = store.select(fromCore.workbench.getViewerFileState);
    this.sourceExtractorState$ = store.select(fromCore.workbench.getSourceExtractorFileState);
    this.sourceExtractorGlobalState$ = store.select(fromCore.getSourceExtractorGlobalState);

    this.filteredSources$ = this.sourceExtractorState$
    .distinctUntilChanged((a,b) => {
      return a && b && a.region == b.region && a.sources == b.sources;
    })
    .debounceTime(200)
    .map(state => {
      if(!state) return [];
      return state.sources;
      // return state.sources.filter(source => {
      //   return source.x >= state.region.x && source.x < (state.region.x + state.region.width) &&
      //   source.y >= state.region.y && source.y < (state.region.y + state.region.height);
      // })
    })

    this.selectedSources$ = this.sourceExtractorState$
    .distinctUntilChanged((a,b) => {
      return a && b && a.selectedSourceIds == b.selectedSourceIds;
    })
    .map(state => {
      if(!state) return [];
      return state.sources.filter(source => state.selectedSourceIds.indexOf(source.id) != -1)
    })

    this.region$ = this.sourceExtractorState$
    .distinctUntilChanged((a,b) => {
      return a && b && a.region == b.region;
    })
    .map(state => {
      if(!state) return null;
      return state.region;
    })


    
    this.subs.push(this.imageFile$.subscribe(imageFile => this.lastImageFile = imageFile));
    this.subs.push(this.viewerState$.subscribe(viewerState => this.lastViewerState = viewerState));
    this.subs.push(this.sourceExtractorState$.subscribe(sourceExtractorState => this.lastSourceExtractorState = sourceExtractorState));
    this.subs.push(this.sourceExtractorGlobalState$.subscribe(sourceExtractorGlobalState => this.lastSourceExtractorGlobalState = sourceExtractorGlobalState));
  }

    

  ngAfterViewInit() {
  }

  ngOnDestroy() {
    this.subs.forEach(sub => sub.unsubscribe());
  }

  ngOnChanges() {
    
  }
  
  setModeOption(value) {
    this.store.dispatch(new sourceExtractorActions.SetSourceExtractionMode({mode: value}));
  }

  setRegionOption(value) {
    this.store.dispatch(new sourceExtractorActions.UpdateFileState({file: this.lastImageFile, changes: {regionOption: value}}));
  }

  onViewportChange($event: ViewportChangeEvent) {
    this.store.dispatch(new sourceExtractorActions.UpdateViewport({
      file: this.lastImageFile,
      viewport: {
        imageX: $event.imageX,
        imageY: $event.imageY,
        imageWidth: $event.imageWidth,
        imageHeight: $event.imageHeight,
        viewportWidth: $event.viewportWidth,
        viewportHeight: $event.viewportHeight
      }}))
  }

  openPhotSettings() {
    let dialogRef = this.dialog.open(PhotSettingsDialogComponent, {
      width: '600px',
      data: {...this.lastSourceExtractorGlobalState.photSettings}
    });

    dialogRef.afterClosed().subscribe(result => {
      if(result) {
        this.store.dispatch(new sourceExtractorActions.UpdatePhotSettings({changes: result}));
      }
    });
  }

  openSourceExtractionSettings() {
    let dialogRef = this.dialog.open(SourceExtractionSettingsDialogComponent, {
      width: '500px',
      data: {...this.lastSourceExtractorGlobalState.sourceExtractionSettings}
    });

    dialogRef.afterClosed().subscribe(result => {
      if(result) {
        this.store.dispatch(new sourceExtractorActions.UpdateSourceExtractionSettings({changes: result}));
      }
    });
  }



  onSelectedRowChanges($event: ITdDataTableSelectEvent) {
    if($event.selected) {
      this.selectSources([$event.row])
    }
    else {
      this.deselectSources([$event.row]);
    }
  }

  onSelectAllRows($event: ITdDataTableSelectAllEvent) {
    if($event.selected) {
      this.selectSources($event.rows);
    }
    else {
      this.deselectSources($event.rows);
    }
   
  }

  selectSources(sources: Source[]) {
    this.store.dispatch(new sourceExtractorActions.SelectSources({file: this.lastImageFile, sources: sources}));
  }

  deselectSources(sources: Source[]) {
    this.store.dispatch(new sourceExtractorActions.DeselectSources({file: this.lastImageFile, sources: sources}));
  }

  findSources() {
    this.store.dispatch(new sourceExtractorActions.ExtractSources({file: this.lastImageFile}));
  }

  onImageClick($event: ViewerMouseEvent) {
    if($event.source) {
      let sourceSelected = this.lastSourceExtractorState.selectedSourceIds.indexOf($event.source.id) != -1;
      if($event.mouseEvent.ctrlKey) {
        if(!sourceSelected) {
          // select the source
          this.selectSources([$event.source]);
        }
        else {
          // deselect the source
          this.deselectSources([$event.source]);
        }
      }
      else {
        this.store.dispatch(new sourceExtractorActions.SetSourceSelection({file: this.lastImageFile, sources: [$event.source]}));
      }
      
    }
    else if($event.hitImage) {
      

      if(this.lastSourceExtractorGlobalState.sourceExtractorModeOption == SourceExtractorModeOption.MOUSE && this.lastSourceExtractorState.selectedSourceIds.length == 0) {
        let x = $event.imageX;
        let y = $event.imageY;
        this.store.dispatch(new sourceExtractorActions.PhotometerXYSources({file: this.lastImageFile, coords: [{x: x, y: y}]}));
      }

      this.store.dispatch(new sourceExtractorActions.SetSourceSelection({file: this.lastImageFile, sources: []}));
      
    }
    
  }

  removeAllSources() {
    this.store.dispatch(new sourceExtractorActions.RemoveAllSources({file: this.lastImageFile}))
  }

  removeSelectedSources() {
    this.store.dispatch(new sourceExtractorActions.RemoveSelectedSources({file: this.lastImageFile}))
  }

  

}

