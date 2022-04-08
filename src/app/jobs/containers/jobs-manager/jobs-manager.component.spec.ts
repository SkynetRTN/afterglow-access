import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JobsManagerComponent } from './jobs-manager.component';

describe('JobsManagerComponent', () => {
  let component: JobsManagerComponent;
  let fixture: ComponentFixture<JobsManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ JobsManagerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JobsManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
