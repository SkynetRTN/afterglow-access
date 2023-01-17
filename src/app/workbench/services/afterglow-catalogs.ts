import { Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AfterglowConfigService } from '../../afterglow-config.service';
import { getCoreApiUrl } from '../../afterglow-config';
import { CoreApiResponse } from '../../utils/core-api-response';
import { Catalog } from 'src/app/jobs/models/catalog-query';

@Injectable()
export class AfterglowCatalogService {
  constructor(private http: HttpClient, private config: AfterglowConfigService) { }

  getCatalogs(): Observable<Catalog[]> {
    return this.http.get<any>(`${getCoreApiUrl(this.config)}/catalogs/`).pipe(
      map((res) => {
        return res.data;
      })
    );
  }
}
