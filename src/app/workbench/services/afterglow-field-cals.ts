import { Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PosType, CatalogSource } from '../models/source';
import { getCoreApiUrl } from '../../afterglow-config';
import { AfterglowConfigService } from '../../afterglow-config.service';
import { FieldCalibration } from 'src/app/jobs/models/field-calibration';

@Injectable()
export class AfterglowFieldCalService {
  constructor(private http: HttpClient, private config: AfterglowConfigService) { }

  getFieldCals(): Observable<FieldCalibration[]> {
    return this.http.get<FieldCalibration[]>(`${getCoreApiUrl(this.config)}/field-cals`);
  }

  createFieldCal(c: FieldCalibration): Observable<FieldCalibration> {
    return this.http
      .post<any>(`${getCoreApiUrl(this.config)}/field-cals`, {
        name: c.name,
        catalogSources: JSON.stringify(c.catalogSources),
        catalogs: c.catalogs,
        customFilterLookup: JSON.stringify(c.customFilterLookup),
        sourceInclusionPercent: c.sourceInclusionPercentage,
        sourceMatchTol: c.sourceInclusionPercentage,
        minSnr: c.minSnr,
        maxSnr: c.maxSnr,
      })
  }

  updateFieldCal(c: FieldCalibration): Observable<FieldCalibration> {
    return this.http
      .put<any>(`${getCoreApiUrl(this.config)}/field-cals/${c.id}`, {
        id: c.id,
        name: c.name,
        catalogSources: JSON.stringify(c.catalogSources),
        catalogs: c.catalogs,
        customFilterLookup: JSON.stringify(c.customFilterLookup),
        sourceInclusionPercent: c.sourceInclusionPercentage,
        sourceMatchTol: c.sourceMatchTol,
        minSnr: c.minSnr,
        maxSnr: c.maxSnr,
      })
  }
}
