import { Component, OnInit, Input } from '@angular/core';
import { MatDialog } from '@angular/material';
import { HelpDialogComponent } from '../help-dialog/help-dialog.component';
import { DataProvider } from '../../../data-providers/models/data-provider';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  @Input() authenticated: boolean = false;
  @Input() dataProviders: Array<DataProvider>;


  constructor(public dialog: MatDialog) { }

  ngOnInit() {
  }

  openQuickStartGuide() {
    this.dialog.open(HelpDialogComponent, {
      data: {},
      width: '800px',
      height: '600px',
    });
  }

}
