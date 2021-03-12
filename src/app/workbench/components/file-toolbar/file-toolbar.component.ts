import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-file-toolbar',
  templateUrl: './file-toolbar.component.html',
  styleUrls: ['./file-toolbar.component.scss']
})
export class FileToolbarComponent implements OnInit {

  @Input()
  showSave: boolean = false;

  @Input()
  showClose: boolean = false;

  @Input()
  showModified: boolean = false;

  @Input()
  modified: boolean = false;

  @Output() onSave= new EventEmitter<MouseEvent>();
  @Output() onClose= new EventEmitter<MouseEvent>();

  constructor() { }

  ngOnInit(): void {
  }

}
