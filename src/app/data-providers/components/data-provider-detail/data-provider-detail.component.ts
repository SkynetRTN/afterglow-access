import { Component, OnInit, Input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import { DataProvider } from '../../models/data-provider'

@Component({
  selector: 'app-data-provider-detail',
  templateUrl: './data-provider-detail.component.html',
  styleUrls: ['./data-provider-detail.component.css']
})
export class DataProviderDetailComponent implements OnInit {
  @Input() dataProvider: DataProvider;


  constructor(private sanitizer: DomSanitizer) { }

  ngOnInit() {
  }

}
