import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PixelOpsJobsDialogComponent } from './pixel-ops-jobs-dialog.component';

describe('PixelOpsJobsDialogComponent', () => {
  let component: PixelOpsJobsDialogComponent;
  let fixture: ComponentFixture<PixelOpsJobsDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PixelOpsJobsDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PixelOpsJobsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
