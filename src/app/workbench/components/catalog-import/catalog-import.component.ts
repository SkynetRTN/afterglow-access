import { Component, OnInit } from '@angular/core';
import { Select } from '@ngxs/store';
import { Observable } from 'rxjs';
import { Header } from '../../../data-files/models/data-file';
import { DataProvider } from '../../../data-providers/models/data-provider';
import { WorkbenchState } from '../../workbench.state';

@Component({
  selector: 'app-catalog-import',
  templateUrl: './catalog-import.component.html',
  styleUrls: ['./catalog-import.component.scss'],
})
export class CatalogImportComponent implements OnInit {
  // @Select(WorkbenchState.getFocusedViewer) focusedViewer$: Observable<IViewer>;
  // header$: Observable<Header>;
  // surveyDataProvider$: Observable<DataProvider>;
  // surveyImportCorrId$: Observable<string>;
  // dssImportLoading$: Observable<boolean>;
  // useWcsCenter: boolean = false;

  constructor() {
    // let hduId$ = this.focusedViewer$.pipe(
    //   map((viewer) => viewer?.hduId),
    //   distinctUntilChanged()
    // );
    // let hdu$ = hduId$.pipe(
    //   switchMap((hduId) => this.store.select(DataFilesState.getHduById).pipe(map((fn) => fn(hduId))))
    // );
    // let headerId$ = hdu$.pipe(
    //   map((hdu) => hdu?.headerId || null),
    //   distinctUntilChanged()
    // );
    // this.header$ = headerId$.pipe(
    //   switchMap((headerId) => this.store.select(DataFilesState.getHeaderById).pipe(map((fn) => fn(headerId))))
    // );
    // this.dssImportLoading$ = store.select(WorkbenchState.getDssImportLoading);
    // this.surveyDataProvider$ = this.store
    //   .select(DataProvidersState.getDataProviders)
    //   .pipe(map((dataProviders) => dataProviders.find((dp) => dp.displayName == 'Imaging Surveys')));
  }

  ngOnInit(): void {}

  importFromSurvey(surveyDataProvider: DataProvider) {
    // let centerRaDec;
    // let pixelScale;
    // let focusedViewer = this.store.selectSnapshot(WorkbenchState.getFocusedViewer);
    // if (!focusedViewer) return;
    // let hduId = focusedViewer.hduId;
    // if (!hduId) {
    //   hduId = this.store.selectSnapshot(DataFilesState.getFileEntities)[focusedViewer.fileId].hduIds[0];
    // }
    // if (!hduId) return;
    // let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[hduId];
    // let header = this.store.selectSnapshot(DataFilesState.getHeaderEntities)[hdu.headerId];
    // if (header.wcs && header.wcs.isValid() && this.useWcsCenter) {
    //   centerRaDec = header.wcs.pixToWorld([getWidth(header) / 2, getHeight(header) / 2]);
    //   pixelScale = header.wcs.getPixelScale() * 60;
    // } else {
    //   let centerRa = getRaHours(header);
    //   let centerDec = getDecDegs(header);
    //   if (centerRa == undefined || centerDec == undefined) return;
    //   centerRaDec = [centerRa, centerDec];
    //   pixelScale = getDegsPerPixel(header) * 60;
    //   if (pixelScale == undefined) return;
    // }
    // let width = pixelScale * getWidth(header);
    // let height = pixelScale * getHeight(header);
    // if (!focusedViewer.keepOpen) {
    //   this.store.dispatch(new KeepViewerOpen(focusedViewer.id));
    // }
    // let correlationId = this.corrGen.next();
    // let importFromSurveyFail$ = this.actions$.pipe(
    //   ofActionDispatched(ImportFromSurveyFail),
    //   filter<ImportFromSurveyFail>((action) => action.correlationId == correlationId),
    //   take(1),
    //   flatMap((v) => {
    //     let dialogConfig: Partial<AlertDialogConfig> = {
    //       title: 'Error',
    //       message: `An unexpected error occurred when importing the survey image.  Please try again later.`,
    //       buttons: [
    //         {
    //           color: null,
    //           value: false,
    //           label: 'Close',
    //         },
    //       ],
    //     };
    //     let dialogRef = this.dialog.open(AlertDialogComponent, {
    //       width: '400px',
    //       data: dialogConfig,
    //       disableClose: true,
    //     });
    //     return dialogRef.afterClosed();
    //   })
    // );
    // this.actions$
    //   .pipe(
    //     takeUntil(importFromSurveyFail$),
    //     ofActionDispatched(ImportFromSurveySuccess),
    //     filter<ImportFromSurveySuccess>((action) => action.correlationId == correlationId),
    //     take(1),
    //     flatMap((action) => {
    //       let surveyFileId = action.fileId;
    //       this.store.dispatch(new LoadLibrary());
    //       let loadLibraryFail$ = this.actions$.pipe(ofActionDispatched(LoadLibraryFail), take(1));
    //       return this.actions$.pipe(
    //         ofActionDispatched(LoadLibrarySuccess),
    //         takeUntil(loadLibraryFail$),
    //         take(1),
    //         map((action) => surveyFileId)
    //       );
    //     })
    //   )
    //   .subscribe(
    //     (surveyFileId) => {
    //       let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
    //       if (surveyFileId && surveyFileId in hduEntities) {
    //         let hdu = hduEntities[surveyFileId];
    //         this.store.dispatch(new SelectFile(hdu.fileId, hdu.id, true));
    //       }
    //     },
    //     (err) => {},
    //     () => {}
    //   );
    // this.store.dispatch(
    //   new ImportFromSurvey(surveyDataProvider.id, centerRaDec[0], centerRaDec[1], width, height, correlationId)
    // );
  }

  // onUseWcsCenterChange($event: MatCheckboxChange) {
  //   this.useWcsCenter = $event.checked;
  // }

  // onUseWcsCenterChange($event: MatRadioChange) {
  //   this.useWcsCenter = $event.value == 'wcs';
  // }
}
