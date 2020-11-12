import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  Input,
  Output,
  EventEmitter,
} from "@angular/core";

import {
  Header,
  getWidth,
  getHeight,
  getDegsPerPixel,
  getStartTime,
  getCenterTime,
  getExpLength,
  getObject,
  getTelescope,
  getFilter,
  DataFile,
  ImageHdu,
  IHdu,
} from "../../../data-files/models/data-file";
import { DecimalPipe, DatePipe } from "@angular/common";
import { MatSlideToggleChange } from "@angular/material/slide-toggle";
import { Router } from "@angular/router";
import { Store } from "@ngxs/store";
import { datetimeToJd } from "../../../utils/skynet-astro";
import { FileInfoPanelConfig } from '../../models/file-info-panel';
import { BehaviorSubject, Subject, Observable, combineLatest } from 'rxjs';
import { map, distinctUntilChanged, filter } from 'rxjs/operators';
import { MatSelectChange } from '@angular/material/select';
import { HeaderEntry } from '../../../data-files/models/header-entry';

@Component({
  selector: "app-file-info-panel",
  templateUrl: "./file-info-panel.component.html",
  styleUrls: ["./file-info-panel.component.css"],
  // changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileInfoToolsetComponent
  implements OnInit, AfterViewInit, OnDestroy {
    @Input("hdu")
    set hdu(hdu: IHdu) {
      this.hdu$.next(hdu);
    }
    get hdu() {
      return this.hdu$.getValue();
    }
    private hdu$ = new BehaviorSubject<IHdu>(null);
  
   
  @Input("config")
  set config(config: FileInfoPanelConfig) {
    this.config$.next(config);
  }
  get config() {
    return this.config$.getValue();
  }
  private config$ = new BehaviorSubject<FileInfoPanelConfig>(null);

  @Output() configChange: EventEmitter<Partial<FileInfoPanelConfig>> = new EventEmitter();

  columnsDisplayed = ["key", "value", "comment"];
  headerSummary$: Observable<HeaderEntry[]>;

  constructor(
    private decimalPipe: DecimalPipe,
    private datePipe: DatePipe,
    store: Store,
    router: Router
  ) {

    let header$ = this.hdu$.pipe(
      filter(hdu => hdu != null),
      map(hdu => hdu.header),
      distinctUntilChanged()
    )

    this.headerSummary$ = combineLatest(
      header$,
      this.config$
    ).pipe(
      map(([header, config]) => {
        if (!header) return [];
        let imageLayer = this.hdu as ImageHdu;
        let result: HeaderEntry[] = [];
        let width = getWidth(header);
        let height = getHeight(header);
        let hasWcs = header.loaded && header.wcs.isValid();
        let degsPerPixel = getDegsPerPixel(header);
        let startTime = getStartTime(header);
        let expLength = getExpLength(header);
        let centerTime = getCenterTime(header);
        let telescope = getTelescope(header);
        let object = getObject(header);
        let filter = getFilter(header);

        let systemTimeZone: string = new Date().getTimezoneOffset().toString();

        result.push({
          key: "ID",
          value: `${this.hdu.id}`,
          comment: "",
        });

        if (width && height) {
          result.push({
            key: "Size",
            value: `${width} x ${height} pixels`,
            comment: "",
          });

          if (degsPerPixel) {
            let fovX = width * degsPerPixel;
            let fovY = height * degsPerPixel;
            let units = "degs";
            if (fovX < 1 && fovY < 1) {
              units = "arcmins";
              fovX *= 60;
              fovY *= 60;
            }
            result.push({
              key: "FOV",
              value: `${this.decimalPipe.transform(
                fovX,
                "1.0-1"
              )} x ${this.decimalPipe.transform(fovY, "1.0-1")} ${units}`,
              comment: "",
            });

            if (startTime) {
              result.push({
                key: "Start Time",
                value: `${this.datePipe.transform(
                  startTime,
                  "yyyy-MM-dd HH:mm:ss z",
                  this.config.useSystemTime ? systemTimeZone : "UTC"
                )}`,
                comment: "",
              });
              result.push({
                key: "Start JD",
                value: `${datetimeToJd(startTime)} JD`,
                comment: "",
              });
            }

            if (centerTime) {
              result.push({
                key: "Center Time",
                value: `${this.datePipe.transform(
                  centerTime,
                  "yyyy-MM-dd HH:mm:ss z",
                  this.config.useSystemTime ? systemTimeZone : "UTC"
                )}`,
                comment: "",
              });
              result.push({
                key: "Center JD",
                value: `${datetimeToJd(centerTime)} JD`,
                comment: "",
              });
            }

            if (telescope) {
              result.push({
                key: "Telescope",
                value: `${telescope}`,
                comment: "",
              });
            }

            if (filter) {
              result.push({
                key: "Filter",
                value: `${filter}`,
                comment: "",
              });
            }

            if (expLength !== undefined) {
              result.push({
                key: "Exp Length",
                value: `${expLength}`,
                comment: "",
              });
            }
          }
        }

        result.push({
          key: "WCS",
          value: hasWcs,
          comment: "",
        });

        return result;
      })
    )
  }
  ngOnInit() { }

  ngOnDestroy() { }

  ngAfterViewInit() { }

  onShowRawHeaderChange($event: MatSlideToggleChange) {
    this.configChange.emit({ showRawHeader: $event.checked })
  }

  onUseSystemTimeChange($event: MatSlideToggleChange) {
    this.configChange.emit({ useSystemTime: $event.checked })
  }
}
