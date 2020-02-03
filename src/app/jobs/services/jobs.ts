import { Injectable } from "@angular/core";
import { Location } from "@angular/common";
import { HttpClient, HttpParams, HttpHeaders } from "@angular/common/http";
import { environment } from "../../../environments/environment";
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
      `${environment.apiUrl}/jobs`,
      job
    );
  }

  getJob(jobId: string) {
    return this.http.get<Job>(
      `${environment.apiUrl}/jobs/${jobId}`
    );
  }

  getJobResult(job: Job): Observable<JobResult> {
    return this.http
      .get<any>(
        `${environment.apiUrl}/jobs/${job.id}/result`
      )
      .pipe(
        map(resp => {
          return { ...resp, type: job.type };
        })
      );
  }
}
