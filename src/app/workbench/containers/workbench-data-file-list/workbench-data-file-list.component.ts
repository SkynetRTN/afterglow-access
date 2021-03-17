import {
  Component,
  Input,
  EventEmitter,
  Output,
  OnDestroy,
  ChangeDetectionStrategy,
  AfterViewInit,
} from '@angular/core';
import { DataFile, IHdu, ImageHdu } from '../../../data-files/models/data-file';
import { Store } from '@ngxs/store';
import { HduType } from '../../../data-files/models/data-file-type';
import { BehaviorSubject, Observable, combineLatest, Subject, concat } from 'rxjs';
import { DataFilesState } from '../../../data-files/data-files.state';
import { MatSelectionListChange } from '@angular/material/list';
import { ToggleFileSelection, SelectFile } from '../../workbench.actions';
import { Viewer } from '../../models/viewer';
import { LoadLibrary } from '../../../data-files/data-files.actions';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { AfterglowDataFileService } from '../../services/afterglow-data-files';

@Component({
  selector: 'app-workbench-data-file-list',
  templateUrl: './workbench-data-file-list.component.html',
  styleUrls: ['./workbench-data-file-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkbenchDataFileListComponent implements OnDestroy, AfterViewInit {
  @Input('files')
  set files(files: DataFile[]) {
    this.files$.next(files);
  }
  get files() {
    return this.files$.getValue();
  }
  private files$ = new BehaviorSubject<DataFile[]>(null);

  @Input('focusedViewer')
  set focusedViewer(focusedViewer: Viewer) {
    this.focusedViewer$.next(focusedViewer);
  }
  get focusedViewer() {
    return this.focusedViewer$.getValue();
  }
  private focusedViewer$ = new BehaviorSubject<Viewer>(null);

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

  selectAllChecked$: Observable<boolean>;
  selectAllIndeterminate$: Observable<boolean>;
  destroy$: Subject<boolean> = new Subject<boolean>();
  HduType = HduType;
  collapsedFileIds: { [id: string]: boolean } = {};
  focusedValue: { fileId: string; hduId: string } = null;

  constructor(private store: Store, private fileService: AfterglowDataFileService) {}

  ngAfterViewInit() {}

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  handleItemDoubleClick(value: { fileId: string; hduId: string }) {
    this.selectFile(value.fileId, value.hduId, true);
  }

  selectFile(fileId: string, hduId: string, keepOpen: boolean) {
    if (!hduId) {
      let file = this.store.selectSnapshot(DataFilesState.getFileById)(fileId);
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

  onChannelDrop($event: CdkDragDrop<IHdu[]>) {
    console.log('DROPPPED!!!!!!!!!!: ', $event);
    return;

    let hdus = $event.container.data;
    let srcHdu = $event.item.data as IHdu;

    if ($event.currentIndex == $event.previousIndex) {
      return;
    }

    hdus.splice($event.currentIndex, 0, hdus.splice($event.previousIndex, 1)[0]);
    let reqs = hdus
      .map((hdu, index) => {
        if (hdu.order == index) return null;
        return this.fileService.updateFile(hdu.id, {
          groupOrder: index,
        });
      })
      .filter((req) => req != null);

    concat(...reqs).subscribe(
      () => {},
      (err) => {},
      () => {
        this.store.dispatch(new LoadLibrary());
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
}
