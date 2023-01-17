import { Component, OnInit } from '@angular/core';
import { Store } from '@ngxs/store';
import { LoadCatalogs } from 'src/app/workbench/workbench.actions';

@Component({
  selector: 'app-settings-page',
  templateUrl: './settings-page.component.html',
  styleUrls: ['./settings-page.component.scss']
})
export class SettingsPageComponent implements OnInit {

  constructor(private store: Store) {
    this.store.dispatch(new LoadCatalogs())
  }

  ngOnInit(): void {
  }

}
