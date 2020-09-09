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

export interface FileInfoToolsetState  {
  file: ImageFile;
}

export interface FileInfoToolsetConfig  {
  useSystemTime: boolean;
  showRawHeader: boolean;
}

@Component({
  selector: "app-file-info-toolset",
  templateUrl: "./file-info-toolset.component.html",
  styleUrls: ["./file-info-toolset.component.css"],
  // changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileInfoToolsetComponent
  implements OnInit, AfterViewInit, OnDestroy {
  @Input() state: FileInfoToolsetState;
  @Input() config: FileInfoToolsetConfig;

  columnsDisplayed = ["key", "value", "comment"];

  constructor(
    private decimalPipe: DecimalPipe,
    private datePipe: DatePipe,
    store: Store,
    router: Router
  ) {}

  getHeaderSummary() {
    if (!this.state.file || !this.state.file.header) return [];
    let result: Header = [];
    let width = getWidth(this.state.file);
    let height = getHeight(this.state.file);
    let hasWcs = this.state.file.wcs.isValid();
    let degsPerPixel = getDegsPerPixel(this.state.file);
    let startTime = getStartTime(this.state.file);
    let expLength = getExpLength(this.state.file);
    let centerTime = getCenterTime(this.state.file);
    let telescope = getTelescope(this.state.file);
    let object = getObject(this.state.file);
    let filter = getFilter(this.state.file);

    let systemTimeZone: string = new Date().getTimezoneOffset().toString();

    result.push({
      key: "ID",
      value: `${this.state.file.id}`,
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
    this.config.showRawHeader = $event.checked;
    // this.config.showRawHeaderChange.emit(this.config.showRawHeader);
  }

  onUseSystemTimeChange($event: MatSlideToggleChange) {
    this.config.useSystemTime = $event.checked;
    // this.config.useSystemTimeChange.emit(this.config.useSystemTime);
  }
}
