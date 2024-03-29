import { Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PixelPrecision, PixelType } from '../../data-files/models/data-file';
import { Source, PosType } from '../models/source';
import { LayerType } from '../../data-files/models/data-file-type';
import { Region } from '../../data-files/models/region';
import { HeaderEntry } from '../../data-files/models/header-entry';
import { AfterglowConfigService } from '../../afterglow-config.service';
import { getCoreApiUrl } from '../../afterglow-config';
import { CoreApiResponse } from '../../utils/core-api-response';

export interface CoreDataFile {
  id: string;
  type: LayerType;
  name: string;
  dataProvider: string;
  assetPath: string;
  groupName: string;
  groupOrder: number;
  modified: boolean;
}

@Injectable()
export class AfterglowDataFileService {
  private SOURCE_ID = 0;

  constructor(private http: HttpClient, private config: AfterglowConfigService) { }

  removeFile(fileId: string): Observable<null> {
    return this.http.delete(`${getCoreApiUrl(this.config)}/data-files/${fileId}`).pipe(map((res) => null));
  }

  updateFile(fileId: string, changes: Partial<CoreDataFile>): Observable<null> {
    return this.http.put(`${getCoreApiUrl(this.config)}/data-files/${fileId}`, changes).pipe(map((res) => null));
  }

  getFiles() {
    return this.http.get<CoreApiResponse<CoreDataFile[]>>(`${getCoreApiUrl(this.config)}/data-files/`);
  }

  createFromDataProviderAsset(providerId: string, assetPath: string) {
    // assetPath = assetPath.replace("\\", "/");
    let body = { provider_id: providerId, path: assetPath };
    return this.http.post(`${getCoreApiUrl(this.config)}/data-files/`, body);
  }

  createFromFileId(name: string, fileId: string) {
    let body = { name: name, file_id: fileId };
    return this.http.post(`${getCoreApiUrl(this.config)}/data-files/`, body);
  }

  getHeader(fileId: string) {
    return this.http.get<CoreApiResponse<HeaderEntry[]>>(`${getCoreApiUrl(this.config)}/data-files/${fileId}/header`);
  }

  getWcs(fileId: string) {
    return this.http.get<CoreApiResponse<HeaderEntry[]>>(`${getCoreApiUrl(this.config)}/data-files/${fileId}/wcs`);
  }

  setWcs(fileId: string, wcs: { [key: string]: any }) {
    return this.http.put<CoreApiResponse<HeaderEntry[]>>(`${getCoreApiUrl(this.config)}/data-files/${fileId}/wcs`, wcs);
  }

  updateHeader(fileId: string, changes: HeaderEntry[]) {
    let body: { [key: string]: [number | string, string] } = {};
    changes.forEach(change => {
      body[change.key] = [change.value, change.comment]
    })
    return this.http.put(`${getCoreApiUrl(this.config)}/data-files/${fileId}/header`, body);
  }

  getHist(fileId: string): Observable<{ data: Float32Array; minBin: number; maxBin: number }> {
    return this.http.get<any>(`${getCoreApiUrl(this.config)}/data-files/${fileId}/hist`).pipe(
      map((res) => {
        let h = new Float32Array(res.data.data.length)
        res.data.data.forEach((v, i) => h[i] = v)
        return {
          data: h,
          minBin: res.data.minBin,
          maxBin: res.data.maxBin
        }
      })
    );
  }

  getPixels(layerId: string, precision: PixelPrecision, region: Region = null): Observable<PixelType> {
    let params: HttpParams = new HttpParams();
    if (region) {
      params = params
        .set('x', (region.x + 1).toString())
        .set('y', (region.y + 1).toString())
        .set('width', region.width.toString())
        .set('height', region.height.toString());
    }
    let headers: HttpHeaders = new HttpHeaders({});

    return this.http
      .get(`${getCoreApiUrl(this.config)}/data-files/${layerId}/pixels`, {
        headers: headers,
        responseType: 'arraybuffer',
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
    return `${getCoreApiUrl(this.config)}/data-files/${fileId}/sonification?x=${Math.floor(region.x) + 1}&y=${Math.floor(region.y) + 1
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
      layerId: null,
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
