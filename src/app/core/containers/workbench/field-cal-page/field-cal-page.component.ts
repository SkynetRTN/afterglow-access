import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  HostBinding,
  Input,
} from "@angular/core";
import { Store } from "@ngrx/store";
import { Observable, combineLatest } from 'rxjs';
import {
  map
} from "rxjs/operators";
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { ImageFile, getHasWcs } from '../../../../data-files/models/data-file';
import { ImageFileState } from '../../../models/image-file-state';
import * as fromRoot from "../../../../reducers";
import * as fromCore from '../../../reducers';
import * as workbenchActions from "../../../actions/workbench";
import { WorkbenchState, WorkbenchTool } from "../../../models/workbench-state";
import { Catalog } from "../../../models/catalog";
import { MatDialog } from "@angular/material";
import { CreateFieldCalDialogComponent } from "../../../components/create-field-cal-dialog/create-field-cal-dialog.component";
import { FieldCal } from '../../../models/field-cal';
import { SelectionModel } from '@angular/cdk/collections';
import { JobType } from '../../../../jobs/models/job-types';
import { DataFileType } from '../../../../data-files/models/data-file-type';
import { ViewerGridCanvasMouseEvent, ViewerGridMarkerMouseEvent } from '../workbench-viewer-grid/workbench-viewer-grid.component';
import { CatalogQueryJob } from '../../../../jobs/models/catalog-query';
import { Router } from '@angular/router';

// import { DataFile, ImageFile } from '../../../models'
// import { DataFileLibraryStore } from '../../../stores/data-file-library.store'
// import { ImageViewerComponent } from '../../../components/image-viewer/image-viewer.component'

@Component({
  selector: "app-field-cal-page",
  templateUrl: "./field-cal-page.component.html",
  styleUrls: ["./field-cal-page.component.scss"]
  //changeDetection: ChangeDetectionStrategy.OnPush
})
export class FieldCalPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @HostBinding('class') @Input('class') classList: string = 'fx-workbench-outlet';
  inFullScreenMode$: Observable<boolean>;
  fullScreenPanel$: Observable<'file' | 'viewer' | 'tool'>;
  activeImageFile$: Observable<ImageFile>;
  activeImageHasWcs$: Observable<boolean>;
  activeImageFileState$: Observable<ImageFileState>;
  showConfig$: Observable<boolean>;
  catalogs$: Observable<Catalog[]>;
  selectedCatalog$: Observable<Catalog>;
  selectedCatalogId$: Observable<string>;
  fieldCals$: Observable<FieldCal[]>;
  selectedFieldCal$: Observable<FieldCal>;
  selectedFieldCalId$: Observable<string>;
  selectedImageFiles$: Observable<Array<ImageFile>>;

  enableMagLimit: boolean = false;
  magLimitFilter: string = null;
  magLimitValue: number = 12;

  selectionModel = new SelectionModel<string>(true, []);


  catalogForm = new FormGroup({
    catalog: new FormControl('', Validators.required),
    enableMagLimit: new FormControl(false, Validators.required),
    magLimitFilter: new FormControl({disabled: true, value: ''}, Validators.required),
    magMaxLimitValue: new FormControl({disabled: true, value: 16}, Validators.required),
    magMinLimitValue: new FormControl({disabled: true, value: 10}, Validators.required),
  });
  

  constructor(private store: Store<fromRoot.State>, public dialog: MatDialog, router: Router) {
    this.fullScreenPanel$ = this.store.select(fromCore.workbench.getFullScreenPanel);
    this.inFullScreenMode$ = this.store.select(fromCore.workbench.getInFullScreenMode);
    this.activeImageFile$ = store.select(fromCore.workbench.getActiveFile);
    this.activeImageHasWcs$ = this.activeImageFile$.pipe(map(imageFile => imageFile != null && getHasWcs(imageFile)));
    this.activeImageFileState$ = store.select(fromCore.workbench.getActiveFileState);
    this.showConfig$ = store.select(fromCore.workbench.getShowConfig);
    this.catalogs$ = store.select(fromCore.getWorkbenchState).pipe(map(state => state.catalogs));
    this.fieldCals$ = store.select(fromCore.getWorkbenchState).pipe(map(state => state.fieldCals));
    this.selectedFieldCalId$ = store.select(fromCore.getWorkbenchState).pipe(map(state => state.selectedFieldCalId));
    this.selectedFieldCal$ = combineLatest(this.fieldCals$, this.selectedFieldCalId$).pipe(
      map(([fieldCals, selectedFieldCalId]) => {
        if(!fieldCals || selectedFieldCalId == null) return null;
        let selectedFieldCal = fieldCals.find(fieldCal => fieldCal.id == selectedFieldCalId);
        if(!selectedFieldCal) return null;
        return selectedFieldCal; 
      })
    );

    this.selectedCatalogId$ = store.select(fromCore.getWorkbenchState).pipe(map(state => state.selectedCatalogId));
    this.selectedCatalog$ = combineLatest(this.catalogs$, this.selectedCatalogId$).pipe(
      map(([catalogs, selectedCatalogId]) => {
        if(!catalogs || selectedCatalogId == null) return null;
        let selectedCatalog = catalogs.find(catalog => catalog.name == selectedCatalogId);
        if(!selectedCatalog) return null;
        return selectedCatalog; 
      })
    )


    this.catalogForm.get('enableMagLimit').valueChanges.subscribe(value => {
      if (value) {
        this.catalogForm.get('magLimitFilter').enable();
        this.catalogForm.get('magMaxLimitValue').enable();
        this.catalogForm.get('magMinLimitValue').enable();
      } else {
        this.catalogForm.get('magLimitFilter').disable();
        this.catalogForm.get('magMaxLimitValue').disable();
        this.catalogForm.get('magMinLimitValue').disable();
      }
    });

    this.selectedImageFiles$ = store
      .select(fromCore.workbench.getSelectedFiles)
      .pipe(
        map(
          files =>
            files.filter(file => file.type == DataFileType.IMAGE) as Array<
              ImageFile
            >
        )
      );


    this.store.dispatch(
      new workbenchActions.SetActiveTool({ tool: WorkbenchTool.FIELD_CAL })
    );

    this.store.dispatch(
      new workbenchActions.SetLastRouterPath({path: router.url})
    )
  }
  
  ngOnInit() {
    this.store.dispatch(new workbenchActions.DisableMultiFileSelection());
  }

  ngOnDestroy() {
  }

  ngAfterViewInit() {}

  isAllSelected() {
    return false;
    // const numSelected = this.selectionModel.selected.length;
    // const numRows = this.dataSource.sources.length;
    // return numSelected === numRows;
  }

  showSelectAll() {
    return false;
    // return this.dataSource.sources && this.dataSource.sources.length != 0;
  }

  onFieldCalChange(value) {
    this.store.dispatch(new workbenchActions.SetSelectedFieldCal({fieldCalId: value}));
  }

  onCatalogChange(value) {
    this.store.dispatch(new workbenchActions.SetSelectedCatalog({catalogId: value}) )
  }

  onMagLimitFilterChange(filter) {
    this.magLimitFilter = filter;
  }

  addSourcesFromCatalog(fieldCalId: string, selectedImageFiles: ImageFile[], catalogFormValue: any) {
    let constraints = {};
    if(catalogFormValue.enableMagLimit) {
      constraints[`${catalogFormValue.magLimitFilter}mag`] = `${catalogFormValue.magMinLimitValue}..${catalogFormValue.magMaxLimitValue}`
    }

    let catalogQueryJob: CatalogQueryJob = {
      id: null,
      type: JobType.CatalogQuery,
      file_ids: selectedImageFiles.map(f => parseInt(f.id)),
      catalogs: [catalogFormValue.catalog],
      constraints: constraints
    }

    this.store.dispatch(new workbenchActions.AddFieldCalSourcesFromCatalog({fieldCalId: fieldCalId, catalogQueryJob: catalogQueryJob}));
  }

  openCreateFieldCalDialog() {
    let dialogRef = this.dialog.open(CreateFieldCalDialogComponent, {
      width: "400px",
      data: {  }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.store.dispatch(
          new workbenchActions.CreateFieldCal({ fieldCal: {
            id: null,
            name: result.name,
            catalogSources: [],
            customFilterLookup: {},
            sourceInclusionPercent: 0,
            sourceMatchTol: 5.0,
            minSnr: 3.0,
            maxSnr: 0
          } })
        );
      }
    });
  }

  onMarkerClick($event: ViewerGridMarkerMouseEvent) {
    if ($event.mouseEvent.altKey) return;

    // let source = this.dataSource.sources.find(
    //   source => $event.marker.data && source.id == $event.marker.data["id"]
    // );
    // if (!source) return;

    // let sourceSelected = this.selectedSources.includes(source);
    // // if(!sourceSelected) {
    // //   // select the source
    // //   this.selectSources($event.targetFile, [source]);
    // // }
    // // else {
    // //   // deselect the source
    // //   this.deselectSources($event.targetFile, [source]);
    // // }
    // if ($event.mouseEvent.ctrlKey) {
    //   if (!sourceSelected) {
    //     // select the source
    //     this.selectSources([source]);
    //   } else {
    //     // deselect the source
    //     this.deselectSources([source]);
    //   }
    // } else {
    //   this.store.dispatch(
    //     new sourceActions.SetSourceSelection({ sources: [source] })
    //   );
    // }
    // $event.mouseEvent.stopImmediatePropagation();
    // $event.mouseEvent.preventDefault();
  }

  onImageClick($event: ViewerGridCanvasMouseEvent) {
    if ($event.hitImage) {
      // if (
      //   this.workbenchState.sourceExtractorModeOption ==
      //     SourceExtractorModeOption.MOUSE &&
      //   (this.selectedSources.length == 0 || $event.mouseEvent.altKey)
      // ) {
      //   let primaryCoord = $event.imageX;
      //   let secondaryCoord = $event.imageY;
      //   let posType = PosType.PIXEL;

      //   let centroidClicks = true;
      //   if (centroidClicks) {
      //     let result = centroidPsf(
      //       this.activeImageFile,
      //       primaryCoord,
      //       secondaryCoord,
      //       this.workbenchState.centroidSettings.psfCentroiderSettings
      //     );
      //     primaryCoord = result.x;
      //     secondaryCoord = result.y;
      //   }
      //   if (getHasWcs(this.activeImageFile)) {
      //     let wcs = getWcs(this.activeImageFile);
      //     let raDec = wcs.pixToWorld([primaryCoord, secondaryCoord]);
      //     primaryCoord = raDec[0];
      //     secondaryCoord = raDec[1];
      //     posType = PosType.SKY;
      //   }

      //   let source: Source = {
      //     id: null,
      //     label: "",
      //     objectId: null,
      //     fileId: this.activeImageFile.id,
      //     primaryCoord: primaryCoord,
      //     secondaryCoord: secondaryCoord,
      //     posType: posType,
      //     pm: null,
      //     pmPosAngle: null,
      //     pmEpoch: getCenterTime(this.activeImageFile)
      //   };
      //   this.store.dispatch(
      //     new sourceActions.AddSources({ sources: [source] })
      //   );
      // } else {
      //   this.store.dispatch(
      //     new sourceActions.SetSourceSelection({ sources: [] })
      //   );
      // }
    }
  }
}
