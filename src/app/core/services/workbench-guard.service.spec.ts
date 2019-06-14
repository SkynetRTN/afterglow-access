import { TestBed } from '@angular/core/testing';

import { WorkbenchGuard } from './workbench-guard.service';

describe('WorkbenchGuardService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: WorkbenchGuard = TestBed.get(WorkbenchGuard);
    expect(service).toBeTruthy();
  });
});
