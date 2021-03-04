import { Injectable } from "@angular/core";
import { Location } from "@angular/common";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { FieldCal } from "../models/field-cal";
import { PosType, CatalogSource } from "../models/source";
import { getCoreApiUrl } from '../../afterglow-config';
import { AfterglowConfigService } from '../../afterglow-config.service';

@Injectable()
export class AfterglowFieldCalService {
  constructor(private http: HttpClient, private config: AfterglowConfigService) {}

  getFieldCals(): Observable<FieldCal[]> {
    return this.http.get<any>(`${getCoreApiUrl(this.config)}/field-cals`).pipe(
      map(
        (res) =>
          res.map((r) => {
            return {
              id: r.id,
              name: r.name,
              catalogSources: r.catalog_sources.map((s) => {
                return {
                  id: s.id,
                  label: s.id,
                  objectId: null,
                  hduId: s.file_id,
                  posType: PosType.SKY,
                  primaryCoord: s.ra_hours,
                  secondaryCoord: s.dec_degs,
                  pm: null,
                  pmPosAngle: null,
                  pmEpoch: null,
                  mags: s.mags,
                } as CatalogSource;
              }),
              customFilterLookup: r.custom_filter_lookup,
              sourceInclusionPercent: r.source_inclusion_percent,
              sourceMatchTol: r.source_match_tol,
              minSnr: r.min_snr,
              maxSnr: r.max_snr,
            };
          }) as FieldCal[]
      )
    );
  }

  createFieldCal(c: FieldCal): Observable<FieldCal> {
    return this.http
      .post<any>(`${getCoreApiUrl(this.config)}/field-cals`, {
        name: c.name,
        catalog_sources: JSON.stringify(c.catalogSources),
        catalogs: JSON.stringify([]),
        custom_filter_lookup: JSON.stringify(c.customFilterLookup),
        source_inclusion_percent: c.sourceInclusionPercent,
        source_match_tol: c.sourceInclusionPercent,
        min_snr: c.minSnr,
        max_snr: c.maxSnr,
      })
      .pipe(
        map((r) => {
          return {
            id: r.id,
            name: r.name,
            catalogSources: r.catalog_sources,
            customFilterLookup: r.custom_filter_lookup,
            sourceInclusionPercent: r.source_inclusion_percent,
            sourceMatchTol: r.source_match_tol,
            minSnr: r.min_snr,
            maxSnr: r.max_snr,
          };
        })
      );
  }

  updateFieldCal(c: FieldCal): Observable<FieldCal> {
    return this.http
      .put<any>(`${getCoreApiUrl(this.config)}/field-cals/${c.id}`, {
        id: c.id,
        name: c.name,
        catalog_sources: JSON.stringify(c.catalogSources),
        catalogs: JSON.stringify([]),
        custom_filter_lookup: JSON.stringify(c.customFilterLookup),
        source_inclusion_percent: c.sourceInclusionPercent,
        source_match_tol: c.sourceInclusionPercent,
        min_snr: c.minSnr,
        max_snr: c.maxSnr,
      })
      .pipe(
        map((r) => {
          return {
            id: r.id,
            name: r.name,
            catalogSources: r.catalog_sources,
            customFilterLookup: r.custom_filter_lookup,
            sourceInclusionPercent: r.source_inclusion_percent,
            sourceMatchTol: r.source_match_tol,
            minSnr: r.min_snr,
            maxSnr: r.max_snr,
          };
        })
      );
  }
}
