import { Injectable } from "@angular/core";
import { Location } from "@angular/common";
import { HttpClient, HttpParams, HttpHeaders } from "@angular/common/http";
import { environment } from "../../../environments/environment";
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
    tileWidth: environment.tileSize,
    tileHeight: environment.tileSize
    // markerEntities: {},
    // markerIds: []
  };
}

@Injectable()
export class AfterglowDataFileService {
  private SOURCE_ID = 0;

  constructor(private http: HttpClient, private location: Location) {}

  // searchBooks(queryTitle: string): Observable<Book[]> {
  //   return this.http
  //     .get<{ items: Book[] }>(this.location.prepareExternalUrl(`${environment.apiUrl}/data-files?q=${queryTitle}`)
  //     .map(books => books.items || []);
  // }

  // retrieveBook(volumeId: string): Observable<Book> {
  //   return this.http.get<Book>(this.location.prepareExternalUrl(`${environment.apiUrl}/data-files/${volumeId}`);
  // }

  // createFromProviderAsset(provider: DataProvider, asset: DataProviderAsset) {
  //   asset.path = asset.path.replace('\\', '/');
  //   let body = {provider_id: provider.id, path: asset.path};
  //   let result = this.http.post(this.location.prepareExternalUrl(`${environment.apiUrl}/data-files`, body);
  //   result.subscribe(resp => {
  //   })
  // }

  removeFile(fileId: string): Observable<null> {
    return this.http
      .delete(
        this.location.prepareExternalUrl(
          `${environment.apiUrl}/data-files/${fileId}`
        )
      )
      .pipe(
        map(res => null)
      )
  }

  getFiles(): Observable<DataFile[]> {
    return this.http
      .get<any[]>(
        this.location.prepareExternalUrl(`${environment.apiUrl}/data-files`)
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
    provider: DataProvider,
    asset: DataProviderAsset
  ) {
    asset.path = asset.path.replace("\\", "/");
    let body = { provider_id: provider.id, path: asset.path };
    return this.http.post(
      this.location.prepareExternalUrl(`${environment.apiUrl}/data-files`),
      body
    );
  }

  getHeader(fileId: string): Observable<Header> {
    return this.http.get<Header>(
      this.location.prepareExternalUrl(
        `${environment.apiUrl}/data-files/${fileId}/header`
      )
    );
  }

  getHist(fileId: string): Observable<ImageHist> {
    return this.http
      .get<any>(
        this.location.prepareExternalUrl(
          `${environment.apiUrl}/data-files/${fileId}/hist`
        )
      )
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
      .get(
        this.location.prepareExternalUrl(
          `${environment.apiUrl}/data-files/${fileId}/pixels`
        ),
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
    return this.location.prepareExternalUrl(
      `${environment.apiUrl}/data-files/${fileId}/sonification?x=${Math.floor(
        region.x
      ) + 1}&y=${Math.floor(region.y) + 1}&width=${Math.floor(
        region.width
      )}&height=${Math.floor(region.height)}&tempo=${Math.ceil(
        region.height / duration
      )}&num_tones=${Math.floor(toneCount)}&index_sounds=1`
    );
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

  // private photometryCoordHandler(fileId: string, params: HttpParams, photSettings: PhotSettings, centroidSettings: CentroidSettings): Observable<Array<Source>> {
  //   params = params.set('a', photSettings.aperture.toString())
  //     .set('a_in', photSettings.annulus.toString())
  //     .set('a_out', (photSettings.annulus + photSettings.dannulus).toString());

  //   if (centroidSettings.centroidClicks) {
  //     params = params.set('centroid_radius', (centroidSettings.psfCentroiderSettings.centeringBoxWidth / 2).toString())
  //   }

  //   return this.http.get<any[]>(this.location.prepareExternalUrl(`${environment.apiUrl}/data-files/${fileId}/photometry`, { params: params })
  //     .map(resp => {
  //       return resp.map(result => {
  //         let source = this.parseSource(result);
  //         return source;
  //       })

  //     })

  // }

  // photometerRaDec(fileId: string, coords: Array<{ raHours: number, decDegs: number }>, photSettings: PhotSettings, centroidSettings: CentroidSettings): Observable<Array<Source>> {
  //   if (coords.length == 0) return Observable.of([]);
  //   let params: HttpParams = new HttpParams();
  //   let raHoursArg: string = '';
  //   let decDegsArg: string = '';
  //   coords.forEach(coord => {
  //     raHoursArg += coord.raHours.toFixed(3) + ',';
  //     decDegsArg += coord.decDegs.toFixed(3) + ',';
  //   });

  //   params = params.set('raHours', raHoursArg)
  //     .set('decDegs', decDegsArg);

  //   return this.photometryCoordHandler(fileId, params, photSettings, centroidSettings);
  // }

  // photometerXY(fileId: string, coords: Array<{ x: number, y: number }>, photSettings: PhotSettings, centroidSettings: CentroidSettings): Observable<Array<Source>> {
  //   if (coords.length == 0) return Observable.of([]);

  //   let params: HttpParams = new HttpParams();
  //   let xArg: string = '';
  //   let yArg: string = '';
  //   coords.forEach(coord => {
  //     xArg += (coord.x).toFixed(3) + ',';
  //     yArg += (coord.y).toFixed(3) + ',';
  //   });

  //   params = params.set('x', xArg)
  //     .set('y', yArg);

  //   return this.photometryCoordHandler(fileId, params, photSettings, centroidSettings);
  // }

  // extractSources(fileId: string, settings: SourceExtractionSettings, region: Region = null): Observable<Array<Source>> {
  //   let params: HttpParams = new HttpParams()
  //     .set('threshold', settings.threshold.toString())
  //     .set('fwhm', settings.fwhm.toString())
  //     .set('deblend', settings.deblend ? '1' : '0');

  //   if (region) {
  //     params = params.set('x', Math.ceil(region.x).toString())
  //       .set('y', Math.ceil(region.y).toString())
  //       .set('width', Math.floor(region.width).toString())
  //       .set('height', Math.floor(region.height).toString());
  //   }

  //   return this.http.get<any[]>(this.location.prepareExternalUrl(`${environment.apiUrl}/data-files/${fileId}/sources`), { params: params })
  //     .map(r => {
  //       return r.map(s => this.parseSource(s))
  //     });

  // }
}
