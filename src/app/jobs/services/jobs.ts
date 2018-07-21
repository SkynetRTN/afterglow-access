import 'rxjs/add/operator/map';
import 'rxjs/add/observable/of';
import { Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import changeCase = require('change-case');
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs/Observable';
import { JobType } from '../models/job-types';
import { SourceExtractionSettings } from '../models/source-extraction';
import { SourceMergeSettings } from '../models/source-merge';
import { Job } from '../models/job';
import { JobResult } from '../models/job-result';

@Injectable()
export class JobService {
  private SOURCE_ID = 0;

  constructor(private http: HttpClient, private location: Location) { }
  
  createJob(job: Job) {
    
    return this.http.post<Job>(this.location.prepareExternalUrl(`${environment.apiUrl}/jobs`), job)
  }

  getJob(jobId: string) {
    return this.http.get<Job>(this.location.prepareExternalUrl(`${environment.apiUrl}/jobs/${jobId}`))
  }

  getJobResult(job: Job) {
    return this.http.get<JobResult>(this.location.prepareExternalUrl(`${environment.apiUrl}/jobs/${job.id}/result`))
    .map(resp => {
      return {...resp, type: job.type};
    });
    
  }

  

  
}