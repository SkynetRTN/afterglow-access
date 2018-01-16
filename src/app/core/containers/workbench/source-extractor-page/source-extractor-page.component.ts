import { Component, AfterViewInit, ViewChild, OnDestroy, OnChanges} from '@angular/core';

import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import { ITdDataTableColumn, ITdDataTableSelectEvent, ITdDataTableSelectAllEvent } from '@covalent/core';
import {VgAPI} from 'videogular2/core';
import { Store } from '@ngrx/store';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/combineLatest';
import { Subscription } from 'rxjs/Subscription';
import 'rxjs/add/operator/do';

import * as fromRoot from '../../../../reducers';
import * as fromDataFiles from '../../../../data-files/reducers';
import * as dataFileActions from '../../../../data-files/actions/data-file';
import * as imageFileActions from '../../../../data-files/actions/image-file';
import { calcLevels } from '../../../../data-files/models/image-hist';
import { ImageFile } from '../../../../data-files/models/data-file';
import { DmsPipe } from '../../../../pipes/dms.pipe'

import * as fromCore from '../../../reducers';
import * as fromWorkbench from '../../../reducers/workbench'
import * as workbenchActions from '../../../actions/workbench';
import { ViewerFileState } from '../../../models/viewer-file-state';
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
  workbenchState$: Observable<fromWorkbench.State>;
  imageFile$: Observable<ImageFile>;
  viewerState$: Observable<ViewerFileState>;
  sourceExtractorState$: Observable<SourceExtractorFileState>;
  region$: Observable<Region> = null;
  filteredSources$: Observable<Source[]>;
  selectedSources$: Observable<Source[]>;
  selectedSources: Array<Source> = [];
  lastImageFile: ImageFile;
  lastViewerState: ViewerFileState;
  lastSourceExtractorState: SourceExtractorFileState;
  lastWorkbenchState: fromWorkbench.State;
  stateSub: Subscription;
  SourceExtractorModeOption = SourceExtractorModeOption;

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
    let selectedFileWorkspaceState$ = store.select(fromCore.getSelectedFileWorkbenchState);
    this.imageFile$ = selectedFileWorkspaceState$.map(state => state && state.file);
    this.workbenchState$ = selectedFileWorkspaceState$.map(state => state && state.workbenchState);
    this.viewerState$ = selectedFileWorkspaceState$.map(state => state && state.fileState.viewer);
    this.sourceExtractorState$ = selectedFileWorkspaceState$.map(state => state && state.fileState.sourceExtractor);

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


    
    this.stateSub = selectedFileWorkspaceState$.subscribe(state => {
      this.lastImageFile = state && state.file;
      this.lastWorkbenchState = state && state.workbenchState;
      this.lastViewerState = state && state.fileState && state.fileState.viewer;
      this.lastSourceExtractorState = state && state.fileState && state.fileState.sourceExtractor;
    });
  }

    

  ngAfterViewInit() {
  }

  ngOnDestroy() {
    if(this.stateSub) this.stateSub.unsubscribe();
  }

  ngOnChanges() {
    
  }
  
  private setModeOption(value) {
    this.store.dispatch(new workbenchActions.SetSourceExtractorMode({mode: value}));
  }

  private setRegionOption(value) {
    this.store.dispatch(new workbenchActions.UpdateSourceExtractorFileState({file: this.lastImageFile, changes: {regionOption: value}}));
  }

  private openPhotSettings() {
    let dialogRef = this.dialog.open(PhotSettingsDialogComponent, {
      width: '600px',
      data: {...this.lastWorkbenchState.photSettings}
    });

    dialogRef.afterClosed().subscribe(result => {
      if(result) {
        this.store.dispatch(new workbenchActions.UpdatePhotSettings({changes: result}));
      }
    });
  }

  private openSourceExtractionSettings() {
    let dialogRef = this.dialog.open(SourceExtractionSettingsDialogComponent, {
      width: '500px',
      data: {...this.lastWorkbenchState.sourceExtractionSettings}
    });

    dialogRef.afterClosed().subscribe(result => {
      if(result) {
        this.store.dispatch(new workbenchActions.UpdateSourceExtractionSettings({changes: result}));
      }
    });
  }



  private onSelectedRowChanges($event: ITdDataTableSelectEvent) {
    if($event.selected) {
      this.selectSources([$event.row])
    }
    else {
      this.deselectSources([$event.row]);
    }
  }

  private onSelectAllRows($event: ITdDataTableSelectAllEvent) {
    if($event.selected) {
      this.selectSources($event.rows);
    }
    else {
      this.deselectSources($event.rows);
    }
   
  }

  private selectSources(sources: Source[]) {
    this.store.dispatch(new workbenchActions.SelectSources({file: this.lastImageFile, sources: sources}));
  }

  private deselectSources(sources: Source[]) {
    this.store.dispatch(new workbenchActions.DeselectSources({file: this.lastImageFile, sources: sources}));
  }

  private findSources() {
    this.store.dispatch(new workbenchActions.ExtractSources({file: this.lastImageFile}));
  }

  private onImageClick($event: ViewerMouseEvent) {
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
        this.store.dispatch(new workbenchActions.SetSourceSelection({file: this.lastImageFile, sources: [$event.source]}));
      }
      
    }
    else if($event.hitImage) {
      

      if(this.lastWorkbenchState.sourceExtractorModeOption == SourceExtractorModeOption.MOUSE && this.lastSourceExtractorState.selectedSourceIds.length == 0) {
        let x = $event.imageX;
        let y = $event.imageY;
        this.store.dispatch(new workbenchActions.PhotometerXYSources({file: this.lastImageFile, coords: [{x: x, y: y}]}));
      }

      this.store.dispatch(new workbenchActions.SetSourceSelection({file: this.lastImageFile, sources: []}));
      
    }
    
  }

  removeAllSources() {
    this.store.dispatch(new workbenchActions.RemoveAllSources({file: this.lastImageFile}))
  }

  removeSelectedSources() {
    this.store.dispatch(new workbenchActions.RemoveSelectedSources({file: this.lastImageFile}))
  }

  

}

