import { Component, OnInit, Input, EventEmitter, Output } from "@angular/core";
import { MatSelectChange } from "@angular/material/select";
import { IHdu } from "../../../data-files/models/data-file";
import { BehaviorSubject, Observable } from "rxjs";
import { HduType } from '../../../data-files/models/data-file-type';
import { Store } from '@ngxs/store';
import { DataFilesState } from '../../../data-files/data-files.state';
import { switchMap, map } from 'rxjs/operators';
import { SetSelectedHduId } from '../../workbench.actions';

@Component({
  selector: "app-hdu-selector",
  templateUrl: "./hdu-selector.component.html",
  styleUrls: ["./hdu-selector.component.scss"],
})
export class HduSelectorComponent implements OnInit {
  @Input()
  selectedHduId: string;

  @Input()
  hduType: HduType = null;

  @Input("fileId")
  set fileId(fileId: string) {
    this.fileId$.next(fileId);
  }
  get fileId() {
    return this.fileId$.getValue();
  }
  private fileId$ = new BehaviorSubject<string>(null);

  @Output() selectedHduIdChange = new EventEmitter<string>();

  hdus$: Observable<IHdu[]>;

  constructor(private store: Store) {
    this.hdus$ = this.fileId$.pipe(
      switchMap(fileId => this.store.select(DataFilesState.getFileById).pipe(
        map(fn => fn(fileId)),
        map(file => {
          let hduEntities = this.store.selectSnapshot(DataFilesState.getHduEntities);
          let hdus = file.hduIds.map(hduId => hduEntities[hduId]);
          if(this.hduType) {
            hdus = hdus.filter(hdu => hdu.hduType == this.hduType);
          }
          return hdus;
        })
      ))
    )
  }

  ngOnInit(): void {}

  onSelectedHduIdChange($event: MatSelectChange) {
    this.selectedHduIdChange.emit($event.value);
    this.store.dispatch(new SetSelectedHduId(this.store.selectSnapshot(DataFilesState.getHduEntities)[$event.value].fileId, $event.value));

  }
}
