import { Injectable } from "@angular/core";
import { Location } from "@angular/common";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { environment } from "../../../environments/environment";

import { DataProvider } from "../../data-providers/models/data-provider";
import { DataProviderAsset } from "../../data-providers/models/data-provider-asset";

@Injectable()
export class AfterglowDataProviderService {
  constructor(private http: HttpClient, private location: Location) {}

  getDataProviders(): Observable<DataProvider[]> {
    return this.http
      .get<any[]>(
        this.location.prepareExternalUrl(`${environment.apiUrl}/data-providers`)
      )
      .pipe(
        map(res =>
          res.map(r => {
            return {
              id: r.id,
              name: r.display_name,
              icon: r.icon,
              description: r.description,
              columns: r.columns.map(rcol => {
                return {
                  name: rcol.name,
                  fieldName: rcol.field_name,
                  sortable: rcol.sortable
                };
              }),
              sortBy: r.sort_by,
              sortAsc: r.sort_asc,
              browseable: r.browseable,
              searchable: r.searchable,
              readonly: r.readonly,
              quota: r.quota,
              usage: r.usage
            };
          })
        )
      );
  }

  getAssets(dataProviderId: string, path: string) {
    let params: HttpParams = new HttpParams();
    if (path) params = params.set("path", path);

    return this.http
      .get<any[]>(
        this.location.prepareExternalUrl(
          `${environment.apiUrl}/data-providers/${dataProviderId}/assets`
        ),
        { params: params }
      )
      .pipe(
        map(resp =>
          resp.map(r => {
            let asset: DataProviderAsset = {
              name: r.name,
              collection: r.collection,
              path: r.path,
              metadata: r.metadata
            };
            return asset;
          })
        )
      );
  }
}
