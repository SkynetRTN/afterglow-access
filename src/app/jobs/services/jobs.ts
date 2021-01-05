import { Injectable } from "@angular/core";
import { Location } from "@angular/common";
import { HttpClient, HttpParams, HttpHeaders } from "@angular/common/http";
import { appConfig } from "../../../environments/environment";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Job } from "../models/job";
import { JobStateBase } from "../models/job-base";
import { JobResult } from "../models/job-result";
import { getCoreApiUrl } from "../../../environments/app-config";

@Injectable()
export class JobService {
  private SOURCE_ID = 0;

  constructor(private http: HttpClient, private location: Location) {}

  createJob(job: Job) {
    return this.http.post<Job>(`${getCoreApiUrl(appConfig)}/jobs`, job);
  }

  getJob(jobId: string) {
    return this.http.get<Job>(`${getCoreApiUrl(appConfig)}/jobs/${jobId}`);
  }

  getJobState(jobId: string) {
    return this.http.get<JobStateBase>(`${getCoreApiUrl(appConfig)}/jobs/${jobId}/state`);
  }

  getJobResult(job: Job): Observable<JobResult> {
    return this.http.get<any>(`${getCoreApiUrl(appConfig)}/jobs/${job.id}/result`).pipe(
      map((resp) => {
        return { ...resp, type: job.type };
      })
    );
  }

  getJobResultFile(jobId: string, fileId: string): Observable<any> {
    return this.http.get(`${getCoreApiUrl(appConfig)}/jobs/${jobId}/result/files/${fileId}`, {
      responseType: 'blob'
    })
  }


}
