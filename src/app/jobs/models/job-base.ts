import { JobType } from './job-types';

export interface JobStateBase {
  status: 'pending' | 'in_progress' | 'canceled' | 'completed';
  createdOn: Date;
  completedOn: Date;
  progress: number;
}

export interface JobResultBase {
  errors: string[];
  warnings: string[];
}

export interface JobBase {
  id: string | null;
  state: JobStateBase | null;
  result: JobResultBase | null;
}
