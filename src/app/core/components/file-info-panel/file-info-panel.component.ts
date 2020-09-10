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
  ImageFile,
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
} from "../../../data-files/models/data-file";
import { DecimalPipe, DatePipe } from "@angular/common";
import { MatSlideToggleChange } from "@angular/material/slide-toggle";
import { Router } from "@angular/router";
import { Store } from "@ngxs/store";
import { datetimeToJd } from "../../../utils/skynet-astro";
import { FileInfoPanelConfig } from '../../models/file-info-panel';

@Component({
  selector: "app-file-info-panel",
  templateUrl: "./file-info-panel.component.html",
  styleUrls: ["./file-info-panel.component.css"],
  // changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileInfoToolsetComponent
  implements OnInit, AfterViewInit, OnDestroy {
  @Input() file: ImageFile;
  @Input() config: FileInfoPanelConfig;

  @Output() configChange: EventEmitter<Partial<FileInfoPanelConfig>> = new EventEmitter();

  columnsDisplayed = ["key", "value", "comment"];

  constructor(
    private decimalPipe: DecimalPipe,
    private datePipe: DatePipe,
    store: Store,
    router: Router
  ) {}

  getHeaderSummary() {
    if (!this.file || !this.file.header) return [];
    let result: Header = [];
    let width = getWidth(this.file);
    let height = getHeight(this.file);
    let hasWcs = this.file.wcs.isValid();
    let degsPerPixel = getDegsPerPixel(this.file);
    let startTime = getStartTime(this.file);
    let expLength = getExpLength(this.file);
    let centerTime = getCenterTime(this.file);
    let telescope = getTelescope(this.file);
    let object = getObject(this.file);
    let filter = getFilter(this.file);

    let systemTimeZone: string = new Date().getTimezoneOffset().toString();

    result.push({
      key: "ID",
      value: `${this.file.id}`,
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
            key: "Start",
            value: `${this.datePipe.transform(
              startTime,
              "yyyy-MM-dd HH:mm:ss z",
              this.config.useSystemTime ? systemTimeZone : "UTC"
            )} (${datetimeToJd(startTime)} JD)`,
            comment: "",
          });
        }

        if (centerTime) {
          result.push({
            key: "Center",
            value: `${this.datePipe.transform(
              centerTime,
              "yyyy-MM-dd HH:mm:ss z",
              this.config.useSystemTime ? systemTimeZone : "UTC"
            )} (${datetimeToJd(centerTime)} JD)`,
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
  }

  ngOnInit() {}

  ngOnDestroy() {}

  ngAfterViewInit() {}

  onShowRawHeaderChange($event: MatSlideToggleChange) {
    this.configChange.emit({showRawHeader: $event.checked})
  }

  onUseSystemTimeChange($event: MatSlideToggleChange) {
    this.configChange.emit({useSystemTime: $event.checked})
  }
}
