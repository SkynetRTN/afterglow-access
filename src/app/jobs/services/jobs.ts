import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Job } from '../models/job';
import { JobStateBase } from '../models/job-base';
import { JobResult } from '../models/job-result';
import { getCoreApiUrl } from '../../afterglow-config';
import { AfterglowConfigService } from '../../afterglow-config.service';
import { CoreApiResponse } from '../../utils/core-api-response';

interface JobResponse extends CoreApiResponse {
  data: Job;
}

interface JobStateResponse extends CoreApiResponse {
  data: JobStateBase;
}

@Injectable()
export class JobService {
  private SOURCE_ID = 0;

  constructor(private http: HttpClient, private config: AfterglowConfigService) {}

  createJob(job: Job) {
    return this.http.post<JobResponse>(`${getCoreApiUrl(this.config)}/jobs`, job);
  }

  getJob(jobId: string) {
    return this.http.get<JobResponse>(`${getCoreApiUrl(this.config)}/jobs/${jobId}`);
  }

  getJobState(jobId: string) {
    return this.http.get<JobStateResponse>(`${getCoreApiUrl(this.config)}/jobs/${jobId}/state`);
  }

  getJobResult(job: Job): Observable<JobResult> {
    return this.http.get<any>(`${getCoreApiUrl(this.config)}/jobs/${job.id}/result`).pipe(
      map((resp) => {
        return { ...resp.data, type: job.type };
      })
    );
  }

  getJobResultFile(jobId: string, fileId: string): Observable<any> {
    return this.http.get(`${getCoreApiUrl(this.config)}/jobs/${jobId}/result/files/${fileId}`, {
      responseType: 'blob',
    });
  }
}
