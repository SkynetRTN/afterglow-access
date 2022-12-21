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
import { RenameHduDialogComponent } from '../../components/rename-layer-dialog/rename-layer-dialog.component';
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
  focusedValue: { fileId: string; layerId: string } = null;

  constructor(private store: Store, private fileService: AfterglowDataFileService, private dialog: MatDialog, private actions$: Actions) { }

  ngAfterViewInit() { }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  handleItemDoubleClick(value: { fileId: string; layerId: string }) {
    this.selectFile(value.fileId, value.layerId, true);
  }

  selectFile(fileId: string, layerId: string, keepOpen: boolean) {
    if (!layerId) {
      let file = this.store.selectSnapshot(DataFilesState.getFileById(fileId));
      if (file && file.layerIds.length == 1) {
        //if a single-layer file is selected,  automatically select the layer
        layerId = file.layerIds[0];
      }
    }
    this.store.dispatch(new SelectFile(fileId, layerId, keepOpen));
  }

  handleToggleExpanded($event: { fileId: string; layerId: string }) {
    if ($event.fileId in this.collapsedFileIds) {
      delete this.collapsedFileIds[$event.fileId];
    } else {
      this.collapsedFileIds[$event.fileId] = true;
    }
  }

  handleToggleSelected($event: { fileId: string; layerId: string; $event: MouseEvent }) {
    //TODO handle multi-selection based on modifier keys
    this.store.dispatch(new ToggleFileSelection($event.fileId));
  }

  trackById(index: number, file: DataFile) {
    return file?.id;
  }

  onLayerDrop($event: CdkDragDrop<IHdu[]>) {
    let item: { fileId: string, layerId: string } = $event.item.data;
    let layers = this.store.selectSnapshot(DataFilesState.getHdusByFileId(item.fileId)).sort((a, b) => a.order - b.order)

    let shift = $event.currentIndex - $event.previousIndex;
    let previousIndex = layers.findIndex(layer => layer.id == item.layerId);
    let currentIndex = Math.min(layers.length - 1, Math.max(0, previousIndex + shift))

    moveItemInArray(layers, previousIndex, currentIndex)
    let reqs = layers
      .map((layer, index) => {
        if (layer.order == index) return null;
        return this.fileService.updateFile(layer.id, {
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

  handleFocus(value: { fileId: string; layerId: string }) {
    this.focusedValue = value;
  }

  handleMouseEnter(value: { fileId: string; layerId: string }) {
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

  onHduContextMenu(event: MouseEvent, layerId: string) {
    event.preventDefault();
    this.contextMenuPosition.x = event.clientX + 'px';
    this.contextMenuPosition.y = event.clientY + 'px';
    this.contextMenu.menuData = {
      layer: this.store.selectSnapshot(DataFilesState.getHduById(layerId))
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


  renameHdu(layer: IHdu) {
    let dialogRef = this.dialog.open(RenameHduDialogComponent, { data: layer })
    dialogRef.afterClosed().subscribe((layer) => {
      if (!layer) return;
      this.store.dispatch(new LoadLibrary())
    })
  }

  setColorMap(layer: ImageHdu, value: string) {
    this.store.dispatch(new UpdateNormalizer(layer.id, { colorMapName: value }))
  }
  setBlendMode(layer: ImageHdu, value: BlendMode) {
    this.store.dispatch(new UpdateBlendMode(layer.id, value));
  }
  setAlpha(layer: ImageHdu, value: number) {
    this.store.dispatch(new UpdateAlpha(layer.id, value));
  }
}
