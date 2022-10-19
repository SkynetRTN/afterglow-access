import {
  Component,
  Input,
  EventEmitter,
  Output,
  OnDestroy,
  ChangeDetectionStrategy,
  AfterViewInit,
  ViewChild,
} from '@angular/core';
import { DataFile, IHdu, ImageHdu, isImageHdu } from '../../../data-files/models/data-file';
import { Actions, ofActionCompleted, ofActionDispatched, Store } from '@ngxs/store';
import { HduType } from '../../../data-files/models/data-file-type';
import { BehaviorSubject, Observable, combineLatest, Subject, concat } from 'rxjs';
import { DataFilesState } from '../../../data-files/data-files.state';
import { MatSelectionListChange } from '@angular/material/list';
import { ToggleFileSelection, SelectFile } from '../../workbench.actions';
import { IViewer } from '../../models/viewer';
import { InvalidateCompositeImageTile, InvalidateCompositeImageTiles, LoadLibrary, LoadLibrarySuccess, UpdateAlpha, UpdateBlendMode, UpdateNormalizer } from '../../../data-files/data-files.actions';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { AfterglowDataFileService } from '../../services/afterglow-data-files';
import { MatMenuTrigger } from '@angular/material/menu';
import { aColorMap, balmerColorMap, blueColorMap, coolColorMap, grayColorMap, greenColorMap, heatColorMap, oiiColorMap, rainbowColorMap, redColorMap } from 'src/app/data-files/models/color-map';
import { BlendMode } from 'src/app/data-files/models/blend-mode';
import { MatDialog } from '@angular/material/dialog';
import { RenameHduDialogComponent } from '../../components/rename-hdu-dialog/rename-hdu-dialog.component';
import { RenameFileDialogComponent } from '../../components/rename-file-dialog/rename-file-dialog.component';
import { take, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-data-file-list',
  templateUrl: './data-file-list.component.html',
  styleUrls: ['./data-file-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataFileListComponent implements OnDestroy, AfterViewInit {
  isImageHdu = isImageHdu;

  colorMaps = [
    grayColorMap,
    redColorMap,
    greenColorMap,
    blueColorMap,
    balmerColorMap,
    oiiColorMap,
    rainbowColorMap,
    coolColorMap,
    heatColorMap,
    aColorMap,
  ];

  blendModeOptions = [
    { label: 'Normal', value: BlendMode.Normal },
    { label: 'Screen', value: BlendMode.Screen },
    { label: 'Lighten', value: BlendMode.Lighten },
    { label: 'Multiply', value: BlendMode.Multiply },
    { label: 'Darken', value: BlendMode.Darken },
    { label: 'Overlay', value: BlendMode.Overlay },
    { label: 'Luminosity', value: BlendMode.Luminosity },
    { label: 'Color', value: BlendMode.Color },
  ];

  alphaOptions = [...Array(21).keys()].map(v => v * 5 / 100)


  @Input('files')
  set files(files: DataFile[]) {
    this.files$.next(files);
  }
  get files() {
    return this.files$.getValue();
  }
  private files$ = new BehaviorSubject<DataFile[]>(null);

  @Input('focusedViewer')
  set focusedViewer(focusedViewer: IViewer) {
    this.focusedViewer$.next(focusedViewer);
  }
  get focusedViewer() {
    return this.focusedViewer$.getValue();
  }
  private focusedViewer$ = new BehaviorSubject<IViewer>(null);

  @Input('selectedFileIds')
  set selectedFileIds(selectedFileIds: string[]) {
    this.selectedFileIds$.next(selectedFileIds);
  }
  get selectedFileIds() {
    return this.selectedFileIds$.getValue();
  }
  private selectedFileIds$ = new BehaviorSubject<string[]>([]);

  @Output() onCloseFile = new EventEmitter<string>();
  @Output() onSaveFile = new EventEmitter<string>();

  @ViewChild(MatMenuTrigger)
  contextMenu: MatMenuTrigger;
  contextMenuPosition = { x: '0px', y: '0px' };
  mouseOverCloseViewerId: string = null;

  selectAllChecked$: Observable<boolean>;
  selectAllIndeterminate$: Observable<boolean>;
  destroy$ = new Subject<boolean>();
  HduType = HduType;
  collapsedFileIds: { [id: string]: boolean } = {};
  focusedValue: { fileId: string; hduId: string } = null;

  constructor(private store: Store, private fileService: AfterglowDataFileService, private dialog: MatDialog, private actions$: Actions) { }

  ngAfterViewInit() { }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  handleItemDoubleClick(value: { fileId: string; hduId: string }) {
    this.selectFile(value.fileId, value.hduId, true);
  }

  selectFile(fileId: string, hduId: string, keepOpen: boolean) {
    if (!hduId) {
      let file = this.store.selectSnapshot(DataFilesState.getFileById(fileId));
      if (file && file.hduIds.length == 1) {
        //if a single-hdu file is selected,  automatically select the hdu
        hduId = file.hduIds[0];
      }
    }
    this.store.dispatch(new SelectFile(fileId, hduId, keepOpen));
  }

  handleToggleExpanded($event: { fileId: string; hduId: string }) {
    if ($event.fileId in this.collapsedFileIds) {
      delete this.collapsedFileIds[$event.fileId];
    } else {
      this.collapsedFileIds[$event.fileId] = true;
    }
  }

  handleToggleSelected($event: { fileId: string; hduId: string; $event: MouseEvent }) {
    //TODO handle multi-selection based on modifier keys
    this.store.dispatch(new ToggleFileSelection($event.fileId));
  }

  trackById(index: number, file: DataFile) {
    return file?.id;
  }

  onLayerDrop($event: CdkDragDrop<IHdu[]>) {
    let item: { fileId: string, hduId: string } = $event.item.data;
    let hdus = this.store.selectSnapshot(DataFilesState.getHdusByFileId(item.fileId)).sort((a, b) => a.order - b.order)

    let shift = $event.currentIndex - $event.previousIndex;
    let previousIndex = hdus.findIndex(hdu => hdu.id == item.hduId);
    let currentIndex = Math.min(hdus.length - 1, Math.max(0, previousIndex + shift))

    moveItemInArray(hdus, previousIndex, currentIndex)
    let reqs = hdus
      .map((hdu, index) => {
        if (hdu.order == index) return null;
        return this.fileService.updateFile(hdu.id, {
          groupOrder: index,
        });
      })
      .filter((req) => req != null);

    concat(...reqs).subscribe(
      () => { },
      (err) => { },
      () => {
        this.store.dispatch(new LoadLibrary());

        this.actions$.pipe(
          takeUntil(this.destroy$),
          ofActionCompleted(LoadLibrary),
          take(1)
        ).subscribe(() => {
          this.store.dispatch(new InvalidateCompositeImageTiles(item.fileId))
        })
      }
    );
  }

  handleFocus(value: { fileId: string; hduId: string }) {
    this.focusedValue = value;
  }

  handleMouseEnter(value: { fileId: string; hduId: string }) {
    this.focusedValue = value;
  }

  handleBlur($event) {
    this.focusedValue = null;
  }

  handleMouseLeave($event: MouseEvent) {
    // when a toolbar button opens a menu, mouseleave event is dispatched
    // this causes the toolbar to be removed leading to the immediately closing of the menu
    // TODO find a better solution
    if (($event.relatedTarget as HTMLElement)?.tagName?.toLowerCase() == 'div') {
      let div = $event.relatedTarget as HTMLDivElement;
      if (div.classList.contains('cdk-overlay-backdrop')) {
        return;
      }
    }

    this.focusedValue = null;
  }

  onFileContextMenu(event: MouseEvent, fileId: string) {
    event.preventDefault();
    this.contextMenuPosition.x = event.clientX + 'px';
    this.contextMenuPosition.y = event.clientY + 'px';
    this.contextMenu.menuData = {
      file: this.store.selectSnapshot(DataFilesState.getFileById(fileId))
    };
    this.contextMenu.menu.focusFirstItem('mouse');
    this.contextMenu.openMenu();
  }

  onHduContextMenu(event: MouseEvent, hduId: string) {
    event.preventDefault();
    this.contextMenuPosition.x = event.clientX + 'px';
    this.contextMenuPosition.y = event.clientY + 'px';
    this.contextMenu.menuData = {
      hdu: this.store.selectSnapshot(DataFilesState.getHduById(hduId))
    };
    this.contextMenu.menu.focusFirstItem('mouse');
    this.contextMenu.openMenu();
  }

  renameFile(file: DataFile) {
    let dialogRef = this.dialog.open(RenameFileDialogComponent, { data: file })
    dialogRef.afterClosed().subscribe((file: DataFile) => {
      if (!file) return;
      this.store.dispatch(new LoadLibrary())
    })
  }

  splitFile(file: DataFile) {

  }


  renameHdu(hdu: IHdu) {
    let dialogRef = this.dialog.open(RenameHduDialogComponent, { data: hdu })
    dialogRef.afterClosed().subscribe((hdu) => {
      if (!hdu) return;
      this.store.dispatch(new LoadLibrary())
    })
  }

  setColorMap(hdu: ImageHdu, value: string) {
    this.store.dispatch(new UpdateNormalizer(hdu.id, { colorMapName: value }))
  }
  setBlendMode(hdu: ImageHdu, value: BlendMode) {
    this.store.dispatch(new UpdateBlendMode(hdu.id, value));
  }
  setAlpha(hdu: ImageHdu, value: number) {
    this.store.dispatch(new UpdateAlpha(hdu.id, value));
  }
}
