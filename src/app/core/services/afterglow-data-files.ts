import 'rxjs/add/operator/map';
import 'rxjs/add/observable/of';
import { Injectable } from '@angular/core';
import { Matrix } from "paper";
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs/Observable';
import { grayColorMap } from '../models/color-map';
import { StretchMode } from '../models/stretch-mode';
import { DataFile, ImageFile, Header } from '../../data-files/models/data-file';
import { HeaderEntry } from '../../data-files/models/header-entry';
import { ImageHist } from '../../data-files/models/image-hist';
import { DataFileType } from '../../data-files/models/data-file-type'
import { Region } from '../models/region'
import { SonifierRegionMode } from '../models/sonifier-file-state';
import { MarkerType } from '../models/marker'
import { SourceExtractorRegionOption } from '../models/source-extractor-file-state';
import { Source } from '../models/source';
import { SourceExtractionSettings } from '../models/source-extraction-settings';
import { PhotSettings } from '../models/phot-settings';
import { DataProvider } from '../../data-providers/models/data-provider';
import { DataProviderAsset } from '../../data-providers/models/data-provider-asset';

function createImageHist(data: Uint32Array, minBin: number, maxBin: number, lowerPercentile = 10.0, upperPercentile = 98.0): ImageHist {
  return {
    initialized: false,
    data: data,
    minBin: minBin,
    maxBin: maxBin
  }
}

function createImageFile(id: string, name: string): ImageFile {
  return {
    type: DataFileType.IMAGE,
    id: id,
    name: name,
    header: null,
    headerLoaded: false,
    headerLoading: false,
    tilesInitialized: false,
    tiles: null,
    hist: null,
    histLoaded: false,
    histLoading: false,
    tileWidth: environment.tileSize,
    tileHeight: environment.tileSize,
    // markerEntities: {},
    // markerIds: []
  }
}

@Injectable()
export class AfterglowDataFileService {
  private SOURCE_ID = 0;

  constructor(private http: HttpClient) { }

  // searchBooks(queryTitle: string): Observable<Book[]> {
  //   return this.http
  //     .get<{ items: Book[] }>(`${environment.apiUrl}/data-files?q=${queryTitle}`)
  //     .map(books => books.items || []);
  // }

  // retrieveBook(volumeId: string): Observable<Book> {
  //   return this.http.get<Book>(`${environment.apiUrl}/data-files/${volumeId}`);
  // }

  // createFromProviderAsset(provider: DataProvider, asset: DataProviderAsset) {
  //   asset.path = asset.path.replace('\\', '/');
  //   let body = {provider_id: provider.id, path: asset.path};
  //   let result = this.http.post(`${environment.apiUrl}/data-files`, body);
  //   result.subscribe(resp => {
  //   })
  // }

  removeFile(fileId: string): Observable<null> {
    return this.http.delete(`${environment.apiUrl}/data-files/${fileId}`).map(res => null);
  }

  getFiles(): Observable<DataFile[]> {
    return this.http
      .get<any[]>(`${environment.apiUrl}/data-files`)
      .map(res => res
        .map(r => {
          switch (r.type) {
            case 'image': {
              let file: ImageFile = createImageFile(r.id.toString(), r.name);
              return file;
            }
            default: {
              return null;
            }
          }
        })
        .filter(file => file)
      )
  }

  createFromDataProviderAsset(provider: DataProvider, asset: DataProviderAsset) {
    asset.path = asset.path.replace('\\', '/');
    let body = { provider_id: provider.id, path: asset.path };
    return this.http.post(`${environment.apiUrl}/data-files`, body);
  }

  getHeader(fileId: string): Observable<Header> {
    return this.http.get<Header>(`${environment.apiUrl}/data-files/${fileId}/header`)
  }

  getHist(fileId: string): Observable<ImageHist> {
    return this.http.get<any>(`${environment.apiUrl}/data-files/${fileId}/hist`)
      .map(res => {
        return createImageHist(res.data, res.min_bin, res.max_bin)
      });
  }

  getPixels(fileId: string, region: Region = null): Observable<Float32Array> {
    let params: HttpParams = new HttpParams();
    if (region) {
      params = params.set('x', (region.x + 1).toString())
        .set('y', (region.y + 1).toString())
        .set('width', region.width.toString())
        .set('height', region.height.toString())
    }
    let headers: HttpHeaders = new HttpHeaders({
      
    })

    return this.http.get(`${environment.apiUrl}/data-files/${fileId}/pixels`, { headers: headers, responseType: 'arraybuffer', params: params })
      .map(resp => {
        let result = new Float32Array(resp);
        return result;
      });
  }

  getSonificationUri(fileId: string, region: Region, duration: number, toneCount: number) {
    return `${environment.apiUrl}/data-files/${fileId}/sonification?x=${Math.floor(region.x) + 1}&y=${Math.floor(region.y) + 1}&width=${Math.floor(region.width)}&height=${Math.floor(region.height)}&tempo=${Math.ceil(region.height / duration)}&num_tones=${Math.floor(toneCount)}`;
  }

  private parseSource(s: any): Source {
    let source: Source = Object.assign({}, {
      id: (this.SOURCE_ID++).toString(),
      x: s.x,
      y: s.y,
      mag: s.mag,
      magError: s.mag_err,
      raHours: s.ra_hours,
      decDegs: s.dec_degs,
      a: s.a,
      b: s.b,
      theta: s.theta,
      fwhm: s.fwhm,
    })
    return source;
  }

  private photometryCoordHandler(fileId: string, params: HttpParams, settings: PhotSettings): Observable<Array<Source>> {
    params = params.set('a', settings.aperture.toString())
      .set('a_in', settings.annulus.toString())
      .set('a_out', (settings.annulus + settings.dannulus).toString());

    if (settings.centroid) {
      params = params.set('centroid_radius', (settings.centeringBoxWidth / 2).toString())
    }


    return this.http.get<any[]>(`${environment.apiUrl}/data-files/${fileId}/photometry`, { params: params })
      .map(resp => {
        return resp.map(result => {
          let source = this.parseSource(result);
          return source;
        })

      })


  }

  photometerRaDec(fileId: string, coords: Array<{ raHours: number, decDegs: number }>, settings: PhotSettings): Observable<Array<Source>> {
    if (coords.length == 0) return Observable.of([]);
    let params: HttpParams = new HttpParams();
    let raHoursArg: string = '';
    let decDegsArg: string = '';
    coords.forEach(coord => {
      raHoursArg += coord.raHours.toFixed(3) + ',';
      decDegsArg += coord.decDegs.toFixed(3) + ',';
    });

    params = params.set('raHours', raHoursArg)
      .set('decDegs', decDegsArg);

    return this.photometryCoordHandler(fileId, params, settings);
  }

  photometerXY(fileId: string, coords: Array<{ x: number, y: number }>, settings: PhotSettings): Observable<Array<Source>> {
    if (coords.length == 0) return Observable.of([]);

    let params: HttpParams = new HttpParams();
    let xArg: string = '';
    let yArg: string = '';
    coords.forEach(coord => {
      xArg += (coord.x).toFixed(3) + ',';
      yArg += (coord.y).toFixed(3) + ',';
    });

    params = params.set('x', xArg)
      .set('y', yArg);

    return this.photometryCoordHandler(fileId, params, settings);


    //params.set('centroid', centroidClicks ? '1' : '0');

    // if(settings.region != Region.Image) {
    //   params.set('x', '0');
    //   params.set('y', '0');
    //   params.set('width', imageFile.width.toString());
    //   params.set('height', imageFile.height.toString());
    // }


  }



  extractSources(fileId: string, settings: SourceExtractionSettings, region: Region = null): Observable<Array<Source>> {

    let params: HttpParams = new HttpParams()
      .set('threshold', settings.threshold.toString())
      .set('fwhm', settings.fwhm.toString())
      .set('deblend', settings.deblend ? '1' : '0');

    if (region) {
      params = params.set('x', Math.ceil(region.x).toString())
        .set('y', Math.ceil(region.y).toString())
        .set('width', Math.floor(region.width).toString())
        .set('height', Math.floor(region.height).toString());
    }

    return this.http.get<any[]>(`${environment.apiUrl}/data-files/${fileId}/sources`, { params: params })
      .map(r => {
        return r.map(s => this.parseSource(s))
      });


  }

  // private photometryCoordHandler(fileId: string, params: HttpParams, settings: PhotSettings) : Observable<Array<Source>> {
  //   params.set('a', settings.aperture.toString());
  //   params.set('a_in', settings.annulus.toString());
  //   params.set('a_out', (settings.annulus + settings.dannulus).toString());

  //   if(settings.centroid) {
  //     params.set('centroid_radius', settings.centroidRadius.toString())
  //     let centroidMethod;
  //     if(settings.centroidMethod == CentroidMethod.COM) {
  //       centroidMethod = 'com'
  //     }
  //     else if(settings.centroidMethod == CentroidMethod.GAUSSIAN_2D) {
  //       centroidMethod = '2dg'
  //     }
  //     else if(settings.centroidMethod == CentroidMethod.GAUSSIAN_1D) {
  //       centroidMethod = '1dg'
  //     }
  //     if(centroidMethod) {
  //       params.set('centroid_method', centroidMethod);
  //     }
  //   }

  //   let requestOptions = new RequestOptions();
  //   requestOptions.search = params;

  //   return this.http.get(`${environment.apiUrl}/data-files/${fileId}/photometry`, requestOptions)
  //       .map(resp => {
  //         return resp.json().map(result => {
  //           let source = this.decodeSource(result);
  //           return source;
  //         })

  //       })


  // }

  // photometerRaDec(fileId: string, coords: Array<{raHours: number, decDegs: number}>, settings: PhotSettings) : Observable<Array<Source>> {
  //   if(coords.length == 0) return Observable.of([]);
  //   let params: HttpParams = new HttpParams();
  //   let raHoursArg: string = '';
  //   let decDegsArg: string = '';
  //   coords.forEach(coord => {
  //     raHoursArg += coord.raHours.toFixed(3) + ',';
  //     decDegsArg += coord.decDegs.toFixed(3) + ',';
  //   });

  //   params.set('raHours', raHoursArg);
  //   params.set('decDegs', decDegsArg);

  //   return this.photometryCoordHandler(fileId, params, settings);
  // }

  // photometer(fileId: string, coords: Array<{x: number, y: number}>, settings: PhotSettings) : Observable<Array<Source>> {
  //   if(coords.length == 0) return Observable.of([]);

  //   let params: HttpParams = new HttpParams();
  //   let xArg: string = '';
  //   let yArg: string = '';
  //   coords.forEach(coord => {
  //     xArg += (coord.x+1).toFixed(3) + ',';
  //     yArg += (coord.y+1).toFixed(3) + ',';
  //   });

  //   params.set('x', xArg);
  //   params.set('y', yArg);

  //   return this.photometryCoordHandler(fileId, params, settings);


  //   //params.set('centroid', centroidClicks ? '1' : '0');

  //   // if(settings.region != Region.Image) {
  //   //   params.set('x', '0');
  //   //   params.set('y', '0');
  //   //   params.set('width', imageFile.width.toString());
  //   //   params.set('height', imageFile.height.toString());
  //   // }


  // }

  // findCatalogSources(fileId: string, catalogName: string, catalogFilter: string, threshold: number) {
  //   let params: HttpParams = new HttpParams();
  //   params.set('catalog', catalogName);
  //   params.set('filter', catalogFilter);
  //   params.set('threshold', threshold.toString());
  //   let requestOptions = new RequestOptions();
  //   requestOptions.search = params;

  //   return this.http.get(`${environment.apiUrl}/data-files/${fileId}/catalog-sources`, requestOptions)
  //     .map(resp => resp.json().map(r => {
  //       let catalogSource : CatalogSource = {
  //         raHours: r.raHours,
  //         decDegs: r.decDegs,
  //         mag: r.mag,
  //         magError: r.magError
  //       }
  //       return catalogSource;
  //   }));
  // }

  // measurePhotCals(fileId: string, catalogSources: Array<CatalogSource>) {
  //   let params: HttpParams = new HttpParams();
  //   catalogSources.forEach(catalogSource => {
  //     params.set('raHours', catalogSource.raHours.toString());
  //     params.set('decDegs', catalogSource.decDegs.toString());
  //     params.set('mag', catalogSource.mag.toString());
  //   });

  //   let requestOptions = new RequestOptions();
  //   requestOptions.search = params;

  //   return this.http.get(`${environment.apiUrl}/data-files/${fileId}/zero-points`, requestOptions)
  //     .map(resp => resp.json().map(r => {
  //       let zeroPoint : PhotCal = {
  //         offset: r.offset,
  //         error: r.error,
  //         rejected: r.rejected,
  //         flags: r.flags
  //       }
  //       return zeroPoint;
  //   }));
  // }

  // getSonificationUri(fileId: string, region: Region, duration: number, toneCount: number) {
  //   return `${environment.apiUrl}/data-files/${fileId}/sonification?x=${Math.floor(region.x)+1}&y=${Math.floor(region.y)+1}&width=${Math.floor(region.width)}&height=${Math.floor(region.height)}&tempo=${Math.ceil(region.height/duration)}&num_tones=${Math.floor(toneCount)}`;
  // }

  // importFromProvider(provider: ImageProvider, assets: ImageProviderAsset[]) {
  //   let promises = [];
  //   assets.forEach(asset => {
  //     promises.push(
  //       this.http.post(this.imageFilesUrl,
  //         {'imageProviderId': provider.id, 'assetParams': asset.params})
  //         .toPromise()
  //         .then(response =>
  //           this.http.get(response.headers.get('Location'))
  //           .toPromise()
  //           .then(response =>  {
  //             let result = response.json() as ImageFile;
  //             this.imageFileToState[result.id] = new ImageFileSettings();
  //             return result;
  //           }))
  //       );
  //   });
  //   return Promise.all(promises);
  // }

  // getPlotterSettings(imageFile: ImageFile) {
  //   let settings = this.imageFileToState[imageFile.id];
  //   if(!settings.plotterSettings) {
  //       settings.plotterSettings = new PlotterSettings();
  //   }

  //   return Promise.resolve(settings.plotterSettings);
  // }

  // getSonifierState(imageFile: ImageFile) {
  //   let settings = this.imageFileToState[imageFile.id];
  //   if(!settings.sonifierSettings) {
  //       settings.sonifierSettings = new SonifierSettings();
  //       settings.sonifierSettings.region$.next({x: 0, y: 0, width: imageFile.width, height: imageFile.height});
  //   }

  //   return Promise.resolve(settings.sonifierSettings);
  // }

  // getSourceExtractionState(imageFile: ImageFile) {
  //   let settings = this.imageFileToState[imageFile.id];
  //   if(!settings.sourceExtractionSettings) {
  //       settings.sourceExtractionSettings = new SourceExtractionState();
  //   }

  //   return Promise.resolve(settings.sourceExtractionSettings);
  // }

  // getImageViewerState(imageFile: ImageFile) {
  //   let settings = this.imageFileToState[imageFile.id];
  //   if(settings.normalization) {
  //     console.log("settings exist", settings.normalization, settings.normalization.layer);
  //     return Promise.resolve(settings.normalization);
  //   }

  //   settings.normalization = new zp.ImageViewerState();
  //   let tm = new zp.ImageTileManager<Uint16Array>(imageFile.width, imageFile.height,
  //     this.tileWidth, this.tileHeight, imageFile.numChannels);
  //   tm.tileLoader = (tile: zp.ImageTile<Uint16Array>) => { return this.loadTile(imageFile, tile) };
  //   let layer = new zp.ImageViewerLayer(tm);

  //   // normalization may be set prior to viewer being loaded
  //   if(settings.normalizer) {
  //     layer.normalizer = settings.normalizer;
  //     settings.normalization.addLayer(layer);
  //     console.log("new settings, default normalizer, added layer", settings.normalization);
  //     return Promise.resolve(settings.normalization);
  //   }

  //   //on first load, get histogram to initialize normalizer values
  //   return this.getImageHist(imageFile).then(imageHist => {
  //     settings.normalizer = new zp.BitmapNormalizer();
  //     settings.normalizer.colorMap = this.colorMaps[0];
  //     settings.normalizer.setBackgroundPeak(Math.round(imageHist.backgroundLevel*100.0)/100.0, Math.round(imageHist.peakLevel*100.0)/100.0);
  //     layer.normalizer = settings.normalizer;
  //     settings.normalization.addLayer(layer);
  //     console.log("new settings, new normalizer, added layer", settings.normalization);
  //     return settings.normalization;
  //   });
  // }

  // getImageHist(imageFile: ImageFile) {
  //   let settings = this.imageFileToState[imageFile.id];
  //   if(settings.hist) {
  //       return Promise.resolve(settings.hist);
  //   }


  //   return this.http.get(this.imageFilesUrl + '/' + imageFile.id + '/hist')
  //     .toPromise()
  //     .then(response => {
  //        let result = response.json()
  //        let hist = new ImageHist();
  //        hist.data = result.data;
  //        hist.minBin = result.minBin;
  //        hist.maxBin = result.maxBin;
  //        settings.hist = hist;
  //        return hist;
  //     })
  //     .catch(this.handleError);
  // }

  // getImageHeader(imageFile: ImageFile) {
  //   return this.http.get(this.imageFilesUrl + '/' + imageFile.id + '/header')
  //     .toPromise()
  //     .then(response => {
  //       //console.log(response);
  //        let result = response.json()
  //        let header = new ImageHeader();
  //        header.setEntries(result);
  //        return header;
  //     })
  //     .catch(this.handleError);
  // }

  // getImageSources(imageFile: ImageFile, settings: SourceExtractionState) {
  //   let params: HttpParams = new HttpParams();
  //   params.set('threshold', settings.threshold.toString());

  //   // if(settings.region != Region.Image) {
  //   //   params.set('x', '0');
  //   //   params.set('y', '0');
  //   //   params.set('width', imageFile.width.toString());
  //   //   params.set('height', imageFile.height.toString());
  //   // }

  //   let requestOptions = new RequestOptions();
  //   requestOptions.search = params;

  //   return this.http.get(this.imageFilesUrl + '/' + imageFile.id + '/sources', requestOptions)
  //     .toPromise()
  //     .then(response => {
  //        let result = response.json() as Array<ImageSource>;
  //        for(let i=0; i<result.length; i++) {
  //          result[i] = result[i] as ImageSource;
  //        }
  //        return result;
  //     })
  //     .catch(this.handleError);
  // }

  // private loadTile(imageFile: ImageFile, imageTile: zp.ImageTile<Uint16Array>) : Promise<any> {
  //   let params: HttpParams = new HttpParams();
  //   params.set('xOffset', imageTile.xOffset.toString());
  //   params.set('yOffset', imageTile.yOffset.toString());
  //   params.set('tileWidth', imageTile.width.toString());
  //   params.set('tileHeight', imageTile.height.toString());
  //   let requestOptions = new RequestOptions();
  //   requestOptions.search = params;

  //   return this.http.get(this.imageFilesUrl + '/' + imageFile.id + '/pixels', requestOptions)
  //     .toPromise()
  //     .then(response => {
  //        return Promise.resolve(response.json() as Array<Uint16Array>);
  //     })
  //     .catch(this.handleError);
  // }

  // private handleError(error: any): Promise<any> {
  //   console.error('An error occurred', error); // for demo purposes only
  //   return Promise.reject(error.message || error);
  // }
}