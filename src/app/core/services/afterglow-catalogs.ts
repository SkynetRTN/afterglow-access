import { Injectable } from "@angular/core";
import { Location } from "@angular/common";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { environment } from "../../../environments/environment";
import { Catalog } from "../models/catalog";

@Injectable()
export class AfterglowCatalogService {
  constructor(private http: HttpClient, private location: Location) {}

  getCatalogs(): Observable<Catalog[]> {
    return this.http
      .get<any[]>(
        this.location.prepareExternalUrl(`${environment.apiUrl}/catalogs`)
      )
      .pipe(
        map(res =>
          Object.keys(res).map(key => {
            let r = res[key];
            return {
              name: r.name,
              displayName: r.display_name,
              numSources: r.num_sources,
              mags: r.mags,
              filterLookup: r.filter_lookup
            };
          })
        )
      );
  }
}
