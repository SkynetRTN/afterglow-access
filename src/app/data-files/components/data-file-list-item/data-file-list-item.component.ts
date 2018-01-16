import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { DataFile } from '../../models/data-file';
import { DataFileType } from '../../models/data-file-type'

@Component({
  selector: 'app-data-file-list-item',
  templateUrl: './data-file-list-item.component.html',
  styleUrls: ['./data-file-list-item.component.css']
})
export class DataFileListItemComponent implements OnInit {
  @Input() file: DataFile;
  @Input() selected: boolean = false;
  @Output() select: EventEmitter<any> = new EventEmitter();

  constructor() { }

  ngOnInit() {
  }

  onSelect($event) {
    this.selected = !this.selected;
    this.select.emit($event);
  }

  isImageDataFile(file: DataFile) {
    return file.type == DataFileType.IMAGE;
  }

}
