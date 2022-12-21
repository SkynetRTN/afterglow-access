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

  @Input('layerId')
  set layerId(layerId: string) {
    this.layerId$.next(layerId);
  }
  get layerId() {
    return this.layerId$.getValue();
  }
  private layerId$ = new BehaviorSubject<string>('');

  @Input() active: boolean = false;
  @Input() showFileToolbar: boolean = false;
  @Input() showImageHduLayerToolbar: boolean = false;
  @Input() showExpand: boolean = false;
  @Input() expanded: boolean = false;
  @Input() showSelect: boolean = false;
  @Input() selected: boolean = false;

  @Output() onItemDoubleClick = new EventEmitter<{ fileId: string; layerId: string }>();
  @Output() onToggleExpanded = new EventEmitter<{ fileId: string; layerId: string }>();
  @Output() onToggleSelected = new EventEmitter<{
    fileId: string;
    layerId: string;
    $event: MouseEvent;
  }>();
  @Output() onClose = new EventEmitter<{ fileId: string; layerId: string }>();
  @Output() onSave = new EventEmitter<{ fileId: string; layerId: string }>();

  @ViewChild(MatCheckbox) checkbox: MatCheckbox;

  HduType = HduType;

  mouseOver: boolean = false;
  hasFocus: boolean = false;
  file$: Observable<DataFile>;
  layers$: Observable<IHdu[]>;
  layer$: Observable<IHdu>;
  imageHdu$: Observable<ImageHdu>;
  label$: Observable<string>;
  dataProvider$: Observable<DataProvider>;
  tooltip$: Observable<string>;
  fileModified$: Observable<boolean>;

  constructor(private store: Store, private _changeDetector: ChangeDetectorRef) {
    this.file$ = this.fileId$.pipe(
      switchMap((fileId) => (!fileId ? of(null) : this.store.select(DataFilesState.getFileById(fileId))))
    );

    this.layer$ = this.layerId$.pipe(
      switchMap((layerId) => (!layerId ? of(null) : this.store.select(DataFilesState.getHduById(layerId))))
    );

    this.imageHdu$ = this.layer$.pipe(map((layer) => (layer?.type == HduType.IMAGE ? (layer as ImageHdu) : null)));

    this.layers$ = this.file$.pipe(
      map((file) => file?.layerIds),
      distinctUntilChanged((a, b) => a?.length === b?.length && a?.every((value, index) => b[index] === value)),
      switchMap((layerIds) => {
        if (!layerIds) return of([]);
        return combineLatest(
          layerIds.map((layerId) => {
            return this.store.select(DataFilesState.getHduById(layerId)).pipe(filter((layer) => layer != null));
          })
        ).pipe(map((layers) => layers.sort((a, b) => (a.order > b.order ? 1 : -1))));
      })
    );

    this.dataProvider$ = this.file$.pipe(
      map((file) => file?.dataProviderId),
      distinctUntilChanged(),
      switchMap((id) => {
        return this.store.select(DataProvidersState.getDataProviderById).pipe(map((fn) => fn(id)));
      })
    );

    this.fileModified$ = this.layers$.pipe(map((layers) => layers.some((layer) => layer.modified)));

    this.label$ = combineLatest(this.file$, this.layer$).pipe(
      map(([file, layer]) => {
        if (!layer && !file) {
          return '';
        }

        if (!layer || file?.layerIds?.length == 1) {
          return file?.name;
        } else {
          return layer.name || file.name;
        }
      })
    );

    this.tooltip$ = combineLatest(this.file$, this.layer$, this.dataProvider$).pipe(
      switchMap(([file, layer, dataProvider]) => {
        if (!layer || file?.layerIds.length == 1) {
          if (!dataProvider || !file?.assetPath) return of(file?.name);
          return of(`${dataProvider.displayName}${file.assetPath}`);
        }
        return this.label$;
      })
    );
  }

  ngOnInit(): void { }

  getHduLabel(file: DataFile, layer: IHdu) {
    return layer.name ? layer.name : `Layer ${file.layerIds.indexOf(layer.id)}`;
  }

  handleToggleExpanded($event: MouseEvent) {
    $event.stopPropagation();
    this.onToggleExpanded.emit({ fileId: this.fileId, layerId: this.layerId });
  }

  handleToggleSelection($event: MouseEvent) {
    $event.stopPropagation();
    this.onToggleSelected.emit({ fileId: this.fileId, layerId: this.layerId, $event: $event });
  }

  handleSave($event: MouseEvent) {
    $event.stopPropagation();
    this.onSave.emit({ fileId: this.fileId, layerId: this.layerId });
  }

  handleClose($event: MouseEvent) {
    $event.stopPropagation();
    this.onClose.emit({ fileId: this.fileId, layerId: this.layerId });
  }

  handleBlendModeChange(layerId: string, value: BlendMode) {
    this.store.dispatch(new UpdateBlendMode(layerId, value));
  }

  handleVisibilityChange(layerId: string, value: boolean) {
    this.store.dispatch(new UpdateVisibility(layerId, value));
  }

  handleColorMapChange(layerId: string, colorMapName: string) {
    this.store.dispatch(new UpdateColorMap(layerId, colorMapName));
  }
}
