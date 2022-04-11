import { JobType } from './job-types';

export interface JobStateBase {
  status: 'pending' | 'in_progress' | 'canceled' | 'completed';
  createdOn: Date;
  completedOn: Date;
  progress: number;
}

export interface JobResultError {
  id: string;
  detail: string;
  status: string;
  meta: { [key: string]: any };
}

export interface JobResultBase {
  errors: JobResultError[];
  warnings: string[];
}

export interface JobBase {
  id: string | null;
  state: JobStateBase | null;
  // result: JobResultBase | null;
}
