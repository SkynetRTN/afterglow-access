import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';

import { Store } from '@ngrx/store';
import * as fromRoot from '../../../../reducers';
import * as fromDataProviders from '../../../../data-providers/reducers'
import * as dataProviderActions from '../../../../data-providers/actions/data-provider';

import { DataProvider } from '../../../../data-providers/models/data-provider'

@Component({
  selector: 'app-data-providers-index-page',
  templateUrl: './data-providers-index-page.component.html',
  styleUrls: ['./data-providers-index-page.component.css']
})
export class DataProvidersIndexPageComponent implements OnInit, AfterViewInit {
  dataProviders$: Observable<DataProvider[]>;

  constructor(private store: Store<fromRoot.State>) {
    this.dataProviders$ = store.select(fromDataProviders.getDataProvidersState).map(state => state.dataProviders);
  }

  ngOnInit() {
    this.store.dispatch(new dataProviderActions.LoadDataProviders());
  }

  ngAfterViewInit() {
  }

}
