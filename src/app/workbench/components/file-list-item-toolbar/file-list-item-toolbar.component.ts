import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { MatCheckboxChange } from '@angular/material/checkbox';

@Component({
  selector: 'app-file-list-item-toolbar',
  templateUrl: './file-list-item-toolbar.component.html',
  styleUrls: ['./file-list-item-toolbar.component.scss']
})
export class FileListItemToolbarComponent implements OnInit {

  @Input()
  showSave: boolean = true;

  @Input()
  showClose: boolean = true;

  @Input()
  showSelect: boolean = true;

  @Input()
  modified: boolean = true;

  @Input()
  selected: boolean = true;

  @Output() onToggleSelection = new EventEmitter<MouseEvent>();
  @Output() onClose= new EventEmitter<MouseEvent>();
  @Output() onSave= new EventEmitter<MouseEvent>();

  constructor() { }

  ngOnInit(): void {
  }

}
