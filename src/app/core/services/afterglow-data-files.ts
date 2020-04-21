import { Injectable } from "@angular/core";
import { Location } from "@angular/common";
import { HttpClient, HttpParams, HttpHeaders } from "@angular/common/http";
import { AppConfig } from "../../../environments/environment";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { DataFile, ImageFile, Header } from "../../data-files/models/data-file";
import { ImageHist } from "../../data-files/models/image-hist";
import { DataFileType } from "../../data-files/models/data-file-type";
import { Region } from "../models/region";
import { Source, PosType } from "../models/source";
import { DataProvider } from "../../data-providers/models/data-provider";
import { DataProviderAsset } from "../../data-providers/models/data-provider-asset";

function createImageHist(
  data: Uint32Array,
  minBin: number,
  maxBin: number,
  lowerPercentile = 10.0,
  upperPercentile = 98.0
): ImageHist {
  return {
    initialized: false,
    data: data,
    minBin: minBin,
    maxBin: maxBin
  };
}

function createImageFile(id: string, name: string, layer: string): ImageFile {
  return {
    type: DataFileType.IMAGE,
    id: id,
    name: name,
    layer: layer,
    header: null,
    wcs: null,
    headerLoaded: false,
    headerLoading: false,
    tilesInitialized: false,
    tiles: null,
    hist: null,
    histLoaded: false,
    histLoading: false,
    tileWidth: AppConfig.tileSize,
    tileHeight: AppConfig.tileSize
    // markerEntities: {},
    // markerIds: []
  };
}

@Injectable()
export class AfterglowDataFileService {
  private SOURCE_ID = 0;

  constructor(private http: HttpClient, private location: Location) {}

  removeFile(fileId: string): Observable<null> {
    return this.http
      .delete(`${AppConfig.baseUrl}/data-files/${fileId}`)
      .pipe(
        map(res => null)
      )
  }

  getFiles(): Observable<DataFile[]> {
    return this.http
      .get<any[]>(
        `${AppConfig.baseUrl}/data-files`
      )
      .pipe(
        map(res =>
          res
            .map(r => {
              switch (r.type) {
                case "image": {
                  let file: ImageFile = createImageFile(
                    r.id.toString(),
                    r.name,
                    r.layer
                  );
                  return file;
                }
                default: {
                  return null;
                }
              }
            })
            .filter(file => file)
        )
      );
  }

  createFromDataProviderAsset(
    providerId: string,
    assetPath: string
  ) {
    // assetPath = assetPath.replace("\\", "/");
    let body = { provider_id: providerId, path: assetPath };
    return this.http.post(
      `${AppConfig.baseUrl}/data-files`,
      body
    );
  }

  getHeader(fileId: string): Observable<Header> {
    return this.http.get<Header>(`${AppConfig.baseUrl}/data-files/${fileId}/header`);
  }

  getHist(fileId: string): Observable<ImageHist> {
    return this.http
      .get<any>(`${AppConfig.baseUrl}/data-files/${fileId}/hist`)
      .pipe(
        map(res => {
          return createImageHist(res.data, res.min_bin, res.max_bin);
        })
      );
  }

  getPixels(fileId: string, region: Region = null): Observable<Float32Array> {
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
      .get(`${AppConfig.baseUrl}/data-files/${fileId}/pixels`,
        { headers: headers, responseType: "arraybuffer", params: params }
      )
      .pipe(
        map(resp => {
          let result = new Float32Array(resp);
          return result;
        })
      );
  }

  getSonificationUri(
    fileId: string,
    region: Region,
    duration: number,
    toneCount: number
  ) {
    return `${AppConfig.baseUrl}/data-files/${fileId}/sonification?x=${Math.floor(
      region.x
    ) + 1}&y=${Math.floor(region.y) + 1}&width=${Math.floor(
      region.width
    )}&height=${Math.floor(region.height)}&tempo=${Math.ceil(
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
      fileId: null,
      label: sourceId.toString(),
      objectId: null,
      pmEpoch: null,
      posType: posType,
      primaryCoord: primaryCoord,
      secondaryCoord: secondaryCoord,
      pm: null,
      pmPosAngle: null
    };
    return source;
  }
}
