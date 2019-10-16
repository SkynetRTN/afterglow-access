import { Action } from '@ngrx/store';
import { CorrelatedAction } from '../../utils/correlated-action';

export const IMPORT_FROM_SURVEY = '[Survey] Import From Survey';
export const IMPORT_FROM_SURVEY_SUCCESS = '[Survey] Import From Survey Success';
export const IMPORT_FROM_SURVEY_FAIL = '[Survey] Import From Survey Fail';

export class ImportFromSurvey implements CorrelatedAction {
  readonly type = IMPORT_FROM_SURVEY;

  constructor(public payload: {
    surveyDataProviderId: string,
    raHours: number,
    decDegs: number,
    widthArcmins: number,
    heightArcmins: number,
    imageFileId?: string
  }, 
  public correlationId?: string) { }
}

export class ImportFromSurveySuccess {
  readonly type = IMPORT_FROM_SURVEY_SUCCESS;
}

export class ImportFromSurveyFail {
  readonly type = IMPORT_FROM_SURVEY_FAIL;
}

export type Actions = ImportFromSurvey 
| ImportFromSurveySuccess
| ImportFromSurveyFail;