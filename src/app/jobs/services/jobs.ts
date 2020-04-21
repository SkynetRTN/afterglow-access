import { Injectable } from "@angular/core";
import { Location } from "@angular/common";
import { HttpClient, HttpParams, HttpHeaders } from "@angular/common/http";
import { AppConfig } from "../../../environments/environment";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Job } from "../models/job";
import { JobResult } from "../models/job-result";

@Injectable()
export class JobService {
  private SOURCE_ID = 0;

  constructor(private http: HttpClient, private location: Location) {}

  createJob(job: Job) {
    return this.http.post<Job>(
      `${AppConfig.baseUrl}/jobs`,
      job
    );
  }

  getJob(jobId: string) {
    return this.http.get<Job>(
      `${AppConfig.baseUrl}/jobs/${jobId}`
    );
  }

  getJobResult(job: Job): Observable<JobResult> {
    return this.http
      .get<any>(
        `${AppConfig.baseUrl}/jobs/${job.id}/result`
      )
      .pipe(
        map(resp => {
          return { ...resp, type: job.type };
        })
      );
  }
}
