import { Injectable } from "@angular/core";
import { Location } from "@angular/common";
import { HttpClient, HttpParams, HttpHeaders } from "@angular/common/http";
import { appConfig } from "../../../environments/environment";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { DataFile, Header, PixelPrecision, PixelType, ImageHdu } from "../../data-files/models/data-file";
import { ImageHist } from "../../data-files/models/image-hist";
import { Source, PosType } from "../models/source";
import { getCoreApiUrl } from "../../../environments/app-config";
import { HduType } from "../../data-files/models/data-file-type";
import { Region } from "../../data-files/models/region";
import { HeaderEntry } from "../../data-files/models/header-entry";

export interface CoreDataFile {
  id: string;
  type: HduType;
  name: string;
  dataProvider: string;
  assetPath: string;
  groupId: string;
  groupOrder: number;
  modified: boolean;
}

// function createDataFile(id: string, name: string, dataProviderId: string, assetPath: string): DataFile {
//   return {
//     id: id,
//     name: name,
//     dataProviderId: dataProviderId,
//     assetPath: assetPath,
//     modified: false,
//     hdus: [{
//       hduType: HduType.IMAGE,
//       header: null,
//       wcs: null,
//       headerLoaded: false,
//       headerLoading: false,
//       tilesInitialized: false,
//       tiles: null,
//       hist: null,
//       histLoaded: false,
//       histLoading: false,
//       tileWidth: appConfig.tileSize,
//       tileHeight: appConfig.tileSize,
//     } as ImageHdu]
//   };
// }

@Injectable()
export class AfterglowDataFileService {
  private SOURCE_ID = 0;

  constructor(private http: HttpClient, private location: Location) {}

  removeFile(fileId: string): Observable<null> {
    return this.http.delete(`${getCoreApiUrl(appConfig)}/data-files/${fileId}`).pipe(map((res) => null));
  }

  updateFile(fileId: string, changes: Partial<CoreDataFile>): Observable<null> {
    return this.http.put(`${getCoreApiUrl(appConfig)}/data-files/${fileId}`, changes).pipe(map((res) => null));
  }

  getFiles(): Observable<CoreDataFile[]> {
    return this.http.get<CoreDataFile[]>(`${getCoreApiUrl(appConfig)}/data-files`);
  }

  createFromDataProviderAsset(providerId: string, assetPath: string) {
    // assetPath = assetPath.replace("\\", "/");
    let body = { provider_id: providerId, path: assetPath };
    return this.http.post(`${getCoreApiUrl(appConfig)}/data-files`, body);
  }

  getHeader(fileId: string): Observable<HeaderEntry[]> {
    return this.http.get<HeaderEntry[]>(`${getCoreApiUrl(appConfig)}/data-files/${fileId}/header`);
  }

  getHist(fileId: string): Observable<{data: Uint32Array, minBin: number, maxBin: number}> {
    return this.http.get<any>(`${getCoreApiUrl(appConfig)}/data-files/${fileId}/hist`).pipe(
      map((res) => {
        return {
          data: res.data,
          minBin: res.minBin,
          maxBin: res.maxBin
        };
      })
    );
  }

  getPixels(hduId: string, precision: PixelPrecision, region: Region = null): Observable<PixelType> {
    let params: HttpParams = new HttpParams();
    if (region) {
      params = params
        .set("x", (region.x + 1).toString())
        .set("y", (region.y + 1).toString())
        .set("width", region.width.toString())
        .set("height", region.height.toString());
    }
    let headers: HttpHeaders = new HttpHeaders({});

    return this.http
      .get(`${getCoreApiUrl(appConfig)}/data-files/${hduId}/pixels`, {
        headers: headers,
        responseType: "arraybuffer",
        params: params,
      })
      .pipe(
        map((resp) => {
          switch (precision) {
            case PixelPrecision.uint8: {
              return new Uint8Array(resp);
            }
            case PixelPrecision.uint16: {
              return new Uint16Array(resp);
            }
            case PixelPrecision.uint32: {
              return new Uint32Array(resp);
            }
            case PixelPrecision.float32: {
              return new Float32Array(resp);
            }
            case PixelPrecision.float64: {
              return new Float64Array(resp);
            }
          }
        })
      );
  }

  getSonificationUri(fileId: string, region: Region, duration: number, toneCount: number) {
    return `${getCoreApiUrl(appConfig)}/data-files/${fileId}/sonification?x=${Math.floor(region.x) + 1}&y=${
      Math.floor(region.y) + 1
    }&width=${Math.floor(region.width)}&height=${Math.floor(region.height)}&tempo=${Math.ceil(
      region.height / duration
    )}&num_tones=${Math.floor(toneCount)}&index_sounds=1`;
  }

  private parseSource(s: any): Source {
    let sourceId = this.SOURCE_ID++;
    let posType = PosType.PIXEL;
    let primaryCoord = s.x;
    let secondaryCoord = s.y;
    if (s.ra_hours != null && s.dec_degs != null) {
      posType = PosType.SKY;
      primaryCoord = s.ra_hours;
      secondaryCoord = s.dec_degs;
    }
    let source: Source = {
      id: sourceId.toString(),
      hduId: null,
      label: sourceId.toString(),
      objectId: null,
      pmEpoch: null,
      posType: posType,
      primaryCoord: primaryCoord,
      secondaryCoord: secondaryCoord,
      pm: null,
      pmPosAngle: null,
    };
    return source;
  }
}
