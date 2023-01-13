import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Job } from '../models/job';
import { JobBase, JobResultBase, JobStateBase } from '../models/job-base';
import { JobResult } from '../models/job-result';
import { getCoreApiUrl } from '../../afterglow-config';
import { AfterglowConfigService } from '../../afterglow-config.service';
import { CoreApiResponse } from '../../utils/core-api-response';

@Injectable()
export class JobApiService {
  private SOURCE_ID = 0;

  constructor(private http: HttpClient, private config: AfterglowConfigService) { }

  createJob(job: Job) {
    return this.http.post<CoreApiResponse<Job>>(`${getCoreApiUrl(this.config)}/jobs/`, job);
  }

  getJobs() {
    return this.http.get<CoreApiResponse<Job[]>>(`${getCoreApiUrl(this.config)}/jobs/`);
  }

  getJob(jobId: string) {
    return this.http.get<CoreApiResponse<Job>>(`${getCoreApiUrl(this.config)}/jobs/${jobId}`);
  }

  cancelJob(jobId: string) {
    return this.http.put<CoreApiResponse<Job>>(`${getCoreApiUrl(this.config)}/jobs/${jobId}/state`, { status: 'canceled' });
  }

  getJobState(jobId: string) {
    return this.http.get<CoreApiResponse<JobStateBase>>(`${getCoreApiUrl(this.config)}/jobs/${jobId}/state`);
  }

  getJobResult(id: string): Observable<JobResultBase> {
    return this.http.get<any>(`${getCoreApiUrl(this.config)}/jobs/${id}/result`).pipe(
      map((resp) => {
        return { ...resp.data };
      })
    );
  }

  getJobResultFile(jobId: string, fileId: string): Observable<any> {
    return this.http.get(`${getCoreApiUrl(this.config)}/jobs/${jobId}/result/files/${fileId}`, {
      responseType: 'blob',
    });
  }
}
