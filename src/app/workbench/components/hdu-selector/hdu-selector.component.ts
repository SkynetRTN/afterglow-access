import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { MatSelectChange } from '@angular/material/select';
import { DataFile, getFilter, IHdu, ImageHdu } from '../../../data-files/models/data-file';
import { BehaviorSubject, merge, Observable, Subject, concat, combineLatest } from 'rxjs';
import { HduType } from '../../../data-files/models/data-file-type';
import { Store } from '@ngxs/store';
import { DataFilesState } from '../../../data-files/data-files.state';
import { switchMap, map, debounce, debounceTime, distinctUntilChanged, concatAll, tap, take } from 'rxjs/operators';
import { SetSelectedHduId } from '../../workbench.actions';
import { MatSelectionListChange } from '@angular/material/list';
import {
  LoadLibrary,
  UpdateAlpha,
  UpdateBlendMode,
  UpdateColorMap,
  UpdateNormalizer,
  UpdateVisibility,
} from '../../../data-files/data-files.actions';
import { MatSliderChange } from '@angular/material/slider';
import { BlendMode } from '../../../data-files/models/blend-mode';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { AfterglowDataFileService } from '../../services/afterglow-data-files';
import {
  grayColorMap,
  rainbowColorMap,
  coolColorMap,
  heatColorMap,
  redColorMap,
  greenColorMap,
  blueColorMap,
  aColorMap,
} from '../../../data-files/models/color-map';

@Component({
  selector: 'app-hdu-selector',
  templateUrl: './hdu-selector.component.html',
  styleUrls: ['./hdu-selector.component.scss'],
})
export class HduSelectorComponent implements OnInit {
  @Input()
  selectedHduId: string;

  @Input()
  hduType: HduType = null;

  @Input('fileId')
  set fileId(fileId: string) {
    this.fileId$.next(fileId);
  }
  get fileId() {
    return this.fileId$.getValue();
  }
  private fileId$ = new BehaviorSubject<string>(null);

  @Output() selectedHduIdChange = new EventEmitter<string>();

  HduType = HduType;
  colorMaps = [
    grayColorMap,
    rainbowColorMap,
    coolColorMap,
    heatColorMap,
    redColorMap,
    greenColorMap,
    blueColorMap,
    aColorMap,
  ];

  blendModeOptions = [
    { label: 'Normal', value: BlendMode.Normal },
    { label: 'Screen', value: BlendMode.Screen },
    { label: 'Luminosity', value: BlendMode.Luminosity },
  ];
  file$: Observable<DataFile>;
  hdus$: Observable<IHdu[]>;
  imageHduEntities$: Observable<{ [hduId: string]: ImageHdu }>;
  nextAlpha$ = new Subject<{ hduId: string; value: number }>();

  constructor(private store: Store, private fileService: AfterglowDataFileService) {
    this.file$ = this.fileId$.pipe(
      switchMap((fileId) => this.store.select(DataFilesState.getFileById).pipe(map((fn) => fn(fileId))))
    );

    let hduIds$ = this.file$.pipe(
      map((file) => file.hduIds),
      distinctUntilChanged()
    );

    this.hdus$ = hduIds$.pipe(
      switchMap((hduIds) =>
        combineLatest(
          hduIds.map((hduId) => this.store.select(DataFilesState.getHduById).pipe(map((fn) => fn(hduId))))
        ).pipe(map((hdus) => hdus.sort((a, b) => (a.order > b.order ? 1 : -1))))
      )
    );

    this.imageHduEntities$ = this.hdus$.pipe(
      map((hdus) => hdus.filter((hdu) => hdu.hduType == HduType.IMAGE) as ImageHdu[]),
      map((hdus) =>
        hdus.reduce((result, value) => {
          result[value.id] = value;
          return result;
        }, {})
      )
    );

    this.nextAlpha$.pipe(distinctUntilChanged(), debounceTime(1000)).subscribe((result) => {
      this.store.dispatch(new UpdateAlpha(result.hduId, result.value));
    });
  }

  ngOnInit(): void {}

  onSelectedHduIdChange($event: MatSelectionListChange) {
    this.selectedHduIdChange.emit($event.option.value);
    let hdu = this.store.selectSnapshot(DataFilesState.getHduEntities)[$event.option.value];
    this.store.dispatch(new SetSelectedHduId(hdu.fileId, hdu.id));
  }

  onAlphaChange(hdu: ImageHdu, value: number) {
    value = Math.min(1.0, Math.max(0, value));
    // hdu.alpha = value;
    this.nextAlpha$.next({ hduId: hdu.id, value: value });
  }

  onBlendModeChange(hdu: ImageHdu, value: BlendMode) {
    this.store.dispatch(new UpdateBlendMode(hdu.id, value));
  }

  onVisibilityBtnClick($event: MouseEvent, hduId: string, value: boolean) {
    $event.stopPropagation();
    this.store.dispatch(new UpdateVisibility(hduId, value));
  }

  onColorMapChange(hdu: ImageHdu, colorMap: string) {
    this.store.dispatch(new UpdateColorMap(hdu.id, colorMap));
  }

  onChannelDrop($event: CdkDragDrop<IHdu[]>) {
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

  getHduLabel(hdu: IHdu, index: number) {
    return combineLatest(
      this.store.select(DataFilesState.getHduById).pipe(map((fn) => fn(hdu.id))),
      this.store.select(DataFilesState.getHeaderByHduId).pipe(map((fn) => fn(hdu.id)))
    ).pipe(
      map(([hdu, header]) => {
        let name = hdu && hdu.name ? hdu.name : `Layer ${index}`;
        let filter = header && (getFilter(header) as string);
        return name;
        // return name + (filter ? `- ${filter}` : '')
      })
    );
  }
}
