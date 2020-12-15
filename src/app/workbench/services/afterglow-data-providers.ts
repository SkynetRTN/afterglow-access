import { Injectable } from "@angular/core";
import { Location } from "@angular/common";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { appConfig } from "../../../environments/environment";

import { DataProvider } from "../../data-providers/models/data-provider";
import { DataProviderAsset } from "../../data-providers/models/data-provider-asset";
import { getCoreApiUrl } from "../../../environments/app-config";
import UploadInfo from 'devextreme/file_management/upload_info';

@Injectable()
export class AfterglowDataProviderService {
  constructor(private http: HttpClient, private location: Location) {}

  getDataProviders(): Observable<DataProvider[]> {
    return this.http.get<any>(`${getCoreApiUrl(appConfig)}/data-providers`).pipe(
      map((res) =>
        res.map((r) => {
          return {
            id: r.id,
            name: r.display_name,
            icon: r.icon,
            description: r.description,
            columns: r.columns.map((rcol) => {
              return {
                name: rcol.name,
                fieldName: rcol.field_name,
                sortable: rcol.sortable,
              };
            }),
            sortBy: r.sort_by,
            sortAsc: r.sort_asc,
            browseable: r.browseable,
            searchable: r.searchable,
            readonly: r.readonly,
            quota: r.quota,
            usage: r.usage,
          };
        })
      )
    );
  }

  getAssets(dataProviderId: string, path: string) : Observable<DataProviderAsset[]> {
    let params: HttpParams = new HttpParams();
    if (path) params = params.set("path", path);

    return this.http
      .get<any>(`${getCoreApiUrl(appConfig)}/data-providers/${dataProviderId}/assets?` + params.toString())
      .pipe(
        map((resp) =>
          resp.map((r) => {
            let asset: DataProviderAsset = {
              name: r.name,
              isDirectory: r.collection,
              assetPath: r.path,
              metadata: r.metadata,
              dataProviderId: dataProviderId
            };
            return asset;
          })
        )
      );
  }

  downloadAsset(dataProviderId: string, path: string) : Observable<any> {
    let params: HttpParams = new HttpParams();
    params = params.set("path", path);

    return this.http
    .get(`${getCoreApiUrl(appConfig)}/data-providers/${dataProviderId}/assets/data?` + params.toString(),{
      responseType: 'blob'
    })
  }

  deleteAsset(dataProviderId: string, path: string, recursive: boolean=false) : Observable<any> {
    let params: HttpParams = new HttpParams();
    params = params.set("path", path);
    if(recursive) {
      params = params.set('force', 'true');
    }
    

    return this.http
    .delete(`${getCoreApiUrl(appConfig)}/data-providers/${dataProviderId}/assets?` + params.toString())
  }

  updateAssetName(dataProviderId: string, path: string, name: string) : Observable<any> {
    let params: HttpParams = new HttpParams();
    params = params.set("path", path);

    return this.http
    .put(`${getCoreApiUrl(appConfig)}/data-providers/${dataProviderId}/assets?` + params.toString(), {name: name})
  }

  createCollectionAsset(dataProviderId: string, path: string) : Observable<any> {
    let params: HttpParams = new HttpParams();
    params = params.set("path", path);

    return this.http
    .post(`${getCoreApiUrl(appConfig)}/data-providers/${dataProviderId}/assets?` + params.toString(), null)
  }

  createAsset(dataProviderId: string, path: string, file: File, uploadInfo: UploadInfo) : Observable<any> {
    let params: HttpParams = new HttpParams();
    params = params.set("path", path);

    let formData = new FormData();
    formData.append('file', uploadInfo.chunkBlob)

    return this.http
    .post(`${getCoreApiUrl(appConfig)}/data-providers/${dataProviderId}/assets/data?` + params.toString(), formData)
  }
}
