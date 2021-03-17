import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToolPanelBaseComponent } from './tool-panel-base.component';

describe('ToolPanelBaseComponent', () => {
  let component: ToolPanelBaseComponent;
  let fixture: ComponentFixture<ToolPanelBaseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ToolPanelBaseComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ToolPanelBaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
