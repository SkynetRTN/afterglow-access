import { Injectable } from "@angular/core";
import { Location } from "@angular/common";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { appConfig } from "../../../environments/environment";
import { Catalog } from "../models/catalog";
import { getCoreApiUrl } from "../../../environments/app-config";

@Injectable()
export class AfterglowCatalogService {
  constructor(private http: HttpClient, private location: Location) {}

  getCatalogs(): Observable<Catalog[]> {
    return this.http.get<any>(`${getCoreApiUrl(appConfig)}/catalogs`).pipe(
      map((res) =>
        res.map((c) => {
          return {
            name: c.name,
            displayName: c.display_name,
            numSources: c.num_sources,
            mags: c.mags,
            filterLookup: c.filter_lookup,
          };
        })
      )
    );
  }
}
