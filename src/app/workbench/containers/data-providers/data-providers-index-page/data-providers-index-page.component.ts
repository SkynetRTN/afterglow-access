import { Component, OnInit, AfterViewInit } from "@angular/core";

import { Observable } from "rxjs";
import { map } from "rxjs/operators";

import { DataProvider } from "../../../../data-providers/models/data-provider";
import { Store } from "@ngxs/store";
import { DataProvidersState } from "../../../../data-providers/data-providers.state";
import { LoadDataProviders } from "../../../../data-providers/data-providers.actions";

@Component({
  selector: "app-data-providers-index-page",
  templateUrl: "./data-providers-index-page.component.html",
  styleUrls: ["./data-providers-index-page.component.css"],
})
export class DataProvidersIndexPageComponent implements OnInit, AfterViewInit {
  dataProviders$: Observable<DataProvider[]>;

  constructor(private store: Store) {
    this.dataProviders$ = store.select(DataProvidersState.getDataProviders);
  }

  ngOnInit() {
    this.store.dispatch(new LoadDataProviders());
  }

  ngAfterViewInit() {}
}
