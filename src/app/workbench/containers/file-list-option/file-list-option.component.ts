import {
  Component,
  Input,
  EventEmitter,
  Output,
  OnDestroy,
  ChangeDetectionStrategy,
  ViewChild,
  forwardRef,
  QueryList,
  Inject,
  ChangeDetectorRef,
  OnInit,
  ViewChildren,
  AfterViewInit,
} from '@angular/core';
import { DataFile, IHdu, ImageHdu } from '../../../data-files/models/data-file';
import { Store } from '@ngxs/store';
import { HduType } from '../../../data-files/models/data-file-type';
import { BehaviorSubject, Observable, combineLatest, Subject, concat, of } from 'rxjs';
import { map, switchMap, filter, distinctUntilChanged } from 'rxjs/operators';
import { DataFilesState } from '../../../data-files/data-files.state';
import { DataProvidersState } from '../../../data-providers/data-providers.state';
import { MatSelectionListChange, MatSelectionList } from '@angular/material/list';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { DataProvider } from '../../../data-providers/models/data-provider';
import {
  MatCheckbox,
  MAT_CHECKBOX_DEFAULT_OPTIONS,
  MatCheckboxDefaultOptions,
  MatCheckboxChange,
} from '@angular/material/checkbox';
import { ToggleFileSelection, SelectFile } from '../../workbench.actions';
import { IViewer } from '../../models/viewer';
import { BlendMode } from '../../../data-files/models/blend-mode';
import { UpdateBlendMode, UpdateVisibility, UpdateColorMap, LoadLibrary } from '../../../data-files/data-files.actions';

import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { AfterglowDataFileService } from '../../services/afterglow-data-files';
import { MatTooltipDefaultOptions, MAT_TOOLTIP_DEFAULT_OPTIONS } from '@angular/material/tooltip';

export interface SelectionChangeEvent {
  value: boolean;
  $mouseEvent: MouseEvent;
}

@Component({
  selector: 'app-file-list-option',
  templateUrl: './file-list-option.component.html',
  providers: [
    {
      provide: MAT_CHECKBOX_DEFAULT_OPTIONS,
      useValue: {
        clickAction: 'noop',
        color: 'accent',
      } as MatCheckboxDefaultOptions,
    },
    {
      provide: MAT_TOOLTIP_DEFAULT_OPTIONS,
      useValue: {
        showDelay: 2000,
        hideDelay: 200,
        touchendHideDelay: 200,
        disableTooltipInteractivity: true
      }
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileListOptionComponent implements OnInit {
  @Input('fileId')
  set fileId(fileId: string) {
    this.fileId$.next(fileId);
  }
  get fileId() {
    return this.fileId$.getValue();
  }
  private fileId$ = new BehaviorSubject<string>('');

  @Input('hduId')
  set hduId(hduId: string) {
    this.hduId$.next(hduId);
  }
  get hduId() {
    return this.hduId$.getValue();
  }
  private hduId$ = new BehaviorSubject<string>('');

  @Input() active: boolean = false;
  @Input() showFileToolbar: boolean = false;
  @Input() showImageHduLayerToolbar: boolean = false;
  @Input() showExpand: boolean = false;
  @Input() expanded: boolean = false;
  @Input() showSelect: boolean = false;
  @Input() selected: boolean = false;

  @Output() onItemDoubleClick = new EventEmitter<{ fileId: string; hduId: string }>();
  @Output() onToggleExpanded = new EventEmitter<{ fileId: string; hduId: string }>();
  @Output() onToggleSelected = new EventEmitter<{
    fileId: string;
    hduId: string;
    $event: MouseEvent;
  }>();
  @Output() onClose = new EventEmitter<{ fileId: string; hduId: string }>();
  @Output() onSave = new EventEmitter<{ fileId: string; hduId: string }>();

  @ViewChild(MatCheckbox) checkbox: MatCheckbox;

  HduType = HduType;

  mouseOver: boolean = false;
  hasFocus: boolean = false;
  file$: Observable<DataFile>;
  hdus$: Observable<IHdu[]>;
  hdu$: Observable<IHdu>;
  imageHdu$: Observable<ImageHdu>;
  label$: Observable<string>;
  dataProvider$: Observable<DataProvider>;
  tooltip$: Observable<string>;
  fileModified$: Observable<boolean>;

  constructor(private store: Store, private _changeDetector: ChangeDetectorRef) {
    this.file$ = this.fileId$.pipe(
      switchMap((fileId) => (!fileId ? of(null) : this.store.select(DataFilesState.getFileById(fileId))))
    );

    this.hdu$ = this.hduId$.pipe(
      switchMap((hduId) => (!hduId ? of(null) : this.store.select(DataFilesState.getHduById(hduId))))
    );

    this.imageHdu$ = this.hdu$.pipe(map((hdu) => (hdu?.type == HduType.IMAGE ? (hdu as ImageHdu) : null)));

    this.hdus$ = this.file$.pipe(
      map((file) => file?.hduIds),
      distinctUntilChanged((a, b) => a?.length === b?.length && a?.every((value, index) => b[index] === value)),
      switchMap((hduIds) => {
        if (!hduIds) return of([]);
        return combineLatest(
          hduIds.map((hduId) => {
            return this.store.select(DataFilesState.getHduById(hduId)).pipe(filter((hdu) => hdu != null));
          })
        ).pipe(map((hdus) => hdus.sort((a, b) => (a.order > b.order ? 1 : -1))));
      })
    );

    this.dataProvider$ = this.file$.pipe(
      map((file) => file?.dataProviderId),
      distinctUntilChanged(),
      switchMap((id) => {
        return this.store.select(DataProvidersState.getDataProviderById).pipe(map((fn) => fn(id)));
      })
    );

    this.fileModified$ = this.hdus$.pipe(map((hdus) => hdus.some((hdu) => hdu.modified)));

    this.label$ = combineLatest(this.file$, this.hdu$).pipe(
      map(([file, hdu]) => {
        if (!hdu && !file) {
          return '';
        }

        if (!hdu || file?.hduIds?.length == 1) {
          return file?.name;
        } else {
          return hdu.name || file.name;
        }
      })
    );

    this.tooltip$ = combineLatest(this.file$, this.hdu$, this.dataProvider$).pipe(
      switchMap(([file, hdu, dataProvider]) => {
        if (!hdu || file?.hduIds.length == 1) {
          if (!dataProvider || !file?.assetPath) return of(file?.name);
          return of(`${dataProvider.displayName}${file.assetPath}`);
        }
        return this.label$;
      })
    );
  }

  ngOnInit(): void { }

  getHduLabel(file: DataFile, hdu: IHdu) {
    return hdu.name ? hdu.name : `Layer ${file.hduIds.indexOf(hdu.id)}`;
  }

  handleToggleExpanded($event: MouseEvent) {
    $event.stopPropagation();
    this.onToggleExpanded.emit({ fileId: this.fileId, hduId: this.hduId });
  }

  handleToggleSelection($event: MouseEvent) {
    $event.stopPropagation();
    this.onToggleSelected.emit({ fileId: this.fileId, hduId: this.hduId, $event: $event });
  }

  handleSave($event: MouseEvent) {
    $event.stopPropagation();
    this.onSave.emit({ fileId: this.fileId, hduId: this.hduId });
  }

  handleClose($event: MouseEvent) {
    $event.stopPropagation();
    this.onClose.emit({ fileId: this.fileId, hduId: this.hduId });
  }

  handleBlendModeChange(hduId: string, value: BlendMode) {
    this.store.dispatch(new UpdateBlendMode(hduId, value));
  }

  handleVisibilityChange(hduId: string, value: boolean) {
    this.store.dispatch(new UpdateVisibility(hduId, value));
  }

  handleColorMapChange(hduId: string, colorMapName: string) {
    this.store.dispatch(new UpdateColorMap(hduId, colorMapName));
  }
}
