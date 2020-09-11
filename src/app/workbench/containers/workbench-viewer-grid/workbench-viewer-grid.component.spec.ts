import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkbenchViewerGridComponent } from './workbench-viewer-grid.component';

describe('WorkbenchViewerGridComponent', () => {
  let component: WorkbenchViewerGridComponent;
  let fixture: ComponentFixture<WorkbenchViewerGridComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WorkbenchViewerGridComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkbenchViewerGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
