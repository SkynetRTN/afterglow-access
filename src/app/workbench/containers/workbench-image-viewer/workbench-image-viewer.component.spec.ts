import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkbenchViewerComponent } from './workbench-viewer.component';

describe('ViewerComponent', () => {
  let component: WorkbenchViewerComponent;
  let fixture: ComponentFixture<WorkbenchViewerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [WorkbenchViewerComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkbenchViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
