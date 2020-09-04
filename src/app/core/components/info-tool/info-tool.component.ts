import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ChangeDetectionStrategy,
  HostBinding,
  Input,
  Output,
  EventEmitter
} from "@angular/core";

import { ImageFile, Header, getWidth, getHeight, getDegsPerPixel, getStartTime, getCenterTime, getExpLength, getObject, getTelescope, getFilter } from "../../../data-files/models/data-file";
import { DecimalPipe, DatePipe } from "@angular/common";
import { MatSlideToggleChange } from "@angular/material/slide-toggle";
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { WorkbenchPageBaseComponent } from '../../containers/workbench/workbench-page-base/workbench-page-base.component';
import { datetimeToJd } from '../../../utils/skynet-astro';

@Component({
  selector: "app-info-tool",
  templateUrl: "./info-tool.component.html",
  styleUrls: ["./info-tool.component.css"],
  // changeDetection: ChangeDetectionStrategy.OnPush
})
export class InfoToolComponent extends WorkbenchPageBaseComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() imageFile: ImageFile
  @Input() useSystemTime: boolean = true;
  @Input() showRawHeader: boolean = false;
  
  @Output() useSystemTimeChange: EventEmitter<boolean> = new EventEmitter();
  @Output() showRawHeaderChange: EventEmitter<boolean> = new EventEmitter();

  columnsDisplayed = ['key', 'value', 'comment'];

  constructor(private decimalPipe: DecimalPipe, private datePipe: DatePipe, store: Store, router: Router) {
    super(store, router);
  }

  getHeaderSummary() {
    if(!this.imageFile || !this.imageFile.header) return [];
    let result: Header = [];
      let width = getWidth(this.imageFile);
      let height = getHeight(this.imageFile);
      let hasWcs = this.imageFile.wcs.isValid();
      let degsPerPixel = getDegsPerPixel(this.imageFile);
      let startTime = getStartTime(this.imageFile);
      let expLength = getExpLength(this.imageFile);
      let centerTime = getCenterTime(this.imageFile);
      let telescope = getTelescope(this.imageFile);
      let object = getObject(this.imageFile);
      let filter = getFilter(this.imageFile);

      let systemTimeZone: string = (new Date()).getTimezoneOffset().toString();

      result.push({
        key: 'ID',
        value: `${this.imageFile.id}`,
        comment: ''
      });

      if(width && height) {
        result.push({
          key: 'Size',
          value: `${width} x ${height} pixels`,
          comment: ''
        })

        if(degsPerPixel) {
          let fovX = width*degsPerPixel;
          let fovY = height*degsPerPixel;
          let units = 'degs';
          if(fovX < 1 && fovY < 1) {
            units = 'arcmins';
            fovX *= 60;
            fovY *= 60;
          }
          result.push({
            key: 'FOV',
            value: `${this.decimalPipe.transform(fovX, '1.0-1')} x ${this.decimalPipe.transform(fovY, '1.0-1')} ${units}`,
            comment: ''
          })

          if(startTime) {
            result.push({
              key: 'Start',
              value: `${this.datePipe.transform(startTime, 'yyyy-MM-dd HH:mm:ss z', this.useSystemTime ? systemTimeZone : 'UTC')} (${datetimeToJd(startTime)} JD)`,
              comment: ''
            })
          }

          if(centerTime) {
            result.push({
              key: 'Center',
              value: `${this.datePipe.transform(centerTime, 'yyyy-MM-dd HH:mm:ss z', this.useSystemTime ? systemTimeZone : 'UTC')} (${datetimeToJd(centerTime)} JD)`,
              comment: ''
            })
          }

          if(telescope) {
            result.push({
              key: 'Telescope',
              value: `${telescope}`,
              comment: ''
            })
          }

          if(filter) {
            result.push({
              key: 'Filter',
              value: `${filter}`,
              comment: ''
            })
          }

          if(expLength !== undefined) {
            result.push({
              key: 'Exp Length',
              value: `${expLength}`,
              comment: ''
            })
          }
        }
      }

      result.push({
        key: 'WCS',
        value: hasWcs,
        comment: ''
      })
      

      return result;
  }

  
  ngOnInit() {
  }

  ngOnDestroy() {
  }

  ngAfterViewInit() {}

  onShowRawHeaderChange($event: MatSlideToggleChange) {
    this.showRawHeader = $event.checked;
    this.showRawHeaderChange.emit(this.showRawHeader);
  }

  onUseSystemTimeChange($event: MatSlideToggleChange) {
    this.useSystemTime = $event.checked;
    this.useSystemTimeChange.emit(this.useSystemTime);
  }
}
