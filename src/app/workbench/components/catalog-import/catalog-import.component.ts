import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { Select, Store, Actions, ofActionDispatched } from '@ngxs/store';
import { Observable, BehaviorSubject, Subject, throwError, merge } from 'rxjs';
import {
  Header,
  DataFile,
  IHdu,
  ImageHdu,
  TableHdu,
  getWidth,
  getHeight,
  getRaHours,
  getDecDegs,
  getDegsPerPixel,
} from '../../../data-files/models/data-file';
import { DataProvider } from '../../../data-providers/models/data-provider';
import { WorkbenchState } from '../../workbench.state';
import { IViewer } from '../../models/viewer';
import { switchMap, map, takeUntil, withLatestFrom, filter, take, flatMap, tap } from 'rxjs/operators';
import { HduType } from '../../../data-files/models/data-file-type';
import { DataProvidersState } from '../../../data-providers/data-providers.state';
import { DataFilesState } from '../../../data-files/data-files.state';
import {
  KeepViewerOpen,
  ImportFromSurveyFail,
  ImportFromSurveySuccess,
  SelectFile,
  ImportFromSurvey,
} from '../../workbench.actions';
import { CorrelationIdGenerator } from '../../../utils/correlated-action';
import { AlertDialogConfig, AlertDialogComponent } from '../../../utils/alert-dialog/alert-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { LoadLibrary, LoadLibrarySuccess, LoadLibraryFail } from '../../../data-files/data-files.actions';
import { MatRadioChange } from '@angular/material/radio';
import { isNotEmpty } from '../../../utils/utils';

@Component({
  selector: 'app-catalog-import',
  templateUrl: './catalog-import.component.html',
  styleUrls: ['./catalog-import.component.scss'],
})
export class CatalogImportComponent implements OnInit, OnDestroy {
  @Input('viewerId')
  set viewerId(viewer: string) {
    this.viewerId$.next(viewer);
  }
  get viewerId() {
    return this.viewerId$.getValue();
  }
  protected viewerId$ = new BehaviorSubject<string>(null);

  viewportSize$: Observable<{ width: number; height: number }>;
  file$: Observable<DataFile>;
  layer$: Observable<IHdu>;
  header$: Observable<Header>;
  imageHdu$: Observable<ImageHdu>;
  tableHdu$: Observable<TableHdu>;

  destroy$ = new Subject<boolean>();
  importFromSurveyEvent$ = new Subject<boolean>();
  surveyFileId$: Observable<string>;

  surveyDataProvider$: Observable<DataProvider>;
  surveyImportCorrId$: Observable<string>;
  dssImportLoading$: Observable<boolean>;
  useWcsCenter: boolean = false;

  constructor(
    private store: Store,
    private corrGen: CorrelationIdGenerator,
    private actions$: Actions,
    private dialog: MatDialog
  ) {
    this.viewportSize$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getViewportSizeByViewerId(viewerId)))
    );

    this.file$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getFileByViewerId(viewerId)))
    );

    this.header$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getHduHeaderByViewerId(viewerId)))
    );

    this.layer$ = this.viewerId$.pipe(
      switchMap((viewerId) => this.store.select(WorkbenchState.getHduByViewerId(viewerId)))
    );

    this.imageHdu$ = this.layer$.pipe(map((layer) => (layer && layer.type == HduType.IMAGE ? (layer as ImageHdu) : null)));

    this.tableHdu$ = this.layer$.pipe(map((layer) => (layer && layer.type == HduType.TABLE ? (layer as TableHdu) : null)));

    this.dssImportLoading$ = store.select(WorkbenchState.getDssImportLoading);
    this.surveyDataProvider$ = this.store
      .select(DataProvidersState.getDataProviders)
      .pipe(map((dataProviders) => dataProviders.find((dp) => dp.name == 'dss')));

    this.surveyFileId$ = this.importFromSurveyEvent$.pipe(
      takeUntil(this.destroy$),
      withLatestFrom(this.surveyDataProvider$, this.header$),
      filter(([value, dataProvider, header]) => isNotEmpty(dataProvider) && isNotEmpty(header)),
      switchMap(([value, dataProvider, header]) => {
        let centerRaDec;
        let pixelScale;

        if (header.wcs && header.wcs.isValid() && this.useWcsCenter) {
          centerRaDec = header.wcs.pixToWorld([getWidth(header) / 2, getHeight(header) / 2]);
          pixelScale = header.wcs.getPixelScale() * 60;
        } else {
          let centerRa = getRaHours(header);
          let centerDec = getDecDegs(header);
          if (centerRa == undefined || centerDec == undefined)
            return throwError('Unable to extract coordinates from selected image.');
          centerRaDec = [centerRa, centerDec];
          pixelScale = getDegsPerPixel(header) * 60;
          if (pixelScale == undefined) return throwError('Unable to extract pixel scale from selected image.');
        }
        let width = pixelScale * getWidth(header);
        let height = pixelScale * getHeight(header);
        this.store.dispatch(new KeepViewerOpen(this.viewerId));

        let correlationId = this.corrGen.next();
        let importFromSurveyFail$ = this.actions$.pipe(
          ofActionDispatched(ImportFromSurveyFail),
          filter<ImportFromSurveyFail>((action) => action.correlationId == correlationId),
          take(1),
          flatMap((v) => {
            return throwError(
              `An unexpected error occurred when importing the survey image.  Please try again later. ${v.error}`
            );
          })
        );
        this.store.dispatch(
          new ImportFromSurvey(dataProvider.id, centerRaDec[0], centerRaDec[1], width, height, correlationId)
        );
        return this.actions$.pipe(
          takeUntil(importFromSurveyFail$),
          ofActionDispatched(ImportFromSurveySuccess),
          filter<ImportFromSurveySuccess>((action) => action.correlationId == correlationId),
          take(1),
          flatMap((action) => {
            let surveyFileId = action.fileId;
            this.store.dispatch(new LoadLibrary());
            let loadLibraryFail$ = this.actions$.pipe(ofActionDispatched(LoadLibraryFail), take(1));
            return this.actions$.pipe(
              ofActionDispatched(LoadLibrarySuccess),
              takeUntil(loadLibraryFail$),
              take(1),
              map((action) => surveyFileId)
            );
          })
        );
      })
    );
  }

  ngOnInit(): void { }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  onImportFromSurvey() {
    this.surveyFileId$.pipe(take(1)).subscribe(
      (surveyFileId) => {
        let layerEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
        if (surveyFileId && surveyFileId in layerEntities) {
          let layer = layerEntities[surveyFileId];
          this.store.dispatch(new SelectFile(layer.fileId, layer.id, true));
        }
      },
      (error) => {
        let dialogConfig: Partial<AlertDialogConfig> = {
          title: 'Error',
          message: error,
          buttons: [
            {
              color: null,
              value: false,
              label: 'Close',
            },
          ],
        };
        let dialogRef = this.dialog.open(AlertDialogComponent, {
          width: '400px',
          data: dialogConfig,
          disableClose: true,
        });
        return dialogRef.afterClosed();
      }
    );

    this.importFromSurveyEvent$.next(true);
  }

  onUseWcsCenterChange($event: MatRadioChange) {
    this.useWcsCenter = $event.value == 'wcs';
  }
}
