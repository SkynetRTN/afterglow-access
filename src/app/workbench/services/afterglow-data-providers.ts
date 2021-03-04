import { Injectable } from "@angular/core";
import { Location } from "@angular/common";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

import { DataProvider } from "../../data-providers/models/data-provider";
import { DataProviderAsset } from "../../data-providers/models/data-provider-asset";
import { getCoreApiUrl } from '../../afterglow-config';
import { AfterglowConfigService } from '../../afterglow-config.service';

export interface UploadInfo {
  bytesUploaded: number;
  chunkCount: number;
  customData: any;
  chunkBlob: Blob;
  chunkIndex: number;
}

@Injectable()
export class AfterglowDataProviderService {
  constructor(private http: HttpClient, private config: AfterglowConfigService) {}

  getDataProviders(): Observable<DataProvider[]> {
    return this.http.get<DataProvider[]>(`${getCoreApiUrl(this.config)}/data-providers`)
  }

  getAssets(dataProviderId: string, path: string): Observable<DataProviderAsset[]> {
    if (path && path[0] == "/") {
      path = path.slice(1);
    }
    let params: HttpParams = new HttpParams();
    if (path) params = params.set("path", path);

    return this.http
      .get<any>(`${getCoreApiUrl(this.config)}/data-providers/${dataProviderId}/assets?` + params.toString())
      .pipe(
        map((resp) =>
          resp.map((r) => {
            let asset: DataProviderAsset = {
              name: r.name,
              isDirectory: r.collection,
              assetPath: "/" + r.path,
              metadata: r.metadata,
              dataProviderId: dataProviderId,
            };
            return asset;
          })
        )
      );
  }

  downloadAsset(dataProviderId: string, path: string): Observable<any> {
    if (path && path[0] == "/") {
      path = path.slice(1);
    }
    let params: HttpParams = new HttpParams();
    params = params.set("path", path);

    return this.http.get(`${getCoreApiUrl(this.config)}/data-providers/${dataProviderId}/assets/data?` + params.toString(), {
      responseType: "blob",
    });
  }

  deleteAsset(dataProviderId: string, path: string, recursive: boolean = false) {
    if (path && path[0] == "/") {
      path = path.slice(1);
    }
    let params: HttpParams = new HttpParams();
    params = params.set("path", path);
    if (recursive) {
      params = params.set("force", "1");
    }

    return this.http.delete(`${getCoreApiUrl(this.config)}/data-providers/${dataProviderId}/assets?` + params.toString());
  }

  moveAsset(dataProviderId: string, path: string, newDataProviderId: string, newPath: string): Observable<any> {
    if (path && path[0] == "/") {
      path = path.slice(1);
    }
    if (newPath && newPath[0] == "/") {
      newPath = path.slice(1);
    }
    return this.copyAsset(dataProviderId, path, newDataProviderId, newPath, false);
  }

  copyAsset(
    dataProviderId: string,
    path: string,
    newDataProviderId: string,
    newPath: string,
    keepOriginal: boolean = true
  ): Observable<any> {
    if (path && path[0] == "/") {
      path = path.slice(1);
    }
    if (newPath && newPath[0] == "/") {
      newPath = newPath.slice(1);
    }
    let params: HttpParams = new HttpParams();
    params = params.set("path", newPath);
    if (!keepOriginal) {
      params = params.set("move", "1");
    }

    return this.http.post(
      `${getCoreApiUrl(this.config)}/data-providers/${newDataProviderId}/assets/data?` + params.toString(),
      {
        src_provider_id: dataProviderId,
        src_path: path,
      }
    );
  }

  renameAsset(dataProviderId: string, path: string, name: string): Observable<any> {
    if (path && path[0] == "/") {
      path = path.slice(1);
    }
    let params: HttpParams = new HttpParams();
    params = params.set("path", path);

    return this.http.put(`${getCoreApiUrl(this.config)}/data-providers/${dataProviderId}/assets?` + params.toString(), {
      name: name,
    });
  }

  createCollectionAsset(dataProviderId: string, path: string): Observable<any> {
    if (path && path[0] == "/") {
      path = path.slice(1);
    }
    let params: HttpParams = new HttpParams();
    params = params.set("path", path);

    return this.http.post(
      `${getCoreApiUrl(this.config)}/data-providers/${dataProviderId}/assets/data?` + params.toString(),
      null
    );
  }

  createAsset(dataProviderId: string, path: string, file: File, uploadInfo: UploadInfo): Observable<any> {
    if (path && path[0] == "/") {
      path = path.slice(1);
    }
    let params: HttpParams = new HttpParams();
    params = params.set("path", path);

    let formData = new FormData();
    formData.append("file", uploadInfo.chunkBlob);

    return this.http.post(
      `${getCoreApiUrl(this.config)}/data-providers/${dataProviderId}/assets/data?` + params.toString(),
      formData
    );
  }

  saveFile(fileId: string, dataProviderId: string, path: string, create: boolean = false) {
    if (path && path[0] == "/") {
      path = path.slice(1);
    }
    let params: HttpParams = new HttpParams();
    params = params.set("path", path);
    params = params.set("group_name", fileId);

    let uri = `${getCoreApiUrl(this.config)}/data-providers/${dataProviderId}/assets/data?` + params.toString();
    if (!create) {
      return this.http.put(uri, null);
    } else {
      return this.http.post(uri, null);
    }
  }

  saveFileAs(fileId: string, dataProviderId: string, path: string) {
    return this.saveFile(fileId, dataProviderId, path, true);
  }
}
