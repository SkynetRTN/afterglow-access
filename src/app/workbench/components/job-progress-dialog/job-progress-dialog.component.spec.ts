import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { JobProgressDialogComponent } from './job-progress-dialog.component';

describe('JobProgressDialogComponent', () => {
  let component: JobProgressDialogComponent;
  let fixture: ComponentFixture<JobProgressDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ JobProgressDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(JobProgressDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
