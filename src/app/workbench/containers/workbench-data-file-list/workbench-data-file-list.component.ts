import {
  Component,
  Input,
  EventEmitter,
  Output,
  OnChanges,
  OnDestroy,
  SimpleChange,
  ChangeDetectionStrategy,
} from "@angular/core";
import { DataFile, IHdu } from "../../../data-files/models/data-file";
import { Store } from "@ngxs/store";
import { HduType } from "../../../data-files/models/data-file-type";
import { BehaviorSubject, Observable, combineLatest } from "rxjs";
import { map, tap, switchMap, distinctUntilKeyChanged, filter } from "rxjs/operators";
import { DataFilesState } from "../../../data-files/data-files.state";
import { DataProvidersState } from "../../../data-providers/data-providers.state";
import { MatTreeFlatDataSource, MatTreeFlattener } from "@angular/material/tree";
import { SelectionModel } from "@angular/cdk/collections";
import { FlatTreeControl } from "@angular/cdk/tree";
import { MatSelectionListChange } from "@angular/material/list";

export interface ISelectedFileListItem {
  fileId: string;
  hduId: string;
}

export class FileListItem {
  children: FileListItem[];
  id: string;
  name: string;
  fileId: string;
  hduId: string;
  showButtonBar: boolean;
  icon: string;
  tooltip: string;
  modified: boolean;
  file: DataFile;
  hdu: IHdu;
}

@Component({
  selector: "app-workbench-data-file-list",
  templateUrl: "./workbench-data-file-list.component.html",
  styleUrls: ["./workbench-data-file-list.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkbenchDataFileListComponent {
  @Input("selectedItem")
  set selectedItem(files: ISelectedFileListItem) {
    this.selectedItem$.next(files);
  }
  get selectedItem() {
    return this.selectedItem$.getValue();
  }
  private selectedItem$ = new BehaviorSubject<ISelectedFileListItem>(null);

  @Input("files")
  set files(files: DataFile[]) {
    this.files$.next(files);
  }
  get files() {
    return this.files$.getValue();
  }
  private files$ = new BehaviorSubject<DataFile[]>(null);

  @Output() onSelectionChange = new EventEmitter<{
    item: ISelectedFileListItem;
  }>();

  @Output() onItemDoubleClick = new EventEmitter<{
    item: ISelectedFileListItem;
  }>();

  @Output() onCloseFile = new EventEmitter<string>();

  @Output() onSaveFile = new EventEmitter<string>();

  HduType = HduType;
  hduEntities$: Observable<{ [id: string]: IHdu }>;

  collapsedItems: { [id: string]: boolean } = {};
  hoveredItem: FileListItem;

  items$: Observable<FileListItem[]>;

  constructor(private store: Store) {
    this.hduEntities$ = this.store.select(DataFilesState.getHduEntities);

    this.items$ = this.store.select(DataFilesState.getFileIds).pipe(
      switchMap((fileIds) => {
        return combineLatest(
          ...fileIds.map((fileId) => {
            let file$ = this.store.select(DataFilesState.getFileById).pipe(
              map((fn) => fn(fileId)),
              filter((f) => f != null),
              distinctUntilKeyChanged("id"),
              distinctUntilKeyChanged("name"),
              distinctUntilKeyChanged("hduIds"),
              distinctUntilKeyChanged("name")
            );
            let hdus$ = file$.pipe(
              switchMap((file) =>
                combineLatest(
                  file.hduIds.map((hduId) =>
                    this.store.select(DataFilesState.getHduById).pipe(
                      map((fn) => fn(hduId)),
                      filter((f) => f != null),
                      distinctUntilKeyChanged("id"),
                      distinctUntilKeyChanged("modified"),
                      distinctUntilKeyChanged("hduType")
                    )
                  )
                )
              )
            );
            return combineLatest(file$, hdus$).pipe(
              map(([file, hdus]) => {
                let dataProvider = this.store.selectSnapshot(DataProvidersState.getDataProviderEntities)[
                  file.dataProviderId
                ];
                let result: FileListItem = null;
                let tooltip = file.name;
                if (dataProvider && file.assetPath != null) {
                  tooltip = `${dataProvider.name}${file.assetPath}`;
                }
                if (hdus.length > 1) {
                  result = {
                    id: file.id,
                    name: file.name,
                    tooltip: tooltip,
                    fileId: file.id,
                    hduId: null,
                    showButtonBar: true,
                    icon: null,
                    modified: hdus.map((hdu) => hdu.modified).some((v) => v),
                    file: file,
                    hdu: null,
                    children: hdus.map((hdu, index) => ({
                      file: null,
                      hdu: hdu,
                      id: `${file.id}-${hdu.id}`,
                      name: `Channel ${index}`,
                      fileId: file.id,
                      hduId: hdu.id,
                      showButtonBar: false,
                      icon: hdu.hduType == HduType.IMAGE ? "insert_photo" : "toc",
                      tooltip: `${tooltip} - Channel ${index}`,
                      modified: null,
                      children: [],
                    })),
                  };
                } else if (hdus.length == 1) {
                  let hdu = hdus[0];
                  result = {
                    file: null,
                    hdu: hdu,
                    id: `${file.id}-${hdu.id}`,
                    name: file.name,
                    tooltip: tooltip,
                    fileId: file.id,
                    hduId: hdu.id,
                    showButtonBar: true,
                    icon: hdu.hduType == HduType.IMAGE ? "insert_photo" : "toc",
                    modified: hdu.modified,
                    children: [],
                  };
                }
                return result;
              })
            );
          })
        );
      })
    );
  }

  getTooltip(file: DataFile) {
    let dataProvider = this.store.selectSnapshot(DataProvidersState.getDataProviderEntities)[file.dataProviderId];
    let tooltip = file.name;
    if (dataProvider && file.assetPath != null) {
      tooltip = `${dataProvider.name}${file.assetPath}`;
    }
    return tooltip;
  }

  toggleFile($event: MouseEvent, fileId: string) {
    $event.preventDefault();
    $event.stopPropagation();

    if (this.collapsedItems[fileId]) {
      delete this.collapsedItems[fileId];
    } else {
      this.collapsedItems[fileId] = true;
    }
  }

  onMouseEnterNode(item: FileListItem) {
    this.hoveredItem = item;
  }

  onMouseLeaveNode(item: FileListItem) {
    this.hoveredItem = null;
  }

  saveFile($event: MouseEvent, fileId: string) {
    $event.preventDefault();
    $event.stopImmediatePropagation();
    this.onSaveFile.emit(fileId);
  }

  closeFile($event: MouseEvent, fileId: string) {
    $event.preventDefault();
    $event.stopImmediatePropagation();
    this.onCloseFile.emit(fileId);
  }
}
