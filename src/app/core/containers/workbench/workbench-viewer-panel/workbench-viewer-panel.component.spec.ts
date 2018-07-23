import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkbenchViewerPanelComponent } from './workbench-viewer-panel.component';

describe('ViewerComponent', () => {
  let component: WorkbenchViewerPanelComponent;
  let fixture: ComponentFixture<WorkbenchViewerPanelComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WorkbenchViewerPanelComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkbenchViewerPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
