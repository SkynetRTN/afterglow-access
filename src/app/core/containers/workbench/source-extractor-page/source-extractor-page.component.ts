import { Component, AfterViewInit, ViewChild, OnDestroy, OnChanges, OnInit} from '@angular/core';

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
import * as fromImageFileState from '../../../reducers/image-file-state';
import * as workbenchActions from '../../../actions/workbench';
import * as sourceExtractorActions from '../../../actions/source-extractor';
import * as dataFileActions from '../../../../data-files/actions/data-file';
import * as imageFileActions from '../../../../data-files/actions/image-file';

import { Normalization } from '../../../models/normalization';
import { calcLevels } from '../../../../data-files/models/image-hist';
import { ImageFile, DataFile } from '../../../../data-files/models/data-file';
import { DmsPipe } from '../../../../pipes/dms.pipe'
import { SourceExtractorFileState, SourceExtractorRegionOption } from '../../../models/source-extractor-file-state';
import { SourceExtractorModeOption } from '../../../models/source-extractor-mode-option';
import { PhotSettingsDialogComponent } from '../../../components/phot-settings-dialog/phot-settings-dialog.component';
import { SourceExtractionSettingsDialogComponent } from '../../../components/source-extraction-settings-dialog/source-extraction-settings-dialog.component';
import { ViewportChangeEvent, CanvasMouseEvent } from '../../../components/pan-zoom-canvas/pan-zoom-canvas.component';
import { Source } from '../../../models/source';
import { Region } from '../../../models/region';
import { ImageFileState } from '../../../models/image-file-state';
import { Viewer } from '../../../models/viewer';
import { Dictionary } from '@ngrx/entity/src/models';
import { MarkerMouseEvent } from '../../../components/image-viewer-marker-overlay/image-viewer-marker-overlay.component';
import { Marker, MarkerType } from '../../../models/marker';
import { ViewerGridCanvasMouseEvent, ViewerGridMarkerMouseEvent } from '../workbench-viewer-grid/workbench-viewer-grid.component';


@Component({
  selector: 'app-source-extractor-page',
  templateUrl: './source-extractor-page.component.html',
  styleUrls: ['./source-extractor-page.component.css']
})
export class SourceExtractorPageComponent implements AfterViewInit, OnDestroy, OnChanges, OnInit {
  activeImageFile$: Observable<ImageFile>;
  activeImageFileState$: Observable<ImageFileState>;
  showConfig$: Observable<boolean>;
  activeSourceExtractorFileState$: Observable<SourceExtractorFileState>;
  sourceExtractorState$: Observable<fromImageFileState.State>;
  markers$: Observable<Marker[]>;
  region$: Observable<Region> = null;
  filteredSources$: Observable<Source[]>;
  selectedSources$: Observable<Source[]>;
  selectedSources: Array<Source> = [];
  activeImageFile: ImageFile;
  activeSourceExtractorFileState: SourceExtractorFileState;
  sourceExtractorState: fromImageFileState.State;
  SourceExtractorModeOption = SourceExtractorModeOption;
  SourceExtractorRegionOption = SourceExtractorRegionOption;
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
    this.activeImageFile$ = store.select(fromCore.workbench.getActiveFile)
    this.activeImageFileState$ = store.select(fromCore.workbench.getActiveFileState);
    this.sourceExtractorState$ = store.select(fromCore.getImageFileGlobalState).filter(state => state != null);
    this.activeSourceExtractorFileState$ = this.activeImageFileState$.filter(state => state != null).map(state => state.sourceExtractor).filter(v => v != null);
    this.showConfig$ = store.select(fromCore.workbench.getShowConfig);

    this.filteredSources$ = this.activeSourceExtractorFileState$
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

    this.selectedSources$ = this.activeSourceExtractorFileState$
    .distinctUntilChanged((a,b) => {
      return a && b && a.selectedSourceIds == b.selectedSourceIds;
    })
    .map(state => {
      if(!state) return [];
      return state.sources.filter(source => state.selectedSourceIds.indexOf(source.id) != -1)
    })

    this.region$ = this.activeSourceExtractorFileState$
    .distinctUntilChanged((a,b) => {
      return a && b && a.region == b.region;
    })
    .map(state => {
      if(!state) return null;
      return state.region;
    })

    this.markers$ = Observable.combineLatest(
      this.region$,
      this.filteredSources$,
      this.selectedSources$
    )
    .map(([region, filteredSources, selectedSources]) => {
      let result: Marker[] = [];
      if(region) result.push({type: MarkerType.RECTANGLE, ...region});
      if(filteredSources) {
        let sourceMarkers = filteredSources.map(source => {
          return {
            type: MarkerType.ELLIPSE,
            x: source.x,
            y: source.y,
            a: 15,
            b: 15,
            theta: 0,
            selected: selectedSources.find(selectedSource => selectedSource.id == source.id) != null,
            data: {id: source.id}
          }
        });

        result = result.concat(sourceMarkers);
      }

      return result;
    })

    this.subs.push(this.activeImageFile$.subscribe(imageFile => this.activeImageFile = imageFile));
    this.subs.push(this.activeSourceExtractorFileState$.subscribe(sourceExtractorState => this.activeSourceExtractorFileState = sourceExtractorState));
    this.subs.push(this.sourceExtractorState$.subscribe(sourceExtractorGlobalState => this.sourceExtractorState = sourceExtractorGlobalState));
  }

  ngOnInit() {
    this.store.dispatch(new workbenchActions.DisableMultiFileSelection());
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
    this.store.dispatch(new sourceExtractorActions.UpdateFileState({file: this.activeImageFile, changes: {regionOption: value}}));
  }

  openPhotSettings() {
    let dialogRef = this.dialog.open(PhotSettingsDialogComponent, {
      width: '600px',
      data: {...this.sourceExtractorState.photSettings}
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
      data: {...this.sourceExtractorState.sourceExtractionSettings}
    });

    dialogRef.afterClosed().subscribe(result => {
      if(result) {
        this.store.dispatch(new sourceExtractorActions.UpdateSourceExtractionSettings({changes: result}));
      }
    });
  }



  onSelectedRowChanges($event: ITdDataTableSelectEvent) {
    if($event.selected) {
      this.selectSources(this.activeImageFile, [$event.row])
    }
    else {
      this.deselectSources(this.activeImageFile, [$event.row]);
    }
  }

  onSelectAllRows($event: ITdDataTableSelectAllEvent) {
    if($event.selected) {
      this.selectSources(this.activeImageFile, $event.rows);
    }
    else {
      this.deselectSources(this.activeImageFile, $event.rows);
    }
   
  }

  selectSources(imageFile: ImageFile, sources: Source[]) {
    this.store.dispatch(new sourceExtractorActions.SelectSources({file: this.activeImageFile, sources: sources}));
  }

  deselectSources(imageFile: ImageFile, sources: Source[]) {
    this.store.dispatch(new sourceExtractorActions.DeselectSources({file: this.activeImageFile, sources: sources}));
  }

  findSources() {
    this.store.dispatch(new sourceExtractorActions.ExtractSources({file: this.activeImageFile}));
  }

  onMarkerClick($event: ViewerGridMarkerMouseEvent) {
    let source = this.activeSourceExtractorFileState.sources.find(source => source.id == $event.marker.data['id']);
    if(!source) return;

    let sourceSelected = this.activeSourceExtractorFileState.selectedSourceIds.indexOf(source.id) != -1;
    if($event.mouseEvent.ctrlKey) {
      if(!sourceSelected) {
        // select the source
        this.selectSources($event.targetFile, [source]);
      }
      else {
        // deselect the source
        this.deselectSources($event.targetFile, [source]);
      }
    }
    else {
      this.store.dispatch(new sourceExtractorActions.SetSourceSelection({file: this.activeImageFile, sources: [source]}));
    }
    $event.mouseEvent.stopImmediatePropagation();
    $event.mouseEvent.preventDefault();
  }

  onImageClick($event: ViewerGridCanvasMouseEvent) {
    if($event.hitImage) {
      if(this.sourceExtractorState.sourceExtractorModeOption == SourceExtractorModeOption.MOUSE && this.activeSourceExtractorFileState.selectedSourceIds.length == 0) {
        let x = $event.imageX;
        let y = $event.imageY;
        this.store.dispatch(new sourceExtractorActions.PhotometerXYSources({file: $event.targetFile, coords: [{x: x, y: y}]}));
      }

      this.store.dispatch(new sourceExtractorActions.SetSourceSelection({file: $event.targetFile, sources: []}));
      
    }
    
  }

  removeAllSources() {
    this.store.dispatch(new sourceExtractorActions.RemoveAllSources({file: this.activeImageFile}))
  }

  removeSelectedSources() {
    this.store.dispatch(new sourceExtractorActions.RemoveSelectedSources({file: this.activeImageFile}))
  }

  
  
}

